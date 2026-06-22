import os
import json
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

SYSTEM_PROMPT = """You are an AI assistant for a project management tool.
You help users manage their projects, tasks, and event templates through natural language.
When the user asks to create, update, or list tasks/projects/templates — use the available tools.
Always respond in the same language the user writes in.
Be concise and helpful.

IMPORTANT RULES:
- Never guess or invent IDs. All IDs (project_id, issue_id, template_id) are UUIDs.
- Previous tool calls in this conversation are available in the message history — reuse IDs from earlier tool_result blocks instead of re-listing.
- Before operating on a project/issue/template you have not seen this conversation: call the matching list_* tool first.
- If the user says "the first task", "that issue", "it" — find it in earlier tool_result blocks or call list_issues.
- If the user mentions a date or deadline, always pass due_date to create_issue or update_issue.

TEMPLATE WORKFLOW (strict):
- When the user wants to find or create from a template:
  1. If no list_templates result is in the recent history, call list_templates FIRST.
  2. The `query` parameter MUST be a single keyword (1–2 words) — only the event TYPE (e.g. 'митап', 'корпоратив'). NEVER include dates, numbers, months, or generic words like 'для', 'на'. If the user says 'Митап 3' or 'митап в июле' → query='митап'. If unsure, omit the parameter to list ALL templates.
  3. If results are empty → tell the user and offer a regular project (without a template). Do NOT proceed to create_event_from_template.
  4. If multiple matches → list them (name, task count, estimated budget) and ask which one.
  5. Confirm event name and event_date with the user (ask if not provided).
  6. Only AFTER user confirmation — call create_event_from_template with the EXACT template_id from a list_templates tool_result. NEVER invent a UUID. NEVER pass a project_id as template_id.
- For save_project_as_template: call list_projects first to get project_id, then ask for template name and category if not provided."""


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
                    system=SYSTEM_PROMPT,
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
                        system=SYSTEM_PROMPT,
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
                gc_messages = [Messages(role=MessagesRole.SYSTEM, content=SYSTEM_PROMPT)]
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
    return "Done"
