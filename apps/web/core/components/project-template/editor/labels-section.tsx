import { useState } from "react";
import { PlusIcon, TrashIcon } from "@plane/propel/icons";
import { Button } from "@plane/propel/button";
import type { ITemplateLabel } from "@plane/types";

type Props = {
  labels: Omit<ITemplateLabel, "id">[];
  onChange: (labels: Omit<ITemplateLabel, "id">[]) => void;
};

const emptyLabel = (): Omit<ITemplateLabel, "id"> => ({ name: "", color: "#6366f1" });

export const LabelsSection = ({ labels, onChange }: Props) => {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyLabel);

  const add = () => {
    if (!draft.name.trim()) return;
    onChange([...labels, draft]);
    setDraft(emptyLabel());
    setAdding(false);
  };

  const remove = (idx: number) => onChange(labels.filter((_, i) => i !== idx));

  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm font-medium text-secondary">Метки</div>

      <div className="flex flex-col gap-1">
        {labels.map((label, idx) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={idx} className="flex items-center gap-3 rounded-md border border-subtle bg-surface-1 px-3 py-2">
            <input
              type="color"
              value={label.color}
              onChange={(e) => onChange(labels.map((l, i) => (i === idx ? { ...l, color: e.target.value } : l)))}
              className="h-5 w-5 cursor-pointer rounded border-0 p-0"
            />
            <span className="text-sm flex-1 truncate">{label.name}</span>
            <button onClick={() => remove(idx)} className="hover:text-red-500 text-tertiary">
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="border-primary/40 flex items-center gap-2 rounded-md border bg-surface-1 px-3 py-2">
          <input
            type="color"
            value={draft.color}
            onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
            className="h-5 w-5 cursor-pointer rounded border-0 p-0"
          />
          <input
            placeholder="Название метки"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && add()}
            className="text-sm flex-1 bg-transparent outline-none"
          />
          <Button variant="primary" size="sm" onClick={add}>
            Добавить
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setAdding(false)}>
            Отмена
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-sm flex items-center gap-1.5 text-secondary hover:text-primary"
        >
          <PlusIcon className="h-4 w-4" />
          Добавить метку
        </button>
      )}
    </div>
  );
};
