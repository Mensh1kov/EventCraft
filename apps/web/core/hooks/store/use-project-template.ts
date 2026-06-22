import { useContext } from "react";
import { StoreContext } from "@/lib/store-context";
import type { IProjectTemplateStore } from "@/store/project-template/project-template.store";

export const useProjectTemplate = (): IProjectTemplateStore => {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error("useProjectTemplate must be used within StoreProvider");
  return context.projectTemplate;
};
