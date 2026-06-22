import { useState } from "react";
import { PlusIcon, TrashIcon } from "@plane/propel/icons";
import { Button } from "@plane/propel/button";
import { cn } from "@plane/utils";
import type { ITemplateState, TTemplateStateGroup } from "@plane/types";

const GROUPS: { value: TTemplateStateGroup; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "unstarted", label: "Unstarted" },
  { value: "started", label: "Started" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

type Props = {
  states: Omit<ITemplateState, "id">[];
  onChange: (states: Omit<ITemplateState, "id">[]) => void;
};

const emptyState = (): Omit<ITemplateState, "id"> => ({
  name: "",
  color: "#60646C",
  group: "unstarted",
  sequence: 0,
  is_default: false,
});

export const StatesSection = ({ states, onChange }: Props) => {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyState);

  const add = () => {
    if (!draft.name.trim()) return;
    const updated = [...states, { ...draft, sequence: states.length * 10000 }];
    onChange(updated);
    setDraft(emptyState());
    setAdding(false);
  };

  const remove = (idx: number) => onChange(states.filter((_, i) => i !== idx));

  const setDefault = (idx: number) => onChange(states.map((s, i) => ({ ...s, is_default: i === idx })));

  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm font-medium text-secondary">Статусы</div>

      <div className="flex flex-col gap-1">
        {states.map((state, idx) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={idx} className="flex items-center gap-3 rounded-md border border-subtle bg-surface-1 px-3 py-2">
            <input
              type="color"
              value={state.color}
              onChange={(e) => onChange(states.map((s, i) => (i === idx ? { ...s, color: e.target.value } : s)))}
              className="h-5 w-5 cursor-pointer rounded border-0 p-0"
            />
            <span className="text-sm flex-1 truncate">{state.name}</span>
            <select
              value={state.group}
              onChange={(e) =>
                onChange(states.map((s, i) => (i === idx ? { ...s, group: e.target.value as TTemplateStateGroup } : s)))
              }
              className="text-xs rounded border border-subtle bg-surface-1 px-1.5 py-0.5 text-secondary"
            >
              {GROUPS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setDefault(idx)}
              className={cn(
                "text-xs",
                state.is_default ? "font-medium text-primary" : "text-tertiary hover:text-secondary"
              )}
            >
              {state.is_default ? "По умолчанию" : "Сделать дефолтным"}
            </button>
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
            placeholder="Название статуса"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && add()}
            className="text-sm flex-1 bg-transparent outline-none"
          />
          <select
            value={draft.group}
            onChange={(e) => setDraft((d) => ({ ...d, group: e.target.value as TTemplateStateGroup }))}
            className="text-xs rounded border border-subtle bg-surface-1 px-1.5 py-0.5"
          >
            {GROUPS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
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
          Добавить статус
        </button>
      )}
    </div>
  );
};
