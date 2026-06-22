import { observer } from "mobx-react";
import { LayoutTemplate } from "lucide-react";
import { Button } from "@plane/propel/button";
import { Breadcrumbs, Header } from "@plane/ui";
import { BreadcrumbLink } from "@/components/common/breadcrumb-link";
import { TemplateFiltersDropdown } from "@/components/project-template/template-filters-dropdown";
import { TemplateSearch } from "@/components/project-template/template-search";
import type { TDatePreset } from "@/components/project-template/template-date-filter";
import type { TTemplateSortBy } from "@/components/project-template/use-template-filters";

type Props = {
  onCreateTemplate: () => void;
  categories: string[];
  activeCategory: string | null;
  onCategoryChange: (value: string | null) => void;
  datePreset: TDatePreset;
  onDateChange: (value: TDatePreset) => void;
  sortBy: TTemplateSortBy;
  onSortChange: (value: TTemplateSortBy) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
};

export const TemplatesHeader = observer(function TemplatesHeader({
  onCreateTemplate,
  categories,
  activeCategory,
  onCategoryChange,
  datePreset,
  onDateChange,
  sortBy,
  onSortChange,
  searchQuery,
  onSearchChange,
}: Props) {
  return (
    <Header>
      <Header.LeftItem>
        <Breadcrumbs>
          <Breadcrumbs.Item
            component={
              <BreadcrumbLink label="Шаблоны мероприятий" icon={<LayoutTemplate className="size-4 text-tertiary" />} />
            }
          />
        </Breadcrumbs>
      </Header.LeftItem>
      <Header.RightItem>
        <TemplateSearch value={searchQuery} onChange={onSearchChange} />
        <div className="hidden md:flex">
          <TemplateFiltersDropdown
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={onCategoryChange}
            datePreset={datePreset}
            onDateChange={onDateChange}
            sortBy={sortBy}
            onSortChange={onSortChange}
          />
        </div>
        <Button variant="primary" size="lg" onClick={onCreateTemplate}>
          + Создать шаблон
        </Button>
      </Header.RightItem>
    </Header>
  );
});
