import type { TaskStatus } from '../types/workbench';
import type { WorkbenchAgentTab, WorkbenchTabStatus } from './workbenchTabs';

const AGENT_WORK_SESSIONS_KEY = 'hellome_agent_work_sessions';

type Listener = () => void;

const listeners = new Set<Listener>();

export interface AgentWorkSession {
  id: string;
  projectId: string;
  projectName: string;
  agentId: string;
  agentName: string;
  status: TaskStatus;
  draftInput?: unknown;
  taskId?: string;
  createdAt: string;
  updatedAt: string;
}

function notify(): void {
  listeners.forEach((fn) => fn());
}

export function subscribeAgentSessions(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function normalizeStatus(status: WorkbenchTabStatus | TaskStatus | undefined): TaskStatus {
  if (
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
  return 'draft';
}

function normalizeSession(session: AgentWorkSession & Record<string, unknown>): AgentWorkSession | null {
  if (!session?.id || !session.projectId || !session.agentId) return null;
  const now = new Date().toISOString();
  return {
    id: String(session.id),
    projectId: String(session.projectId),
    projectName: String(session.projectName || '未命名项目'),
    agentId: String(session.agentId),
    agentName: String(session.agentName || session.agentId),
    status: normalizeStatus(session.status),
    draftInput: session.draftInput,
    taskId: typeof session.taskId === 'string' ? session.taskId : undefined,
    createdAt: typeof session.createdAt === 'string' ? session.createdAt : now,
    updatedAt: typeof session.updatedAt === 'string' ? session.updatedAt : now,
  };
}

export function getAgentSessions(): AgentWorkSession[] {
  try {
    const raw = localStorage.getItem(AGENT_WORK_SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AgentWorkSession[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeSession)
      .filter((session): session is AgentWorkSession => Boolean(session))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch {
    return [];
  }
}

export function getProjectAgentSessions(projectId: string): AgentWorkSession[] {
  return getAgentSessions().filter((session) => session.projectId === projectId);
}

function writeAgentSessions(next: AgentWorkSession[]): void {
  localStorage.setItem(AGENT_WORK_SESSIONS_KEY, JSON.stringify(next));
  notify();
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const json = (await response.json()) as { success: boolean; data: T; error?: string };
  if (!response.ok || !json.success) {
    throw new Error(json.error || '请求失败');
  }
  return json.data;
}

function replaceAgentSessions(next: AgentWorkSession[]): void {
  writeAgentSessions(
    next
      .map(normalizeSession)
      .filter((session): session is AgentWorkSession => Boolean(session)),
  );
}

export async function loadAgentSessionsFromServer(): Promise<AgentWorkSession[]> {
  const sessions = await requestJson<AgentWorkSession[]>('/api/work-sessions');
  replaceAgentSessions(sessions);
  return sessions;
}

async function persistAgentSessionToServer(session: AgentWorkSession): Promise<void> {
  await requestJson<AgentWorkSession>('/api/work-sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(session),
  });
}

export function upsertAgentSessionFromTab(
  tab: WorkbenchAgentTab,
  patch: {
    status?: WorkbenchTabStatus | TaskStatus;
    draftInput?: unknown;
    taskId?: string;
  } = {},
): AgentWorkSession {
  const now = new Date().toISOString();
  const sessions = getAgentSessions();
  const existingIndex = sessions.findIndex((session) => session.id === tab.id);
  const existing = existingIndex >= 0 ? sessions[existingIndex] : null;
  const next: AgentWorkSession = {
    id: tab.id,
    projectId: tab.projectId,
    projectName: tab.projectName,
    agentId: tab.agentId,
    agentName: tab.agentName,
    status: normalizeStatus(patch.status || tab.status),
    draftInput: patch.draftInput ?? tab.draftInput ?? existing?.draftInput,
    taskId: patch.taskId ?? tab.taskId ?? existing?.taskId,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  if (existingIndex >= 0) sessions[existingIndex] = next;
  else sessions.unshift(next);
  writeAgentSessions(sessions);
  void persistAgentSessionToServer(next).catch(() => {});
  return next;
}
