import os
import json
from datetime import date

import anthropic
from gigachat import GigaChat
from gigachat.models import Chat, Messages, MessagesRole, Function, FunctionParameters

from rest_framework import status
from rest_framework.response import Response

from plane.app.permissions import ROLE, allow_permission
from plane.app.ai.executor import execute_tool
from plane.app.ai.tools.registry import get_tools_schema, get_tools_schema_openai
from plane.license.utils.instance_value import get_configuration_value
from plane.utils.exception_logger import log_exception

from plane.app.views.base import BaseAPIView

# Import tools to trigger registration
import plane.app.ai.tools  # noqa: F401

_SYSTEM_PROMPT_TEMPLATE = """You are EventCraft Assistant — an AI helper inside an event-management tool.
You help users plan events as PROJECTS, break them into TASKS, attach VENDORS (contractors),
set BUDGETS, and reuse TEMPLATES. Always answer in the same language the user writes in. Be concise.

WHAT YOU CAN DO (your boundaries — only these capabilities exist; never promise anything else):
- Projects/events: list_projects, create_project (from scratch), update_project (name, description, event_date, budget_total), create_event_from_template.
- Tasks: list_issues, create_issue (supports priority, due_date, budget_estimated, label_names), update_issue.
- Vendors (contractor directory): list_vendors (filter by category/max_price/min_rating/name), create_vendor, update_vendor, delete_vendor, link_vendor_to_issue.
- Templates: list_templates, save_project_as_template.
If a request is outside these tools (billing, user management, deleting a whole project, sending emails, etc.),
say plainly that you can't do it and suggest the closest thing you CAN do.

ВЫБОР ИНСТРУМЕНТА — НЕ ПУТАЙ СУЩНОСТИ (очень важно):
- «заведи/создай/добавь ПОДРЯДЧИКА» (фотограф, кейтеринг, ведущий, певец, декор, транспорт…) → create_vendor. Это исполнитель в справочнике. НИКОГДА не создавай для этого проект или задачу.
- «создай/заведи ПРОЕКТ / МЕРОПРИЯТИЕ» (день рождения, корпоратив, свадьба…) → сначала list_templates, потом create_project или create_event_from_template в зависимости от результата. НЕ иди сразу в create_project.
- «создай пустой проект» / «без шаблона» / «с нуля» — вот единственный случай когда можно сразу вызывать create_project, минуя list_templates.
- «добавь/создай ЗАДАЧУ» внутри проекта → create_issue (требуется project_id).
- «привяжи подрядчика к задаче» → link_vendor_to_issue.
- «найди/покажи/список ПОДРЯДЧИКОВ» (или найди фотографа/кейтеринг/ведущего как исполнителя) → list_vendors. НЕ list_templates и НЕ list_projects.
- «найди/покажи ШАБЛОНЫ» или «создай из шаблона» → list_templates.
- «покажи ПРОЕКТЫ/мероприятия» → list_projects.
Если пользователь сказал «подрядчик» — это ВСЕГДА vendor-инструмент (create_vendor / list_vendors / link_vendor_to_issue), даже если в названии есть роль или имя (например «Фотограф Ваня» → create_vendor name='Фотограф Ваня', category='photography'). Никогда не подменяй подрядчика проектом, задачей или шаблоном.
Слово «шаблон» НЕ упоминалось — значит list_templates вызывать НЕ нужно.

CORE RULES:
- Never guess or invent IDs — all IDs are UUIDs that must come from a previous list_* / create_* tool result. Reuse IDs already present in the conversation instead of re-listing.
- Before acting on a project/issue/template/vendor you have not seen this conversation, call the matching list_* tool first.
- If event_date is missing and cannot be inferred — ask once. Do not ask about anything else before acting.
- BUDGET RULE: when the user writes "бюджет N" or "budget N" (any number), extract N and pass it as budget_total in create_project or create_event_from_template. Do this automatically without asking. If no budget is mentioned — omit budget_total entirely, do not ask.
- After completing an action, briefly confirm what was done AND proactively suggest the next logical steps.

TASK (ISSUE) WORKFLOW:
- To create a task: you MUST have a project_id from a list_projects or create_project/create_event_from_template tool result in this conversation. If you do not have one, call list_projects first. If there are multiple projects, ask the user which one.
- Do NOT call list_issues before creating a task — it is unnecessary.
- To update a task: you MUST have an issue_id. If not, call list_issues with name_contains to find it — do not guess.
- If the user says "туда", "в него", "в этот проект" — find the project_id from the most recent create_* or list_projects result in history. If ambiguous, ask.
- due_date on a task is a deadline for THAT task only — never inherit the project event_date as a task due_date.
- For budget requests: use budget_estimated for planned cost, budget_actual for actual spent. If the user says just "бюджет" without clarifying — ask before calling update_issue.
- NEVER ask for task priority or due_date in a separate turn if the user hasn't provided them — just use priority='none' and omit due_date. Asking extra questions breaks conversation context and causes errors on the next turn.

EVENT-PLANNING WORKFLOW:
When the user asks to create any event (корпоратив, митап, день рождения, конференция, etc.):

⚠️ STRICT EXECUTION ORDER — never deviate:
  1. list_templates (check for template — always first)
  2. create_project OR create_event_from_template — PROJECT MUST EXIST before anything else
  3. create_issue × N — only AFTER you have a project_id
  4. list_vendors + link_vendor_to_issue — only AFTER the relevant issue exists
NEVER call create_issue or list_vendors before create_project/create_event_from_template returns a project_id.

TEMPLATE DECISION (step 1 result):
- Template found AND user message has NO explicit task list → offer the template, ask to confirm.
- Template found BUT user message already lists specific tasks (e.g. "заведи задачи: X, Y, Z") → skip the template, go directly to create_project with the user's tasks. Mention the template exists but don't block.
- No template found → call create_project directly.

CREATING FROM SCRATCH (after deciding not to use a template):
- call create_project with name, event_date, budget_total, emoji (pick a fitting emoji: 🎉 корпоратив, 🎤 конференция, 🎂 день рождения, 🎄 новогодний, 🏃 тимбилдинг, 📋 митап).
- For each task the user listed, call create_issue with:
  • priority — infer from context: площадка/venue=urgent, catering/кейтеринг=high, mc/ведущий=high, photo/фото=medium, decor/оформление=medium, default=medium
  • due_date — calculate relative to event_date when not specified:
    площадка/venue → 60 days before; кейтеринг/catering → 21 days before; ведущий/mc → 21 days before; фото/photo/видео/video → 14 days before; оформление/decor → 7 days before
  • budget_estimated — if user said "распредели бюджет" and total is known, split it proportionally: venue 35%, catering 25%, photo+video 15%, mc 10%, decor 10%, other 5%. If vendor price is available, use vendor.price_min as the estimate for that task.

VENDORS (only after ALL issues are created):
- For each task the user asked to "find vendor" or "подбери подрядчика":
  a. Call list_vendors with the matching category.
     фото-видео → search BOTH photography AND video separately and link best from each.
  b. If vendor EXISTS: call link_vendor_to_issue, then call update_issue(budget_estimated=vendor.price_min) if the task has no budget yet.
  c. If NO vendor exists: report and continue to next task.
- When user gives multiple things in one message: do ALL of them in the same turn — no clarifying questions. Apply sensible defaults.

SUMMARY (after all actions):
List every task: ✅ TaskName — VendorName (if linked) or ⬜ TaskName — подрядчик не указан. Then suggest next steps.

TEMPLATE WORKFLOW (strict — applying a template the user confirmed):
1. `query` MUST be a single keyword (1–2 words) — only the event TYPE. Strip dates, numbers, months. 'Митап в июле' → query='митап'. If unsure, omit to list ALL templates.
2. If multiple matches → list them (name, task count, estimated budget) and ask which one.
3. Check if you already have the event name and event_date from the user's message.
   - If BOTH are known → call create_event_from_template immediately, no extra confirmation turn needed.
   - If name or date is MISSING → ask only for what's missing, then proceed.
4. When the user confirms ("да", "применяй", "используем") — call create_event_from_template DIRECTLY.
   ⚠️ CRITICAL: create_event_from_template already creates the project internally.
   ⚠️ NEVER call create_project at any point in this flow — it creates a duplicate and breaks everything.
   ⚠️ The ONLY tool call when applying a template is create_event_from_template. Nothing before it.
5. If user declines the template ("нет", "с нуля", "без шаблона") → call create_project with the name/date already given. Do NOT call list_templates again.
6. After create_event_from_template succeeds: use the `tasks` array in the result to report a task-by-task summary.
   Format: one line per task — ✅ TaskName — VendorName (if vendor present) or ⬜ TaskName — подрядчик не указан.
   Then suggest next steps: add missing vendors, add new tasks, adjust budget.
- For save_project_as_template: call list_projects first to get project_id, then ask for template name and category if not provided.

VENDOR PRESENTATION RULES:
- When showing vendors from list_vendors: for each vendor show name, price range, rating, and a ONE-SENTENCE summary from their `notes` field (if non-empty). Keep it natural.
  Example: «Иван Петров — 40–60 тыс. ₽, рейтинг 5★. Специализируется на корпоративах, сдаёт фото за 5 дней.»
- If notes is empty — omit the description line.
- If no vendors found for a category: say so clearly and ask if the user wants to add one.
  - If the user already provided name + category (+ optionally price/phone) in the same message → call create_vendor immediately with the given data. Do NOT ask again.
  - If vendor details are missing → ask for them before calling create_vendor. Do NOT invent data.
- When user asks to "add a task AND find/add a vendor" in one message:
  Call create_issue ONCE (task creation), then call list_vendors for the matching category.
  ⚠️ NEVER call create_issue twice for the same task in one turn — even if multiple rules seem to apply.
  If vendor found → propose linking with link_vendor_to_issue.
  If not found and user gave vendor details → call create_vendor then link_vendor_to_issue.
  If not found and no details given → say so and ask."""


def _build_system_prompt() -> str:
    today = date.today()
    date_str = today.strftime("%d %B %Y")  # e.g. "24 June 2026"
    # Day-of-week in Russian for natural responses
    days_ru = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"]
    day_ru = days_ru[today.weekday()]
    return f"Сегодня {day_ru}, {today.strftime('%d.%m.%Y')}. Use this as the reference date for all deadline calculations.\n\n" + _SYSTEM_PROMPT_TEMPLATE


class AIChatEndpoint(BaseAPIView):
    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def post(self, request, slug):
        api_key, provider_key, model = get_configuration_value(
            [
                {"key": "LLM_API_KEY", "default": os.environ.get("LLM_API_KEY")},
                {"key": "LLM_PROVIDER", "default": os.environ.get("LLM_PROVIDER", "openai")},
                {"key": "LLM_MODEL", "default": os.environ.get("LLM_MODEL")},
            ]
        )

        if not api_key or provider_key.lower() not in ("anthropic", "gigachat"):
            return Response(
                {"error": "AI chat requires Anthropic or GigaChat provider to be configured"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        messages = request.data.get("messages", [])
        if not messages:
            return Response({"error": "messages are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            actions = []
            system_prompt = _build_system_prompt()

            if provider_key.lower() == "anthropic":
                import httpx

                base_url = os.environ.get("ANTHROPIC_BASE_URL")
                client = anthropic.Anthropic(
                    api_key=api_key,
                    base_url=base_url,
                    http_client=httpx.Client(verify=False),
                )

                tools = get_tools_schema()

                response = client.messages.create(
                    model=model,
                    max_tokens=2048,
                    system=system_prompt,
                    tools=tools,
                    messages=messages,
                )

                while response.stop_reason == "tool_use":
                    tool_results = []
                    for block in response.content:
                        if block.type == "tool_use":
                            result = execute_tool(block.name, block.input, slug, request.user)
                            actions.append({"tool": block.name, "result": _summarize(block.name, result)})
                            tool_results.append({
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "content": str(result),
                            })

                    messages = [
                        *messages,
                        {"role": "assistant", "content": _serialize_anthropic_blocks(response.content)},
                        {"role": "user", "content": tool_results},
                    ]

                    response = client.messages.create(
                        model=model,
                        max_tokens=2048,
                        system=system_prompt,
                        tools=tools,
                        messages=messages,
                    )

                final_text = next(
                    (block.text for block in response.content if hasattr(block, "text")), ""
                )

                # Append the final assistant turn so the client can replay it next request.
                messages = [
                    *messages,
                    {"role": "assistant", "content": _serialize_anthropic_blocks(response.content)},
                ]

            else:  # gigachat
                tools = get_tools_schema_openai()
                # Convert tools to GigaChat Function objects
                gc_functions = [
                    Function(
                        name=t["function"]["name"],
                        description=t["function"]["description"],
                        parameters=FunctionParameters(**t["function"]["parameters"]),
                    )
                    for t in tools
                ]

                # Build initial GigaChat messages from incoming history (system prompt prepended).
                gc_messages = [Messages(role=MessagesRole.SYSTEM, content=system_prompt)]
                for m in messages:
                    gc_messages.append(_deserialize_gigachat_message(m))

                with GigaChat(credentials=api_key, model=model, verify_ssl_certs=False) as client:
                    response = client.chat(Chat(messages=gc_messages, functions=gc_functions))

                    # Agentic loop
                    while response.choices[0].finish_reason == "function_call":
                        fn_call = response.choices[0].message.function_call
                        tool_args = json.loads(fn_call.arguments) if isinstance(fn_call.arguments, str) else fn_call.arguments
                        result = execute_tool(fn_call.name, tool_args, slug, request.user)
                        actions.append({"tool": fn_call.name, "result": _summarize(fn_call.name, result)})

                        gc_messages.append(response.choices[0].message)
                        gc_messages.append(
                            Messages(
                                role=MessagesRole.FUNCTION,
                                content=json.dumps(result, ensure_ascii=False),
                                name=fn_call.name,
                            )
                        )

                        response = client.chat(Chat(messages=gc_messages, functions=gc_functions))

                    gc_messages.append(response.choices[0].message)

                final_text = response.choices[0].message.content
                # Drop the system message before returning — frontend re-attaches none, backend re-adds it.
                messages = [_serialize_gigachat_message(m) for m in gc_messages[1:]]

            return Response(
                {"response": final_text, "actions": actions, "messages": messages},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            log_exception(e)
            return Response(
                {"error": "An error occurred while processing your request"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


def _serialize_anthropic_blocks(content):
    """Convert Anthropic SDK content blocks (pydantic models) to JSON-safe dicts."""
    out = []
    for block in content:
        if hasattr(block, "model_dump"):
            out.append(block.model_dump(exclude_none=True))
        elif isinstance(block, dict):
            out.append(block)
    return out


def _serialize_gigachat_message(msg) -> dict:
    """Convert a GigaChat Messages object to a JSON-safe dict.

    Falls back to attribute access if the object is not pydantic.
    """
    if hasattr(msg, "model_dump"):
        return msg.model_dump(exclude_none=True)
    if hasattr(msg, "dict"):
        return msg.dict(exclude_none=True)
    if isinstance(msg, dict):
        return msg
    return {
        "role": getattr(msg, "role", None),
        "content": getattr(msg, "content", ""),
        "name": getattr(msg, "name", None),
        "function_call": getattr(msg, "function_call", None),
    }


def _deserialize_gigachat_message(data: dict):
    """Rebuild a GigaChat Messages object from a dict produced by _serialize_gigachat_message."""
    role_str = (data.get("role") or "user").lower()
    role_map = {
        "user": MessagesRole.USER,
        "assistant": MessagesRole.ASSISTANT,
        "system": MessagesRole.SYSTEM,
        "function": MessagesRole.FUNCTION,
    }
    kwargs = {
        "role": role_map.get(role_str, MessagesRole.USER),
        "content": data.get("content") or "",
    }
    if data.get("name"):
        kwargs["name"] = data["name"]
    if data.get("function_call"):
        kwargs["function_call"] = data["function_call"]
    return Messages(**kwargs)


def _summarize(tool_name: str, result: dict) -> str:
    if "error" in result:
        return f"Error: {result['error']}"
    if "message" in result:
        return result["message"]
    if "issues" in result:
        return f"Found {len(result['issues'])} issues"
    if "projects" in result:
        return f"Found {len(result['projects'])} projects"
    if "templates" in result:
        return f"Found {len(result['templates'])} templates"
    if "vendors" in result:
        return f"Found {len(result['vendors'])} vendors"
    return "Done"
