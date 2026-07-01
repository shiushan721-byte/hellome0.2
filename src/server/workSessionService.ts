import fs from 'node:fs/promises';
import path from 'node:path';

export type WorkSessionStatus =
  | 'draft'
  | 'queued'
  | 'awaiting_input'
  | 'running'
  | 'waiting_confirmation'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface WorkSessionRecord {
  id: string;
  ownerExternalId: string;
  projectId: string;
  projectName: string;
  agentId: string;
  agentName: string;
  status: WorkSessionStatus;
  draftInput?: unknown;
  taskId?: string;
  createdAt: string;
  updatedAt: string;
}

const storePath = path.join(process.cwd(), '.data', 'work-sessions.json');
let writeQueue = Promise.resolve();

async function readAllSessions(): Promise<WorkSessionRecord[]> {
  try {
    const raw = await fs.readFile(storePath, 'utf8');
    const parsed = JSON.parse(raw) as WorkSessionRecord[];
    return Array.isArray(parsed) ? parsed.map(normalizeSession).filter(Boolean) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function writeAllSessions(sessions: WorkSessionRecord[]): Promise<void> {
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  writeQueue = writeQueue.then(() => fs.writeFile(storePath, JSON.stringify(sessions, null, 2), 'utf8'));
  await writeQueue;
}

function normalizeStatus(status: unknown): WorkSessionStatus {
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

function normalizeSession(session: WorkSessionRecord & Record<string, unknown>): WorkSessionRecord | null {
  if (!session?.id || !session.ownerExternalId || !session.projectId || !session.agentId) return null;
  const now = new Date().toISOString();
  return {
    id: String(session.id),
    ownerExternalId: String(session.ownerExternalId),
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

export async function listWorkSessions(ownerExternalId: string): Promise<WorkSessionRecord[]> {
  const sessions = await readAllSessions();
  return sessions
    .filter((session) => session.ownerExternalId === ownerExternalId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function upsertWorkSession(
  ownerExternalId: string,
  input: Omit<WorkSessionRecord, 'ownerExternalId' | 'createdAt' | 'updatedAt'> & {
    createdAt?: string;
    updatedAt?: string;
  },
): Promise<WorkSessionRecord> {
  if (!input.id.trim() || !input.projectId.trim() || !input.agentId.trim()) {
    throw new Error('工作会话参数不完整');
  }

  const now = new Date().toISOString();
  const sessions = await readAllSessions();
  const existingIndex = sessions.findIndex(
    (session) => session.ownerExternalId === ownerExternalId && session.id === input.id,
  );
  const existing = existingIndex >= 0 ? sessions[existingIndex] : null;
  const next: WorkSessionRecord = {
    id: input.id,
    ownerExternalId,
    projectId: input.projectId,
    projectName: input.projectName || existing?.projectName || '未命名项目',
    agentId: input.agentId,
    agentName: input.agentName || existing?.agentName || input.agentId,
    status: normalizeStatus(input.status),
    draftInput: input.draftInput ?? existing?.draftInput,
    taskId: input.taskId ?? existing?.taskId,
    createdAt: existing?.createdAt || input.createdAt || now,
    updatedAt: now,
  };

  if (existingIndex >= 0) sessions[existingIndex] = next;
  else sessions.unshift(next);
  await writeAllSessions(sessions);
  return next;
}
