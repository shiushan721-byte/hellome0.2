import type { Task } from '../types/workbench';
import type { HermesDynamicSchema, UgcStructuredAnswer, UgcTaskEvent, UgcTaskInput, UgcTaskSchemaResponse } from '../types/ugc';
import type { ResumeDiagnosisResponse, ResumeDraft } from '../types/resume';
import { getUser } from './auth';

type JsonResponse<T> = {
  success: boolean;
  data: T;
  error?: string;
};

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const json = (await response.json()) as JsonResponse<T>;
  if (!response.ok || !json.success) {
    throw new Error(json.error || '请求失败');
  }
  return json.data;
}

export async function uploadTaskFile(file: File): Promise<{
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
}> {
  const formData = new FormData();
  formData.append('file', file);
  return requestJson('/api/uploads', {
    method: 'POST',
    body: formData,
  });
}

export async function createRemoteUgcTask(
  input: UgcTaskInput,
  context?: {
    projectId?: string;
    projectName?: string;
    taskScope?: 'project';
  },
): Promise<Task> {
  const user = getUser();
  const externalId = user.email || user.phone || 'local-user';
  return requestJson('/api/tasks/ugc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input,
      context,
      user: {
        externalId,
        displayName: user.name,
        email: user.email,
        phone: user.phone,
        workspaceName: user.workspace,
      },
    }),
  });
}

export async function createRemoteResumeDiagnosisTask(input: ResumeDraft): Promise<ResumeDiagnosisResponse> {
  const user = getUser();
  const externalId = user.email || user.phone || 'local-user';
  return requestJson('/api/tasks/resume/diagnosis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input,
      user: {
        externalId,
        displayName: user.name,
        email: user.email,
        phone: user.phone,
        workspaceName: user.workspace,
      },
    }),
  });
}

export async function listRemoteTasks(): Promise<Task[]> {
  return requestJson('/api/tasks');
}

export async function getRemoteTask(id: string): Promise<Task & { events: UgcTaskEvent[] }> {
  return requestJson(`/api/tasks/${id}`);
}

export async function confirmRemoteTask(id: string): Promise<Task> {
  return requestJson(`/api/tasks/${id}/confirm`, {
    method: 'POST',
  });
}

export async function retryRemoteTask(id: string): Promise<Task> {
  return requestJson(`/api/tasks/${id}/retry`, {
    method: 'POST',
  });
}

export async function retryRemoteUgcTaskWithInput(id: string, input: UgcTaskInput): Promise<Task> {
  return requestJson(`/api/tasks/${id}/retry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input }),
  });
}

export async function cancelRemoteTask(id: string): Promise<Task> {
  return requestJson(`/api/tasks/${id}/cancel`, {
    method: 'POST',
  });
}

export async function deleteRemoteTask(id: string): Promise<void> {
  await requestJson(`/api/tasks/${id}`, {
    method: 'DELETE',
  });
}

export async function listRemoteTaskEvents(id: string): Promise<UgcTaskEvent[]> {
  return requestJson(`/api/tasks/${id}/events`);
}

export async function runHermesDebug(prompt?: string): Promise<{
  available: boolean;
  version: string | null;
  stdout: string;
  stderr: string;
  command: string;
}> {
  return requestJson('/api/hermes/debug-run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      recipe: 'UGC Video Factory',
    }),
  });
}

export async function getHermesRuntime(): Promise<{
  cliAvailable: boolean;
  appInstalled: boolean;
  version: string | null;
  recommendedMode: 'backend_silent' | 'local_debug';
  note: string;
}> {
  return requestJson('/api/runtime/hermes');
}

// =============================================================================
// v1.1: Schema-first 流程的 4 个 API
// =============================================================================
//
// createUgcTaskV2 + fetchRemoteTaskSchema + pollRemoteTaskSchema + submitUgcTaskAnswers
// 对应后端 POST /api/tasks/ugc/v2 + GET /api/tasks/:id/schema + POST /api/tasks/:id/answers

/**
 * 第 1 阶段:创建"等待参数"任务。后端会异步调 Hermes 拿 schema。
 *
 * sellingPoint 留空(老 endpoint 必填,新 endpoint 不需要)。
 * 返回的 task.status === 'awaiting_input'。
 */
export async function createUgcTaskV2(input: {
  skillId: string;
  rawContext?: Record<string, unknown>;
}): Promise<Task> {
  const user = getUser();
  const externalId = user.email || user.phone || 'local-user';
  return requestJson('/api/tasks/ugc/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      skillId: input.skillId,
      rawContext: input.rawContext,
      user: {
        externalId,
        displayName: user.name,
        email: user.email,
        phone: user.phone,
        workspaceName: user.workspace,
      },
    }),
  });
}

/**
 * 第 2 阶段:轮询一次。返回 ready=true 时 schema 已就绪。
 */
export async function fetchRemoteTaskSchema(taskId: string): Promise<UgcTaskSchemaResponse> {
  return requestJson(`/api/tasks/${taskId}/schema`);
}

/**
 * 第 2 阶段:持续轮询直到 ready=true 或 timeout。
 *
 * 默认 30 秒超时、500ms 间隔。
 */
export async function pollRemoteTaskSchema(
  taskId: string,
  options: { timeoutMs?: number; intervalMs?: number; onTick?: (hint?: string) => void } = {},
): Promise<HermesDynamicSchema> {
  const timeout = options.timeoutMs ?? 30_000;
  const interval = options.intervalMs ?? 500;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const resp = await fetchRemoteTaskSchema(taskId);
      if (resp.ready && resp.schema) {
        return resp.schema;
      }
      options.onTick?.(resp.pendingHint);
    } catch (err) {
      // 404 = task 还没建好,继续轮询
      options.onTick?.(String(err));
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`Schema polling timed out after ${timeout}ms for task ${taskId}`);
}

/**
 * 第 3 阶段:提交结构化答案。后端校验 + 触发老执行流。
 */
export async function submitUgcTaskAnswers(
  taskId: string,
  answers: UgcStructuredAnswer[],
): Promise<Task> {
  return requestJson(`/api/tasks/${taskId}/answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  });
}
