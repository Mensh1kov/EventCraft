import { action, makeObservable, observable, runInAction } from "mobx";
import { computedFn } from "mobx-utils";
import { set } from "lodash-es";
import type {
  IApplyTemplatePayload,
  IProjectTemplate,
  IProjectTemplateWrite,
  ISaveAsTemplatePayload,
} from "@plane/types";
import { ProjectTemplateService } from "@/services/project-template/project-template.service";
import type { CoreRootStore } from "../root.store";

export interface IProjectTemplateStore {
  // observables
  templateMap: Record<string, IProjectTemplate>;
  fetchedMap: Record<string, boolean>;
  // computed functions
  getTemplateById: (templateId: string) => IProjectTemplate | undefined;
  getWorkspaceTemplates: (workspaceSlug: string) => IProjectTemplate[];
  // actions
  fetchTemplates: (workspaceSlug: string) => Promise<IProjectTemplate[]>;
  createTemplate: (workspaceSlug: string, data: IProjectTemplateWrite) => Promise<IProjectTemplate>;
  updateTemplate: (
    workspaceSlug: string,
    templateId: string,
    data: Partial<IProjectTemplateWrite>
  ) => Promise<IProjectTemplate>;
  deleteTemplate: (workspaceSlug: string, templateId: string) => Promise<void>;
  applyTemplate: (
    workspaceSlug: string,
    templateId: string,
    data: IApplyTemplatePayload
  ) => Promise<{ project_id: string; project_identifier: string }>;
  saveAsTemplate: (workspaceSlug: string, projectId: string, data: ISaveAsTemplatePayload) => Promise<IProjectTemplate>;
}

export class ProjectTemplateStore implements IProjectTemplateStore {
  templateMap: Record<string, IProjectTemplate> = {};
  fetchedMap: Record<string, boolean> = {};

  rootStore: CoreRootStore;
  templateService: ProjectTemplateService;

  constructor(_rootStore: CoreRootStore) {
    makeObservable(this, {
      templateMap: observable,
      fetchedMap: observable,
      fetchTemplates: action,
      createTemplate: action,
      updateTemplate: action,
      deleteTemplate: action,
      applyTemplate: action,
      saveAsTemplate: action,
    });

    this.rootStore = _rootStore;
    this.templateService = new ProjectTemplateService();
  }

  getTemplateById = computedFn((templateId: string) => this.templateMap[templateId]);

  getWorkspaceTemplates = computedFn((workspaceSlug: string) =>
    this.fetchedMap[workspaceSlug] ? Object.values(this.templateMap) : []
  );

  fetchTemplates = async (workspaceSlug: string) => {
    const templates = await this.templateService.getTemplates(workspaceSlug);
    runInAction(() => {
      templates.forEach((t) => set(this.templateMap, [t.id], t));
      set(this.fetchedMap, workspaceSlug, true);
    });
    return templates;
  };

  createTemplate = async (workspaceSlug: string, data: IProjectTemplateWrite) => {
    const template = await this.templateService.createTemplate(workspaceSlug, data);
    runInAction(() => {
      set(this.templateMap, [template.id], template);
    });
    return template;
  };

  updateTemplate = async (workspaceSlug: string, templateId: string, data: Partial<IProjectTemplateWrite>) => {
    const original = this.templateMap[templateId];
    try {
      runInAction(() => {
        set(this.templateMap, [templateId], { ...original, ...data });
      });
      const updated = await this.templateService.updateTemplate(workspaceSlug, templateId, data);
      runInAction(() => {
        set(this.templateMap, [templateId], updated);
      });
      return updated;
    } catch (error) {
      runInAction(() => {
        set(this.templateMap, [templateId], original);
      });
      throw error;
    }
  };

  deleteTemplate = async (workspaceSlug: string, templateId: string) => {
    await this.templateService.deleteTemplate(workspaceSlug, templateId);
    runInAction(() => {
      delete this.templateMap[templateId];
    });
  };

  applyTemplate = async (workspaceSlug: string, templateId: string, data: IApplyTemplatePayload) => {
    const result = await this.templateService.applyTemplate(workspaceSlug, templateId, data);
    runInAction(() => {
      // Обновляем usage_count в локальном стейте
      const template = this.templateMap[templateId];
      if (template) {
        set(this.templateMap, [templateId, "usage_count"], template.usage_count + 1);
      }
    });
    return result;
  };

  saveAsTemplate = async (workspaceSlug: string, projectId: string, data: ISaveAsTemplatePayload) => {
    const template = await this.templateService.saveAsTemplate(workspaceSlug, projectId, data);
    runInAction(() => {
      set(this.templateMap, [template.id], template);
    });
    return template;
  };
}
