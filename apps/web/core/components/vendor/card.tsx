/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { Link2, Mail, Pencil, Phone, Trash2 } from "lucide-react";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { Tooltip } from "@plane/ui";
import type { IVendor } from "@plane/types";
import { copyTextToClipboard } from "@plane/utils";
import { formatVendorPrice, getVendorCategoryLabel } from "./constants";

type Props = {
  vendor: IVendor;
  onEdit: (vendor: IVendor) => void;
  onDelete: (vendor: IVendor) => void;
};

export const VendorCard = observer(function VendorCard(props: Props) {
  const { vendor, onEdit, onDelete } = props;
  const { workspaceSlug } = useParams();

  const handleCopyLink = () => {
    const url = `${window.location.origin}/${workspaceSlug}/vendors/#${vendor.id}`;
    copyTextToClipboard(url).then(() =>
      setToast({ type: TOAST_TYPE.SUCCESS, title: "Скопировано", message: "Ссылка на подрядчика скопирована" })
    );
  };

  return (
    <div className="hover:shadow-sm flex flex-col gap-3 rounded-lg border border-subtle bg-surface-1 p-4 transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-15 truncate font-semibold">{vendor.name}</h4>
          <span className="text-12 text-secondary">{getVendorCategoryLabel(vendor.category)}</span>
        </div>
        {vendor.rating ? <span className="flex-shrink-0 text-12">{"⭐".repeat(vendor.rating)}</span> : null}
      </div>

      <div className="text-13 font-medium text-primary">{formatVendorPrice(vendor.price_min, vendor.price_max)}</div>

      <div className="flex flex-col gap-1 text-12 text-secondary">
        {vendor.contact_name ? <span>{vendor.contact_name}</span> : null}
        {vendor.contact_email ? (
          <a href={`mailto:${vendor.contact_email}`} className="flex items-center gap-1 hover:text-primary">
            <Mail className="size-3" /> {vendor.contact_email}
          </a>
        ) : null}
        {vendor.contact_phone ? (
          <a href={`tel:${vendor.contact_phone}`} className="flex items-center gap-1 hover:text-primary">
            <Phone className="size-3" /> {vendor.contact_phone}
          </a>
        ) : null}
        {vendor.website ? (
          <a
            href={vendor.website}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 truncate hover:text-primary"
          >
            <Link2 className="size-3" /> {vendor.website}
          </a>
        ) : null}
      </div>

      {vendor.notes ? <p className="line-clamp-2 text-12 text-tertiary">{vendor.notes}</p> : null}

      <div className="mt-1 flex items-center justify-end gap-1 border-t border-subtle pt-2">
        <Tooltip tooltipContent="Скопировать ссылку">
          <button type="button" onClick={handleCopyLink} className="rounded p-1.5 hover:bg-layer-1">
            <Link2 className="size-4 text-secondary" />
          </button>
        </Tooltip>
        <Tooltip tooltipContent="Редактировать">
          <button type="button" onClick={() => onEdit(vendor)} className="rounded p-1.5 hover:bg-layer-1">
            <Pencil className="size-4 text-secondary" />
          </button>
        </Tooltip>
        <Tooltip tooltipContent="Удалить">
          <button type="button" onClick={() => onDelete(vendor)} className="rounded p-1.5 hover:bg-layer-1">
            <Trash2 className="text-danger size-4" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
});
