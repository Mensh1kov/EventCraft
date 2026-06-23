import re

from django.db import transaction

from plane.app.ai.tools.registry import register_tool
from plane.db.models import Project, ProjectMember, State, Workspace
from plane.db.models.state import DEFAULT_STATES, StateGroup


def _generate_identifier(name: str) -> str:
    clean = re.sub(r"[^A-Za-z0-9]", "", name).upper()
    return clean[:12] if clean else "PROJ"


@register_tool(
    name="list_projects",
    description="List all projects (events) in the workspace. Call this first to get project IDs before working with issues.",
    input_schema={
        "type": "object",
        "properties": {},
        "required": [],
    },
)
def list_projects(workspace_slug: str, user, **kwargs) -> dict:
    projects = Project.objects.filter(
        workspace__slug=workspace_slug,
        project_projectmember__member=user,
        project_projectmember__is_active=True,
    ).values("id", "name", "description", "identifier", "event_date", "budget_total")

    return {
        "projects": [
            {
                "id": str(p["id"]),
                "name": p["name"],
                "identifier": p["identifier"],
                "description": p["description"] or "",
                "event_date": str(p["event_date"]) if p["event_date"] else None,
                "budget_total": str(p["budget_total"]) if p["budget_total"] is not None else None,
            }
            for p in projects
        ]
    }


@register_tool(
    name="create_project",
    description=(
        "Создать новый ПРОЕКТ / МЕРОПРИЯТИЕ с нуля, когда шаблон НЕ используется. "
        "⚠️ ЗАПРЕЩЕНО вызывать этот инструмент если пользователь согласился использовать шаблон — "
        "в этом случае вызывай create_event_from_template, который уже создаёт проект внутри себя. "
        "Вызов create_project перед create_event_from_template создаёт дубликат и ломает сценарий. "
        "Используй ТОЛЬКО когда: шаблон не найден, пользователь явно отказался от шаблона, "
        "или пользователь сказал «без шаблона» / «с нуля» / «пустой проект». "
        "Если пользователь просит завести ПОДРЯДЧИКА — используй create_vendor, не этот инструмент."
    ),
    input_schema={
        "type": "object",
        "properties": {
            "name": {"type": "string", "description": "Event / project name, e.g. 'День рождения Анны'"},
            "description": {"type": "string", "description": "Optional short description"},
            "event_date": {"type": "string", "description": "Event date in YYYY-MM-DD format (ask the user if not given)"},
            "budget_total": {"type": "number", "description": "Total budget in rubles. If the user mentioned any number next to 'бюджет' or 'budget', pass it here. Do not skip."},
            "emoji": {"type": "string", "description": "Single emoji for the project icon. Pick by type: 🎉 корпоратив, 🎄 новогодний, 🎂 день рождения, 🎤 конференция, 🏃 тимбилдинг, 📋 митап, 💍 свадьба, 🎓 выпускной."},
        },
        "required": ["name"],
    },
)
@transaction.atomic
def create_project(
    workspace_slug: str,
    user,
    name: str,
    description: str = "",
    event_date: str | None = None,
    budget_total: float | None = None,
    emoji: str | None = None,
    **kwargs,
) -> dict:
    workspace = Workspace.objects.get(slug=workspace_slug)

    identifier = _generate_identifier(name)
    base = identifier
    suffix = 1
    while Project.objects.filter(workspace=workspace, identifier=identifier).exists():
        identifier = f"{base[:10]}{suffix}"
        suffix += 1

    logo_props = {}
    if emoji:
        decimal_value = "-".join(str(ord(c)) for c in emoji)
        logo_props = {"in_use": "emoji", "emoji": {"value": decimal_value}}

    project = Project.objects.create(
        workspace=workspace,
        name=name,
        identifier=identifier,
        description=description or "",
        event_date=event_date,
        budget_total=budget_total,
        emoji=emoji,
        logo_props=logo_props,
        network=0,
    )

    ProjectMember.objects.create(project=project, workspace=workspace, member=user, role=20)

    # Default statuses (skip triage)
    State.objects.bulk_create(
        [
            State(
                project=project,
                workspace=workspace,
                name=s["name"],
                color=s["color"],
                group=s["group"],
                sequence=s["sequence"],
                default=s.get("default", False),
            )
            for s in DEFAULT_STATES
            if s["group"] != StateGroup.TRIAGE.value
        ]
    )

    return {
        "project_id": str(project.id),
        "name": project.name,
        "identifier": project.identifier,
        "event_date": str(project.event_date) if project.event_date else None,
        "budget_total": str(project.budget_total) if project.budget_total is not None else None,
        "message": f"Мероприятие '{name}' создано",
    }


@register_tool(
    name="update_project",
    description="Update an existing project (event): its name, description, event date or total budget.",
    input_schema={
        "type": "object",
        "properties": {
            "project_id": {"type": "string", "description": "Project UUID (use list_projects to get it)"},
            "name": {"type": "string"},
            "description": {"type": "string"},
            "event_date": {"type": "string", "description": "YYYY-MM-DD"},
            "budget_total": {"type": "number", "description": "Total budget in rubles"},
        },
        "required": ["project_id"],
    },
)
def update_project(
    workspace_slug: str,
    user,
    project_id: str,
    name: str | None = None,
    description: str | None = None,
    event_date: str | None = None,
    budget_total: float | None = None,
    **kwargs,
) -> dict:
    project = Project.objects.get(id=project_id, workspace__slug=workspace_slug)
    if name is not None:
        project.name = name
    if description is not None:
        project.description = description
    if event_date is not None:
        project.event_date = event_date
    if budget_total is not None:
        project.budget_total = budget_total
    project.save()
    return {
        "project_id": str(project.id),
        "name": project.name,
        "message": f"Проект '{project.name}' обновлён",
    }
