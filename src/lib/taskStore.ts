import type { GeoTaskInput, Task, TaskStep } from '../types/workbench';
import { GEO_STEPS } from '../types/workbench';
import { getProject, updateProjectFromGeoInput } from './projectStore';
import { estimateGeoTokens } from './tokenBilling';
import { ensureDemoTasks } from './taskSeed';
import { syncWorkbenchTabFromTask } from './workbenchTabs';

const TASKS_KEY = 'hellome_tasks';
const EMPTY_TASKS: Task[] = [];

type Listener = () => void;
const listeners = new Set<Listener>();

let snapshot: Task[] = EMPTY_TASKS;
let snapshotRaw: string | null = '__init__';

function normalizeTask(raw: Task & Record<string, unknown>): Task {
  const geoInput = isGeoTaskInput(raw.input) ? raw.input : undefined;
  const est =
    raw.estimatedTokenMin != null
      ? { min: Number(raw.estimatedTokenMin), max: Number(raw.estimatedTokenMax) }
      : geoInput
        ? estimateGeoTokens(geoInput)
        : { min: 12000, max: 25000 };

  return {
    ...raw,
    taskScope: raw.projectId || raw.taskScope === 'project' ? 'project' : undefined,
    projectId: typeof raw.projectId === 'string' ? raw.projectId : undefined,
    projectName: typeof raw.projectName === 'string' ? raw.projectName : undefined,
    estimatedTokenMin: est.min,
    estimatedTokenMax: est.max,
    tokenUsed: Number(raw.tokenUsed ?? 0),
    currentTokenUsed: raw.currentTokenUsed != null ? Number(raw.currentTokenUsed) : undefined,
    steps: (raw.steps ?? []).map((s) => ({
      ...s,
      tokenUsed: s.tokenUsed != null ? Number(s.tokenUsed) : undefined,
    })),
  };
}

function isGeoTaskInput(input: Task['input']): input is GeoTaskInput {
  return Boolean(
    input &&
      typeof input === 'object' &&
      'brandName' in input &&
      'websiteUrl' in input,
  );
}

function readTasksFromStorage(): Task[] {
  ensureDemoTasks();
  const raw = localStorage.getItem(TASKS_KEY);
  if (raw === snapshotRaw) return snapshot;

  snapshotRaw = raw;
  if (!raw) {
    snapshot = EMPTY_TASKS;
    return snapshot;
  }

  try {
    const parsed = JSON.parse(raw) as Task[];
    snapshot = Array.isArray(parsed) ? parsed.map((t) => normalizeTask(t as Task & Record<string, unknown>)) : EMPTY_TASKS;
  } catch {
    snapshot = EMPTY_TASKS;
  }
  return snapshot;
}

function notify(): void {
  snapshotRaw = '__stale__';
  listeners.forEach((fn) => fn());
}

export function subscribeTasks(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTasks(): Task[] {
  return readTasksFromStorage();
}

export function getTask(id: string): Task | undefined {
  return getTasks().find((t) => t.id === id);
}

function taskFinishedAt(task: Task): string {
  return task.completedAt ?? task.updatedAt ?? task.createdAt;
}

/** 至少完整运行过一次（任务状态为 completed）的智能体，按最近完成时间倒序 */
export function getFullyRunAgentIds(): string[] {
  const latestByAgent = new Map<string, string>();

  for (const task of getTasks()) {
    if (task.status !== 'completed') continue;
    const finishedAt = taskFinishedAt(task);
    const previous = latestByAgent.get(task.agentType);
    if (!previous || new Date(finishedAt).getTime() > new Date(previous).getTime()) {
      latestByAgent.set(task.agentType, finishedAt);
    }
  }

  return [...latestByAgent.entries()]
    .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())
    .map(([agentId]) => agentId);
}

export function saveTask(task: Task): void {
  const tasks = [...getTasks()];
  const idx = tasks.findIndex((t) => t.id === task.id);
  if (idx >= 0) tasks[idx] = task;
  else tasks.unshift(task);
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  syncWorkbenchTabFromTask(task);
  notify();
}

export function deleteTask(id: string): void {
  const tasks = getTasks().filter((t) => t.id !== id);
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  notify();
}

const RUNNING_STATUSES = new Set(['running', 'waiting_confirmation']);
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

export function getRunningTasksForAgent(agentId: string): Task[] {
  return getTasks().filter((t) => t.agentType === agentId && RUNNING_STATUSES.has(t.status));
}

export function getGlobalActiveTask(exceptTaskId?: string): Task | undefined {
  return getTasks()
    .filter((task) => task.id !== exceptTaskId && RUNNING_STATUSES.has(task.status))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
}

export function getQueuedTasks(): Task[] {
  return getTasks()
    .filter((task) => task.status === 'queued')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function getQueuePosition(taskId: string): number {
  const index = getQueuedTasks().findIndex((task) => task.id === taskId);
  return index >= 0 ? index + 1 : 0;
}

export function getNextQueuedTask(): Task | undefined {
  if (getGlobalActiveTask()) return undefined;
  return getQueuedTasks()[0];
}

export function isTerminalTaskStatus(status: Task['status']): boolean {
  return TERMINAL_STATUSES.has(status);
}

/** 取消智能体下所有进行中的任务，返回取消数量 */
export function cancelRunningTasksForAgent(agentId: string): number {
  const running = getRunningTasksForAgent(agentId);
  for (const task of running) {
    saveTask({
      ...task,
      status: 'cancelled',
      pendingConfirmation: undefined,
    });
  }
  return running.length;
}

function buildSteps(): TaskStep[] {
  return GEO_STEPS.map((name, i) => ({
    id: `step-${i}`,
    name,
    status: 'pending' as const,
  }));
}

export function createGeoTask(
  input: GeoTaskInput,
  options: { projectId: string },
): Task {
  const est = estimateGeoTokens(input);
  const project = getProject(options.projectId);
  if (!project) {
    throw new Error('使用智能体前请先选择项目');
  }
  if (project) {
    updateProjectFromGeoInput(project.id, input);
  }
  const task: Task = {
    id: `task-${Date.now()}`,
    name: `${input.brandName} GEO 可见度检测`,
    agentType: 'geo',
    status: getGlobalActiveTask() ? 'queued' : 'running',
    createdAt: new Date().toISOString(),
    estimatedTokenMin: est.min,
    estimatedTokenMax: est.max,
    tokenUsed: 0,
    currentTokenUsed: 0,
    input,
    steps: buildSteps(),
    logs: [],
    taskScope: 'project',
    projectId: project.id,
    projectName: project.name,
  };
  saveTask(task);
  return task;
}

export function duplicateTask(id: string): Task | undefined {
  const source = getTask(id);
  if (!isGeoTaskInput(source?.input)) return undefined;
  return createGeoTask(source.input, { projectId: source.projectId });
}
