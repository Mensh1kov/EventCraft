# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Third party imports
from rest_framework import status
from rest_framework.response import Response

# Module imports
from plane.app.views.base import BaseViewSet
from plane.app.permissions import ROLE, allow_permission, ProjectEntityPermission
from plane.db.models import Vendor, IssueVendor, ProjectVendor, Workspace
from plane.app.serializers import (
    VendorSerializer,
    IssueVendorSerializer,
    ProjectVendorSerializer,
)


class VendorViewSet(BaseViewSet):
    """Workspace-level CRUD for the vendor (contractor) directory."""

    serializer_class = VendorSerializer
    model = Vendor

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(workspace__slug=self.kwargs.get("slug"))
            .select_related("workspace")
            .distinct()
        )

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def list(self, request, slug):
        vendors = self.get_queryset()

        category = request.query_params.get("category")
        max_price = request.query_params.get("max_price")
        min_rating = request.query_params.get("min_rating")
        query = request.query_params.get("query")

        if category:
            vendors = vendors.filter(category=category)
        if max_price:
            vendors = vendors.filter(price_max__lte=max_price)
        if min_rating:
            vendors = vendors.filter(rating__gte=min_rating)
        if query:
            vendors = vendors.filter(name__icontains=query)

        return Response(VendorSerializer(vendors, many=True).data, status=status.HTTP_200_OK)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def create(self, request, slug):
        workspace = Workspace.objects.get(slug=slug)
        serializer = VendorSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(workspace_id=workspace.id)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def retrieve(self, request, slug, pk):
        vendor = self.get_queryset().get(pk=pk)
        return Response(VendorSerializer(vendor).data, status=status.HTTP_200_OK)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def partial_update(self, request, slug, pk):
        vendor = self.get_queryset().get(pk=pk)
        serializer = VendorSerializer(vendor, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @allow_permission(allowed_roles=[ROLE.ADMIN], level="WORKSPACE")
    def destroy(self, request, slug, pk):
        vendor = self.get_queryset().get(pk=pk)
        vendor.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class IssueVendorViewSet(BaseViewSet):
    """Manage vendor links attached to a specific issue."""

    permission_classes = [ProjectEntityPermission]
    serializer_class = IssueVendorSerializer
    model = IssueVendor

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(workspace__slug=self.kwargs.get("slug"))
            .filter(project_id=self.kwargs.get("project_id"))
            .filter(issue_id=self.kwargs.get("issue_id"))
            .select_related("vendor")
            .order_by("-created_at")
            .distinct()
        )

    def list(self, request, slug, project_id, issue_id):
        return Response(
            IssueVendorSerializer(self.get_queryset(), many=True).data,
            status=status.HTTP_200_OK,
        )

    def create(self, request, slug, project_id, issue_id):
        serializer = IssueVendorSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(project_id=project_id, issue_id=issue_id)
            issue_vendor = self.get_queryset().get(id=serializer.data.get("id"))
            return Response(
                IssueVendorSerializer(issue_vendor).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, slug, project_id, issue_id, pk):
        issue_vendor = IssueVendor.objects.get(
            workspace__slug=slug, project_id=project_id, issue_id=issue_id, pk=pk
        )
        issue_vendor.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectVendorViewSet(BaseViewSet):
    """Manage vendor links attached to a specific project."""

    permission_classes = [ProjectEntityPermission]
    serializer_class = ProjectVendorSerializer
    model = ProjectVendor

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(workspace__slug=self.kwargs.get("slug"))
            .filter(project_id=self.kwargs.get("project_id"))
            .select_related("vendor")
            .order_by("-created_at")
            .distinct()
        )

    def list(self, request, slug, project_id):
        return Response(
            ProjectVendorSerializer(self.get_queryset(), many=True).data,
            status=status.HTTP_200_OK,
        )

    def create(self, request, slug, project_id):
        serializer = ProjectVendorSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(project_id=project_id)
            project_vendor = self.get_queryset().get(id=serializer.data.get("id"))
            return Response(
                ProjectVendorSerializer(project_vendor).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, slug, project_id, pk):
        project_vendor = ProjectVendor.objects.get(
            workspace__slug=slug, project_id=project_id, pk=pk
        )
        project_vendor.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
