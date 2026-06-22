/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IVendor, TVendorCategory } from "@plane/types";
import { EModalPosition, EModalWidth, Input, ModalCore, TextArea } from "@plane/ui";
import { useVendor } from "@/hooks/store/use-vendor";
import { VENDOR_CATEGORIES } from "./constants";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  vendor?: IVendor | null;
};

const EMPTY_FORM: Partial<IVendor> = {
  name: "",
  category: "other",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  website: "",
  price_min: "",
  price_max: "",
  rating: null,
  notes: "",
};

export const VendorCreateUpdateModal = observer(function VendorCreateUpdateModal(props: Props) {
  const { isOpen, onClose, vendor } = props;
  const { workspaceSlug } = useParams();
  const { createVendor, updateVendor } = useVendor();

  const [form, setForm] = useState<Partial<IVendor>>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(vendor?.id);

  useEffect(() => {
    if (isOpen) {
      setForm(vendor ? { ...vendor } : EMPTY_FORM);
    }
  }, [isOpen, vendor]);

  const handleChange = (key: keyof IVendor, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleClose = () => {
    setIsSubmitting(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!workspaceSlug || !form.name?.trim()) {
      setToast({ type: TOAST_TYPE.ERROR, title: "Ошибка", message: "Введите название подрядчика" });
      return;
    }
    setIsSubmitting(true);

    const payload: Partial<IVendor> = {
      ...form,
      name: form.name?.trim(),
      price_min: form.price_min === "" ? null : form.price_min,
      price_max: form.price_max === "" ? null : form.price_max,
      rating: form.rating ? Number(form.rating) : null,
    };

    try {
      if (isEditing && vendor) {
        await updateVendor(workspaceSlug.toString(), vendor.id, payload);
        setToast({ type: TOAST_TYPE.SUCCESS, title: "Готово", message: "Подрядчик обновлён" });
      } else {
        await createVendor(workspaceSlug.toString(), payload);
        setToast({ type: TOAST_TYPE.SUCCESS, title: "Готово", message: "Подрядчик добавлен" });
      }
      handleClose();
    } catch {
      setToast({ type: TOAST_TYPE.ERROR, title: "Ошибка", message: "Не удалось сохранить подрядчика" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalCore isOpen={isOpen} handleClose={handleClose} position={EModalPosition.CENTER} width={EModalWidth.XXL}>
      <div className="flex flex-col gap-4 p-5">
        <h3 className="text-18 font-medium">{isEditing ? "Редактировать подрядчика" : "Новый подрядчик"}</h3>

        <div className="flex flex-col gap-3">
          <div>
            <span className="mb-1 block text-13 font-medium text-secondary">Название *</span>
            <Input
              type="text"
              value={form.name ?? ""}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Иванов Фото"
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="mb-1 block text-13 font-medium text-secondary">Категория</span>
              <select
                value={form.category ?? "other"}
                onChange={(e) => handleChange("category", e.target.value as TVendorCategory)}
                className="w-full rounded-md border border-strong bg-surface-1 px-3 py-2 text-13 outline-none"
              >
                {VENDOR_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="mb-1 block text-13 font-medium text-secondary">Рейтинг (1–5)</span>
              <select
                value={form.rating ?? ""}
                onChange={(e) => handleChange("rating", e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-md border border-strong bg-surface-1 px-3 py-2 text-13 outline-none"
              >
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((r) => (
                  <option key={r} value={r}>
                    {"⭐".repeat(r)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="mb-1 block text-13 font-medium text-secondary">Цена от</span>
              <Input
                type="number"
                value={(form.price_min as string) ?? ""}
                onChange={(e) => handleChange("price_min", e.target.value)}
                placeholder="40000"
                className="w-full"
              />
            </div>
            <div>
              <span className="mb-1 block text-13 font-medium text-secondary">Цена до</span>
              <Input
                type="number"
                value={(form.price_max as string) ?? ""}
                onChange={(e) => handleChange("price_max", e.target.value)}
                placeholder="60000"
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="mb-1 block text-13 font-medium text-secondary">Контактное лицо</span>
              <Input
                type="text"
                value={form.contact_name ?? ""}
                onChange={(e) => handleChange("contact_name", e.target.value)}
                placeholder="Алексей"
                className="w-full"
              />
            </div>
            <div>
              <span className="mb-1 block text-13 font-medium text-secondary">Телефон</span>
              <Input
                type="text"
                value={form.contact_phone ?? ""}
                onChange={(e) => handleChange("contact_phone", e.target.value)}
                placeholder="+7 ..."
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="mb-1 block text-13 font-medium text-secondary">Email</span>
              <Input
                type="email"
                value={form.contact_email ?? ""}
                onChange={(e) => handleChange("contact_email", e.target.value)}
                placeholder="vendor@example.com"
                className="w-full"
              />
            </div>
            <div>
              <span className="mb-1 block text-13 font-medium text-secondary">Сайт / соцсети</span>
              <Input
                type="text"
                value={form.website ?? ""}
                onChange={(e) => handleChange("website", e.target.value)}
                placeholder="https://..."
                className="w-full"
              />
            </div>
          </div>

          <div>
            <span className="mb-1 block text-13 font-medium text-secondary">Заметки</span>
            <TextArea
              value={form.notes ?? ""}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Дополнительная информация о подрядчике"
              className="w-full"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="lg" onClick={handleClose}>
            Отмена
          </Button>
          <Button variant="primary" size="lg" onClick={handleSubmit} loading={isSubmitting}>
            {isEditing ? "Сохранить" : "Добавить"}
          </Button>
        </div>
      </div>
    </ModalCore>
  );
});
