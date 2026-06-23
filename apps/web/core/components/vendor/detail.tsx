/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { ReactNode } from "react";
import { useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { ArrowLeft, Link2, Mail, Pencil, Phone } from "lucide-react";
import useSWR from "swr";
import { Button } from "@plane/propel/button";
import { Loader } from "@plane/ui";
import { PageHead } from "@/components/core/page-title";
import { useVendor } from "@/hooks/store/use-vendor";
import { useAppRouter } from "@/hooks/use-app-router";
import { formatVendorPrice, getVendorCategoryLabel } from "./constants";
import { VendorCreateUpdateModal } from "./create-update-modal";

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-0.5 border-b border-subtle py-2.5 last:border-0">
    <span className="text-12 text-tertiary">{label}</span>
    <span className="text-13 text-primary">{children}</span>
  </div>
);

export const VendorDetailRoot = observer(function VendorDetailRoot() {
  const { workspaceSlug, vendorId } = useParams();
  const router = useAppRouter();
  const { getVendorById, fetchVendors, loader } = useVendor();
  const [isEditOpen, setIsEditOpen] = useState(false);

  useSWR(
    workspaceSlug ? `WORKSPACE_VENDORS_${workspaceSlug}` : null,
    workspaceSlug ? () => fetchVendors(workspaceSlug.toString()) : null,
    { revalidateOnFocus: false }
  );

  const vendor = vendorId ? getVendorById(vendorId.toString()) : undefined;
  const vendorsHref = `/${workspaceSlug}/vendors`;

  if (!vendor) {
    return (
      <div className="p-6">
        <PageHead title="Подрядчик" />
        {loader ? (
          <Loader className="max-w-xl space-y-3">
            <Loader.Item height="40px" />
            <Loader.Item height="160px" />
          </Loader>
        ) : (
          <div className="flex flex-col items-start gap-3 text-secondary">
            <p>Подрядчик не найден.</p>
            <Button variant="secondary" size="sm" onClick={() => router.push(vendorsHref)}>
              К списку подрядчиков
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <PageHead title={vendor.name} />
      <VendorCreateUpdateModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} vendor={vendor} />

      <div className="mx-auto w-full max-w-2xl p-6">
        <button
          type="button"
          onClick={() => router.push(vendorsHref)}
          className="mb-4 flex items-center gap-1 text-12 text-secondary hover:text-primary"
        >
          <ArrowLeft className="size-3.5" /> Подрядчики
        </button>

        <div className="rounded-lg border border-subtle bg-surface-1 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-20 font-semibold">{vendor.name}</h1>
              <div className="mt-1 flex items-center gap-2 text-12 text-secondary">
                <span>{getVendorCategoryLabel(vendor.category)}</span>
                {vendor.rating ? <span>{"⭐".repeat(vendor.rating)}</span> : null}
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              prependIcon={<Pencil className="size-3.5" />}
              onClick={() => setIsEditOpen(true)}
            >
              Редактировать
            </Button>
          </div>

          <div className="mt-4">
            <Row label="Стоимость">{formatVendorPrice(vendor.price_min, vendor.price_max)}</Row>
            {vendor.contact_name ? <Row label="Контактное лицо">{vendor.contact_name}</Row> : null}
            {vendor.contact_email ? (
              <Row label="Email">
                <a
                  href={`mailto:${vendor.contact_email}`}
                  className="flex items-center gap-1 text-link-primary hover:underline"
                >
                  <Mail className="size-3.5" /> {vendor.contact_email}
                </a>
              </Row>
            ) : null}
            {vendor.contact_phone ? (
              <Row label="Телефон">
                <a
                  href={`tel:${vendor.contact_phone}`}
                  className="flex items-center gap-1 text-link-primary hover:underline"
                >
                  <Phone className="size-3.5" /> {vendor.contact_phone}
                </a>
              </Row>
            ) : null}
            {vendor.website ? (
              <Row label="Сайт / соцсети">
                <a
                  href={vendor.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 truncate text-link-primary hover:underline"
                >
                  <Link2 className="size-3.5" /> {vendor.website}
                </a>
              </Row>
            ) : null}
            {vendor.notes ? <Row label="Заметки">{vendor.notes}</Row> : null}
          </div>
        </div>
      </div>
    </>
  );
});
