/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { useSearchParams } from "react-router";
import { Plus, Search, Store } from "lucide-react";
import useSWR from "swr";
import { Button } from "@plane/propel/button";
import { Loader } from "@plane/ui";
import type { IVendor } from "@plane/types";
import { PageHead } from "@/components/core/page-title";
import { useVendor } from "@/hooks/store/use-vendor";
import { VENDOR_CATEGORIES } from "./constants";
import { VendorCard } from "./card";
import { VendorCreateUpdateModal } from "./create-update-modal";
import { VendorDeleteModal } from "./delete-modal";

export const VendorRoot = observer(function VendorRoot() {
  const { workspaceSlug } = useParams();
  const { vendorMap, vendorIds, loader, fetchVendors } = useVendor();

  // filters
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [minRating, setMinRating] = useState("");

  // modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<IVendor | null>(null);
  const [deletingVendor, setDeletingVendor] = useState<IVendor | null>(null);

  useSWR(
    workspaceSlug ? `WORKSPACE_VENDORS_${workspaceSlug}` : null,
    workspaceSlug ? () => fetchVendors(workspaceSlug.toString()) : null,
    { revalidateOnFocus: false }
  );

  // Open a specific vendor's card when navigated with ?vendor=<id> (e.g. clicking a vendor chip on a task)
  const [searchParams] = useSearchParams();
  const focusVendorId = searchParams.get("vendor");
  const focusVendor = focusVendorId ? vendorMap[focusVendorId] : undefined;
  useEffect(() => {
    if (focusVendor) {
      setEditingVendor(focusVendor);
      setIsFormOpen(true);
    }
  }, [focusVendorId, focusVendor]);

  const filteredVendors = useMemo(() => {
    return vendorIds
      .map((id) => vendorMap[id])
      .filter((vendor) => {
        if (!vendor) return false;
        if (query && !vendor.name.toLowerCase().includes(query.toLowerCase())) return false;
        if (category && vendor.category !== category) return false;
        if (minRating && (vendor.rating ?? 0) < Number(minRating)) return false;
        return true;
      });
  }, [vendorIds, vendorMap, query, category, minRating]);

  const openCreate = () => {
    setEditingVendor(null);
    setIsFormOpen(true);
  };

  const openEdit = (vendor: IVendor) => {
    setEditingVendor(vendor);
    setIsFormOpen(true);
  };

  return (
    <>
      <PageHead title="Подрядчики" />
      <VendorCreateUpdateModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} vendor={editingVendor} />
      <VendorDeleteModal
        isOpen={Boolean(deletingVendor)}
        onClose={() => setDeletingVendor(null)}
        vendor={deletingVendor}
      />

      <div className="flex h-full w-full flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-subtle px-5 py-3">
          <div className="flex items-center gap-2">
            <Store className="size-5 text-secondary" />
            <h2 className="text-16 font-semibold">Подрядчики</h2>
          </div>
          <Button variant="primary" size="sm" prependIcon={<Plus className="size-4" />} onClick={openCreate}>
            Добавить
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-subtle px-5 py-2">
          <div className="flex items-center gap-1.5 rounded-md border border-strong bg-surface-1 px-2 py-1.5">
            <Search className="size-4 text-tertiary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по имени"
              className="bg-transparent text-13 outline-none"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-md border border-strong bg-surface-1 px-2 py-1.5 text-13 outline-none"
          >
            <option value="">Все категории</option>
            {VENDOR_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
            className="rounded-md border border-strong bg-surface-1 px-2 py-1.5 text-13 outline-none"
          >
            <option value="">Любой рейтинг</option>
            {[1, 2, 3, 4, 5].map((r) => (
              <option key={r} value={r}>
                от {r} ⭐
              </option>
            ))}
          </select>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-5">
          {loader && vendorIds.length === 0 ? (
            <Loader className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Loader.Item height="160px" />
              <Loader.Item height="160px" />
              <Loader.Item height="160px" />
            </Loader>
          ) : filteredVendors.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-secondary">
              <Store className="size-10 opacity-40" />
              <p className="text-14">Подрядчиков пока нет</p>
              <Button variant="primary" size="sm" prependIcon={<Plus className="size-4" />} onClick={openCreate}>
                Добавить первого
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredVendors.map((vendor) => (
                <VendorCard key={vendor.id} vendor={vendor} onEdit={openEdit} onDelete={setDeletingVendor} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
});
