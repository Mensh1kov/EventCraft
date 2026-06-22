import { useState } from "react";
import { ListFilter } from "lucide-react";
import { SearchIcon, CloseIcon } from "@plane/propel/icons";
import { FilterHeader, FilterOption, FiltersDropdown } from "@/components/issues/issue-layouts/filters";
import { DATE_PRESETS, type TDatePreset } from "./template-date-filter";
import type { TTemplateSortBy } from "./use-template-filters";

const SORT_OPTIONS: { value: TTemplateSortBy; label: string }[] = [
  { value: "default", label: "По умолчанию" },
  { value: "popular", label: "По популярности" },
];

type Props = {
  categories: string[];
  activeCategory: string | null;
  onCategoryChange: (value: string | null) => void;
  datePreset: TDatePreset;
  onDateChange: (value: TDatePreset) => void;
  sortBy: TTemplateSortBy;
  onSortChange: (value: TTemplateSortBy) => void;
};

const CategoriesSection = ({
  categories,
  activeCategory,
  onCategoryChange,
  searchQuery,
}: {
  categories: string[];
  activeCategory: string | null;
  onCategoryChange: (value: string | null) => void;
  searchQuery: string;
}) => {
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const filtered = categories.filter((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <>
      <FilterHeader
        title={`Категория${activeCategory ? " (1)" : ""}`}
        isPreviewEnabled={previewEnabled}
        handleIsPreviewEnabled={() => setPreviewEnabled(!previewEnabled)}
      />
      {previewEnabled && (
        <div>
          {filtered.length > 0 ? (
            filtered.map((cat) => (
              <FilterOption
                key={cat}
                isChecked={activeCategory === cat}
                onClick={() => onCategoryChange(activeCategory === cat ? null : cat)}
                title={cat}
                multiple={false}
              />
            ))
          ) : (
            <p className="text-11 text-placeholder italic">Категории не найдены</p>
          )}
        </div>
      )}
    </>
  );
};

const CreatedDateSection = ({
  datePreset,
  onDateChange,
  searchQuery,
}: {
  datePreset: TDatePreset;
  onDateChange: (value: TDatePreset) => void;
  searchQuery: string;
}) => {
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const filtered = DATE_PRESETS.filter((p) => p.label.toLowerCase().includes(searchQuery.toLowerCase()));
  const applied = datePreset !== "all";

  return (
    <>
      <FilterHeader
        title={`Дата создания${applied ? " (1)" : ""}`}
        isPreviewEnabled={previewEnabled}
        handleIsPreviewEnabled={() => setPreviewEnabled(!previewEnabled)}
      />
      {previewEnabled && (
        <div>
          {filtered.length > 0 ? (
            filtered.map((option) => (
              <FilterOption
                key={option.value}
                isChecked={datePreset === option.value}
                onClick={() => onDateChange(option.value)}
                title={option.label}
                multiple={false}
              />
            ))
          ) : (
            <p className="text-11 text-placeholder italic">Совпадений нет</p>
          )}
        </div>
      )}
    </>
  );
};

const SortSection = ({
  sortBy,
  onSortChange,
  searchQuery,
}: {
  sortBy: TTemplateSortBy;
  onSortChange: (value: TTemplateSortBy) => void;
  searchQuery: string;
}) => {
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const filtered = SORT_OPTIONS.filter((o) => o.label.toLowerCase().includes(searchQuery.toLowerCase()));
  const applied = sortBy !== "default";

  return (
    <>
      <FilterHeader
        title={`Сортировка${applied ? " (1)" : ""}`}
        isPreviewEnabled={previewEnabled}
        handleIsPreviewEnabled={() => setPreviewEnabled(!previewEnabled)}
      />
      {previewEnabled && (
        <div>
          {filtered.map((option) => (
            <FilterOption
              key={option.value}
              isChecked={sortBy === option.value}
              onClick={() => onSortChange(option.value)}
              title={option.label}
              multiple={false}
            />
          ))}
        </div>
      )}
    </>
  );
};

export const TemplateFiltersDropdown = (props: Props) => {
  const { categories, activeCategory, onCategoryChange, datePreset, onDateChange, sortBy, onSortChange } = props;
  const [filtersSearchQuery, setFiltersSearchQuery] = useState("");

  const isFiltersApplied = activeCategory !== null || datePreset !== "all" || sortBy !== "default";

  return (
    <FiltersDropdown
      icon={<ListFilter className="h-3 w-3" />}
      title="Фильтры"
      placement="bottom-end"
      isFiltersApplied={isFiltersApplied}
    >
      <div className="flex h-full w-full flex-col overflow-hidden">
        <div className="bg-surface-1 p-2.5 pb-0">
          <div className="flex items-center gap-1.5 rounded-sm border-[0.5px] border-subtle bg-surface-2 px-1.5 py-1 text-11">
            <SearchIcon className="text-placeholder" width={12} height={12} strokeWidth={2} />
            <input
              type="text"
              className="w-full bg-surface-2 outline-none placeholder:text-placeholder"
              placeholder="Поиск"
              value={filtersSearchQuery}
              onChange={(e) => setFiltersSearchQuery(e.target.value)}
            />
            {filtersSearchQuery !== "" && (
              <button type="button" className="grid place-items-center" onClick={() => setFiltersSearchQuery("")}>
                <CloseIcon className="text-tertiary" height={12} width={12} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
        <div className="vertical-scrollbar scrollbar-sm h-full w-full divide-y divide-subtle-1 overflow-y-auto px-2.5">
          {categories.length > 0 && (
            <div className="py-2">
              <CategoriesSection
                categories={categories}
                activeCategory={activeCategory}
                onCategoryChange={onCategoryChange}
                searchQuery={filtersSearchQuery}
              />
            </div>
          )}
          <div className="py-2">
            <CreatedDateSection datePreset={datePreset} onDateChange={onDateChange} searchQuery={filtersSearchQuery} />
          </div>
          <div className="py-2">
            <SortSection sortBy={sortBy} onSortChange={onSortChange} searchQuery={filtersSearchQuery} />
          </div>
        </div>
      </div>
    </FiltersDropdown>
  );
};
