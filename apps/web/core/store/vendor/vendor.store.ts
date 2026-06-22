/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { set } from "lodash-es";
import { action, computed, makeObservable, observable, runInAction } from "mobx";
import { computedFn } from "mobx-utils";
import type { IVendor, IVendorMap, IIssueVendor, IProjectVendor } from "@plane/types";
import { VendorService } from "@/services/vendor/vendor.service";

export interface IVendorStore {
  // observables
  vendorMap: IVendorMap;
  issueVendorMap: Record<string, IIssueVendor[]>; // issueId -> links
  projectVendorMap: Record<string, IProjectVendor[]>; // projectId -> links
  loader: boolean;
  // computed
  vendorIds: string[];
  // helpers
  getVendorById: (vendorId: string) => IVendor | undefined;
  getIssueVendors: (issueId: string) => IIssueVendor[];
  getProjectVendors: (projectId: string) => IProjectVendor[];
  // actions
  fetchVendors: (workspaceSlug: string, params?: Record<string, string>) => Promise<IVendor[]>;
  createVendor: (workspaceSlug: string, data: Partial<IVendor>) => Promise<IVendor>;
  updateVendor: (workspaceSlug: string, vendorId: string, data: Partial<IVendor>) => Promise<IVendor>;
  deleteVendor: (workspaceSlug: string, vendorId: string) => Promise<void>;
  // issue links
  fetchIssueVendors: (workspaceSlug: string, projectId: string, issueId: string) => Promise<IIssueVendor[]>;
  addIssueVendor: (workspaceSlug: string, projectId: string, issueId: string, vendorId: string) => Promise<void>;
  removeIssueVendor: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    issueVendorId: string
  ) => Promise<void>;
  // project links
  fetchProjectVendors: (workspaceSlug: string, projectId: string) => Promise<IProjectVendor[]>;
  addProjectVendor: (workspaceSlug: string, projectId: string, vendorId: string) => Promise<void>;
  removeProjectVendor: (workspaceSlug: string, projectId: string, projectVendorId: string) => Promise<void>;
}

export class VendorStore implements IVendorStore {
  vendorMap: IVendorMap = {};
  issueVendorMap: Record<string, IIssueVendor[]> = {};
  projectVendorMap: Record<string, IProjectVendor[]> = {};
  loader: boolean = false;

  vendorService;

  constructor() {
    makeObservable(this, {
      // observables
      vendorMap: observable,
      issueVendorMap: observable,
      projectVendorMap: observable,
      loader: observable.ref,
      // computed
      vendorIds: computed,
      // actions
      fetchVendors: action,
      createVendor: action,
      updateVendor: action,
      deleteVendor: action,
      fetchIssueVendors: action,
      addIssueVendor: action,
      removeIssueVendor: action,
      fetchProjectVendors: action,
      addProjectVendor: action,
      removeProjectVendor: action,
    });
    this.vendorService = new VendorService();
  }

  get vendorIds() {
    return Object.keys(this.vendorMap);
  }

  getVendorById = computedFn((vendorId: string) => this.vendorMap[vendorId]);

  getIssueVendors = computedFn((issueId: string) => this.issueVendorMap[issueId] || []);

  getProjectVendors = computedFn((projectId: string) => this.projectVendorMap[projectId] || []);

  fetchVendors = async (workspaceSlug: string, params?: Record<string, string>) => {
    runInAction(() => {
      this.loader = true;
    });
    try {
      const vendors = await this.vendorService.getVendors(workspaceSlug, params);
      runInAction(() => {
        this.vendorMap = {};
        vendors.forEach((vendor) => {
          set(this.vendorMap, [vendor.id], vendor);
        });
        this.loader = false;
      });
      return vendors;
    } catch (error) {
      runInAction(() => {
        this.loader = false;
      });
      throw error;
    }
  };

  createVendor = async (workspaceSlug: string, data: Partial<IVendor>) => {
    const vendor = await this.vendorService.createVendor(workspaceSlug, data);
    runInAction(() => {
      set(this.vendorMap, [vendor.id], vendor);
    });
    return vendor;
  };

  updateVendor = async (workspaceSlug: string, vendorId: string, data: Partial<IVendor>) => {
    const vendor = await this.vendorService.updateVendor(workspaceSlug, vendorId, data);
    runInAction(() => {
      set(this.vendorMap, [vendorId], { ...this.vendorMap[vendorId], ...vendor });
    });
    return vendor;
  };

  deleteVendor = async (workspaceSlug: string, vendorId: string) => {
    await this.vendorService.deleteVendor(workspaceSlug, vendorId);
    runInAction(() => {
      delete this.vendorMap[vendorId];
    });
  };

  fetchIssueVendors = async (workspaceSlug: string, projectId: string, issueId: string) => {
    const links = await this.vendorService.getIssueVendors(workspaceSlug, projectId, issueId);
    runInAction(() => {
      set(this.issueVendorMap, [issueId], links);
    });
    return links;
  };

  addIssueVendor = async (workspaceSlug: string, projectId: string, issueId: string, vendorId: string) => {
    const link = await this.vendorService.addIssueVendor(workspaceSlug, projectId, issueId, vendorId);
    runInAction(() => {
      set(this.issueVendorMap, [issueId], [...(this.issueVendorMap[issueId] || []), link]);
    });
  };

  removeIssueVendor = async (workspaceSlug: string, projectId: string, issueId: string, issueVendorId: string) => {
    await this.vendorService.removeIssueVendor(workspaceSlug, projectId, issueId, issueVendorId);
    runInAction(() => {
      set(
        this.issueVendorMap,
        [issueId],
        (this.issueVendorMap[issueId] || []).filter((link) => link.id !== issueVendorId)
      );
    });
  };

  fetchProjectVendors = async (workspaceSlug: string, projectId: string) => {
    const links = await this.vendorService.getProjectVendors(workspaceSlug, projectId);
    runInAction(() => {
      set(this.projectVendorMap, [projectId], links);
    });
    return links;
  };

  addProjectVendor = async (workspaceSlug: string, projectId: string, vendorId: string) => {
    const link = await this.vendorService.addProjectVendor(workspaceSlug, projectId, vendorId);
    runInAction(() => {
      set(this.projectVendorMap, [projectId], [...(this.projectVendorMap[projectId] || []), link]);
    });
  };

  removeProjectVendor = async (workspaceSlug: string, projectId: string, projectVendorId: string) => {
    await this.vendorService.removeProjectVendor(workspaceSlug, projectId, projectVendorId);
    runInAction(() => {
      set(
        this.projectVendorMap,
        [projectId],
        (this.projectVendorMap[projectId] || []).filter((link) => link.id !== projectVendorId)
      );
    });
  };
}
