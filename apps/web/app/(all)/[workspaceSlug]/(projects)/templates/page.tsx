import { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IProjectTemplate } from "@plane/types";
import { AppHeader } from "@/components/core/app-header";
import { ContentWrapper } from "@/components/core/content-wrapper";
import { PageHead } from "@/components/core/page-title";
import { CreateProjectModal } from "@/components/project/create-project-modal";
import { TemplateEditorModal } from "@/components/project-template/editor/root";
import { TemplateList } from "@/components/project-template/list";
import { useTemplateFilters } from "@/components/project-template/use-template-filters";
import { useProjectTemplate } from "@/hooks/store/use-project-template";
import { TemplatesHeader } from "./header";

const TemplatesPage = observer(function TemplatesPage({ params }: { params: { workspaceSlug: string } }) {
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

  const templates = fetchedMap[workspaceSlug] ? Object.values(templateMap) : [];
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
    <>
      <AppHeader
        header={
          <TemplatesHeader
            onCreateTemplate={() => setIsCreating(true)}
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            datePreset={datePreset}
            onDateChange={setDatePreset}
            sortBy={sortBy}
            onSortChange={setSortBy}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        }
      />
      <ContentWrapper>
        <PageHead title="Шаблоны мероприятий" />
        <div className="p-8">
          <TemplateList
            templates={filtered}
            totalCount={templates.length}
            workspaceSlug={workspaceSlug}
            onEdit={(template) => setEditingTemplate(template)}
            onCreateEvent={(template) => setEventTemplateId(template.id)}
          />
        </div>
      </ContentWrapper>

      <TemplateEditorModal workspaceSlug={workspaceSlug} isOpen={isCreating} onClose={() => setIsCreating(false)} />

      <TemplateEditorModal
        workspaceSlug={workspaceSlug}
        template={editingTemplate ?? undefined}
        isOpen={!!editingTemplate}
        onClose={() => setEditingTemplate(null)}
      />

      <CreateProjectModal
        isOpen={!!eventTemplateId}
        onClose={() => setEventTemplateId(null)}
        workspaceSlug={workspaceSlug}
        templateId={eventTemplateId ?? undefined}
      />
    </>
  );
});

export default TemplatesPage;
