# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from .base import BaseSerializer
from plane.db.models import Vendor, IssueVendor, ProjectVendor


class VendorSerializer(BaseSerializer):
    class Meta:
        model = Vendor
        fields = "__all__"
        read_only_fields = [
            "workspace",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]


class IssueVendorSerializer(BaseSerializer):
    vendor_detail = VendorSerializer(read_only=True, source="vendor")

    class Meta:
        model = IssueVendor
        fields = [
            "id",
            "issue",
            "vendor",
            "vendor_detail",
            "project",
            "workspace",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "workspace",
            "project",
            "issue",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]


class ProjectVendorSerializer(BaseSerializer):
    vendor_detail = VendorSerializer(read_only=True, source="vendor")

    class Meta:
        model = ProjectVendor
        fields = [
            "id",
            "vendor",
            "vendor_detail",
            "project",
            "workspace",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "workspace",
            "project",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]
