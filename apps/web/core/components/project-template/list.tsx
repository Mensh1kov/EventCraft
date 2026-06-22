import { useState } from "react";
import { observer } from "mobx-react";
import type { IProjectTemplate } from "@plane/types";
import { TemplateCard } from "./card";
import { TemplatePreviewDrawer } from "./preview-drawer";

type Props = {
  templates: IProjectTemplate[];
  totalCount: number;
  workspaceSlug: string;
  onEdit: (template: IProjectTemplate) => void;
  onCreateEvent: (template: IProjectTemplate) => void;
};

export const TemplateList = observer(function TemplateList({
  templates,
  totalCount,
  workspaceSlug,
  onEdit,
  onCreateEvent,
}: Props) {
  const [previewTemplate, setPreviewTemplate] = useState<IProjectTemplate | null>(null);

  return (
    <div className="flex flex-col gap-6">
      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-subtle py-16 text-center">
          <p className="text-sm text-secondary">{totalCount === 0 ? "Шаблоны ещё не созданы" : "Шаблоны не найдены"}</p>
          {totalCount > 0 && (
            <p className="text-13 text-placeholder">Попробуйте изменить фильтры или поисковый запрос</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              workspaceSlug={workspaceSlug}
              onPreview={setPreviewTemplate}
              onEdit={onEdit}
              onCreateEvent={onCreateEvent}
            />
          ))}
        </div>
      )}

      <TemplatePreviewDrawer
        template={previewTemplate}
        isOpen={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onCreateEvent={(t) => {
          setPreviewTemplate(null);
          onCreateEvent(t);
        }}
      />
    </div>
  );
});
