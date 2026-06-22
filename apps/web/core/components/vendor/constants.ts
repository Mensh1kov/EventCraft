/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { TVendorCategory } from "@plane/types";

export const VENDOR_CATEGORIES: { value: TVendorCategory; label: string }[] = [
  { value: "photography", label: "Фотография" },
  { value: "video", label: "Видеосъёмка" },
  { value: "catering", label: "Кейтеринг" },
  { value: "sound_lighting", label: "Звук и свет" },
  { value: "decor", label: "Декор" },
  { value: "mc", label: "Ведущий" },
  { value: "transport", label: "Транспорт" },
  { value: "other", label: "Другое" },
];

export const getVendorCategoryLabel = (category?: string): string =>
  VENDOR_CATEGORIES.find((c) => c.value === category)?.label ?? "Другое";

const formatRub = (v: number) => `${v.toLocaleString("ru-RU")} ₽`;

export const formatVendorPrice = (priceMin?: number | string | null, priceMax?: number | string | null): string => {
  const min = priceMin != null && priceMin !== "" ? Number(priceMin) : null;
  const max = priceMax != null && priceMax !== "" ? Number(priceMax) : null;
  if (min != null && max != null) return `${formatRub(min)} – ${formatRub(max)}`;
  if (min != null) return `от ${formatRub(min)}`;
  if (max != null) return `до ${formatRub(max)}`;
  return "—";
};
