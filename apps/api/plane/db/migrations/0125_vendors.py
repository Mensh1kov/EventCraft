from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("db", "0124_template_cover_image"),
    ]

    operations = [
        migrations.CreateModel(
            name="Vendor",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Created At")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Last Modified At")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="Deleted At")),
                ("id", models.UUIDField(db_index=True, default=uuid.uuid4, editable=False, primary_key=True, serialize=False, unique=True)),
                ("name", models.CharField(max_length=255)),
                ("category", models.CharField(choices=[("photography", "Фотография"), ("video", "Видеосъёмка"), ("catering", "Кейтеринг"), ("sound_lighting", "Звук и свет"), ("decor", "Декор"), ("mc", "Ведущий"), ("transport", "Транспорт"), ("other", "Другое")], default="other", max_length=50)),
                ("contact_name", models.CharField(blank=True, max_length=255, null=True)),
                ("contact_email", models.EmailField(blank=True, max_length=254, null=True)),
                ("contact_phone", models.CharField(blank=True, max_length=50, null=True)),
                ("website", models.URLField(blank=True, null=True)),
                ("price_min", models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ("price_max", models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ("rating", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("notes", models.TextField(blank=True, default="")),
                ("created_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(class)s_created_by", to=settings.AUTH_USER_MODEL, verbose_name="Created By")),
                ("updated_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(class)s_updated_by", to=settings.AUTH_USER_MODEL, verbose_name="Last Modified By")),
                ("project", models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name="project_%(class)s", to="db.project")),
                ("workspace", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="workspace_%(class)s", to="db.workspace")),
            ],
            options={
                "verbose_name": "Vendor",
                "verbose_name_plural": "Vendors",
                "db_table": "vendors",
                "ordering": ("name",),
            },
        ),
        migrations.CreateModel(
            name="IssueVendor",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Created At")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Last Modified At")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="Deleted At")),
                ("id", models.UUIDField(db_index=True, default=uuid.uuid4, editable=False, primary_key=True, serialize=False, unique=True)),
                ("created_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(class)s_created_by", to=settings.AUTH_USER_MODEL, verbose_name="Created By")),
                ("updated_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(class)s_updated_by", to=settings.AUTH_USER_MODEL, verbose_name="Last Modified By")),
                ("issue", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="issue_vendor", to="db.issue")),
                ("vendor", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="issue_vendor", to="db.vendor")),
                ("project", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="project_%(class)s", to="db.project")),
                ("workspace", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="workspace_%(class)s", to="db.workspace")),
            ],
            options={
                "verbose_name": "Issue Vendor",
                "verbose_name_plural": "Issue Vendors",
                "db_table": "issue_vendors",
                "ordering": ("-created_at",),
            },
        ),
        migrations.CreateModel(
            name="ProjectVendor",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Created At")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Last Modified At")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="Deleted At")),
                ("id", models.UUIDField(db_index=True, default=uuid.uuid4, editable=False, primary_key=True, serialize=False, unique=True)),
                ("created_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(class)s_created_by", to=settings.AUTH_USER_MODEL, verbose_name="Created By")),
                ("updated_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(class)s_updated_by", to=settings.AUTH_USER_MODEL, verbose_name="Last Modified By")),
                ("vendor", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="project_vendor", to="db.vendor")),
                ("project", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="project_%(class)s", to="db.project")),
                ("workspace", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="workspace_%(class)s", to="db.workspace")),
            ],
            options={
                "verbose_name": "Project Vendor",
                "verbose_name_plural": "Project Vendors",
                "db_table": "project_vendors",
                "ordering": ("-created_at",),
            },
        ),
        migrations.CreateModel(
            name="TemplateTaskVendor",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Created At")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Last Modified At")),
                ("deleted_at", models.DateTimeField(blank=True, null=True, verbose_name="Deleted At")),
                ("id", models.UUIDField(db_index=True, default=uuid.uuid4, editable=False, primary_key=True, serialize=False, unique=True)),
                ("vendor_name", models.CharField(blank=True, max_length=255, null=True)),
                ("created_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(class)s_created_by", to=settings.AUTH_USER_MODEL, verbose_name="Created By")),
                ("updated_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(class)s_updated_by", to=settings.AUTH_USER_MODEL, verbose_name="Last Modified By")),
                ("template_task", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="vendors", to="db.templatetask")),
                ("vendor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="template_task_vendors", to="db.vendor")),
            ],
            options={
                "db_table": "template_task_vendors",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AlterUniqueTogether(
            name="issuevendor",
            unique_together={("issue", "vendor", "deleted_at")},
        ),
        migrations.AddConstraint(
            model_name="issuevendor",
            constraint=models.UniqueConstraint(
                condition=models.Q(("deleted_at__isnull", True)),
                fields=("issue", "vendor"),
                name="issue_vendor_unique_issue_vendor_when_deleted_at_null",
            ),
        ),
        migrations.AlterUniqueTogether(
            name="projectvendor",
            unique_together={("project", "vendor", "deleted_at")},
        ),
        migrations.AddConstraint(
            model_name="projectvendor",
            constraint=models.UniqueConstraint(
                condition=models.Q(("deleted_at__isnull", True)),
                fields=("project", "vendor"),
                name="project_vendor_unique_project_vendor_when_deleted_at_null",
            ),
        ),
    ]
