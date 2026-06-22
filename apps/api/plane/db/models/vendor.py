# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Django imports
from django.db import models
from django.db.models import Q

# Module imports
from .base import BaseModel
from .project import ProjectBaseModel
from .workspace import WorkspaceBaseModel


VENDOR_CATEGORY_CHOICES = (
    ("photography", "Фотография"),
    ("video", "Видеосъёмка"),
    ("catering", "Кейтеринг"),
    ("sound_lighting", "Звук и свет"),
    ("decor", "Декор"),
    ("mc", "Ведущий"),
    ("transport", "Транспорт"),
    ("other", "Другое"),
)


class Vendor(WorkspaceBaseModel):
    """Workspace-level directory of contractors / vendors."""

    name = models.CharField(max_length=255)
    category = models.CharField(max_length=50, choices=VENDOR_CATEGORY_CHOICES, default="other")
    contact_name = models.CharField(max_length=255, blank=True, null=True)
    contact_email = models.EmailField(blank=True, null=True)
    contact_phone = models.CharField(max_length=50, blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    price_min = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    price_max = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    rating = models.PositiveSmallIntegerField(blank=True, null=True)  # 1-5
    notes = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "Vendor"
        verbose_name_plural = "Vendors"
        db_table = "vendors"
        ordering = ("name",)

    def __str__(self):
        return self.name


class IssueVendor(ProjectBaseModel):
    """Link between an Issue (task) and a Vendor."""

    issue = models.ForeignKey("db.Issue", on_delete=models.CASCADE, related_name="issue_vendor")
    vendor = models.ForeignKey("db.Vendor", on_delete=models.CASCADE, related_name="issue_vendor")

    class Meta:
        verbose_name = "Issue Vendor"
        verbose_name_plural = "Issue Vendors"
        db_table = "issue_vendors"
        ordering = ("-created_at",)
        unique_together = ["issue", "vendor", "deleted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["issue", "vendor"],
                condition=Q(deleted_at__isnull=True),
                name="issue_vendor_unique_issue_vendor_when_deleted_at_null",
            )
        ]

    def __str__(self):
        return f"{self.issue.name} {self.vendor.name}"


class ProjectVendor(ProjectBaseModel):
    """Link between a Project and a Vendor."""

    vendor = models.ForeignKey("db.Vendor", on_delete=models.CASCADE, related_name="project_vendor")

    class Meta:
        verbose_name = "Project Vendor"
        verbose_name_plural = "Project Vendors"
        db_table = "project_vendors"
        ordering = ("-created_at",)
        unique_together = ["project", "vendor", "deleted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["project", "vendor"],
                condition=Q(deleted_at__isnull=True),
                name="project_vendor_unique_project_vendor_when_deleted_at_null",
            )
        ]

    def __str__(self):
        return f"{self.project.name} {self.vendor.name}"
