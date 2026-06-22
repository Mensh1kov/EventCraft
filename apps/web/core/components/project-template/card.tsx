import { useState } from "react";
import { observer } from "mobx-react";
import { LayoutTemplate } from "lucide-react";
import { Button } from "@plane/propel/button";
import { EditIcon, PlusIcon, TrashIcon } from "@plane/propel/icons";
import type { IProjectTemplate } from "@plane/types";
import { CoverImage } from "@/components/common/cover-image";
import { DeleteTemplateModal } from "./delete-modal";

type Props = {
  template: IProjectTemplate;
  workspaceSlug: string;
  onPreview: (template: IProjectTemplate) => void;
  onEdit: (template: IProjectTemplate) => void;
  onCreateEvent: (template: IProjectTemplate) => void;
};

// Палитра градиентов — категория получает свой стабильный цвет.
// Используется style/CSS, а не классы Tailwind, чтобы динамические значения гарантированно рендерились.
const COVER_GRADIENTS: [string, string][] = [
  ["#6366f1", "#7c3aed"], // indigo → violet
  ["#f59e0b", "#ea580c"], // amber  → orange
  ["#10b981", "#0d9488"], // emerald → teal
  ["#0ea5e9", "#2563eb"], // sky → blue
  ["#f43f5e", "#db2777"], // rose → pink
  ["#06b6d4", "#0284c7"], // cyan → sky
  ["#84cc16", "#16a34a"], // lime → green
  ["#d946ef", "#9333ea"], // fuchsia → purple
];

const pickGradient = (key: string): [string, string] => {
  if (!key) return COVER_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return COVER_GRADIENTS[hash % COVER_GRADIENTS.length];
};

export const TemplateCard = observer(function TemplateCard({
  template,
  workspaceSlug,
  onPreview,
  onEdit,
  onCreateEvent,
}: Props) {
  const [deleteModal, setDeleteModal] = useState(false);

  const totalCost = template.tasks.reduce((sum, t) => sum + (t.estimated_cost ? parseFloat(t.estimated_cost) : 0), 0);
  const [gradientFrom, gradientTo] = pickGradient(template.category || template.name);

  return (
    <>
      <DeleteTemplateModal
        template={template}
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        workspaceSlug={workspaceSlug}
      />

      <div className="group/template-card flex w-full flex-col overflow-hidden rounded-lg border border-subtle bg-layer-2 transition-all duration-300 hover:border-strong hover:shadow-raised-200">
        {/* Cover */}
        <button
          type="button"
          onClick={() => onPreview(template)}
          className="relative flex h-[118px] w-full items-center justify-center overflow-hidden"
          style={
            template.cover_image_url
              ? undefined
              : { backgroundImage: `linear-gradient(to bottom right, ${gradientFrom}, ${gradientTo})` }
          }
        >
          {template.cover_image_url && (
            <CoverImage
              src={template.cover_image_url}
              alt={template.name}
              className="absolute top-0 left-0 h-full w-full"
              showDefaultWhenEmpty
            />
          )}
          <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/40 to-transparent" />
          <div className="relative z-[2] flex items-center justify-center">
            {template.emoji ? (
              <span className="text-5xl drop-shadow-md">{template.emoji}</span>
            ) : (
              <LayoutTemplate className="h-14 w-14 text-on-color/80" strokeWidth={1.5} />
            )}
          </div>
          {template.category && (
            <div className="absolute top-3 left-3 z-[2] rounded-full bg-white/20 px-2.5 py-0.5 text-11 font-medium text-on-color backdrop-blur">
              {template.category}
            </div>
          )}
        </button>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="line-clamp-1 font-semibold">{template.name}</h3>
          <p className="line-clamp-2 min-h-[34px] text-13 text-tertiary">
            {template.description || "Описание не указано"}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-11 text-secondary">
            <span>{template.states.length} статусов</span>
            <span>{template.labels.length} меток</span>
            <span>{template.tasks.length} задач</span>
          </div>
          {totalCost > 0 && (
            <div className="text-13 text-secondary">
              <span>💰</span> ~ {totalCost.toLocaleString("ru-RU")} ₽
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-subtle px-4 py-3">
          <span className="text-11 text-placeholder">
            {template.usage_count > 0 ? `Использован ${template.usage_count} раз` : "Ещё не использован"}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              prependIcon={<PlusIcon className="h-3.5 w-3.5" />}
              onClick={() => onCreateEvent(template)}
            >
              Создать
            </Button>
            <button
              type="button"
              onClick={() => onEdit(template)}
              className="rounded p-1.5 text-secondary hover:bg-surface-2 hover:text-primary"
              aria-label="Редактировать"
            >
              <EditIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeleteModal(true)}
              className="hover:bg-red-50 hover:text-red-500 rounded p-1.5 text-secondary"
              aria-label="Удалить"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
});
