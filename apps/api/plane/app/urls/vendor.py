# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.urls import path

from plane.app.views import (
    VendorViewSet,
    IssueVendorViewSet,
    ProjectVendorViewSet,
)


urlpatterns = [
    # Workspace-level vendor directory
    path(
        "workspaces/<str:slug>/vendors/",
        VendorViewSet.as_view({"get": "list", "post": "create"}),
        name="vendors",
    ),
    path(
        "workspaces/<str:slug>/vendors/<uuid:pk>/",
        VendorViewSet.as_view(
            {"get": "retrieve", "patch": "partial_update", "delete": "destroy"}
        ),
        name="vendor-detail",
    ),
    # Issue <-> Vendor links
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/issues/<uuid:issue_id>/issue-vendors/",
        IssueVendorViewSet.as_view({"get": "list", "post": "create"}),
        name="issue-vendors",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/issues/<uuid:issue_id>/issue-vendors/<uuid:pk>/",
        IssueVendorViewSet.as_view({"delete": "destroy"}),
        name="issue-vendor-detail",
    ),
    # Project <-> Vendor links
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/project-vendors/",
        ProjectVendorViewSet.as_view({"get": "list", "post": "create"}),
        name="project-vendors",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/project-vendors/<uuid:pk>/",
        ProjectVendorViewSet.as_view({"delete": "destroy"}),
        name="project-vendor-detail",
    ),
]
