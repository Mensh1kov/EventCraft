import { useState } from "react";
import { PlusIcon, TrashIcon } from "@plane/propel/icons";
import { Button } from "@plane/propel/button";
import type { ITemplateTask, ITemplateLabel, TTemplatePriority } from "@plane/types";

const PRIORITIES: { value: TTemplatePriority; label: string }[] = [
  { value: "urgent", label: "Срочно" },
  { value: "high", label: "Высокий" },
  { value: "medium", label: "Средний" },
  { value: "low", label: "Низкий" },
  { value: "none", label: "Нет" },
];

type Props = {
  tasks: Omit<ITemplateTask, "id">[];
  labels: Omit<ITemplateLabel, "id">[];
  onChange: (tasks: Omit<ITemplateTask, "id">[]) => void;
};

const emptyTask = (): Omit<ITemplateTask, "id"> => ({
  title: "",
  description: "",
  priority: "none",
  label_name: null,
  sequence: 0,
  estimated_cost: null,
});

export const TasksSection = ({ tasks, labels, onChange }: Props) => {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyTask);

  const add = () => {
    if (!draft.title.trim()) return;
    onChange([...tasks, { ...draft, sequence: tasks.length * 10000 }]);
    setDraft(emptyTask());
    setAdding(false);
  };

  const remove = (idx: number) => onChange(tasks.filter((_, i) => i !== idx));

  const totalCost = tasks.reduce((sum, t) => sum + (t.estimated_cost ? parseFloat(t.estimated_cost) : 0), 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-secondary">Задачи</div>
        {totalCost > 0 && <div className="text-xs text-secondary">Итого: ~ {totalCost.toLocaleString("ru-RU")} ₽</div>}
      </div>

      <div className="flex flex-col gap-1">
        {tasks.map((task, idx) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={idx} className="flex items-center gap-2 rounded-md border border-subtle bg-surface-1 px-3 py-2">
            <span className="text-sm flex-1 truncate">{task.title}</span>
            <select
              value={task.priority}
              onChange={(e) =>
                onChange(tasks.map((t, i) => (i === idx ? { ...t, priority: e.target.value as TTemplatePriority } : t)))
              }
              className="text-xs rounded border border-subtle bg-surface-1 px-1.5 py-0.5 text-secondary"
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <select
              value={task.label_name ?? ""}
              onChange={(e) =>
                onChange(tasks.map((t, i) => (i === idx ? { ...t, label_name: e.target.value || null } : t)))
              }
              className="text-xs rounded border border-subtle bg-surface-1 px-1.5 py-0.5 text-secondary"
            >
              <option value="">Метка</option>
              {labels.map((l) => (
                <option key={l.name} value={l.name}>
                  {l.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Стоимость"
              value={task.estimated_cost ?? ""}
              onChange={(e) =>
                onChange(tasks.map((t, i) => (i === idx ? { ...t, estimated_cost: e.target.value || null } : t)))
              }
              className="text-xs w-24 rounded border border-subtle bg-surface-1 px-2 py-0.5 text-secondary outline-none"
            />
            <button onClick={() => remove(idx)} className="hover:text-red-500 shrink-0 text-tertiary">
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="border-primary/40 flex flex-col gap-2 rounded-md border bg-surface-1 p-3">
          <input
            placeholder="Название задачи"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            className="text-sm bg-transparent outline-none"
          />
          <input
            placeholder="Описание (необязательно)"
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            className="text-xs bg-transparent text-secondary outline-none"
          />
          <div className="flex items-center gap-2">
            <select
              value={draft.priority}
              onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value as TTemplatePriority }))}
              className="text-xs rounded border border-subtle bg-surface-1 px-1.5 py-0.5"
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <select
              value={draft.label_name ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, label_name: e.target.value || null }))}
              className="text-xs rounded border border-subtle bg-surface-1 px-1.5 py-0.5"
            >
              <option value="">Без метки</option>
              {labels.map((l) => (
                <option key={l.name} value={l.name}>
                  {l.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Стоимость ₽"
              value={draft.estimated_cost ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, estimated_cost: e.target.value || null }))}
              className="text-xs w-28 rounded border border-subtle bg-surface-1 px-2 py-0.5 outline-none"
            />
            <div className="ml-auto flex gap-2">
              <Button variant="primary" size="sm" onClick={add}>
                Добавить
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setAdding(false)}>
                Отмена
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-sm flex items-center gap-1.5 text-secondary hover:text-primary"
        >
          <PlusIcon className="h-4 w-4" />
          Добавить задачу
        </button>
      )}
    </div>
  );
};
