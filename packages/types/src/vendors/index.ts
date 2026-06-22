/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

export type TVendorCategory =
  | "photography"
  | "video"
  | "catering"
  | "sound_lighting"
  | "decor"
  | "mc"
  | "transport"
  | "other";

export interface IVendor {
  id: string;
  workspace: string;
  name: string;
  category: TVendorCategory;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  price_min?: number | string | null;
  price_max?: number | string | null;
  rating?: number | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface IVendorMap {
  [id: string]: IVendor;
}

export interface IIssueVendor {
  id: string;
  issue: string;
  vendor: string;
  vendor_detail?: IVendor;
  project: string;
  workspace: string;
  created_at?: string;
  updated_at?: string;
}

export interface IProjectVendor {
  id: string;
  vendor: string;
  vendor_detail?: IVendor;
  project: string;
  workspace: string;
  created_at?: string;
  updated_at?: string;
}
