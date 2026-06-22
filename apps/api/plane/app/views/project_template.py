import re
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from plane.app.permissions import WorkspaceEntityPermission
from plane.app.serializers import (
    ProjectTemplateSerializer,
    ProjectTemplateWriteSerializer,
)
from plane.db.models import (
    Issue,
    Label,
    Project,
    ProjectMember,
    ProjectTemplate,
    State,
    TemplateLabel,
    TemplateState,
    TemplateTask,
    Workspace,
)
from plane.db.models.state import DEFAULT_STATES, StateGroup

from .base import BaseViewSet


def _generate_identifier(name):
    """Генерирует identifier проекта из названия (до 12 символов, только буквы/цифры)."""
    clean = re.sub(r"[^A-Za-z0-9]", "", name).upper()
    return clean[:12] if clean else "PROJ"


def _emoji_to_logo_props(emoji):
    """Конвертирует unicode-эмоджи в logo_props проекта.

    Совместимо с фронтовым emojiToString: код каждого code point джоинится через '-'.
    """
    if not emoji:
        return {}
    decimal_value = "-".join(str(ord(c)) for c in emoji)
    return {"in_use": "emoji", "emoji": {"value": decimal_value}}


class ProjectTemplateViewSet(BaseViewSet):
    permission_classes = [WorkspaceEntityPermission]
    serializer_class = ProjectTemplateSerializer
    model = ProjectTemplate

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(workspace__slug=self.kwargs.get("slug"))
            .prefetch_related("states", "labels", "tasks")
            .order_by("-created_at")
        )

    def list(self, request, slug):
        templates = self.get_queryset()
        serializer = ProjectTemplateSerializer(templates, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request, slug):
        workspace = Workspace.objects.get(slug=slug)
        serializer = ProjectTemplateWriteSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(workspace=workspace)
            return Response(
                ProjectTemplateSerializer(serializer.instance).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, slug, pk):
        template = self.get_queryset().get(pk=pk)
        return Response(ProjectTemplateSerializer(template).data)

    def partial_update(self, request, slug, pk):
        template = self.get_queryset().get(pk=pk)
        serializer = ProjectTemplateWriteSerializer(template, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(
                ProjectTemplateSerializer(serializer.instance).data,
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, slug, pk):
        template = self.get_queryset().get(pk=pk)
        template.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="apply")
    @transaction.atomic
    def apply(self, request, slug, pk):
        """Создаёт проект из шаблона."""
        name = request.data.get("name", "").strip()
        event_date = request.data.get("event_date")
        budget_total = request.data.get("budget_total")
        logo_props = request.data.get("logo_props")

        if not name:
            return Response({"error": "name is required"}, status=status.HTTP_400_BAD_REQUEST)
        if not event_date:
            return Response({"error": "event_date is required"}, status=status.HTTP_400_BAD_REQUEST)

        template = self.get_queryset().get(pk=pk)
        workspace = Workspace.objects.get(slug=slug)

        # Создаём проект
        identifier = _generate_identifier(name)
        # Если identifier уже занят — добавляем суффикс
        base = identifier
        suffix = 1
        while Project.objects.filter(workspace=workspace, identifier=identifier).exists():
            identifier = f"{base[:10]}{suffix}"
            suffix += 1

        # Используем logo_props из запроса (выбор пользователя) или fallback на emoji шаблона
        resolved_logo_props = logo_props if logo_props else _emoji_to_logo_props(template.emoji)

        project = Project.objects.create(
            workspace=workspace,
            name=name,
            identifier=identifier,
            event_date=event_date,
            budget_total=budget_total if budget_total is not None else _sum_estimated_cost(template),
            cover_image=template.cover_image_url,
            emoji=template.emoji,
            logo_props=resolved_logo_props,
            network=0,
        )

        # Добавляем создателя как admin
        ProjectMember.objects.create(
            project=project,
            workspace=workspace,
            member=request.user,
            role=20,
        )

        # Удаляем дефолтные статусы, созданные сигналом/при создании
        State.objects.filter(project=project).delete()

        # Создаём статусы из шаблона
        template_states = list(template.states.order_by("sequence"))
        if template_states:
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
        else:
            states = State.objects.bulk_create(
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

        # Дефолтный статус для задач
        default_state = next((s for s in states if s.default), states[0] if states else None)

        # Создаём метки из шаблона
        label_map = {}  # name → Label instance
        for tl in template.labels.all():
            label = Label.objects.create(
                project=project,
                workspace=workspace,
                name=tl.name,
                color=tl.color,
            )
            label_map[tl.name] = label

        # Создаём задачи из шаблона
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

        # Привязываем метки к задачам
        from plane.db.models import IssueLabel

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

        # Инкрементируем счётчик
        ProjectTemplate.objects.filter(pk=pk).update(usage_count=template.usage_count + 1)

        return Response(
            {"project_id": str(project.id), "project_identifier": project.identifier},
            status=status.HTTP_201_CREATED,
        )


def _sum_estimated_cost(template):
    from django.db.models import Sum

    result = template.tasks.aggregate(total=Sum("estimated_cost"))["total"]
    return result


class SaveProjectAsTemplateEndpoint(BaseViewSet):
    """POST /workspaces/{slug}/projects/{project_id}/save-as-template/"""

    permission_classes = [WorkspaceEntityPermission]
    model = Project

    @transaction.atomic
    def create(self, request, slug, project_id):
        name = request.data.get("name", "").strip()
        category = request.data.get("category", "other")

        if not name:
            return Response({"error": "name is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            project = Project.objects.get(pk=project_id, workspace__slug=slug)
        except Project.DoesNotExist:
            return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

        workspace = project.workspace

        template = ProjectTemplate.objects.create(
            workspace=workspace,
            name=name,
            category=category,
            description=request.data.get("description", ""),
            emoji=request.data.get("emoji"),
            cover_image_url=project.cover_image_url,
        )

        # Копируем статусы
        states = State.objects.filter(project=project)
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
                for s in states
            ],
            batch_size=50,
        )

        # Копируем метки
        labels = Label.objects.filter(project=project)
        TemplateLabel.objects.bulk_create(
            [
                TemplateLabel(
                    template=template,
                    name=lb.name,
                    color=lb.color,
                )
                for lb in labels
            ],
            batch_size=50,
        )

        # Копируем задачи (без личных данных)
        issues = Issue.objects.filter(
            project=project,
            parent__isnull=True,
        ).order_by("sort_order")

        TemplateTask.objects.bulk_create(
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

        return Response(
            ProjectTemplateSerializer(template).data,
            status=status.HTTP_201_CREATED,
        )
