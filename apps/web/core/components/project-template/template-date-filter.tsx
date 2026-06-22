export type TDatePreset = "all" | "today" | "week" | "month" | "3months";

export const DATE_PRESETS: { value: TDatePreset; label: string }[] = [
  { value: "all", label: "Всё время" },
  { value: "today", label: "Сегодня" },
  { value: "week", label: "Последние 7 дней" },
  { value: "month", label: "Последние 30 дней" },
  { value: "3months", label: "Последние 3 месяца" },
];

export const filterByDatePreset = <T extends { created_at: string }>(items: T[], preset: TDatePreset): T[] => {
  if (preset === "all") return items;

  const now = new Date();
  const thresholds: Record<Exclude<TDatePreset, "all">, Date> = {
    // "today" = с начала текущего дня (полночь)
    today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    "3months": new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
  };
  const threshold = thresholds[preset].getTime();

  return items.filter((t) => {
    const ts = new Date(t.created_at).getTime();
    // невалидный created_at — не скрываем шаблон
    if (!Number.isFinite(ts)) return true;
    return ts >= threshold;
  });
};
