import { useState } from "react";
import { observer } from "mobx-react";
import { Button } from "@plane/propel/button";
import { CloseIcon } from "@plane/propel/icons";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { TEMPLATE_CATEGORY_SUGGESTIONS } from "@plane/types";
import { EModalPosition, EModalWidth, ModalCore } from "@plane/ui";
import { useProjectTemplate } from "@/hooks/store/use-project-template";

type Props = {
  workspaceSlug: string;
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
};

export const SaveAsTemplateModal = observer(function SaveAsTemplateModal({
  workspaceSlug,
  projectId,
  projectName,
  isOpen,
  onClose,
}: Props) {
  const { saveAsTemplate } = useProjectTemplate();

  const [name, setName] = useState(projectName);
  const [category, setCategory] = useState("Другое");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      setToast({ type: TOAST_TYPE.ERROR, title: "Введите название шаблона" });
      return;
    }
    setSaving(true);
    try {
      await saveAsTemplate(workspaceSlug, projectId, { name, category, description: description || undefined });
      setToast({ type: TOAST_TYPE.SUCCESS, title: "Шаблон сохранён" });
      onClose();
    } catch {
      setToast({ type: TOAST_TYPE.ERROR, title: "Не удалось сохранить шаблон" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalCore isOpen={isOpen} handleClose={onClose} position={EModalPosition.CENTER} width={EModalWidth.LG}>
      <div className="flex items-center justify-between border-b border-subtle px-5 py-4">
        <h3 className="text-h4-medium">Сохранить как шаблон</h3>
        <button onClick={onClose} className="rounded p-1 hover:bg-surface-2">
          <CloseIcon className="h-4 w-4 text-secondary" />
        </button>
      </div>

      <div className="flex flex-col gap-4 px-5 py-5">
        <input
          placeholder="Название шаблона *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-sm focus:border-primary rounded-md border border-subtle bg-surface-1 px-3 py-2 outline-none"
        />
        <input
          placeholder="Описание (необязательно)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="text-sm focus:border-primary rounded-md border border-subtle bg-surface-1 px-3 py-2 text-secondary outline-none"
        />
        <input
          list="save-template-category-suggestions"
          placeholder="Категория (например: Корпоратив)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="text-sm focus:border-primary rounded-md border border-subtle bg-surface-1 px-3 py-2 outline-none"
        />
        <datalist id="save-template-category-suggestions">
          {TEMPLATE_CATEGORY_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-subtle px-5 py-4">
        <Button variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button variant="primary" onClick={handleSave} loading={saving}>
          Сохранить
        </Button>
      </div>
    </ModalCore>
  );
});
