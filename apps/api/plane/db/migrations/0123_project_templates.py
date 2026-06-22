from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("db", "0122_budget_event_date"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProjectTemplate",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, unique=True, db_index=True)),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Created At")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Last Modified At")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="Deleted At")),
                ("name", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("emoji", models.CharField(blank=True, max_length=255, null=True)),
                ("category", models.CharField(
                    choices=[
                        ("corporate", "Корпоратив"),
                        ("conference", "Конференция"),
                        ("teambuilding", "Тимбилдинг"),
                        ("training", "Обучение"),
                        ("other", "Другое"),
                    ],
                    default="other",
                    max_length=50,
                )),
                ("usage_count", models.PositiveIntegerField(default=0)),
                ("workspace", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="project_templates",
                    to="db.workspace",
                )),
                ("created_by", models.ForeignKey(
                    null=True, blank=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="%(class)s_created_by",
                    to="db.user",
                    verbose_name="Created By",
                )),
                ("updated_by", models.ForeignKey(
                    null=True, blank=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="%(class)s_updated_by",
                    to="db.user",
                    verbose_name="Last Modified By",
                )),
            ],
            options={"db_table": "project_templates", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="TemplateState",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, unique=True, db_index=True)),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Created At")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Last Modified At")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="Deleted At")),
                ("name", models.CharField(max_length=255)),
                ("color", models.CharField(max_length=255)),
                ("group", models.CharField(
                    choices=[
                        ("backlog", "Backlog"),
                        ("unstarted", "Unstarted"),
                        ("started", "Started"),
                        ("completed", "Completed"),
                        ("cancelled", "Cancelled"),
                    ],
                    default="backlog",
                    max_length=20,
                )),
                ("sequence", models.FloatField(default=65536)),
                ("is_default", models.BooleanField(default=False)),
                ("template", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="states",
                    to="db.projecttemplate",
                )),
                ("created_by", models.ForeignKey(
                    null=True, blank=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="%(class)s_created_by",
                    to="db.user",
                    verbose_name="Created By",
                )),
                ("updated_by", models.ForeignKey(
                    null=True, blank=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="%(class)s_updated_by",
                    to="db.user",
                    verbose_name="Last Modified By",
                )),
            ],
            options={"db_table": "template_states", "ordering": ["sequence"]},
        ),
        migrations.CreateModel(
            name="TemplateLabel",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, unique=True, db_index=True)),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Created At")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Last Modified At")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="Deleted At")),
                ("name", models.CharField(max_length=255)),
                ("color", models.CharField(max_length=255)),
                ("template", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="labels",
                    to="db.projecttemplate",
                )),
                ("created_by", models.ForeignKey(
                    null=True, blank=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="%(class)s_created_by",
                    to="db.user",
                    verbose_name="Created By",
                )),
                ("updated_by", models.ForeignKey(
                    null=True, blank=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="%(class)s_updated_by",
                    to="db.user",
                    verbose_name="Last Modified By",
                )),
            ],
            options={"db_table": "template_labels", "ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="TemplateTask",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, unique=True, db_index=True)),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Created At")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Last Modified At")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="Deleted At")),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("priority", models.CharField(
                    choices=[
                        ("urgent", "Urgent"),
                        ("high", "High"),
                        ("medium", "Medium"),
                        ("low", "Low"),
                        ("none", "None"),
                    ],
                    default="none",
                    max_length=10,
                )),
                ("label_name", models.CharField(blank=True, max_length=255, null=True)),
                ("sequence", models.FloatField(default=65536)),
                ("estimated_cost", models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ("template", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="tasks",
                    to="db.projecttemplate",
                )),
                ("created_by", models.ForeignKey(
                    null=True, blank=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="%(class)s_created_by",
                    to="db.user",
                    verbose_name="Created By",
                )),
                ("updated_by", models.ForeignKey(
                    null=True, blank=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="%(class)s_updated_by",
                    to="db.user",
                    verbose_name="Last Modified By",
                )),
            ],
            options={"db_table": "template_tasks", "ordering": ["sequence"]},
        ),
    ]
