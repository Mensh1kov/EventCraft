/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useMemo } from "react";
import { observer } from "mobx-react";
import { X } from "lucide-react";
import useSWR from "swr";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { useVendor } from "@/hooks/store/use-vendor";
import { getVendorCategoryLabel } from "./constants";

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled?: boolean;
};

export const IssueVendorSelect = observer(function IssueVendorSelect(props: Props) {
  const { workspaceSlug, projectId, issueId, disabled } = props;
  const { vendorMap, vendorIds, fetchVendors, fetchIssueVendors, getIssueVendors, addIssueVendor, removeIssueVendor } =
    useVendor();

  useSWR(workspaceSlug ? `WORKSPACE_VENDORS_${workspaceSlug}` : null, () => fetchVendors(workspaceSlug), {
    revalidateOnFocus: false,
  });
  useSWR(
    workspaceSlug && projectId && issueId ? `ISSUE_VENDORS_${issueId}` : null,
    () => fetchIssueVendors(workspaceSlug, projectId, issueId),
    { revalidateOnFocus: false }
  );

  const links = getIssueVendors(issueId);
  const linkedVendorIds = useMemo(() => new Set(links.map((l) => l.vendor)), [links]);
  const availableVendorIds = vendorIds.filter((id) => !linkedVendorIds.has(id));

  const handleAdd = async (vendorId: string) => {
    if (!vendorId) return;
    try {
      await addIssueVendor(workspaceSlug, projectId, issueId, vendorId);
    } catch {
      setToast({ type: TOAST_TYPE.ERROR, title: "Ошибка", message: "Не удалось привязать подрядчика" });
    }
  };

  const handleRemove = async (issueVendorId: string) => {
    try {
      await removeIssueVendor(workspaceSlug, projectId, issueId, issueVendorId);
    } catch {
      setToast({ type: TOAST_TYPE.ERROR, title: "Ошибка", message: "Не удалось отвязать подрядчика" });
    }
  };

  return (
    <div className="flex w-full flex-wrap items-center gap-1.5">
      {links.map((link) => {
        const vendor = link.vendor_detail ?? vendorMap[link.vendor];
        if (!vendor) return null;
        return (
          <span
            key={link.id}
            className="flex items-center gap-1 rounded-md border border-subtle bg-layer-1 px-2 py-0.5 text-12"
          >
            {vendor.name}
            <span className="text-tertiary">· {getVendorCategoryLabel(vendor.category)}</span>
            {!disabled ? (
              <button type="button" onClick={() => handleRemove(link.id)} className="hover:text-danger">
                <X className="size-3" />
              </button>
            ) : null}
          </span>
        );
      })}

      {!disabled ? (
        <select
          value=""
          onChange={(e) => handleAdd(e.target.value)}
          className="rounded-md border border-strong bg-surface-1 px-2 py-1 text-12 outline-none"
          disabled={availableVendorIds.length === 0}
        >
          <option value="">
            {availableVendorIds.length === 0 ? "Нет доступных подрядчиков" : "+ Привязать подрядчика"}
          </option>
          {availableVendorIds.map((id) => (
            <option key={id} value={id}>
              {vendorMap[id]?.name}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
});
