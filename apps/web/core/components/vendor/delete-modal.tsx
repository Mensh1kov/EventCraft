/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IVendor } from "@plane/types";
import { EModalPosition, EModalWidth, ModalCore } from "@plane/ui";
import { useVendor } from "@/hooks/store/use-vendor";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  vendor: IVendor | null;
};

export const VendorDeleteModal = observer(function VendorDeleteModal(props: Props) {
  const { isOpen, onClose, vendor } = props;
  const { workspaceSlug } = useParams();
  const { deleteVendor } = useVendor();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!vendor) return null;

  const handleDelete = async () => {
    if (!workspaceSlug) return;
    setIsDeleting(true);
    try {
      await deleteVendor(workspaceSlug.toString(), vendor.id);
      setToast({ type: TOAST_TYPE.SUCCESS, title: "Удалено", message: `Подрядчик «${vendor.name}» удалён` });
      onClose();
    } catch {
      setToast({ type: TOAST_TYPE.ERROR, title: "Ошибка", message: "Не удалось удалить подрядчика" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ModalCore isOpen={isOpen} handleClose={onClose} position={EModalPosition.CENTER} width={EModalWidth.LG}>
      <div className="p-5">
        <h3 className="text-18 font-medium">Удалить подрядчика</h3>
        <p className="mt-3 text-13 text-secondary">
          Вы уверены, что хотите удалить «{vendor.name}»? Это действие необратимо.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" size="lg" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="error-fill" size="lg" onClick={handleDelete} loading={isDeleting}>
            Удалить
          </Button>
        </div>
      </div>
    </ModalCore>
  );
});
