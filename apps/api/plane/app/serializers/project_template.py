from .base import BaseSerializer
from plane.db.models import ProjectTemplate, TemplateState, TemplateLabel, TemplateTask


class TemplateStateSerializer(BaseSerializer):
    class Meta:
        model = TemplateState
        fields = ["id", "name", "color", "group", "sequence", "is_default"]


class TemplateLabelSerializer(BaseSerializer):
    class Meta:
        model = TemplateLabel
        fields = ["id", "name", "color"]


class TemplateTaskSerializer(BaseSerializer):
    class Meta:
        model = TemplateTask
        fields = ["id", "title", "description", "priority", "label_name", "sequence", "estimated_cost"]


class ProjectTemplateSerializer(BaseSerializer):
    states = TemplateStateSerializer(many=True, read_only=True)
    labels = TemplateLabelSerializer(many=True, read_only=True)
    tasks = TemplateTaskSerializer(many=True, read_only=True)

    class Meta:
        model = ProjectTemplate
        fields = [
            "id",
            "name",
            "description",
            "emoji",
            "category",
            "cover_image_url",
            "usage_count",
            "states",
            "labels",
            "tasks",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["usage_count", "created_at", "updated_at"]


class ProjectTemplateWriteSerializer(BaseSerializer):
    """Используется для create/update — принимает вложенные объекты как списки."""

    states = TemplateStateSerializer(many=True, required=False)
    labels = TemplateLabelSerializer(many=True, required=False)
    tasks = TemplateTaskSerializer(many=True, required=False)

    class Meta:
        model = ProjectTemplate
        fields = ["name", "description", "emoji", "category", "cover_image_url", "states", "labels", "tasks"]

    def _save_nested(self, template, states_data, labels_data, tasks_data):
        if states_data is not None:
            template.states.all().delete()
            TemplateState.objects.bulk_create(
                [TemplateState(template=template, **s) for s in states_data],
                batch_size=50,
            )
        if labels_data is not None:
            template.labels.all().delete()
            TemplateLabel.objects.bulk_create(
                [TemplateLabel(template=template, **l) for l in labels_data],
                batch_size=50,
            )
        if tasks_data is not None:
            template.tasks.all().delete()
            TemplateTask.objects.bulk_create(
                [TemplateTask(template=template, **t) for t in tasks_data],
                batch_size=50,
            )

    def create(self, validated_data):
        states_data = validated_data.pop("states", None)
        labels_data = validated_data.pop("labels", None)
        tasks_data = validated_data.pop("tasks", None)
        template = ProjectTemplate.objects.create(**validated_data)
        self._save_nested(template, states_data, labels_data, tasks_data)
        return template

    def update(self, instance, validated_data):
        states_data = validated_data.pop("states", None)
        labels_data = validated_data.pop("labels", None)
        tasks_data = validated_data.pop("tasks", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        self._save_nested(instance, states_data, labels_data, tasks_data)
        return instance
