import { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { useForm } from "react-hook-form";
import { ChevronLeft } from "lucide-react";
import { Button } from "@plane/propel/button";
import { EmojiPicker, EmojiIconPickerTypes, stringToEmoji } from "@plane/propel/emoji-icon-picker";
import { CloseIcon } from "@plane/propel/icons";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IProjectTemplate, IProjectTemplateWrite } from "@plane/types";
import { TEMPLATE_CATEGORY_SUGGESTIONS } from "@plane/types";
import { EModalPosition, EModalWidth, ModalCore } from "@plane/ui";
import { CoverImage } from "@/components/common/cover-image";
import { ImagePickerPopover } from "@/components/core/image-picker-popover";
import { useProjectTemplate } from "@/hooks/store/use-project-template";
import { LabelsSection } from "./labels-section";
import { StatesSection } from "./states-section";
import { TasksSection } from "./tasks-section";

type Props = {
  workspaceSlug: string;
  template?: IProjectTemplate;
  isOpen: boolean;
  onClose: () => void;
};

enum EStep {
  TEMPLATE = "TEMPLATE",
  TASKS = "TASKS",
}

const getInitialData = (template?: IProjectTemplate): IProjectTemplateWrite => ({
  name: template?.name ?? "",
  description: template?.description ?? "",
  emoji: template?.emoji ?? null,
  category: template?.category ?? "other",
  cover_image_url: template?.cover_image_url ?? null,
  states: template?.states.map(({ id: _id, ...s }) => s) ?? [],
  labels: template?.labels.map(({ id: _id, ...l }) => l) ?? [],
  tasks: template?.tasks.map(({ id: _id, ...t }) => t) ?? [],
});

export const TemplateEditorModal = observer(function TemplateEditorModal({
  workspaceSlug,
  template,
  isOpen,
  onClose,
}: Props) {
  const { createTemplate, updateTemplate } = useProjectTemplate();
  const [step, setStep] = useState<EStep>(EStep.TEMPLATE);
  const [data, setData] = useState<IProjectTemplateWrite>(() => getInitialData(template));
  const [saved, setSaved] = useState<IProjectTemplate | undefined>(template);
  const [saving, setSaving] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  // ImagePickerPopover needs a Control to wire its internal Unsplash search input
  const pickerForm = useForm<{ search: string }>({ defaultValues: { search: "" } });

  useEffect(() => {
    if (isOpen) {
      setStep(EStep.TEMPLATE);
      setData(getInitialData(template));
      setSaved(template);
    }
  }, [isOpen, template]);

  const handleStep1Save = async () => {
    if (!data.name.trim()) {
      setToast({ type: TOAST_TYPE.ERROR, title: "Введите название шаблона" });
      return;
    }
    setSaving(true);
    try {
      const payload: IProjectTemplateWrite = {
        name: data.name,
        description: data.description,
        emoji: data.emoji,
        category: data.category,
        cover_image_url: data.cover_image_url,
        states: data.states,
        labels: data.labels,
        // на первом шаге задачи не трогаем — у нового шаблона их нет, у существующего сохраним как было
        tasks: saved?.tasks.map(({ id: _id, ...t }) => t) ?? data.tasks,
      };
      const result = saved
        ? await updateTemplate(workspaceSlug, saved.id, payload)
        : await createTemplate(workspaceSlug, payload);
      setSaved(result);
      setData((d) => ({ ...d, tasks: result.tasks.map(({ id: _id, ...t }) => t) }));
      setStep(EStep.TASKS);
    } catch {
      setToast({ type: TOAST_TYPE.ERROR, title: "Не удалось сохранить шаблон" });
    } finally {
      setSaving(false);
    }
  };

  const handleStep2Save = async () => {
    if (!saved) return;
    setSaving(true);
    try {
      await updateTemplate(workspaceSlug, saved.id, { tasks: data.tasks });
      setToast({ type: TOAST_TYPE.SUCCESS, title: "Шаблон сохранён" });
      onClose();
    } catch {
      setToast({ type: TOAST_TYPE.ERROR, title: "Не удалось сохранить задачи" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalCore isOpen={isOpen} handleClose={onClose} position={EModalPosition.TOP} width={EModalWidth.XXXL}>
      <div className="flex max-h-[90vh] flex-col overflow-hidden">
        {step === EStep.TEMPLATE ? (
          <>
            {/* Hero with cover image */}
            <div className="relative h-44 w-full">
              <CoverImage
                src={data.cover_image_url ?? undefined}
                alt={data.name || "Шаблон"}
                className="absolute top-0 left-0 h-full w-full"
                showDefaultWhenEmpty
              />
              <button
                type="button"
                onClick={onClose}
                className="absolute top-2 right-2 rounded p-1 hover:bg-black/20"
                aria-label="Закрыть"
              >
                <CloseIcon className="h-5 w-5 text-on-color" />
              </button>
              <div className="absolute right-2 bottom-2">
                <ImagePickerPopover
                  label="Изменить обложку"
                  value={data.cover_image_url ?? null}
                  onChange={(url) => setData((d) => ({ ...d, cover_image_url: url }))}
                  control={pickerForm.control}
                />
              </div>
              <div className="absolute -bottom-[22px] left-3">
                <EmojiPicker
                  isOpen={isEmojiPickerOpen}
                  handleToggle={setIsEmojiPickerOpen}
                  buttonClassName="flex items-center justify-center"
                  label={
                    <span className="text-2xl grid h-11 w-11 place-items-center rounded-md border border-subtle bg-surface-1 shadow-raised-100 hover:border-strong">
                      {data.emoji || "🙂"}
                    </span>
                  }
                  defaultOpen={EmojiIconPickerTypes.EMOJI}
                  onChange={(val) => {
                    if (val?.type === EmojiIconPickerTypes.EMOJI) {
                      const emojiChar = stringToEmoji(val.value);
                      setData((d) => ({ ...d, emoji: emojiChar || null }));
                    }
                    setIsEmojiPickerOpen(false);
                  }}
                />
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 pt-9 pb-5">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                  <input
                    placeholder="Название шаблона *"
                    value={data.name}
                    onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
                    className="text-base focus:border-primary rounded-md border border-subtle bg-surface-1 px-3 py-2 font-medium outline-none"
                  />
                  <input
                    placeholder="Описание (необязательно)"
                    value={data.description ?? ""}
                    onChange={(e) => setData((d) => ({ ...d, description: e.target.value }))}
                    className="text-sm focus:border-primary rounded-md border border-subtle bg-surface-1 px-3 py-2 text-secondary outline-none"
                  />
                  <input
                    list="template-category-suggestions"
                    placeholder="Категория (например: Корпоратив)"
                    value={data.category ?? ""}
                    onChange={(e) => setData((d) => ({ ...d, category: e.target.value }))}
                    className="text-sm focus:border-primary rounded-md border border-subtle bg-surface-1 px-3 py-2 outline-none"
                  />
                  <datalist id="template-category-suggestions">
                    {TEMPLATE_CATEGORY_SUGGESTIONS.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>

                <StatesSection states={data.states ?? []} onChange={(states) => setData((d) => ({ ...d, states }))} />

                <LabelsSection labels={data.labels ?? []} onChange={(labels) => setData((d) => ({ ...d, labels }))} />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-subtle px-6 py-4">
              <span className="text-13 text-placeholder">Шаг 1 из 2 · Параметры шаблона</span>
              <div className="flex items-center gap-3">
                <Button variant="secondary" onClick={onClose}>
                  Отмена
                </Button>
                <Button variant="primary" onClick={handleStep1Save} loading={saving}>
                  Далее: задачи →
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Step 2 header */}
            <div className="flex items-center justify-between gap-3 border-b border-subtle px-6 py-4">
              <button
                type="button"
                onClick={() => setStep(EStep.TEMPLATE)}
                className="text-sm flex items-center gap-1 text-secondary hover:text-primary"
              >
                <ChevronLeft className="h-4 w-4" />
                Назад
              </button>
              <h3 className="flex-1 truncate text-center text-h4-medium">
                {data.emoji && <span className="mr-2">{data.emoji}</span>}
                {saved?.name || data.name} — задачи
              </h3>
              <button onClick={onClose} className="rounded p-1 hover:bg-surface-2" aria-label="Закрыть">
                <CloseIcon className="h-4 w-4 text-secondary" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <TasksSection
                tasks={data.tasks ?? []}
                labels={data.labels ?? []}
                onChange={(tasks) => setData((d) => ({ ...d, tasks }))}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-subtle px-6 py-4">
              <span className="text-13 text-placeholder">Шаг 2 из 2 · Типовые задачи</span>
              <div className="flex items-center gap-3">
                <Button variant="secondary" onClick={() => setStep(EStep.TEMPLATE)}>
                  Назад
                </Button>
                <Button variant="primary" onClick={handleStep2Save} loading={saving}>
                  Готово
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </ModalCore>
  );
});
