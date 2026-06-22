export type TTemplateCategory = string;

export type TTemplateStateGroup = "backlog" | "unstarted" | "started" | "completed" | "cancelled";

export type TTemplatePriority = "urgent" | "high" | "medium" | "low" | "none";

export interface ITemplateState {
  id: string;
  name: string;
  color: string;
  group: TTemplateStateGroup;
  sequence: number;
  is_default: boolean;
}

export interface ITemplateLabel {
  id: string;
  name: string;
  color: string;
}

export interface ITemplateTask {
  id: string;
  title: string;
  description: string;
  priority: TTemplatePriority;
  label_name: string | null;
  sequence: number;
  estimated_cost: string | null;
}

export interface IProjectTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string | null;
  category: TTemplateCategory;
  cover_image_url: string | null;
  usage_count: number;
  states: ITemplateState[];
  labels: ITemplateLabel[];
  tasks: ITemplateTask[];
  created_at: string;
  updated_at: string;
}

export interface IProjectTemplateWrite {
  name: string;
  description?: string;
  emoji?: string | null;
  category?: TTemplateCategory;
  cover_image_url?: string | null;
  states?: Omit<ITemplateState, "id">[];
  labels?: Omit<ITemplateLabel, "id">[];
  tasks?: Omit<ITemplateTask, "id">[];
}

export interface IApplyTemplatePayload {
  name: string;
  event_date: string;
  budget_total?: string | null;
  logo_props?: Record<string, any> | null;
}

export interface ISaveAsTemplatePayload {
  name: string;
  category: TTemplateCategory;
  description?: string;
  emoji?: string | null;
}

// Подсказки по умолчанию — пользователь может ввести свою категорию
export const TEMPLATE_CATEGORY_SUGGESTIONS: string[] = [
  "Корпоратив",
  "Конференция",
  "Тимбилдинг",
  "Обучение",
  "Другое",
];
