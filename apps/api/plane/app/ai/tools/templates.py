import re

from django.db import transaction

from plane.app.ai.tools.registry import register_tool
from plane.db.models import (
    Issue,
    IssueLabel,
    IssueLink,
    IssueVendor,
    Label,
    Project,
    ProjectMember,
    ProjectTemplate,
    State,
    TemplateLabel,
    TemplateState,
    TemplateTask,
    TemplateTaskLink,
    TemplateTaskVendor,
    Workspace,
)


def _generate_identifier(name: str) -> str:
    clean = re.sub(r"[^A-Za-z0-9]", "", name).upper()
    return clean[:12] if clean else "PROJ"


def _emoji_to_logo_props(emoji):
    if not emoji:
        return {}
    decimal_value = "-".join(str(ord(c)) for c in emoji)
    return {"in_use": "emoji", "emoji": {"value": decimal_value}}


@register_tool(
    name="list_templates",
    description=(
        "Список ШАБЛОНОВ мероприятий. Используй ТОЛЬКО когда пользователь явно говорит про «шаблон/template» "
        "или просит «создать мероприятие из шаблона». "
        "НЕ вызывай для поиска подрядчиков (для этого list_vendors) и не для списка проектов (list_projects). "
        "ALWAYS call this BEFORE create_event_from_template — never guess a template_id. "
        "GUIDELINES for `query`: "
        "(1) Pass a SHORT KEYWORD only (1–2 words), the topic the user mentioned. "
        "Examples: user says 'митап для июля' → query='митап'. "
        "User says 'корпоратив на декабрь' → query='корпоратив'. "
        "User says 'хочу провести Митап 3' → query='митап' (NOT 'митап 3' — the number is meaningless to search). "
        "(2) Strip dates, numbers, months, generic words. Only the event type/topic keyword. "
        "(3) If no keyword is clear, call with NO arguments to get ALL templates. "
        "If results are empty, tell the user no matching templates exist and offer a regular project."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": (
                    "Single-keyword filter (1–2 words). Searches case-insensitively across name, description, and category. "
                    "Strip numbers and dates. Omit this param to list all templates."
                ),
            },
        },
        "required": [],
    },
)
def list_templates(
    workspace_slug: str,
    user,
    query: str | None = None,
    **kwargs,
) -> dict:
    from django.db.models import Q

    qs = ProjectTemplate.objects.filter(workspace__slug=workspace_slug).prefetch_related("tasks")

    # OR-фильтр по словам: каждое слово ищется в name / description / category.
    # Шаблон попадает в выборку, если ХОТЬ ОДНО слово нашлось хоть в одном поле.
    if query:
        terms = [t for t in query.strip().lower().split() if t]
        if terms:
            qf = Q()
            for term in terms:
                qf |= Q(name__icontains=term) | Q(description__icontains=term) | Q(category__icontains=term)
            qs = qs.filter(qf)

    templates = []
    for t in qs.order_by("-usage_count", "name"):
        task_list = list(t.tasks.order_by("sequence"))
        total_cost = sum(
            float(task.estimated_cost) for task in task_list if task.estimated_cost
        )
        templates.append({
            "id": str(t.id),
            "name": t.name,
            "description": t.description or "",
            "category": t.category,
            "emoji": t.emoji or "",
            "task_count": len(task_list),
            "tasks": [
                {
                    "title": task.title,
                    "estimated_cost": float(task.estimated_cost) if task.estimated_cost else None,
                }
                for task in task_list
            ],
            "estimated_budget": total_cost if total_cost > 0 else None,
            "usage_count": t.usage_count,
        })

    return {"templates": templates, "count": len(templates)}


@register_tool(
    name="create_event_from_template",
    description=(
        "Create a new project (event) from a template. "
        "Applies the template's statuses, labels, and tasks to the new project. "
        "STRICT RULES: "
        "(1) NEVER call this without calling list_templates first in the same conversation — the template_id MUST come from list_templates output. "
        "(2) NEVER fabricate or guess a UUID. "
        "(3) If list_templates returned no matches, tell the user and stop — do NOT attempt this tool."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "template_id": {
                "type": "string",
                "description": "Template UUID returned by list_templates. Do not invent.",
            },
            "name": {
                "type": "string",
                "description": "Name of the new event/project",
            },
            "event_date": {
                "type": "string",
                "description": "Event date in YYYY-MM-DD format",
            },
            "budget_total": {
                "type": "number",
                "description": "Total budget in rubles (optional, defaults to sum of task estimated costs)",
            },
        },
        "required": ["template_id", "name", "event_date"],
    },
)
@transaction.atomic
def create_event_from_template(
    workspace_slug: str,
    user,
    template_id: str,
    name: str,
    event_date: str,
    budget_total: float | None = None,
    **kwargs,
) -> dict:
    from django.core.exceptions import ValidationError
    from django.db import DataError

    workspace = Workspace.objects.get(slug=workspace_slug)
    try:
        template = ProjectTemplate.objects.prefetch_related(
            "states", "labels", "tasks", "tasks__vendors", "tasks__vendors__vendor", "tasks__links"
        ).get(
            pk=template_id, workspace=workspace
        )
    except (ProjectTemplate.DoesNotExist, ValueError, ValidationError, DataError):
        return {
            "error": (
                f"Template with id '{template_id}' not found in this workspace. "
                "Call list_templates first to get a valid template_id."
            )
        }

    identifier = _generate_identifier(name)
    base = identifier
    suffix = 1
    while Project.objects.filter(workspace=workspace, identifier=identifier).exists():
        identifier = f"{base[:10]}{suffix}"
        suffix += 1

    # Compute budget from template tasks if not provided
    if budget_total is None:
        budget_total = sum(
            float(t.estimated_cost) for t in template.tasks.all() if t.estimated_cost
        ) or None

    project = Project.objects.create(
        workspace=workspace,
        name=name,
        identifier=identifier,
        event_date=event_date,
        budget_total=budget_total,
        cover_image=template.cover_image_url,
        emoji=template.emoji,
        logo_props=_emoji_to_logo_props(template.emoji),
        network=0,
    )

    ProjectMember.objects.create(
        project=project,
        workspace=workspace,
        member=user,
        role=20,
    )

    State.objects.filter(project=project).delete()

    template_states = list(template.states.order_by("sequence"))
    states = State.objects.bulk_create(
        [
            State(
                project=project,
                workspace=workspace,
                name=s.name,
                color=s.color,
                group=s.group,
                sequence=s.sequence,
                default=s.is_default,
            )
            for s in template_states
        ]
    )
    default_state = next((s for s in states if s.default), states[0] if states else None)

    label_map = {}
    for tl in template.labels.all():
        label = Label.objects.create(
            project=project, workspace=workspace, name=tl.name, color=tl.color
        )
        label_map[tl.name] = label

    tasks = list(template.tasks.order_by("sequence"))
    issues = Issue.objects.bulk_create(
        [
            Issue(
                project=project,
                workspace=workspace,
                name=t.title,
                description_html=f"<p>{t.description}</p>" if t.description else "<p></p>",
                priority=t.priority,
                state=default_state,
                sequence_id=i + 1,
                sort_order=t.sequence,
                budget_estimated=t.estimated_cost,
            )
            for i, t in enumerate(tasks)
        ]
    )

    issue_labels = []
    for issue, task in zip(issues, tasks):
        if task.label_name and task.label_name in label_map:
            issue_labels.append(
                IssueLabel(
                    issue=issue,
                    label=label_map[task.label_name],
                    project=project,
                    workspace=workspace,
                )
            )
    if issue_labels:
        IssueLabel.objects.bulk_create(issue_labels, batch_size=50)

    # Restore vendor links and URL links saved in the template
    issue_vendors = []
    issue_links = []
    # Pre-fetch vendor links per task to build the summary
    task_vendor_names: dict[int, list[str]] = {}
    for idx, (issue, task) in enumerate(zip(issues, tasks)):
        names = []
        for tt_vendor in task.vendors.all():
            if tt_vendor.vendor_id:
                issue_vendors.append(
                    IssueVendor(issue=issue, vendor_id=tt_vendor.vendor_id, project=project, workspace=workspace)
                )
                names.append(tt_vendor.vendor.name if tt_vendor.vendor else (tt_vendor.vendor_name or ""))
        task_vendor_names[idx] = names
        for tt_link in task.links.all():
            issue_links.append(
                IssueLink(issue=issue, url=tt_link.url, title=tt_link.title, project=project, workspace=workspace)
            )
    if issue_vendors:
        IssueVendor.objects.bulk_create(issue_vendors, batch_size=50)
    if issue_links:
        IssueLink.objects.bulk_create(issue_links, batch_size=50)

    ProjectTemplate.objects.filter(pk=template_id).update(usage_count=template.usage_count + 1)

    # Full task list with issue IDs and vendor status — lets the AI report the summary
    task_summaries = [
        {
            "id": str(issue.id),
            "title": task.title,
            "vendors": task_vendor_names.get(idx, []),
        }
        for idx, (issue, task) in enumerate(zip(issues, tasks))
    ]

    return {
        "project_id": str(project.id),
        "project_name": project.name,
        "identifier": project.identifier,
        "tasks": task_summaries,
        "tasks_created": len(issues),
        "vendor_links_restored": sum(1 for names in task_vendor_names.values() if names),
        "message": f"Мероприятие '{name}' успешно создано из шаблона '{template.name}' ({len(issues)} задач)",
    }


@register_tool(
    name="save_project_as_template",
    description=(
        "Save an existing project as a reusable template. "
        "Copies the project's statuses, labels, and tasks (without personal data) into a new template."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "project_id": {
                "type": "string",
                "description": "Project UUID (use list_projects to get it)",
            },
            "template_name": {
                "type": "string",
                "description": "Name for the new template",
            },
            "category": {
                "type": "string",
                "description": "Template category (free text, e.g. 'Корпоратив', 'Конференция')",
            },
            "description": {
                "type": "string",
                "description": "Optional description of the template",
            },
        },
        "required": ["project_id", "template_name"],
    },
)
@transaction.atomic
def save_project_as_template(
    workspace_slug: str,
    user,
    project_id: str,
    template_name: str,
    category: str = "other",
    description: str = "",
    **kwargs,
) -> dict:
    project = Project.objects.get(pk=project_id, workspace__slug=workspace_slug)
    workspace = project.workspace

    template = ProjectTemplate.objects.create(
        workspace=workspace,
        name=template_name,
        category=category,
        description=description,
        cover_image_url=project.cover_image_url,
    )

    project_states = State.objects.filter(project=project)
    TemplateState.objects.bulk_create(
        [
            TemplateState(
                template=template,
                name=s.name,
                color=s.color,
                group=s.group,
                sequence=s.sequence,
                is_default=s.default,
            )
            for s in project_states
        ],
        batch_size=50,
    )

    labels = Label.objects.filter(project=project)
    TemplateLabel.objects.bulk_create(
        [
            TemplateLabel(template=template, name=lb.name, color=lb.color)
            for lb in labels
        ],
        batch_size=50,
    )

    issues = list(
        Issue.objects.filter(project=project, parent__isnull=True).order_by("sort_order")
    )
    created_tasks = TemplateTask.objects.bulk_create(
        [
            TemplateTask(
                template=template,
                title=issue.name,
                description=issue.description_stripped or "",
                priority=issue.priority,
                sequence=issue.sort_order,
                estimated_cost=issue.budget_estimated,
            )
            for issue in issues
        ],
        batch_size=50,
    )

    # Capture vendor links and URL links for each task
    tt_vendors = []
    tt_links = []
    for task, issue in zip(created_tasks, issues):
        for iv in IssueVendor.objects.filter(issue=issue).select_related("vendor"):
            tt_vendors.append(
                TemplateTaskVendor(
                    template_task=task,
                    vendor=iv.vendor,
                    vendor_name=iv.vendor.name if iv.vendor else None,
                )
            )
        for il in IssueLink.objects.filter(issue=issue):
            tt_links.append(TemplateTaskLink(template_task=task, title=il.title, url=il.url))
    if tt_vendors:
        TemplateTaskVendor.objects.bulk_create(tt_vendors, batch_size=50)
    if tt_links:
        TemplateTaskLink.objects.bulk_create(tt_links, batch_size=50)

    return {
        "template_id": str(template.id),
        "template_name": template.name,
        "message": f"Шаблон '{template_name}' успешно создан из проекта '{project.name}'",
    }
