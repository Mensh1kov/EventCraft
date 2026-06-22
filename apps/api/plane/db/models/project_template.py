import uuid
from django.db import models
from .base import BaseModel


class ProjectTemplate(BaseModel):
    workspace = models.ForeignKey(
        "db.Workspace",
        on_delete=models.CASCADE,
        related_name="project_templates",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    emoji = models.CharField(max_length=255, null=True, blank=True)
    category = models.CharField(max_length=100, default="other")
    cover_image_url = models.TextField(null=True, blank=True)
    usage_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "project_templates"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class TemplateState(BaseModel):
    GROUP_CHOICES = [
        ("backlog", "Backlog"),
        ("unstarted", "Unstarted"),
        ("started", "Started"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    template = models.ForeignKey(
        ProjectTemplate,
        on_delete=models.CASCADE,
        related_name="states",
    )
    name = models.CharField(max_length=255)
    color = models.CharField(max_length=255)
    group = models.CharField(max_length=20, choices=GROUP_CHOICES, default="backlog")
    sequence = models.FloatField(default=65536)
    is_default = models.BooleanField(default=False)

    class Meta:
        db_table = "template_states"
        ordering = ["sequence"]

    def __str__(self):
        return f"{self.template.name} / {self.name}"


class TemplateLabel(BaseModel):
    template = models.ForeignKey(
        ProjectTemplate,
        on_delete=models.CASCADE,
        related_name="labels",
    )
    name = models.CharField(max_length=255)
    color = models.CharField(max_length=255)

    class Meta:
        db_table = "template_labels"
        ordering = ["name"]

    def __str__(self):
        return f"{self.template.name} / {self.name}"


class TemplateTask(BaseModel):
    PRIORITY_CHOICES = [
        ("urgent", "Urgent"),
        ("high", "High"),
        ("medium", "Medium"),
        ("low", "Low"),
        ("none", "None"),
    ]

    template = models.ForeignKey(
        ProjectTemplate,
        on_delete=models.CASCADE,
        related_name="tasks",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default="none",
    )
    label_name = models.CharField(max_length=255, null=True, blank=True)
    sequence = models.FloatField(default=65536)
    estimated_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "template_tasks"
        ordering = ["sequence"]

    def __str__(self):
        return f"{self.template.name} / {self.title}"
