import type { EnabledAgentSummary } from '../types/homeDashboard';
import type { Task, TaskStatus } from '../types/workbench';
import { getAgentById } from '../data/agentsCatalog';
import { upsertAgentSessionFromTab } from './agentSessionStore';
import { getProject } from './projectStore';

export const WORKBENCH_TABS_MIGRATION_KEY = 'hellome_workbench_tabs_v2';

export const WORKBENCH_PROJECT_TABS_KEY = 'hellome_workbench_project_tabs';
export const WORKBENCH_HIDDEN_TABS_KEY = 'hellome_workbench_hidden_tabs';
export const WORKBENCH_TAB_ORDER_KEY = 'hellome_workbench_tab_order';
export const WORKBENCH_LAST_AGENT_KEY = 'hellome_workbench_last_agent';
export const WORKBENCH_PINNED_TABS_KEY = 'hellome_workbench_pinned_tabs';
export const WORKBENCH_LAST_TAB_KEY = 'hellome_workbench_last_tab';

export type WorkbenchTabStatus =
  | 'opened'
  | 'draft'
  | 'queued'
  | 'awaiting_input'
  | 'running'
  | 'waiting_confirmation'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface WorkbenchAgentTab {
  id: string;
  projectAgentKey: string;
  agentId: string;
  agentName: string;
  projectId: string;
  projectName: string;
  status: WorkbenchTabStatus;
  draftInput?: unknown;
  taskId?: string;
  openedAt: string;
  updatedAt: string;
}

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((fn) => fn());
}

export function subscribeWorkbenchTabs(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function migrateWorkbenchTabsIfNeeded(): void {
  if (typeof window === 'undefined') return;
  if (window.localStorage.getItem(WORKBENCH_TABS_MIGRATION_KEY) === '1') return;

  // 旧版会把全部可用智能体展示为标签；重置为仅用户主动打开后才出现标签
  window.localStorage.removeItem(WORKBENCH_TAB_ORDER_KEY);
  window.localStorage.removeItem(WORKBENCH_HIDDEN_TABS_KEY);
  window.localStorage.removeItem(WORKBENCH_PINNED_TABS_KEY);
  window.localStorage.removeItem(WORKBENCH_LAST_AGENT_KEY);
  window.localStorage.setItem(WORKBENCH_TABS_MIGRATION_KEY, '1');
  notify();
}

function readStringArray(key: string): string[] {
  migrateWorkbenchTabsIfNeeded();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readProjectTabs(): WorkbenchAgentTab[] {
  migrateWorkbenchTabsIfNeeded();
  try {
    const raw = localStorage.getItem(WORKBENCH_PROJECT_TABS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WorkbenchAgentTab[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeProjectTab)
      .filter((tab): tab is WorkbenchAgentTab => Boolean(tab));
  } catch {
    return [];
  }
}

function normalizeProjectTab(tab: WorkbenchAgentTab & Record<string, unknown>): WorkbenchAgentTab | null {
  if (!tab?.agentId || !tab.projectId) return null;
  const agent = getAgentById(String(tab.agentId));
  const project = getProject(String(tab.projectId));
  const now = new Date().toISOString();
  return {
    id:
      typeof tab.id === 'string' && tab.id.includes('::')
        ? tab.id
        : buildWorkbenchTabId(String(tab.projectId), String(tab.agentId)),
    projectAgentKey: buildProjectAgentKey(String(tab.projectId), String(tab.agentId)),
    agentId: String(tab.agentId),
    agentName: String(tab.agentName || agent?.name || tab.agentId),
    projectId: String(tab.projectId),
    projectName: String(tab.projectName || project?.name || '未命名项目'),
    status: normalizeTabStatus(tab.status),
    draftInput: tab.draftInput,
    taskId: typeof tab.taskId === 'string' ? tab.taskId : undefined,
    openedAt: typeof tab.openedAt === 'string' ? tab.openedAt : now,
    updatedAt: typeof tab.updatedAt === 'string' ? tab.updatedAt : now,
  };
}

function normalizeTabStatus(status: unknown): WorkbenchTabStatus {
  if (
    status === 'opened' ||
    status === 'draft' ||
    status === 'queued' ||
    status === 'awaiting_input' ||
    status === 'running' ||
    status === 'waiting_confirmation' ||
    status === 'completed' ||
    status === 'failed' ||
    status === 'cancelled'
  ) {
    return status;
  }
  return 'opened';
}

function writeProjectTabs(next: WorkbenchAgentTab[]): void {
  localStorage.setItem(WORKBENCH_PROJECT_TABS_KEY, JSON.stringify(next));
  notify();
}

function writeStringArray(key: string, next: string[]): void {
  localStorage.setItem(key, JSON.stringify(next));
  notify();
}

export function getHiddenTabIds(): string[] {
  return readStringArray(WORKBENCH_HIDDEN_TABS_KEY);
}

export function getTabOrder(): string[] {
  const projectTabs = readProjectTabs();
  if (projectTabs.length > 0) {
    return Array.from(new Set(projectTabs.map((tab) => tab.agentId)));
  }
  return readStringArray(WORKBENCH_TAB_ORDER_KEY);
}

export function getPinnedTabIds(): string[] {
  return readStringArray(WORKBENCH_PINNED_TABS_KEY);
}

/** 智能体标签是否已在工作台标签栏中打开 */
export function isAgentTabOpen(agentId: string): boolean {
  return getVisibleWorkbenchTabs().some((tab) => tab.agentId === agentId) || getVisibleRecentAgentIds().includes(agentId);
}

export function isTabVisible(agentId: string): boolean {
  return !getHiddenTabIds().includes(agentId);
}

export function showAgentTab(agentId: string): void {
  writeStringArray(
    WORKBENCH_HIDDEN_TABS_KEY,
    getHiddenTabIds().filter((id) => id !== agentId),
  );
}

export function hideAgentTab(agentId: string): void {
  writeStringArray(
    WORKBENCH_HIDDEN_TABS_KEY,
    Array.from(new Set([...getHiddenTabIds(), agentId])),
  );
}

/** 关闭工作台标签：隐藏标签并更新最近打开记录 */
export function closeAgentTab(agentId: string): void {
  const projectTabs = readProjectTabs();
  const matching = projectTabs.filter((tab) => tab.agentId === agentId).map((tab) => tab.id);
  if (matching.length > 0) {
    writeProjectTabs(projectTabs.filter((tab) => tab.agentId !== agentId));
  }
  hideAgentTab(agentId);
  const visible = getVisibleRecentAgentIds();
  if (getLastOpenedAgentId() === agentId) {
    const fallback = visible[visible.length - 1] ?? null;
    if (fallback) setLastOpenedAgentId(fallback);
    else {
      localStorage.removeItem(WORKBENCH_LAST_AGENT_KEY);
      notify();
    }
  }
}

export function setTabOrder(order: string[]): void {
  writeStringArray(WORKBENCH_TAB_ORDER_KEY, order);
}

export function setLastOpenedAgentId(agentId: string): void {
  localStorage.setItem(WORKBENCH_LAST_AGENT_KEY, agentId);
  notify();
}

export function getLastOpenedAgentId(): string | null {
  return localStorage.getItem(WORKBENCH_LAST_AGENT_KEY);
}

/** 最近打开且未关闭的智能体标签 ID */
export function getVisibleRecentAgentIds(): string[] {
  const projectAgentIds = getVisibleWorkbenchTabs().map((tab) => tab.agentId);
  if (projectAgentIds.length > 0) {
    return Array.from(new Set(projectAgentIds));
  }
  const hidden = new Set(getHiddenTabIds());
  return getTabOrder().filter((id) => !hidden.has(id));
}

export function sortRecentAgentSummaries(agents: EnabledAgentSummary[]): EnabledAgentSummary[] {
  const hidden = getHiddenTabIds();
  const order = getTabOrder();
  const pinned = new Set(getPinnedTabIds());
  const orderMap = new Map(order.map((id, idx) => [id, idx]));

  return agents
    .filter((agent) => order.includes(agent.agentId) && !hidden.includes(agent.agentId))
    .sort((a, b) => {
      const pinDiff = Number(pinned.has(b.agentId)) - Number(pinned.has(a.agentId));
      if (pinDiff !== 0) return pinDiff;
      const aIdx = orderMap.get(a.agentId) ?? Number.MAX_SAFE_INTEGER;
      const bIdx = orderMap.get(b.agentId) ?? Number.MAX_SAFE_INTEGER;
      return aIdx - bIdx;
    });
}

/** @deprecated 使用 sortRecentAgentSummaries */
export function getVisibleEnabledAgents(agents: EnabledAgentSummary[]): EnabledAgentSummary[] {
  return sortRecentAgentSummaries(agents);
}

export function findAdjacentVisibleTabId(
  closingAgentId: string,
): string | null {
  const visibleIds = getVisibleRecentAgentIds();
  const idx = visibleIds.indexOf(closingAgentId);
  if (idx < 0) return visibleIds[0] ?? null;
  return visibleIds[idx + 1] ?? visibleIds[idx - 1] ?? null;
}

export function buildProjectAgentKey(projectId: string, agentId: string): string {
  return `${projectId}::${agentId}`;
}

export function buildWorkbenchTabId(projectId: string, agentId: string): string {
  return `${buildProjectAgentKey(projectId, agentId)}::${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getVisibleWorkbenchTabs(): WorkbenchAgentTab[] {
  return readProjectTabs()
    .sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime());
}

export function getWorkbenchTab(tabId: string): WorkbenchAgentTab | undefined {
  return readProjectTabs().find((tab) => tab.id === tabId);
}

export function getWorkbenchTabForProjectAgent(
  projectId: string | undefined,
  agentId: string,
): WorkbenchAgentTab | undefined {
  if (!projectId) return undefined;
  const key = buildProjectAgentKey(projectId, agentId);
  return getVisibleWorkbenchTabs()
    .filter((tab) => tab.projectAgentKey === key || (tab.projectId === projectId && tab.agentId === agentId))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
}

export function getActiveWorkbenchTaskTab(exceptTabId?: string): WorkbenchAgentTab | undefined {
  return getVisibleWorkbenchTabs().find(
    (tab) =>
      tab.id !== exceptTabId &&
      (tab.status === 'running' ||
        tab.status === 'waiting_confirmation' ||
        tab.status === 'awaiting_input' ||
        tab.status === 'queued'),
  );
}

export function getLastOpenedTabId(): string | null {
  return localStorage.getItem(WORKBENCH_LAST_TAB_KEY);
}

export function openWorkbenchTab(input: {
  agentId: string;
  agentName?: string;
  projectId: string;
  projectName?: string;
  tabId?: string;
  status?: WorkbenchTabStatus;
  draftInput?: unknown;
  taskId?: string;
}): WorkbenchAgentTab {
  const now = new Date().toISOString();
  const agent = getAgentById(input.agentId);
  const project = getProject(input.projectId);
  const id = input.tabId || buildWorkbenchTabId(input.projectId, input.agentId);
  const tabs = readProjectTabs();
  const existingIndex = tabs.findIndex((tab) => tab.id === id);
  const existing = existingIndex >= 0 ? tabs[existingIndex] : null;
  const next: WorkbenchAgentTab = {
    id,
    projectAgentKey: buildProjectAgentKey(input.projectId, input.agentId),
    agentId: input.agentId,
    agentName: input.agentName || existing?.agentName || agent?.name || input.agentId,
    projectId: input.projectId,
    projectName: input.projectName || existing?.projectName || project?.name || '未命名项目',
    status: input.status || existing?.status || 'opened',
    draftInput: input.draftInput ?? existing?.draftInput,
    taskId: input.taskId ?? existing?.taskId,
    openedAt: existing?.openedAt || now,
    updatedAt: now,
  };

  if (existingIndex >= 0) tabs[existingIndex] = next;
  else tabs.push(next);
  writeProjectTabs(tabs);
  localStorage.setItem(WORKBENCH_LAST_TAB_KEY, id);
  setLastOpenedAgentId(input.agentId);
  return next;
}

export function markWorkbenchTabDraft(input: {
  agentId: string;
  projectId: string;
  tabId?: string;
  agentName?: string;
  projectName?: string;
  draftInput: unknown;
}): void {
  const current = input.tabId ? getWorkbenchTab(input.tabId) : getWorkbenchTabForProjectAgent(input.projectId, input.agentId);
  const tab = openWorkbenchTab({
    ...input,
    tabId: input.tabId,
    status: current?.status && current.status !== 'opened' ? current.status : 'draft',
  });
  upsertAgentSessionFromTab(tab, {
    status: tab.status,
    draftInput: input.draftInput,
  });
}

export function attachWorkbenchTabTask(input: {
  agentId: string;
  projectId: string;
  tabId?: string;
  agentName?: string;
  projectName?: string;
  taskId: string;
  status: TaskStatus | WorkbenchTabStatus;
}): void {
  const tab = openWorkbenchTab({
    agentId: input.agentId,
    agentName: input.agentName,
    projectId: input.projectId,
    projectName: input.projectName,
    tabId: input.tabId,
    taskId: input.taskId,
    status: normalizeTabStatus(input.status),
  });
  upsertAgentSessionFromTab(tab, {
    status: tab.status,
    taskId: input.taskId,
  });
}

export function syncWorkbenchTabFromTask(task: Task): void {
  if (!task.projectId) return;
  const existing =
    readProjectTabs().find((tab) => tab.taskId === task.id) ??
    getWorkbenchTabForProjectAgent(task.projectId, task.agentType);
  attachWorkbenchTabTask({
    agentId: task.agentType,
    projectId: task.projectId,
    tabId: existing?.id,
    projectName: task.projectName,
    taskId: task.id,
    status: task.status,
  });
}

export function closeWorkbenchTab(tabId: string): WorkbenchAgentTab | null {
  const tabs = readProjectTabs();
  const idx = tabs.findIndex((tab) => tab.id === tabId);
  if (idx < 0) return null;
  const [closed] = tabs.splice(idx, 1);
  writeProjectTabs(tabs);
  if (getLastOpenedTabId() === tabId) {
    const fallback = tabs[idx] ?? tabs[idx - 1] ?? null;
    if (fallback) {
      localStorage.setItem(WORKBENCH_LAST_TAB_KEY, fallback.id);
      setLastOpenedAgentId(fallback.agentId);
    } else {
      localStorage.removeItem(WORKBENCH_LAST_TAB_KEY);
      localStorage.removeItem(WORKBENCH_LAST_AGENT_KEY);
      notify();
    }
  }
  return tabs[idx] ?? tabs[idx - 1] ?? closed ?? null;
}

export function setWorkbenchTabOrder(tabIds: string[]): void {
  const tabs = readProjectTabs();
  if (tabs.length === 0) return;
  const orderMap = new Map(tabIds.map((id, idx) => [id, idx]));
  const base = Date.now() - tabs.length * 1000;
  const next = [...tabs].sort((a, b) => {
    const aIdx = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bIdx = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (aIdx !== bIdx) return aIdx - bIdx;
    return new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime();
  }).map((tab, idx) => ({
    ...tab,
    openedAt: new Date(base + idx * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  writeProjectTabs(next);
}

export function openAgentTab(agentId: string): void {
  showAgentTab(agentId);
  const order = getTabOrder();
  if (!order.includes(agentId)) {
    setTabOrder([...order, agentId]);
  }
  setLastOpenedAgentId(agentId);
}

export function pruneWorkbenchTabs(validAgentIds: Set<string>): void {
  const projectTabs = readProjectTabs().filter((tab) => validAgentIds.has(tab.agentId));
  if (projectTabs.length !== readProjectTabs().length) {
    writeProjectTabs(projectTabs);
  }
  const hidden = getHiddenTabIds().filter((id) => validAgentIds.has(id));
  const order = getTabOrder().filter((id) => validAgentIds.has(id));
  if (hidden.length !== getHiddenTabIds().length) {
    writeStringArray(WORKBENCH_HIDDEN_TABS_KEY, hidden);
  }
  if (order.length !== getTabOrder().length) {
    writeStringArray(WORKBENCH_TAB_ORDER_KEY, order);
  }
}

/** 清空工作台标签（首次进入 / 调试重置） */
export function clearWorkbenchTabs(): void {
  localStorage.removeItem(WORKBENCH_PROJECT_TABS_KEY);
  localStorage.removeItem(WORKBENCH_TAB_ORDER_KEY);
  localStorage.removeItem(WORKBENCH_HIDDEN_TABS_KEY);
  localStorage.removeItem(WORKBENCH_LAST_AGENT_KEY);
  localStorage.removeItem(WORKBENCH_LAST_TAB_KEY);
  localStorage.removeItem(WORKBENCH_PINNED_TABS_KEY);
  notify();
}
