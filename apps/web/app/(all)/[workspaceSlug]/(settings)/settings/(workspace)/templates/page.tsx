import { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IProjectTemplate } from "@plane/types";
import { PageHead } from "@/components/core/page-title";
import { CreateProjectModal } from "@/components/project/create-project-modal";
import { SettingsContentWrapper } from "@/components/settings/content-wrapper";
import { TemplateEditorModal } from "@/components/project-template/editor/root";
import { TemplateList } from "@/components/project-template/list";
import { TemplateFiltersDropdown } from "@/components/project-template/template-filters-dropdown";
import { TemplateSearch } from "@/components/project-template/template-search";
import { useTemplateFilters } from "@/components/project-template/use-template-filters";
import { useProjectTemplate } from "@/hooks/store/use-project-template";
import { TemplatesSettingsHeader } from "./header";

const TemplatesSettingsPage = observer(function TemplatesSettingsPage({
  params,
}: {
  params: { workspaceSlug: string };
}) {
  const { workspaceSlug } = params;
  const { templateMap, fetchedMap, fetchTemplates } = useProjectTemplate();

  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<IProjectTemplate | null>(null);
  const [eventTemplateId, setEventTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (workspaceSlug && !fetchedMap[workspaceSlug]) {
      fetchTemplates(workspaceSlug).catch(() =>
        setToast({ type: TOAST_TYPE.ERROR, title: "Не удалось загрузить шаблоны" })
      );
    }
  }, [workspaceSlug, fetchedMap, fetchTemplates]);

  const templates = Object.values(templateMap).filter(() => fetchedMap[workspaceSlug]);
  const {
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
  } = useTemplateFilters(templates);

  return (
    <SettingsContentWrapper header={<TemplatesSettingsHeader />}>
      <PageHead title="Шаблоны мероприятий" />

      <section className="flex flex-col gap-6">
        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h4 className="text-h3-medium">Шаблоны мероприятий</h4>
            <p className="text-sm mt-1 text-secondary">
              Готовые структуры статусов, меток и задач для быстрого создания мероприятий
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TemplateSearch value={searchQuery} onChange={setSearchQuery} />
            <TemplateFiltersDropdown
              categories={categories}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              datePreset={datePreset}
              onDateChange={setDatePreset}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
            <Button variant="primary" onClick={() => setIsCreating(true)}>
              + Создать шаблон
            </Button>
          </div>
        </div>

        {/* List */}
        <TemplateList
          templates={filtered}
          totalCount={templates.length}
          workspaceSlug={workspaceSlug}
          onEdit={(template) => setEditingTemplate(template)}
          onCreateEvent={(template) => setEventTemplateId(template.id)}
        />
      </section>

      {/* Create template modal */}
      <TemplateEditorModal workspaceSlug={workspaceSlug} isOpen={isCreating} onClose={() => setIsCreating(false)} />

      {/* Edit template modal */}
      <TemplateEditorModal
        workspaceSlug={workspaceSlug}
        template={editingTemplate ?? undefined}
        isOpen={!!editingTemplate}
        onClose={() => setEditingTemplate(null)}
      />

      {/* Create project from template modal */}
      <CreateProjectModal
        isOpen={!!eventTemplateId}
        onClose={() => setEventTemplateId(null)}
        workspaceSlug={workspaceSlug}
        templateId={eventTemplateId ?? undefined}
      />
    </SettingsContentWrapper>
  );
});

export default TemplatesSettingsPage;
