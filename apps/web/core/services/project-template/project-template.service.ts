import { API_BASE_URL } from "@plane/constants";
import { APIService } from "@/services/api.service";
import type {
  IApplyTemplatePayload,
  IProjectTemplate,
  IProjectTemplateWrite,
  ISaveAsTemplatePayload,
} from "@plane/types";

export class ProjectTemplateService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async getTemplates(workspaceSlug: string): Promise<IProjectTemplate[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/project-templates/`)
      .then((res) => res?.data)
      .catch((err) => {
        throw err?.response?.data;
      });
  }

  async getTemplate(workspaceSlug: string, templateId: string): Promise<IProjectTemplate> {
    return this.get(`/api/workspaces/${workspaceSlug}/project-templates/${templateId}/`)
      .then((res) => res?.data)
      .catch((err) => {
        throw err?.response?.data;
      });
  }

  async createTemplate(workspaceSlug: string, data: IProjectTemplateWrite): Promise<IProjectTemplate> {
    return this.post(`/api/workspaces/${workspaceSlug}/project-templates/`, data)
      .then((res) => res?.data)
      .catch((err) => {
        throw err?.response?.data;
      });
  }

  async updateTemplate(
    workspaceSlug: string,
    templateId: string,
    data: Partial<IProjectTemplateWrite>
  ): Promise<IProjectTemplate> {
    return this.patch(`/api/workspaces/${workspaceSlug}/project-templates/${templateId}/`, data)
      .then((res) => res?.data)
      .catch((err) => {
        throw err?.response?.data;
      });
  }

  async deleteTemplate(workspaceSlug: string, templateId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/project-templates/${templateId}/`)
      .then((res) => res?.data)
      .catch((err) => {
        throw err?.response?.data;
      });
  }

  async applyTemplate(
    workspaceSlug: string,
    templateId: string,
    data: IApplyTemplatePayload
  ): Promise<{ project_id: string; project_identifier: string }> {
    return this.post(`/api/workspaces/${workspaceSlug}/project-templates/${templateId}/apply/`, data)
      .then((res) => res?.data)
      .catch((err) => {
        throw err?.response?.data;
      });
  }

  async saveAsTemplate(
    workspaceSlug: string,
    projectId: string,
    data: ISaveAsTemplatePayload
  ): Promise<IProjectTemplate> {
    return this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/save-as-template/`, data)
      .then((res) => res?.data)
      .catch((err) => {
        throw err?.response?.data;
      });
  }
}
