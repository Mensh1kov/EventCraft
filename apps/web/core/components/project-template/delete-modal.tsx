import { useState } from "react";
import { observer } from "mobx-react";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IProjectTemplate } from "@plane/types";
import { AlertModalCore } from "@plane/ui";
import { useProjectTemplate } from "@/hooks/store/use-project-template";

type Props = {
  template: IProjectTemplate;
  isOpen: boolean;
  onClose: () => void;
  workspaceSlug: string;
};

export const DeleteTemplateModal = observer(function DeleteTemplateModal({
  template,
  isOpen,
  onClose,
  workspaceSlug,
}: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { deleteTemplate } = useProjectTemplate();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTemplate(workspaceSlug, template.id);
      setToast({ type: TOAST_TYPE.SUCCESS, title: "Шаблон удалён" });
      onClose();
    } catch {
      setToast({ type: TOAST_TYPE.ERROR, title: "Не удалось удалить шаблон" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertModalCore
      isOpen={isOpen}
      handleClose={onClose}
      handleSubmit={handleDelete}
      isSubmitting={isDeleting}
      title="Удалить шаблон"
      content={
        <>
          Вы уверены, что хотите удалить шаблон <span className="font-medium text-primary">«{template.name}»</span>? Это
          действие нельзя отменить.
        </>
      }
    />
  );
});
