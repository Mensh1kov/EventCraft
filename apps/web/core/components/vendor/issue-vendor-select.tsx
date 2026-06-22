/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useMemo, useState } from "react";
import { observer } from "mobx-react";
import { Plus, X } from "lucide-react";
import useSWR from "swr";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { Tooltip } from "@plane/ui";
import { useVendor } from "@/hooks/store/use-vendor";
import { useAppRouter } from "@/hooks/use-app-router";
import { getVendorCategoryLabel } from "./constants";

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled?: boolean;
};

export const IssueVendorSelect = observer(function IssueVendorSelect(props: Props) {
  const { workspaceSlug, projectId, issueId, disabled } = props;
  const {
    vendorMap,
    vendorIds,
    fetchVendors,
    fetchIssueVendors,
    getIssueVendors,
    addIssueVendor,
    removeIssueVendor,
    createVendor,
  } = useVendor();
  const router = useAppRouter();

  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const linkVendor = async (vendorId: string) => {
    if (linkedVendorIds.has(vendorId)) return;
    await addIssueVendor(workspaceSlug, projectId, issueId, vendorId);
  };

  // Add by typed name: link existing vendor (match by name) or create a new one on the fly.
  const handleSubmitName = async () => {
    const name = draft.trim();
    if (!name || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const existing = vendorIds.map((id) => vendorMap[id]).find((v) => v?.name.toLowerCase() === name.toLowerCase());
      let vendorId = existing?.id;
      if (!vendorId) {
        const created = await createVendor(workspaceSlug, { name, category: "other" });
        vendorId = created.id;
      }
      await linkVendor(vendorId);
      setDraft("");
    } catch {
      setToast({ type: TOAST_TYPE.ERROR, title: "Ошибка", message: "Не удалось добавить подрядчика" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (issueVendorId: string) => {
    try {
      await removeIssueVendor(workspaceSlug, projectId, issueId, issueVendorId);
    } catch {
      setToast({ type: TOAST_TYPE.ERROR, title: "Ошибка", message: "Не удалось отвязать подрядчика" });
    }
  };

  const datalistId = `vendor-options-${issueId}`;

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
            <Tooltip tooltipContent="Открыть в справочнике подрядчиков">
              <button
                type="button"
                onClick={() => router.push(`/${workspaceSlug}/vendors/#${vendor.id}`)}
                className="font-medium text-primary hover:underline"
              >
                {vendor.name}
              </button>
            </Tooltip>
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
        <div className="flex items-center gap-1 rounded-md border border-strong bg-surface-1 px-1.5 py-0.5">
          <input
            value={draft}
            list={datalistId}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmitName();
              }
            }}
            placeholder="Имя подрядчика или выбрать…"
            className="w-44 bg-transparent text-12 outline-none placeholder:text-tertiary"
          />
          <datalist id={datalistId}>
            {availableVendorIds.map((id) => (
              <option key={id} value={vendorMap[id]?.name} />
            ))}
          </datalist>
          <Tooltip tooltipContent="Добавить подрядчика">
            <button
              type="button"
              onClick={handleSubmitName}
              disabled={!draft.trim() || isSubmitting}
              className="rounded p-0.5 text-secondary hover:bg-layer-1 disabled:opacity-40"
            >
              <Plus className="size-3.5" />
            </button>
          </Tooltip>
        </div>
      ) : null}
    </div>
  );
});
