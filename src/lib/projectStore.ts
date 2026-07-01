import type { GeoResultData } from '../types';
import type { GeoTaskInput, ProjectProfile } from '../types/workbench';

const PROJECTS_KEY = 'hellome_projects';
const ACTIVE_PROJECT_KEY = 'hellome_active_project_id';
const AGENT_CONTEXT_KEY = 'hellome_pending_agent_context';

type Listener = () => void;

const listeners = new Set<Listener>();
let snapshot: ProjectProfile[] = [];
let snapshotRaw: string | null = '__init__';

function notify(): void {
  snapshotRaw = '__stale__';
  listeners.forEach((fn) => fn());
}

function readProjectsFromStorage(): ProjectProfile[] {
  const raw = localStorage.getItem(PROJECTS_KEY);
  if (raw === snapshotRaw) return snapshot;

  snapshotRaw = raw;
  if (!raw) {
    snapshot = [];
    return snapshot;
  }

  try {
    const parsed = JSON.parse(raw) as ProjectProfile[];
    snapshot = Array.isArray(parsed) ? parsed.map(normalizeProject) : [];
  } catch {
    snapshot = [];
  }
  return snapshot;
}

function normalizeProject(project: ProjectProfile & Record<string, unknown>): ProjectProfile {
  const now = new Date().toISOString();
  return {
    id: String(project.id),
    name: String(project.name || '未命名项目'),
    description: stringify(project.description),
    brandName: stringify(project.brandName),
    websiteUrl: stringify(project.websiteUrl),
    productIntro: stringify(project.productIntro),
    targetAudience: stringify(project.targetAudience),
    keywords: stringify(project.keywords),
    competitors: stringify(project.competitors),
    sellingPoints: stringify(project.sellingPoints),
    tone: stringify(project.tone),
    notes: stringify(project.notes),
    createdAt: stringify(project.createdAt) || now,
    updatedAt: stringify(project.updatedAt) || now,
  };
}

function stringify(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function writeProjects(projects: ProjectProfile[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  notify();
}

export function subscribeProjects(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getProjects(): ProjectProfile[] {
  return readProjectsFromStorage();
}

export function getProject(id?: string | null): ProjectProfile | undefined {
  if (!id) return undefined;
  return getProjects().find((project) => project.id === id);
}

export function getActiveProjectId(): string {
  return localStorage.getItem(ACTIVE_PROJECT_KEY) || '';
}

export function setActiveProjectId(projectId: string): void {
  if (projectId) localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
  else localStorage.removeItem(ACTIVE_PROJECT_KEY);
  notify();
}

export function createProject(input: {
  name: string;
  brandName?: string;
  websiteUrl?: string;
  keywords?: string;
  competitors?: string;
  productIntro?: string;
  targetAudience?: string;
}): ProjectProfile {
  const now = new Date().toISOString();
  const project: ProjectProfile = {
    id: `project-${Date.now()}`,
    name: input.name.trim() || input.brandName?.trim() || '新项目',
    brandName: input.brandName?.trim() || undefined,
    websiteUrl: input.websiteUrl?.trim() || undefined,
    keywords: input.keywords?.trim() || undefined,
    competitors: input.competitors?.trim() || undefined,
    productIntro: input.productIntro?.trim() || undefined,
    targetAudience: input.targetAudience?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  writeProjects([project, ...getProjects()]);
  setActiveProjectId(project.id);
  return project;
}

export function updateProject(
  projectId: string,
  patch: Partial<Omit<ProjectProfile, 'id' | 'createdAt' | 'updatedAt'>>,
): ProjectProfile | undefined {
  const projects = getProjects();
  const idx = projects.findIndex((project) => project.id === projectId);
  if (idx < 0) return undefined;

  const current = projects[idx];
  const next: ProjectProfile = {
    ...current,
    ...patch,
    name: patch.name?.trim() || current.name,
    brandName: patch.brandName?.trim() || undefined,
    websiteUrl: patch.websiteUrl?.trim() || undefined,
    productIntro: patch.productIntro?.trim() || undefined,
    targetAudience: patch.targetAudience?.trim() || undefined,
    keywords: patch.keywords?.trim() || undefined,
    competitors: patch.competitors?.trim() || undefined,
    sellingPoints: patch.sellingPoints?.trim() || undefined,
    tone: patch.tone?.trim() || undefined,
    notes: patch.notes?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };
  projects[idx] = next;
  writeProjects(projects);
  return next;
}

export function updateProjectFromGeoInput(projectId: string, input: GeoTaskInput): ProjectProfile | undefined {
  const projects = getProjects();
  const idx = projects.findIndex((project) => project.id === projectId);
  if (idx < 0) return undefined;

  const current = projects[idx];
  const next: ProjectProfile = {
    ...current,
    brandName: input.brandName || current.brandName,
    websiteUrl: input.websiteUrl || current.websiteUrl,
    keywords: input.keywords || current.keywords,
    competitors: input.competitors || current.competitors,
    updatedAt: new Date().toISOString(),
  };
  projects[idx] = next;
  writeProjects(projects);
  return next;
}

export function updateProjectFromGeoResult(
  projectId: string | undefined,
  input: GeoTaskInput,
  result: GeoResultData,
): ProjectProfile | undefined {
  if (!projectId) return undefined;
  const projects = getProjects();
  const idx = projects.findIndex((project) => project.id === projectId);
  if (idx < 0) return undefined;

  const current = projects[idx];
  const suggestions = result.actionableSuggestions
    .slice(0, 4)
    .map((item) => `${item.title}：${item.description}`)
    .join('\n');
  const keyCompetitors = result.keyCompetitors.length > 0 ? result.keyCompetitors.join('、') : input.competitors;
  const geoNote = [
    `GEO 最近分析：品牌可见度 ${result.visibilityRate}%，推荐率 ${result.recommendationRate}%，竞品占位 ${result.competitorShare}%。`,
    result.dynamicAnalysis,
    suggestions ? `优化建议：\n${suggestions}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const next: ProjectProfile = {
    ...current,
    brandName: input.brandName || current.brandName,
    websiteUrl: input.websiteUrl || current.websiteUrl,
    keywords: input.keywords || current.keywords,
    competitors: keyCompetitors || current.competitors,
    notes: mergeProjectText(current.notes, geoNote),
    updatedAt: new Date().toISOString(),
  };
  projects[idx] = next;
  writeProjects(projects);
  return next;
}

function mergeProjectText(current: string | undefined, addition: string): string {
  if (!addition.trim()) return current || '';
  if (!current?.trim()) return addition;
  return `${current.trim()}\n\n${addition}`;
}

export function buildGeoInputFromProject(project: ProjectProfile): Partial<GeoTaskInput> {
  return {
    brandName: project.brandName || '',
    websiteUrl: project.websiteUrl || '',
    keywords: project.keywords || '',
    competitors: project.competitors || '',
  };
}

export function formatTaskProjectLabel(task: {
  taskScope?: string;
  projectName?: string;
  projectId?: string;
}): string {
  return task.projectName || getProject(task.projectId)?.name || '未归属项目';
}

export type PendingAgentContext = {
  agentId: string;
  taskScope: 'project';
  projectId: string;
  projectName: string;
  tabId?: string;
  createdAt: string;
};

export function setPendingAgentContext(context: PendingAgentContext): void {
  localStorage.setItem(AGENT_CONTEXT_KEY, JSON.stringify(context));
}

export function consumePendingAgentContext(agentId: string): PendingAgentContext | null {
  const raw = localStorage.getItem(AGENT_CONTEXT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PendingAgentContext;
    if (parsed.agentId !== agentId) return null;
    localStorage.removeItem(AGENT_CONTEXT_KEY);
    return parsed;
  } catch {
    localStorage.removeItem(AGENT_CONTEXT_KEY);
    return null;
  }
}
