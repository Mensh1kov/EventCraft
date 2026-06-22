import { useMemo, useState } from "react";
import type { IProjectTemplate } from "@plane/types";
import { filterByDatePreset, type TDatePreset } from "./template-date-filter";

export type TTemplateSortBy = "default" | "popular";

export const useTemplateFilters = (templates: IProjectTemplate[]) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState<TDatePreset>("all");
  const [sortBy, setSortBy] = useState<TTemplateSortBy>("default");

  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const t of templates) {
      if (t.category) seen.add(t.category);
    }
    return Array.from(seen).toSorted();
  }, [templates]);

  const filtered = useMemo(() => {
    let result = templates;
    if (activeCategory) result = result.filter((t) => t.category === activeCategory);
    result = filterByDatePreset(result, datePreset);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    if (sortBy === "popular") {
      result = [...result].toSorted((a, b) => b.usage_count - a.usage_count);
    }
    return result;
  }, [templates, activeCategory, datePreset, searchQuery, sortBy]);

  return {
    filtered,
    categories,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    datePreset,
    setDatePreset,
    sortBy,
    setSortBy,
  };
};
