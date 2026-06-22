/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { API_BASE_URL } from "@plane/constants";
import type { IVendor, IIssueVendor, IProjectVendor } from "@plane/types";
import { APIService } from "@/services/api.service";

export class VendorService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async getVendors(workspaceSlug: string, params?: Record<string, string>): Promise<IVendor[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/vendors/`, { params })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response;
      });
  }

  async createVendor(workspaceSlug: string, data: Partial<IVendor>): Promise<IVendor> {
    return this.post(`/api/workspaces/${workspaceSlug}/vendors/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response;
      });
  }

  async updateVendor(workspaceSlug: string, vendorId: string, data: Partial<IVendor>): Promise<IVendor> {
    return this.patch(`/api/workspaces/${workspaceSlug}/vendors/${vendorId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response;
      });
  }

  async deleteVendor(workspaceSlug: string, vendorId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/vendors/${vendorId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response;
      });
  }

  // Issue <-> Vendor links
  async getIssueVendors(workspaceSlug: string, projectId: string, issueId: string): Promise<IIssueVendor[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/issues/${issueId}/issue-vendors/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response;
      });
  }

  async addIssueVendor(
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    vendorId: string
  ): Promise<IIssueVendor> {
    return this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/issues/${issueId}/issue-vendors/`, {
      vendor: vendorId,
    })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response;
      });
  }

  async removeIssueVendor(
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    issueVendorId: string
  ): Promise<void> {
    return this.delete(
      `/api/workspaces/${workspaceSlug}/projects/${projectId}/issues/${issueId}/issue-vendors/${issueVendorId}/`
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response;
      });
  }

  // Project <-> Vendor links
  async getProjectVendors(workspaceSlug: string, projectId: string): Promise<IProjectVendor[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/project-vendors/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response;
      });
  }

  async addProjectVendor(workspaceSlug: string, projectId: string, vendorId: string): Promise<IProjectVendor> {
    return this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/project-vendors/`, {
      vendor: vendorId,
    })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response;
      });
  }

  async removeProjectVendor(workspaceSlug: string, projectId: string, projectVendorId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/projects/${projectId}/project-vendors/${projectVendorId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response;
      });
  }
}
