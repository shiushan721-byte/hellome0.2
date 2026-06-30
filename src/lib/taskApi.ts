import type { Task } from '../types/workbench';
import type { HermesDynamicSchema, UgcStructuredAnswer, UgcTaskEvent, UgcTaskInput, UgcTaskSchemaResponse } from '../types/ugc';
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
