import { observer } from "mobx-react";
import { CloseIcon } from "@plane/propel/icons";
import { Button } from "@plane/propel/button";
import type { IProjectTemplate } from "@plane/types";
import { cn } from "@plane/utils";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-red-500",
  high: "text-orange-500",
  medium: "text-yellow-500",
  low: "text-green-500",
  none: "text-tertiary",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "Срочно",
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
  none: "—",
};

type Props = {
  template: IProjectTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onCreateEvent: (template: IProjectTemplate) => void;
};

export const TemplatePreviewDrawer = observer(function TemplatePreviewDrawer({
  template,
  isOpen,
  onClose,
  onCreateEvent,
}: Props) {
  const totalCost =
    template?.tasks.reduce((sum, t) => sum + (t.estimated_cost ? parseFloat(t.estimated_cost) : 0), 0) ?? 0;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <button
          type="button"
          aria-label="Закрыть"
          className="fixed inset-0 z-20 cursor-default bg-black/20"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 right-0 z-30 flex h-full w-full max-w-md flex-col border-l border-subtle bg-surface-1 shadow-raised-200 transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {!template ? null : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-subtle px-6 py-4">
              <div className="flex items-center gap-3">
                {template.emoji && <span className="text-2xl">{template.emoji}</span>}
                <div>
                  <h3 className="text-h4-medium">{template.name}</h3>
                  {template.description && <p className="text-sm mt-0.5 text-secondary">{template.description}</p>}
                </div>
              </div>
              <button onClick={onClose} className="shrink-0 rounded p-1 hover:bg-surface-2">
                <CloseIcon className="h-4 w-4 text-secondary" />
              </button>
            </div>

            {/* Tasks list */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium">Задачи ({template.tasks.length})</span>
                {totalCost > 0 && (
                  <span className="text-sm text-secondary">~ {totalCost.toLocaleString("ru-RU")} ₽</span>
                )}
              </div>

              <div className="divide-y divide-subtle">
                {template.tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={cn("text-xs shrink-0 font-medium", PRIORITY_COLORS[task.priority])}>
                        {PRIORITY_LABELS[task.priority]}
                      </span>
                      <span className="text-sm truncate">{task.title}</span>
                    </div>
                    <span className="text-sm shrink-0 text-secondary">
                      {task.estimated_cost ? `${parseFloat(task.estimated_cost).toLocaleString("ru-RU")} ₽` : "—"}
                    </span>
                  </div>
                ))}

                {template.tasks.length === 0 && <p className="text-sm py-4 text-placeholder">Задачи не добавлены</p>}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-subtle px-6 py-4">
              <Button variant="primary" className="w-full" onClick={() => onCreateEvent(template)}>
                Создать мероприятие
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
});
