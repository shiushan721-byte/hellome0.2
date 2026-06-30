import { Prisma } from '@prisma/client';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import type { Task, TaskStep, TaskStatus, HermesLogEntry } from '../types/workbench';
import type {
  HermesDynamicSchema,
  TaskExecutionMode,
  TaskPauseReasonType,
  UgcRoutePlan,
  TaskResumeMode,
  TaskRecoveryState,
  UgcStructuredAnswer,
  UgcSystemUnderstanding,
  UgcTaskArtifact,
  UgcTaskEvent,
  UgcTaskInput,
} from '../types/ugc';
import { normalizeHermesRunPayload, type HermesStructuredRun } from './hermesContract';
import { createExecutionGrant, revokeActiveGrantsForTask } from './executionGrantService';
import { getSkillExperienceConfig, resolvePublishedSkillBinding, resolveSkillRoutePlan } from './skillStudioService';
import { presentUgcTask } from './taskPresenter';
import { deriveTaskRunState } from './taskStateMachine';
import { getPrismaClient } from './db/prisma';
import { isFallbackAllowed } from './db/runtime';
import { generateAudio } from './adapters/audioAdapter';
import type { SkillModelSelectionConfig } from '../types/skills';
import { resolvePrimaryVideoArtifact } from '../lib/mediaTaskPresentation';

const execFileAsync = promisify(execFile);
const HERMES_LOCAL_GEN_SCRIPT = path.join(
  process.env.HOME ?? '',
  '.hermes',
  'skills',
  'creative',
  'local-gen',
  'scripts',
  'run.py',
);
const PUBLIC_MEDIA_DIR = path.resolve(process.cwd(), 'public', 'media');
const DEFAULT_SKILL_MODELS: SkillModelSelectionConfig = {
  imageModel: 'z-image-turbo',
  videoModel: 'wan22-5b',
  audioModel: 'tts_chatterbox_api',
  audioEnabled: true,
};

const UGC_STEPS = [
  { key: 'understanding', title: '理解需求' },
  { key: 'script', title: '生成脚本' },
  { key: 'shots', title: '规划镜头' },
  { key: 'assets', title: '生成人物 / 产品镜头' },
  { key: 'composite', title: '合成样片' },
  { key: 'delivery', title: '导出交付包' },
] as const;

type TaskAggregate = {
  task: Task;
  input: UgcTaskInput;
  userExternalId: string;
  workspaceSlug: string;
  skillId?: string;
  skillVersionId?: string;
  skillChecksum?: string;
  executionGrantId?: string;
  /// 🆕 v1.1: Hermes 返回的动态参数 schema
  schemaPayload?: import('../types/ugc').HermesDynamicSchema;
  /// 🆕 v1.1: 用户提交的结构化答案
  structuredAnswers?: Record<string, import('../types/ugc').UgcStructuredAnswer>;
  events: UgcTaskEvent[];
  attempt: number;
  startedAt?: string;
  completedAt?: string;
  executions: Array<{
    id: string;
    mode: TaskExecutionMode;
    recipe: string;
    requestId?: string;
    command?: string;
    stdout?: string;
    stderr?: string;
    status: string;
    pauseReasonType?: TaskPauseReasonType;
    pauseReasonMessage?: string;
    resumeMode?: TaskResumeMode;
    recoverable?: boolean;
    artifactsPreserved?: string[];
    willChargeAgain?: boolean;
    createdAt: string;
    metadata?: Record<string, unknown>;
  }>;
};

type RecoveryPayloadSnapshot = {
  understanding?: UgcSystemUnderstanding;
  routePlan?: UgcRoutePlan;
  pendingConfirmation?: Task['pendingConfirmation'] | null;
  recoveryState?: TaskRecoveryState | null;
};

type CreateTaskPayload = {
  input: UgcTaskInput;
  userExternalId: string;
  displayName?: string;
  email?: string;
  phone?: string;
  workspaceName?: string;
  context?: {
    projectId?: string;
    projectName?: string;
    taskScope?: 'project';
  };
};

type DebugRunPayload = {
  prompt?: string;
  recipe?: string;
};

type HermesLocalGenResult = {
  status: 'ok';
  prompt_id: string;
  model: string;
  task: 'txt2img' | 'txt2video' | 'img2video' | 'edit';
  elapsed_s: number;
  outputs: Array<{
    file?: string;
    url?: string;
    size_bytes?: number;
    type?: string;
    node_id?: string;
    error?: string;
  }>;
};

const terminalStatuses = new Set<TaskStatus>(['completed', 'failed', 'cancelled']);
const activeRuns = new Set<string>();
const memoryStore = new Map<string, TaskAggregate>();

function requirePersistenceFallback(): boolean {
  return !getPrismaClient() && isFallbackAllowed();
}

function nowIso(): string {
  return new Date().toISOString();
}

function formatLogTimestamp(iso: string): string {
  return new Date(iso).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildSteps(status: TaskStatus = 'draft'): TaskStep[] {
  return UGC_STEPS.map((step, index) => ({
    id: `ugc-step-${index}`,
    name: step.title,
    status:
      status === 'running' && index === 0
        ? 'active'
        : status === 'completed'
          ? 'completed'
          : 'pending',
  }));
}

function toStoredRecoverySnapshot(task: Task): RecoveryPayloadSnapshot {
  return {
    understanding: task.understanding,
    routePlan: task.routePlan,
    pendingConfirmation: task.pendingConfirmation ?? null,
    recoveryState: task.recoveryState ?? null,
  };
}

function fromStoredRecoverySnapshot(snapshot: RecoveryPayloadSnapshot, task: Task): Task {
  return {
    ...task,
    understanding: snapshot.understanding ?? task.understanding,
    routePlan: snapshot.routePlan ?? task.routePlan,
    pendingConfirmation: snapshot.pendingConfirmation ?? task.pendingConfirmation,
    recoveryState: snapshot.recoveryState ?? task.recoveryState,
  };
}

function getExecutionRecoveryFields(run: HermesStructuredRun) {
  return {
    pauseReasonType: run.pauseReasonType,
    pauseReasonMessage: run.pauseReasonMessage,
    resumeMode: run.resumeMode,
    recoverable: run.recoverable,
    artifactsPreserved: run.artifactsPreserved,
    willChargeAgain: run.costStatus.willChargeAgain,
  };
}

function applyStructuredRunState(record: TaskAggregate, structuredRun: HermesStructuredRun, currentStatus: Exclude<TaskStatus, 'draft'>): void {
  const derived = deriveTaskRunState({
    currentStatus,
    hermes: structuredRun,
  });

  record.task.status = derived.status;
  record.task.pendingConfirmation = derived.pendingConfirmation;
  record.task.recoveryState = derived.recoveryState;

  if (record.executions[0]) {
    record.executions[0] = {
      ...record.executions[0],
      status: structuredRun.runState,
      ...getExecutionRecoveryFields(structuredRun),
      metadata: {
        ...(record.executions[0].metadata ?? {}),
        structuredRunState: structuredRun.runState,
      },
    };
  }
}

function createUnderstanding(input: UgcTaskInput): UgcSystemUnderstanding {
  const platformTone: Record<string, string> = {
    抖音: '节奏更快、首秒抓人、口播更直接',
    小红书: '更像真人种草、注重场景感和真实体验',
    视频号: '兼顾信任感、讲解感和轻转化',
  };

  return {
    targetAudience: '25-35 岁高频刷短视频、愿意看真人试用反馈的消费用户',
    videoStyle: `${input.effectGoal}，${platformTone[input.platform] ?? '先种草再转化'}`,
    coreAngle: input.sellingPoint,
    outputGoal: `${input.platform} 10 秒 9:16 UGC 样片`,
    draftScript: `开场先展示真实使用场景，再用一句“${input.sellingPoint}”打核心记忆点，最后给出轻行动引导。`,
  };
}

function skillLabel(skillId?: string): string {
  if (skillId === 'media-review') return '测评讲解视频';
  if (skillId === 'media-conversion') return '带货转化视频';
  if (skillId === 'media-showcase') return '品牌宣传视频';
  if (skillId === 'media-demo') return '产品演示视频';
  if (skillId === 'media-proposal') return '客户提案视频';
  if (skillId === 'media-seeding') return '新品种草视频';
  return 'UGC 视频广告';
}

function buildArtifacts(taskId: string): UgcTaskArtifact[] {
  return [
    {
      id: `${taskId}-video`,
      type: 'video',
      label: '样片视频',
      fileName: 'sample-video.mp4',
      mimeType: 'video/mp4',
    },
    {
      id: `${taskId}-cover`,
      type: 'image',
      label: '封面首帧',
      fileName: 'cover-frame.png',
      mimeType: 'image/png',
    },
    {
      id: `${taskId}-script`,
      type: 'script',
      label: '脚本草案',
      fileName: 'script.md',
      mimeType: 'text/markdown',
    },
    {
      id: `${taskId}-summary`,
      type: 'report',
      label: '交付摘要',
      fileName: 'delivery-summary.pdf',
      mimeType: 'application/pdf',
    },
  ];
}

function toPublicArtifactUrl(absoluteFile: string): string {
  const normalized = path.normalize(absoluteFile);
  const relative = path.relative(process.cwd(), normalized).split(path.sep).join('/');
  if (!relative.startsWith('public/')) {
    throw new Error(`产物路径不在 public 目录内：${absoluteFile}`);
  }
  return relative;
}

function resolveTaskBundleDir(taskId: string): string {
  return path.join(PUBLIC_MEDIA_DIR, taskId);
}

function resolveUploadedFilePath(fileUrl?: string): string | undefined {
  if (!fileUrl) return undefined;
  const normalized = fileUrl.replace(/^\//, '');
  if (normalized.startsWith('public/')) {
    return path.resolve(process.cwd(), normalized);
  }
  if (normalized.startsWith('uploads/')) {
    return path.resolve(process.cwd(), 'public', normalized);
  }
  return undefined;
}

function sanitizeSelectedHermesModel(selectedModel?: string): string | undefined {
  const normalized = selectedModel?.trim();
  if (!normalized || normalized.startsWith('local/')) return undefined;
  return normalized;
}

function chooseHermesVideoModel(input: UgcTaskInput, hasInputImage: boolean, selectedModel?: string): string {
  const normalizedSelectedModel = sanitizeSelectedHermesModel(selectedModel);
  if (normalizedSelectedModel) {
    if (hasInputImage && normalizedSelectedModel === 'ltx-2b') {
      return process.env.HERMES_I2V_MODEL?.trim() || 'wan22-5b';
    }
    return normalizedSelectedModel;
  }
  if (hasInputImage) return process.env.HERMES_I2V_MODEL?.trim() || 'wan22-5b';
  if (input.effectGoal.includes('高质量') || input.platform === '视频号') {
    return process.env.HERMES_T2V_QUALITY_MODEL?.trim() || 'wan22-5b';
  }
  return process.env.HERMES_T2V_MODEL?.trim() || 'ltx-2b';
}

function chooseHermesImageModel(selectedModel?: string): string {
  const normalizedSelectedModel = sanitizeSelectedHermesModel(selectedModel);
  if (normalizedSelectedModel) return normalizedSelectedModel;
  return process.env.HERMES_T2I_MODEL?.trim() || 'z-image-turbo';
}

function resolveTaskModelSelection(record: TaskAggregate): SkillModelSelectionConfig {
  const raw = record.executions[0]?.metadata?.skillModels;
  if (!raw || typeof raw !== 'object') return DEFAULT_SKILL_MODELS;
  const value = raw as Record<string, unknown>;
  return {
    imageModel: typeof value.imageModel === 'string' && value.imageModel.trim()
      ? value.imageModel
      : DEFAULT_SKILL_MODELS.imageModel,
    videoModel: typeof value.videoModel === 'string' && value.videoModel.trim()
      ? value.videoModel
      : DEFAULT_SKILL_MODELS.videoModel,
    audioModel: typeof value.audioModel === 'string' && value.audioModel.trim()
      ? value.audioModel
      : DEFAULT_SKILL_MODELS.audioModel,
    audioEnabled: typeof value.audioEnabled === 'boolean'
      ? value.audioEnabled
      : DEFAULT_SKILL_MODELS.audioEnabled,
  };
}

function buildVideoPrompt(input: UgcTaskInput): string {
  return [
    `${input.platform} 9:16 UGC 短视频广告`,
    `核心卖点：${input.sellingPoint}`,
    `风格目标：${input.effectGoal}`,
    '真实中文口播感、自然手持镜头、商品特写、首秒抓人、适合正式交付预览',
  ]
    .filter(Boolean)
    .join('；');
}

function buildCoverPrompt(input: UgcTaskInput): string {
  return [
    '9:16 视频封面首帧',
    input.sellingPoint,
    input.effectGoal,
    '真实 UGC 主播感，近景半身，商品展示明确，适合抖音/小红书封面',
  ]
    .filter(Boolean)
    .join('，');
}

async function detectArtifactFormat(filePath: string): Promise<{ ext: string; mimeType: string }> {
  const handle = await fs.open(filePath, 'r');
  try {
    const header = Buffer.alloc(16);
    await handle.read(header, 0, header.length, 0);
    if (header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) {
      return { ext: 'webm', mimeType: 'video/webm' };
    }
    if (header.subarray(0, 4).toString('ascii') === 'RIFF' && header.subarray(8, 12).toString('ascii') === 'WEBP') {
      return { ext: 'webp', mimeType: 'image/webp' };
    }
    if (header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      return { ext: 'png', mimeType: 'image/png' };
    }
  } finally {
    await handle.close();
  }
  const ext = path.extname(filePath).replace(/^\./, '').toLowerCase();
  if (ext === 'webm') return { ext: 'webm', mimeType: 'video/webm' };
  if (ext === 'webp') return { ext: 'webp', mimeType: 'image/webp' };
  if (ext === 'png') return { ext: 'png', mimeType: 'image/png' };
  return { ext: 'mp4', mimeType: 'video/mp4' };
}

async function normalizeArtifactPath(filePath: string, expectedExt: string): Promise<string> {
  const currentExt = path.extname(filePath).replace(/^\./, '').toLowerCase();
  if (currentExt === expectedExt) return filePath;
  const nextPath = path.join(path.dirname(filePath), `${path.basename(filePath, path.extname(filePath))}.${expectedExt}`);
  await fs.rename(filePath, nextPath);
  return nextPath;
}

async function extractPrimaryOutput(
  result: HermesLocalGenResult,
  preferredKinds: Array<'images' | 'gifs' | 'video'>,
): Promise<{ file: string; sizeBytes?: number; mimeType: string }> {
  const output = result.outputs.find(
    (item) =>
      typeof item.file === 'string' &&
      item.file.trim().length > 0 &&
      (!!item.type && preferredKinds.includes(item.type as 'images' | 'gifs' | 'video')),
  ) ?? result.outputs.find((item) => typeof item.file === 'string' && item.file.trim().length > 0);
  if (!output?.file) {
    throw new Error('Hermes local-gen 未返回本地产物文件。');
  }
  const detected = await detectArtifactFormat(output.file);
  const normalizedPath = await normalizeArtifactPath(output.file, detected.ext);
  return {
    file: normalizedPath,
    sizeBytes: output.size_bytes,
    mimeType: detected.mimeType,
  };
}

async function runHermesLocalGen(args: {
  task: 'txt2img' | 'txt2video' | 'img2video';
  model: string;
  prompt: string;
  outputPath: string;
  inputPath?: string;
  timeoutSeconds: number;
}): Promise<HermesLocalGenResult> {
  await fs.mkdir(path.dirname(args.outputPath), { recursive: true });

  const commandArgs = [
    HERMES_LOCAL_GEN_SCRIPT,
    args.task,
    '--model',
    args.model,
    '--prompt',
    args.prompt,
    '--output',
    args.outputPath,
    '--timeout',
    String(args.timeoutSeconds),
    '--json',
  ];

  if (args.inputPath) {
    commandArgs.push('--input', args.inputPath);
  }

  const { stdout, stderr } = await execFileAsync('python3', commandArgs, {
    timeout: (args.timeoutSeconds + 30) * 1000,
    maxBuffer: 10 * 1024 * 1024,
  });

  const raw = stdout.trim() || stderr.trim();
  if (!raw) {
    throw new Error('Hermes local-gen 没有返回任何输出。');
  }

  const parsed = JSON.parse(raw) as HermesLocalGenResult | { status?: string; message?: string };
  if (
    parsed.status !== 'ok' ||
    typeof (parsed as HermesLocalGenResult).prompt_id !== 'string' ||
    !Array.isArray((parsed as HermesLocalGenResult).outputs)
  ) {
    throw new Error(
      `Hermes local-gen 执行失败：${'message' in parsed && parsed.message ? parsed.message : raw}`,
    );
  }
  return parsed as HermesLocalGenResult;
}

async function buildTextArtifacts(
  record: TaskAggregate,
  bundleDir: string,
  models: { videoModel: string; imageModel: string; audioModel?: string; audioEnabled: boolean },
): Promise<{
  scriptArtifact: UgcTaskArtifact;
  summaryArtifact: UgcTaskArtifact;
}> {
  await fs.mkdir(bundleDir, { recursive: true });
  const scriptPath = path.join(bundleDir, 'script.md');
  const summaryPath = path.join(bundleDir, 'delivery-summary.md');

  const scriptContent = [
    `# ${record.task.name}`,
    '',
    `- 平台：${record.input.platform}`,
    `- 目标：${record.input.effectGoal}`,
    `- 卖点：${record.input.sellingPoint}`,
    '',
    '## 建议脚本',
    '',
    record.task.understanding?.draftScript ?? '开场展示产品与人物场景，突出核心卖点，结尾轻引导转化。',
    '',
    '## 路由方案',
    '',
    `- 方案：${record.task.routePlan?.label ?? 'Hermes Local Delivery'}`,
    `- 原因：${record.task.routePlan?.reason ?? '正式任务走 Hermes 本地视频 skill'}`,
    '',
  ].join('\n');

  const summaryContent = [
    `# ${record.task.name} 正式交付摘要`,
    '',
    `- 任务 ID：${record.task.id}`,
    `- Skill：${record.skillId ?? 'media-ugc'} @ ${record.skillVersionId ?? 'unknown'}`,
    `- 视频模型：${models.videoModel}`,
    `- 图片模型：${models.imageModel}`,
    `- 音频模型：${models.audioEnabled ? models.audioModel ?? '未命名模型' : '未启用'}`,
    `- 创建时间：${record.task.createdAt}`,
    `- 完成时间：${record.completedAt ?? nowIso()}`,
    '',
    '## 交付说明',
    '',
    '- 本次样片由 Hermes 本地 local-gen skill 直接生成。',
    '- 前端任务中心与成果中心展示的是正式落库产物，而不是 mock 占位图。',
    '',
  ].join('\n');

  await fs.writeFile(scriptPath, scriptContent, 'utf8');
  await fs.writeFile(summaryPath, summaryContent, 'utf8');

  return {
    scriptArtifact: {
      id: `${record.task.id}-script`,
      type: 'script',
      label: '脚本草案',
      fileName: 'script.md',
      mimeType: 'text/markdown',
      url: toPublicArtifactUrl(scriptPath),
    },
    summaryArtifact: {
      id: `${record.task.id}-summary`,
      type: 'report',
      label: '交付摘要',
      fileName: 'delivery-summary.md',
      mimeType: 'text/markdown',
      url: toPublicArtifactUrl(summaryPath),
    },
  };
}

function cloneAggregate(record: TaskAggregate): TaskAggregate {
  return JSON.parse(JSON.stringify(record)) as TaskAggregate;
}

function toFrontendTask(record: TaskAggregate): Task {
  const logs: HermesLogEntry[] = record.events.map((event) => ({
    id: event.id,
    timestamp: formatLogTimestamp(event.createdAt),
    message: event.message,
    level: event.level,
  }));

  return presentUgcTask({
    ...record.task,
    currentTokenUsed: record.task.currentTokenUsed ?? 0,
    logs,
    input: record.input,
    steps: record.task.steps ?? buildSteps(record.task.status),
    artifacts: record.task.artifacts ?? [],
    completedAt: record.completedAt ?? record.task.completedAt,
    schemaPayload: record.schemaPayload,
    structuredAnswers: record.structuredAnswers,
  });
}

function buildAggregate(payload: CreateTaskPayload): TaskAggregate {
  const createdAt = nowIso();
  const id = `ugc_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const task: Task = {
    id,
    name: `${skillLabel(payload.input.skillId)} · ${payload.input.platform}`,
    agentType: 'media',
    status: 'queued',
    executionMode: 'backend_silent',
    createdAt,
    estimatedTokenMin: 12000,
    estimatedTokenMax: 28000,
    tokenUsed: 0,
    currentTokenUsed: 0,
    costEstimate: '预计 1 次样片生成 + 1 次视频合成',
    input: payload.input,
    steps: buildSteps('queued'),
    logs: [],
    understanding: undefined,
    artifacts: [],
    taskScope: payload.context?.projectId ? 'project' : undefined,
    projectId: payload.context?.projectId,
    projectName: payload.context?.projectName,
  };

  const initialEvent: UgcTaskEvent = {
    id: `${id}-event-0`,
    type: 'task_created',
    level: 'info',
    message: '任务已创建，等待后端静默执行',
    createdAt,
  };

  return {
    task,
    input: payload.input,
    userExternalId: payload.userExternalId,
    workspaceSlug: slugifyWorkspace(payload.workspaceName ?? '个人空间'),
    events: [initialEvent],
    attempt: 1,
    executions: [
      {
        id: `${id}-exec-0`,
        mode: 'backend_silent',
        recipe: 'Generative-Media-Skills/UGC Video Factory',
        status: 'queued',
        createdAt,
      },
    ],
  };
}

function slugifyWorkspace(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'workspace';
}

function updateStep(task: Task, index: number, status: TaskStep['status'], tokenUsed?: number): void {
  task.steps = task.steps.map((step, stepIndex) => {
    if (stepIndex < index && step.status !== 'failed') {
      return {
        ...step,
        status: 'completed',
      };
    }
    if (stepIndex === index) {
      return {
        ...step,
        status,
        tokenUsed: tokenUsed ?? step.tokenUsed,
      };
    }
    return step;
  });
}

function pushEvent(
  record: TaskAggregate,
  type: string,
  level: UgcTaskEvent['level'],
  message: string,
  metadata?: Record<string, unknown>,
): void {
  record.events.push({
    id: `${record.task.id}-event-${record.events.length + 1}`,
    type,
    level,
    message,
    createdAt: nowIso(),
    metadata,
  });
}

function allocateToken(record: TaskAggregate, value: number): void {
  record.task.currentTokenUsed = Math.min(record.task.estimatedTokenMax, value);
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function persist(record: TaskAggregate): Promise<void> {
  const prisma = getPrismaClient();
  if (!prisma && !isFallbackAllowed()) {
    throw new Error('数据库不可用，且未启用内存回退。');
  }
  if (!prisma) {
    memoryStore.set(record.task.id, cloneAggregate(record));
    return;
  }

  memoryStore.set(record.task.id, cloneAggregate(record));

  const understandingPayload = toStoredRecoverySnapshot(record.task);
  const payloadJson = understandingPayload as unknown as Prisma.InputJsonValue;
  const taskRecoveryState = record.task.recoveryState;

  const user = await prisma.user.upsert({
    where: { externalId: record.userExternalId },
    update: {},
    create: {
      externalId: record.userExternalId,
      displayName: record.userExternalId,
      email: record.userExternalId.includes('@') ? record.userExternalId : null,
      phone: record.userExternalId.includes('@') ? null : record.userExternalId,
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: record.workspaceSlug },
    update: {
      name: record.workspaceSlug,
      ownerId: user.id,
    },
    create: {
      name: record.workspaceSlug,
      slug: record.workspaceSlug,
      ownerId: user.id,
    },
  });

  await prisma.task.upsert({
    where: { id: record.task.id },
    update: {
      name: record.task.name,
      agentType: record.task.agentType,
      status: record.task.status,
      executionMode: record.task.executionMode ?? 'backend_silent',
      completedAt: record.completedAt ? new Date(record.completedAt) : null,
      estimatedTokenMin: record.task.estimatedTokenMin,
      estimatedTokenMax: record.task.estimatedTokenMax,
      tokenUsed: record.task.tokenUsed,
      currentTokenUsed: record.task.currentTokenUsed ?? 0,
      costEstimate: record.task.costEstimate ?? null,
      requiresConfirm: record.task.status === 'waiting_confirmation',
      pauseReasonType: taskRecoveryState?.pauseReasonType ?? null,
      pauseReasonMessage: taskRecoveryState?.pauseReasonMessage ?? null,
      resumeMode: taskRecoveryState?.resumeMode ?? null,
      recoverable: taskRecoveryState?.recoverable ?? false,
      artifactsPreserved: (taskRecoveryState?.artifactsPreserved ?? null) as Prisma.InputJsonValue,
      willChargeAgain: taskRecoveryState?.willChargeAgain ?? null,
      showcaseStage: payloadJson,
      skillId: record.skillId ?? null,
      skillVersionId: record.skillVersionId ?? null,
      executionGrantId: record.executionGrantId ?? null,
      schemaPayload: (record.schemaPayload ?? null) as unknown as Prisma.InputJsonValue,
      structuredAnswers: (record.structuredAnswers ?? null) as unknown as Prisma.InputJsonValue,
      userId: user.id,
      workspaceId: workspace.id,
    },
    create: {
      id: record.task.id,
      name: record.task.name,
      agentType: record.task.agentType,
      status: record.task.status,
      executionMode: record.task.executionMode ?? 'backend_silent',
      createdAt: new Date(record.task.createdAt),
      completedAt: record.completedAt ? new Date(record.completedAt) : null,
      estimatedTokenMin: record.task.estimatedTokenMin,
      estimatedTokenMax: record.task.estimatedTokenMax,
      tokenUsed: record.task.tokenUsed,
      currentTokenUsed: record.task.currentTokenUsed ?? 0,
      costEstimate: record.task.costEstimate ?? null,
      requiresConfirm: record.task.status === 'waiting_confirmation',
      pauseReasonType: taskRecoveryState?.pauseReasonType ?? null,
      pauseReasonMessage: taskRecoveryState?.pauseReasonMessage ?? null,
      resumeMode: taskRecoveryState?.resumeMode ?? null,
      recoverable: taskRecoveryState?.recoverable ?? false,
      artifactsPreserved: (taskRecoveryState?.artifactsPreserved ?? null) as Prisma.InputJsonValue,
      willChargeAgain: taskRecoveryState?.willChargeAgain ?? null,
      showcaseStage: payloadJson,
      skillId: record.skillId ?? null,
      skillVersionId: record.skillVersionId ?? null,
      executionGrantId: record.executionGrantId ?? null,
      schemaPayload: (record.schemaPayload ?? null) as unknown as Prisma.InputJsonValue,
      structuredAnswers: (record.structuredAnswers ?? null) as unknown as Prisma.InputJsonValue,
      userId: user.id,
      workspaceId: workspace.id,
    },
  });

  await prisma.taskInput.upsert({
    where: { taskId: record.task.id },
    update: {
      productImage: record.input.productImageUrl ?? null,
      productName: record.input.productImageName ?? null,
      talentImage: record.input.talentImageUrl ?? null,
      sellingPoint: record.input.sellingPoint,
      platform: record.input.platform,
      effectGoal: record.input.effectGoal,
      referenceUrl: record.input.referenceUrl ?? null,
      payload: {
        ...((payloadJson as Record<string, unknown>) ?? {}),
        skillId: record.input.skillId ?? null,
        talentImageName: record.input.talentImageName ?? null,
      } as Prisma.InputJsonValue,
    },
    create: {
      taskId: record.task.id,
      productImage: record.input.productImageUrl ?? null,
      productName: record.input.productImageName ?? null,
      talentImage: record.input.talentImageUrl ?? null,
      sellingPoint: record.input.sellingPoint,
      platform: record.input.platform,
      effectGoal: record.input.effectGoal,
      referenceUrl: record.input.referenceUrl ?? null,
      payload: {
        skillId: record.input.skillId ?? null,
        talentImageName: record.input.talentImageName ?? null,
      } as Prisma.InputJsonValue,
    },
  });

  await prisma.taskRun.deleteMany({ where: { taskId: record.task.id } });
  await prisma.taskRun.create({
    data: {
      taskId: record.task.id,
      status: record.task.status,
      mode: record.task.executionMode ?? 'backend_silent',
      attempt: record.attempt,
      startedAt: new Date(record.startedAt ?? record.task.createdAt),
      completedAt: record.completedAt ? new Date(record.completedAt) : null,
    },
  });

  await prisma.taskStep.deleteMany({ where: { taskId: record.task.id } });
  if (record.task.steps.length > 0) {
    await prisma.taskStep.createMany({
      data: record.task.steps.map((step, index) => ({
        taskId: record.task.id,
        key: UGC_STEPS[index]?.key ?? `step_${index}`,
        title: step.name,
        orderIndex: index,
        status: step.status,
        detail: undefined,
        tokenUsed: step.tokenUsed ?? 0,
      })),
    });
  }

  await prisma.taskArtifact.deleteMany({ where: { taskId: record.task.id } });
  if ((record.task.artifacts ?? []).length > 0) {
    await prisma.taskArtifact.createMany({
      data: (record.task.artifacts ?? []).map((artifact) => ({
        taskId: record.task.id,
        type: artifact.type,
        label: artifact.label,
        fileName: artifact.fileName,
        url: artifact.url ?? null,
        mimeType: artifact.mimeType ?? null,
      })),
    });
  }

  await prisma.taskEvent.deleteMany({ where: { taskId: record.task.id } });
  if (record.events.length > 0) {
    await prisma.taskEvent.createMany({
      data: record.events.map((event) => ({
        id: event.id,
        taskId: record.task.id,
        type: event.type,
        level: event.level,
        message: event.message,
        metadata: (event.metadata ?? null) as Prisma.InputJsonValue,
        createdAt: new Date(event.createdAt),
      })),
    });
  }

  await prisma.hermesExecution.deleteMany({ where: { taskId: record.task.id } });
  if (record.executions.length > 0) {
    await prisma.hermesExecution.createMany({
      data: record.executions.map((execution) => ({
        id: execution.id,
        taskId: record.task.id,
        mode: execution.mode,
        recipe: execution.recipe,
        command: execution.command ?? null,
        stdout: execution.stdout ?? null,
        stderr: execution.stderr ?? null,
        status: execution.status,
        pauseReasonType: execution.pauseReasonType ?? null,
        pauseReasonMessage: execution.pauseReasonMessage ?? null,
        resumeMode: execution.resumeMode ?? null,
        recoverable: execution.recoverable ?? false,
        artifactsPreserved: (execution.artifactsPreserved ?? null) as Prisma.InputJsonValue,
        willChargeAgain: execution.willChargeAgain ?? null,
        skillId: record.skillId ?? null,
        skillVersionId: record.skillVersionId ?? null,
        skillChecksum: record.skillChecksum ?? null,
        grantId: record.executionGrantId ?? null,
        metadata: (execution.metadata ?? null) as Prisma.InputJsonValue,
        createdAt: new Date(execution.createdAt),
      })),
    });
  }

  await prisma.usageLedger.deleteMany({ where: { taskId: record.task.id } });
  await prisma.usageLedger.create({
    data: {
      userId: user.id,
      taskId: record.task.id,
      tokenUsed: record.task.tokenUsed,
      videoCost: record.task.costEstimate ?? null,
      status: record.task.status === 'failed' ? 'failed' : 'settled',
    },
  });
}

async function loadAllFromPrisma(): Promise<TaskAggregate[]> {
  const prisma = getPrismaClient();
  if (!prisma) {
    if (!requirePersistenceFallback()) {
      throw new Error('数据库不可用，且未启用内存回退。');
    }
    return Array.from(memoryStore.values()).map(cloneAggregate);
  }

  const rows = await prisma.task.findMany({
    where: { agentType: 'media' },
    include: {
      input: true,
      steps: { orderBy: { orderIndex: 'asc' } },
      artifacts: true,
      events: { orderBy: { createdAt: 'asc' } },
      executions: { orderBy: { createdAt: 'asc' } },
      user: true,
      workspace: true,
      runs: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });

  return rows.map((row) => {
    const payload = ((row.showcaseStage as RecoveryPayloadSnapshot | null) ??
      (row.input?.payload as RecoveryPayloadSnapshot | null) ??
      {}) as RecoveryPayloadSnapshot;
    const fallbackRecoveryState =
      payload.recoveryState ??
      (row.status === 'running' ||
      row.status === 'waiting_confirmation' ||
      row.status === 'completed' ||
      row.status === 'failed'
        ? {
            runState:
              row.status === 'waiting_confirmation'
                ? 'waiting_confirmation'
                : row.status === 'running'
                  ? 'running'
                  : row.status === 'completed'
                    ? 'completed'
                    : 'failed',
            pauseReasonType: (row.pauseReasonType as TaskPauseReasonType | null) ?? undefined,
            pauseReasonMessage: row.pauseReasonMessage ?? undefined,
            resumeMode: (row.resumeMode as TaskResumeMode | null) ?? undefined,
            recoverable: row.recoverable,
            artifactsPreserved: Array.isArray(row.artifactsPreserved)
              ? row.artifactsPreserved.filter((item): item is string => typeof item === 'string')
              : undefined,
            willChargeAgain: row.willChargeAgain ?? undefined,
          }
        : undefined);

    const input: UgcTaskInput = {
      skillId: row.skillId ?? ((row.input?.payload as { skillId?: string } | null)?.skillId ?? undefined),
      productImageUrl: row.input?.productImage ?? undefined,
      productImageName: row.input?.productName ?? undefined,
      talentImageUrl: row.input?.talentImage ?? undefined,
      talentImageName:
        ((row.input?.payload as { talentImageName?: string } | null)?.talentImageName ?? undefined),
      sellingPoint: row.input?.sellingPoint ?? '',
      platform: row.input?.platform ?? '抖音',
      effectGoal: row.input?.effectGoal ?? '更像真人种草',
      referenceUrl: row.input?.referenceUrl ?? undefined,
    };

    const task = fromStoredRecoverySnapshot(payload, {
      id: row.id,
      name: row.name,
      agentType: 'media',
      status: row.status,
      executionMode: row.executionMode,
      createdAt: row.createdAt.toISOString(),
      completedAt: row.completedAt?.toISOString(),
      estimatedTokenMin: row.estimatedTokenMin,
      estimatedTokenMax: row.estimatedTokenMax,
      tokenUsed: row.tokenUsed,
      currentTokenUsed: row.currentTokenUsed,
      costEstimate: row.costEstimate ?? undefined,
      input,
      steps: row.steps.map((step) => ({
        id: step.id,
        name: step.title,
        status: step.status as TaskStep['status'],
        tokenUsed: step.tokenUsed,
      })),
      logs: [],
      artifacts: row.artifacts.map((artifact) => ({
        id: artifact.id,
        type: artifact.type,
        label: artifact.label,
        fileName: artifact.fileName,
        url: artifact.url ?? undefined,
        mimeType: artifact.mimeType ?? undefined,
      })),
      recoveryState: fallbackRecoveryState,
    });

    return {
      task,
      input,
      userExternalId: row.user.externalId,
      workspaceSlug: row.workspace?.slug ?? 'workspace',
      skillId: row.skillId ?? undefined,
      skillVersionId: row.skillVersionId ?? undefined,
      skillChecksum: row.executions[0]?.skillChecksum ?? undefined,
      executionGrantId: row.executionGrantId ?? undefined,
      /// 🆕 v1.1: 从 DB 反序列化 Hermes schema + 结构化答案
      schemaPayload: (row.schemaPayload as import('../types/ugc').HermesDynamicSchema | null) ?? undefined,
      structuredAnswers:
        (row.structuredAnswers as Record<string, import('../types/ugc').UgcStructuredAnswer> | null) ?? undefined,
      events: row.events.map((event) => ({
        id: event.id,
        type: event.type,
        level: event.level as UgcTaskEvent['level'],
        message: event.message,
        createdAt: event.createdAt.toISOString(),
        metadata: event.metadata as Record<string, unknown> | undefined,
      })),
      attempt: row.runs[0]?.attempt ?? 1,
      startedAt: row.runs[0]?.startedAt.toISOString(),
      completedAt: row.runs[0]?.completedAt?.toISOString(),
      executions: row.executions.map((execution) => ({
        id: execution.id,
        mode: execution.mode,
        recipe: execution.recipe,
        command: execution.command ?? undefined,
        stdout: execution.stdout ?? undefined,
        stderr: execution.stderr ?? undefined,
        status: execution.status,
        pauseReasonType: (execution.pauseReasonType as TaskPauseReasonType | null) ?? undefined,
        pauseReasonMessage: execution.pauseReasonMessage ?? undefined,
        resumeMode: (execution.resumeMode as TaskResumeMode | null) ?? undefined,
        recoverable: execution.recoverable,
        artifactsPreserved: Array.isArray(execution.artifactsPreserved)
          ? execution.artifactsPreserved.filter((item): item is string => typeof item === 'string')
          : undefined,
        willChargeAgain: execution.willChargeAgain ?? undefined,
        createdAt: execution.createdAt.toISOString(),
        metadata: execution.metadata as Record<string, unknown> | undefined,
      })),
    };
  });
}

async function loadOne(id: string): Promise<TaskAggregate | null> {
  const all = await loadAllFromPrisma();
  return all.find((item) => item.task.id === id) ?? null;
}

function isMediaTaskId(id: string): boolean {
  return id.startsWith('ugc_') || memoryStore.has(id);
}

async function executeUnderstandingPhase(taskId: string): Promise<void> {
  if (activeRuns.has(taskId)) return;
  activeRuns.add(taskId);

  try {
    const record = await loadOne(taskId);
    if (!record || terminalStatuses.has(record.task.status)) return;

    record.startedAt = nowIso();
    applyStructuredRunState(
      record,
      normalizeHermesRunPayload({
        runState: 'running',
        pauseReasonType: 'provider_error',
        pauseReasonMessage: '正在理解需求并生成执行方案',
        resumeMode: 'retry_step',
        recoverable: true,
        artifactsPreserved: [],
        costStatus: {
          charged: false,
          willChargeAgain: false,
        },
      }),
      'running',
    );
    updateStep(record.task, 0, 'active');
    pushEvent(record, 'task_started', 'info', '后端静默执行已启动，开始理解需求');
    record.executions[0] = {
      ...record.executions[0],
      command: 'hermes --cli --oneshot "<system understanding>"',
    };
    await persist(record);

    await delay(400);
    const step1 = await loadOne(taskId);
    if (!step1) return;
    const skillExperience = await getSkillExperienceConfig(step1.input.skillId ?? 'media-ugc');
    step1.task.understanding = createUnderstanding(step1.input);
    if (step1.task.routePlan) {
      step1.task.costEstimate = `${step1.task.routePlan.label} · ${step1.task.routePlan.providerHint}`;
    }
    allocateToken(step1, 4200);
    updateStep(step1.task, 0, 'completed', 4200);
    pushEvent(step1, 'understanding_ready', 'success', '系统已完成用户意图理解与人设推断');
    if (step1.task.routePlan) {
      pushEvent(step1, 'skill_plan_routed', 'info', `系统已自动选择执行方案：${step1.task.routePlan.label}`);
    }
    await persist(step1);

    await delay(450);
    const step2 = await loadOne(taskId);
    if (!step2) return;
    updateStep(step2.task, 1, 'active');
    pushEvent(step2, 'script_generating', 'info', '正在生成脚本草案与镜头提纲');
    await persist(step2);

    await delay(450);
    const step3 = await loadOne(taskId);
    if (!step3) return;
    allocateToken(step3, 7600);
    updateStep(step3.task, 1, 'completed', 3400);
    updateStep(step3.task, 2, 'completed', 1800);
    applyStructuredRunState(
      step3,
      normalizeHermesRunPayload({
        runState: 'waiting_confirmation',
        pauseReasonType: 'confirmation',
        pauseReasonMessage:
          skillExperience.understandingConfig.confirmationMessage ||
          '系统理解、脚本与镜头规划已完成。接下来会进入高成本的视频生成与合成步骤。',
        resumeMode: 'continue',
        recoverable: true,
        artifactsPreserved: ['script.md'],
        costStatus: {
          charged: false,
          willChargeAgain: false,
        },
      }),
      'running',
    );
    if (step3.task.pendingConfirmation) {
      step3.task.pendingConfirmation.title = '确认进入视频生成';
    }
    pushEvent(step3, 'awaiting_confirmation', 'warning', '等待用户确认后进入高成本视频生成步骤');
    await persist(step3);
  } finally {
    activeRuns.delete(taskId);
  }
}

async function executeRenderPhase(taskId: string): Promise<void> {
  if (activeRuns.has(taskId)) return;
  activeRuns.add(taskId);

  try {
    let record = await loadOne(taskId);
    if (!record || terminalStatuses.has(record.task.status)) return;

    applyStructuredRunState(
      record,
      normalizeHermesRunPayload({
        runState: 'running',
        pauseReasonType: 'provider_error',
        pauseReasonMessage: '正在生成素材镜头与样片合成',
        resumeMode: 'retry_step',
        recoverable: true,
        artifactsPreserved: ['script.md'],
        costStatus: {
          charged: false,
          willChargeAgain: false,
        },
      }),
      'running',
    );
    updateStep(record.task, 3, 'active');
    pushEvent(record, 'render_started', 'info', '开始生成素材镜头与样片合成');
    await persist(record);

    await delay(500);
    record = await loadOne(taskId);
    if (!record) return;
    allocateToken(record, 13800);
    updateStep(record.task, 3, 'completed', 6200);
    updateStep(record.task, 4, 'active');
    pushEvent(record, 'video_rendering', 'info', '样片视频正在合成，准备生成封面与交付摘要');
    await persist(record);

    const bundleDir = resolveTaskBundleDir(record.task.id);
    const referenceImagePath =
      resolveUploadedFilePath(record.input.talentImageUrl) ?? resolveUploadedFilePath(record.input.productImageUrl);
    const videoTask = referenceImagePath ? 'img2video' : 'txt2video';
    const selectedModels = resolveTaskModelSelection(record);
    const videoModel = chooseHermesVideoModel(record.input, Boolean(referenceImagePath), selectedModels.videoModel);
    const videoPrompt = buildVideoPrompt(record.input);
    const videoOutputPath = path.join(bundleDir, `sample-video.${videoTask === 'img2video' ? 'mp4' : 'mp4'}`);

    const videoResult = await runHermesLocalGen({
      task: videoTask,
      model: videoModel,
      prompt: videoPrompt,
      outputPath: videoOutputPath,
      inputPath: referenceImagePath,
      timeoutSeconds: videoTask === 'img2video' || videoModel === 'wan22-5b' ? 1800 : 900,
    });
    const videoOutput = await extractPrimaryOutput(videoResult, ['video', 'gifs']);
    const videoArtifact: UgcTaskArtifact = {
      id: `${record.task.id}-video`,
      type: 'video',
      label: '样片视频',
      fileName: path.basename(videoOutput.file),
      mimeType: videoOutput.mimeType,
      url: toPublicArtifactUrl(videoOutput.file),
    };
    pushEvent(
      record,
      'artifact_created',
      'success',
      `Hermes 已生成正式视频产物（${videoResult.model} · ${videoResult.elapsed_s}s）`,
      {
        artifactType: 'video',
        fileName: videoArtifact.fileName,
        url: videoArtifact.url,
        mimeType: videoArtifact.mimeType,
        sizeBytes: videoOutput.sizeBytes,
        model: videoResult.model,
        promptId: videoResult.prompt_id,
      },
    );
    await persist(record);

    record = await loadOne(taskId);
    if (!record) return;
    allocateToken(record, 19400);
    updateStep(record.task, 4, 'completed', 5600);
    updateStep(record.task, 5, 'active');
    pushEvent(record, 'delivery_packaging', 'info', '正在导出视频、封面、脚本与交付摘要');
    await persist(record);

    let audioArtifact: UgcTaskArtifact | null = null;
    if (selectedModels.audioEnabled) {
      const audioText = record.task.understanding?.draftScript ?? `${record.input.sellingPoint}。${record.input.effectGoal}。`;
      const audioResult = await generateAudio({
        text: audioText,
        workflow: selectedModels.audioModel,
        language: 'Chinese',
      });
      const audioFilePath = path.resolve(process.cwd(), audioResult.url);
      audioArtifact = {
        id: `${record.task.id}-audio`,
        type: 'audio',
        label: 'AI 配音音轨',
        fileName: path.basename(audioFilePath),
        mimeType: audioResult.mimeType,
        url: toPublicArtifactUrl(audioFilePath),
      };
      pushEvent(record, 'artifact_created', audioResult.source === 'provider' ? 'success' : 'warning', 'AI 配音音轨已生成', {
        artifactType: 'audio',
        fileName: audioArtifact.fileName,
        url: audioArtifact.url,
        mimeType: audioArtifact.mimeType,
        model: audioResult.model,
        provider: audioResult.provider,
        source: audioResult.source,
        durationMs: audioResult.durationMs,
        sizeBytes: audioResult.sizeBytes,
      });
      await persist(record);
    }

    const coverResult = await runHermesLocalGen({
      task: 'txt2img',
      model: chooseHermesImageModel(selectedModels.imageModel),
      prompt: buildCoverPrompt(record.input),
      outputPath: path.join(bundleDir, 'cover-frame.png'),
      timeoutSeconds: 600,
    });
    const coverOutput = await extractPrimaryOutput(coverResult, ['images']);
    const coverArtifact: UgcTaskArtifact = {
      id: `${record.task.id}-cover`,
      type: 'image',
      label: '封面首帧',
      fileName: path.basename(coverOutput.file),
      mimeType: coverOutput.mimeType,
      url: toPublicArtifactUrl(coverOutput.file),
    };
    pushEvent(record, 'artifact_created', 'success', `Hermes 已生成封面首帧（${coverResult.model}）`, {
      artifactType: 'image',
      fileName: coverArtifact.fileName,
      url: coverArtifact.url,
      mimeType: coverArtifact.mimeType,
      sizeBytes: coverOutput.sizeBytes,
      model: coverResult.model,
      promptId: coverResult.prompt_id,
    });

    const { scriptArtifact, summaryArtifact } = await buildTextArtifacts(record, bundleDir, {
      videoModel,
      imageModel: chooseHermesImageModel(selectedModels.imageModel),
      audioModel: selectedModels.audioModel,
      audioEnabled: selectedModels.audioEnabled,
    });

    await delay(450);
    record = await loadOne(taskId);
    if (!record) return;
    const finalizedArtifacts = [videoArtifact, ...(audioArtifact ? [audioArtifact] : []), coverArtifact, scriptArtifact, summaryArtifact];
    const primaryVideoArtifact = resolvePrimaryVideoArtifact(finalizedArtifacts);
    if (!primaryVideoArtifact) {
      throw new Error('主视频未生成成功，不能标记任务完成');
    }
    record.task.artifacts = [
      primaryVideoArtifact,
      ...finalizedArtifacts.filter((artifact) => artifact.id !== primaryVideoArtifact.id),
    ];
    record.task.tokenUsed = 22600;
    record.task.currentTokenUsed = 22600;
    record.completedAt = nowIso();
    updateStep(record.task, 5, 'completed', 3000);
    applyStructuredRunState(
      record,
      normalizeHermesRunPayload({
        runState: 'completed',
        pauseReasonType: 'provider_error',
        pauseReasonMessage: '任务已完成，可查看交付结果',
        resumeMode: 'continue',
        recoverable: false,
        artifactsPreserved: record.task.artifacts.map((artifact) => artifact.fileName),
        costStatus: {
          charged: true,
          willChargeAgain: false,
        },
      }),
      'running',
    );
    record.executions[0] = {
      ...record.executions[0],
      command: `python3 ${HERMES_LOCAL_GEN_SCRIPT}`,
      stdout: [
        videoArtifact.fileName,
        ...(audioArtifact ? [audioArtifact.fileName] : []),
        coverArtifact.fileName,
        scriptArtifact.fileName,
        summaryArtifact.fileName,
      ].join('\n'),
      metadata: {
        ...(record.executions[0].metadata ?? {}),
        hermesRunner: 'local-gen',
        videoModel,
        imageModel: chooseHermesImageModel(selectedModels.imageModel),
        audioModel: selectedModels.audioEnabled ? selectedModels.audioModel : null,
      },
    };
    pushEvent(record, 'task_completed', 'success', 'UGC 样片与交付包已生成完成');
    await persist(record);
  } catch (error) {
    const record = await loadOne(taskId);
    if (record) {
      record.task.status = 'failed';
      updateStep(record.task, 4, 'failed');
      record.executions[0] = {
        ...record.executions[0],
        status: 'failed',
        stderr: error instanceof Error ? error.message : 'Hermes 正式交付失败',
        pauseReasonType: 'provider_error',
        pauseReasonMessage: error instanceof Error ? error.message : 'Hermes 正式交付失败',
        resumeMode: 'retry_step',
        recoverable: true,
      };
      pushEvent(
        record,
        'task_failed',
        'error',
        error instanceof Error ? `Hermes 正式交付失败：${error.message}` : 'Hermes 正式交付失败',
      );
      await persist(record);
    }
  } finally {
    activeRuns.delete(taskId);
  }
}

export async function createUgcTask(payload: CreateTaskPayload): Promise<Task> {
  const skillBinding = await resolvePublishedSkillBinding(payload.input.skillId ?? 'media-ugc');
  const record = buildAggregate(payload);
  record.skillId = skillBinding.skillId;
  record.skillVersionId = skillBinding.skillVersionId;
  record.skillChecksum = skillBinding.checksum;
  record.input.skillId = payload.input.skillId ?? 'media-ugc';
  record.task.routePlan = await resolveSkillRoutePlan(record.input.skillId, payload.input);
  record.task.costEstimate = `${record.task.routePlan.label} · ${record.task.routePlan.providerHint}`;
  record.executions[0] = {
    ...record.executions[0],
    recipe: `${skillBinding.skillSlug}@${skillBinding.versionLabel}`,
    metadata: {
      skillId: skillBinding.skillId,
      skillVersionId: skillBinding.skillVersionId,
      skillChecksum: skillBinding.checksum,
      versionNumber: skillBinding.versionNumber,
      skillModels: skillBinding.version.executionConfig.modelSelection ?? DEFAULT_SKILL_MODELS,
    },
  };
  pushEvent(
    record,
    'skill_bound',
    'info',
    `正式任务已绑定已发布 Skill ${skillBinding.versionLabel} (${skillBinding.checksum})`,
    {
      skillId: skillBinding.skillId,
      skillVersionId: skillBinding.skillVersionId,
      checksum: skillBinding.checksum,
    },
  );
  await persist(record);

  const grant = await createExecutionGrant({
    taskId: record.task.id,
    skillId: skillBinding.skillId,
    skillVersionId: skillBinding.skillVersionId,
    tokenBudgetMax: record.task.estimatedTokenMax,
  });
  record.executionGrantId = grant.grantId;
  record.executions[0] = {
    ...record.executions[0],
    metadata: {
      ...(record.executions[0].metadata ?? {}),
      executionGrantId: grant.grantId,
    },
  };
  pushEvent(record, 'execution_grant_issued', 'info', '已为本次任务签发短期 execution grant', {
    grantId: grant.grantId,
    expiresAt: grant.expiresAt,
  });
  await persist(record);

  void executeUnderstandingPhase(record.task.id);
  return toFrontendTask(record);
}

export async function listUgcTasks(): Promise<Task[]> {
  const all = await loadAllFromPrisma();
  return all.map((record) => toFrontendTask(record));
}

export async function getUgcTask(id: string): Promise<(Task & { events: UgcTaskEvent[] }) | null> {
  const record = await loadOne(id);
  if (!record) return null;
  return {
    ...toFrontendTask(record),
    events: record.events,
  };
}

export async function confirmUgcTask(id: string): Promise<Task | null> {
  const record = await loadOne(id);
  if (!record) return null;
  if (record.task.status !== 'waiting_confirmation') {
    return toFrontendTask(record);
  }
  applyStructuredRunState(
    record,
    normalizeHermesRunPayload({
      runState: 'running',
      pauseReasonType: 'provider_error',
      pauseReasonMessage: '已确认，继续进入高成本生成步骤',
      resumeMode: 'retry_step',
      recoverable: true,
      artifactsPreserved: record.task.recoveryState?.artifactsPreserved ?? ['script.md'],
      costStatus: {
        charged: false,
        willChargeAgain: false,
      },
    }),
    'running',
  );
  pushEvent(record, 'confirmation_received', 'success', '用户已确认，继续执行高成本生成步骤');
  await persist(record);
  void executeRenderPhase(id);
  return toFrontendTask(record);
}

export async function retryUgcTask(id: string, nextInput?: Partial<UgcTaskInput>): Promise<Task | null> {
  const record = await loadOne(id);
  if (!record) return null;

  if (nextInput) {
    record.input = {
      ...record.input,
      ...nextInput,
      sellingPoint: nextInput.sellingPoint?.trim() || record.input.sellingPoint,
      platform: nextInput.platform?.trim() || record.input.platform,
      effectGoal: nextInput.effectGoal?.trim() || record.input.effectGoal,
      referenceUrl: nextInput.referenceUrl?.trim() || undefined,
    };
  }
  record.task.routePlan = await resolveSkillRoutePlan(record.input.skillId ?? 'media-ugc', record.input);

  record.task.status = 'queued';
  record.task.tokenUsed = 0;
  record.task.currentTokenUsed = 0;
  record.task.completedAt = undefined;
  record.task.artifacts = [];
  record.task.understanding = undefined;
  record.task.recoveryState = undefined;
  record.task.pendingConfirmation = undefined;
  record.task.input = record.input;
  record.task.steps = buildSteps('queued');
  record.attempt += 1;
  record.executions = [
    {
      id: `${record.task.id}-exec-${record.attempt}`,
      mode: 'backend_silent',
      recipe: 'Generative-Media-Skills/UGC Video Factory',
      status: 'queued',
      createdAt: nowIso(),
    },
  ];
  record.task.costEstimate = `${record.task.routePlan.label} · ${record.task.routePlan.providerHint}`;
  pushEvent(record, 'task_retried', 'info', nextInput ? '任务输入已更新，系统已重新选择执行方案并排队生成' : '任务已重新排队，等待后端静默执行');
  await persist(record);
  void executeUnderstandingPhase(id);
  return toFrontendTask(record);
}

export async function cancelUgcTask(id: string): Promise<Task | null> {
  const record = await loadOne(id);
  if (!record) return null;
  record.task.status = 'cancelled';
  record.task.pendingConfirmation = undefined;
  record.task.recoveryState = undefined;
  await revokeActiveGrantsForTask(id);
  pushEvent(record, 'task_cancelled', 'warning', '任务已取消，未进入高成本视频生成阶段');
  await persist(record);
  return toFrontendTask(record);
}

export async function deleteUgcTask(id: string): Promise<boolean> {
  memoryStore.delete(id);
  const prisma = getPrismaClient();
  if (!prisma) {
    if (!isFallbackAllowed()) {
      throw new Error('数据库不可用，且未启用内存回退。');
    }
    return true;
  }
  await prisma.task.deleteMany({
    where: { id, agentType: 'media' },
  });
  return true;
}

export async function getUgcTaskEvents(id: string): Promise<UgcTaskEvent[]> {
  const task = await getUgcTask(id);
  return task?.events ?? [];
}

export async function runHermesDebug(payload: DebugRunPayload): Promise<{
  available: boolean;
  version: string | null;
  stdout: string;
  stderr: string;
  command: string;
}> {
  try {
    const versionResult = await execFileAsync('hermes', ['--version'], { timeout: 5000 });
    const version = versionResult.stdout.trim() || versionResult.stderr.trim() || null;
    const recipe = payload.recipe ?? 'debug';
    const prompt = payload.prompt?.trim();

    if (!prompt) {
      return {
        available: true,
        version,
        stdout: 'Hermes CLI 已安装，可用于本地调试模式。',
        stderr: '',
        command: 'hermes --version',
      };
    }

    const args = ['--cli', '--oneshot', prompt];
    const result = await execFileAsync('hermes', args, { timeout: 20000 });
    return {
      available: true,
      version,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
      command: `hermes --cli --oneshot "<${recipe}>"`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Hermes CLI 调试失败';
    return {
      available: false,
      version: null,
      stdout: '',
      stderr: message,
      command: 'hermes --version',
    };
  }
}

export async function getHermesRuntimeStatus(): Promise<{
  cliAvailable: boolean;
  appInstalled: boolean;
  version: string | null;
  recommendedMode: TaskExecutionMode;
  note: string;
}> {
  try {
    const versionResult = await execFileAsync('hermes', ['--version'], { timeout: 5000 });
    return {
      cliAvailable: true,
      appInstalled: true,
      version: versionResult.stdout.trim() || versionResult.stderr.trim() || null,
      recommendedMode: 'backend_silent',
      note: '当前机器已安装 Hermes CLI 与 Hermes.app，适合保留本地调试入口，生产任务建议走后端静默执行。',
    };
  } catch {
    return {
      cliAvailable: false,
      appInstalled: false,
      version: null,
      recommendedMode: 'backend_silent',
      note: '未检测到可调用的 Hermes CLI，生产任务需完全依赖后端静默执行。',
    };
  }
}

export { isMediaTaskId };

export type UgcTaskAggregateRecord = TaskAggregate;

export async function loadUgcTaskAggregate(id: string): Promise<TaskAggregate | null> {
  return loadOne(id);
}

export async function persistUgcTaskAggregate(record: TaskAggregate): Promise<void> {
  await persist(record);
}

// =============================================================================
// v1.1: Schema-first 流程
// =============================================================================
//
// 区别于 createUgcTask(老路径,7 字段 sellingPoint 必填,立即进 executeUnderstandingPhase):
//   - createUgcTaskWithSchema: 只创建 task + 落 status=awaiting_input + 异步取 Hermes schema
//   - getUgcTaskSchema:        返回 UgcTaskSchemaResponse (ready=true 时含 schema)
//   - submitUgcTaskAnswers:    收结构化答案,落库 + 触发 executeUnderstandingPhase

/**
 * 创建"等待参数"任务。第 1 阶段只建任务,异步调 Hermes 拿参数 schema。
 *
 * 设计目标:用户在画布看到 "Hermes 正在分析..." 期间,后端已经把 task 落库
 * 且 schema 即将就绪。前端用 GET /api/tasks/:id/schema 轮询。
 */
export async function createUgcTaskWithSchema(payload: {
  skillId: string;
  projectId?: string;
  userExternalId: string;
  displayName?: string;
  email?: string;
  phone?: string;
  workspaceName?: string;
  /** 透传的原始用户上下文(如 projectName),让 Hermes 决策更准 */
  rawContext?: Record<string, unknown>;
}): Promise<Task> {
  // 0. 复用老的 skill binding 逻辑(拿 skillVersionId/checksum/grant)
  const skillBinding = await resolvePublishedSkillBinding(payload.skillId);

  // 1. 用一个最小化的 UgcTaskInput 占位(老字段都填空)
  //    真正的 sellingPoint 在 submitUgcTaskAnswers 后回填
  const minimalInput: UgcTaskInput = {
    skillId: payload.skillId,
    sellingPoint: '',
    platform: '抖音',
    effectGoal: '更像真人种草',
  };

  const record = buildAggregate({
    input: minimalInput,
    userExternalId: payload.userExternalId,
    displayName: payload.displayName,
    email: payload.email,
    phone: payload.phone,
    workspaceName: payload.workspaceName,
  });
  record.skillId = skillBinding.skillId;
  record.skillVersionId = skillBinding.skillVersionId;
  record.skillChecksum = skillBinding.checksum;
  record.input.skillId = payload.skillId;
  record.task.routePlan = await resolveSkillRoutePlan(payload.skillId, minimalInput);
  record.task.costEstimate = `${record.task.routePlan.label} · ${record.task.routePlan.providerHint}`;
  record.executions[0] = {
    ...record.executions[0],
    recipe: `${skillBinding.skillSlug}@${skillBinding.versionLabel}`,
    metadata: {
      skillId: skillBinding.skillId,
      skillVersionId: skillBinding.skillVersionId,
      skillChecksum: skillBinding.checksum,
      versionNumber: skillBinding.versionNumber,
      skillModels: skillBinding.version.executionConfig.modelSelection ?? DEFAULT_SKILL_MODELS,
      flow: 'schema-first-v2',
    },
  };
  // 🆕 第 1 阶段关键:状态切到 awaiting_input (不进执行队列)
  record.task.status = 'awaiting_input';
  pushEvent(
    record,
    'schema_requested',
    'info',
    `已创建等待参数任务,正在请求 Hermes skill (${payload.skillId}) 返回参数 schema`,
    { skillId: payload.skillId, rawContext: payload.rawContext ?? null },
  );
  await persist(record);

  // 2. 签 grant(老逻辑)
  const grant = await createExecutionGrant({
    taskId: record.task.id,
    skillId: skillBinding.skillId,
    skillVersionId: skillBinding.skillVersionId,
    tokenBudgetMax: record.task.estimatedTokenMax,
  });
  record.executionGrantId = grant.grantId;
  record.executions[0] = {
    ...record.executions[0],
    metadata: {
      ...(record.executions[0].metadata ?? {}),
      executionGrantId: grant.grantId,
    },
  };
  pushEvent(record, 'execution_grant_issued', 'info', '已为本次任务签发短期 execution grant', {
    grantId: grant.grantId,
    expiresAt: grant.expiresAt,
  });
  await persist(record);

  // 3. 异步取 Hermes schema(不等结果,立刻返回 task 给前端)
  void fetchAndStoreSchema(record.task.id, payload.skillId).catch(async (err) => {
    // 失败时回写一条 error event,前端轮询时能看到
    const failRecord = await loadUgcTaskAggregate(record.task.id);
    if (failRecord) {
      failRecord.events.push({
        id: `${record.task.id}-event-schema-fail`,
        type: 'schema_failed',
        level: 'error',
        message: `Hermes skill 返回 schema 失败:${err.message ?? String(err)}`,
        createdAt: nowIso(),
        metadata: { skillId: payload.skillId, error: String(err) },
      });
      await persist(failRecord);
    }
  });

  return toFrontendTask(record);
}

/**
 * 调 Hermes skill 拿 schema,落库 + 切到 ready 状态。
 * 失败抛错,由 createUgcTaskWithSchema 的 catch 兜底。
 */
async function fetchAndStoreSchema(taskId: string, skillId: string): Promise<void> {
  const record = await loadUgcTaskAggregate(taskId);
  if (!record) throw new Error(`task ${taskId} not found`);

  // 动态 import 避免循环依赖
  const { fetchHermesSkillSchema } = await import('./hermesVideoSkillRunner.mjs');

  pushEvent(record, 'schema_fetching', 'info', `正在向本地 Hermes skill ${skillId} 请求参数 schema...`);
  await persist(record);

  const schema: HermesDynamicSchema = await fetchHermesSkillSchema(skillId);

  record.schemaPayload = schema;
  // status 保持 awaiting_input(schema 已就绪),等用户填答案
  pushEvent(
    record,
    'schema_ready',
    'info',
    `已收到 Hermes skill 返回的参数 schema,共 ${schema.steps.length} 个参数待用户填写`,
    { schemaVersion: schema.schemaVersion, stepCount: schema.steps.length },
  );
  await persist(record);
}

/**
 * 拉取 task 的 schema 状态。供前端轮询用。
 * - ready=true:  schema 就绪,前端开始渲染表单
 * - ready=false: 仍在等,前端继续 spinner(用 pendingHint 文案)
 */
export async function getUgcTaskSchema(taskId: string): Promise<{
  ready: boolean;
  schema?: HermesDynamicSchema;
  pendingHint?: string;
}> {
  const record = await loadUgcTaskAggregate(taskId);
  if (!record) {
    return { ready: false, pendingHint: '任务不存在或正在初始化' };
  }
  if (record.schemaPayload) {
    return { ready: true, schema: record.schemaPayload };
  }
  if (record.task.status === 'failed' || record.task.status === 'cancelled') {
    return { ready: false, pendingHint: `任务已 ${record.task.status === 'failed' ? '失败' : '取消'}` };
  }
  // 取最近一条 hint(从 events 倒推)
  const lastEvent = record.events[record.events.length - 1];
  return {
    ready: false,
    pendingHint:
      lastEvent?.type === 'schema_fetching'
        ? '正在向 Hermes 请求参数 schema...'
        : lastEvent?.type === 'schema_failed'
          ? `上次请求失败:${lastEvent.message}`
          : '初始化中...',
  };
}

/**
 * 收用户结构化答案。落库 + 触发老 executeUnderstandingPhase 进入执行。
 *
 * 关键校验:answer 的 stepId 必须存在于 schema.steps,否则返回 400。
 * 这样防止前端传错字段或脏数据。
 */
export async function submitUgcTaskAnswers(
  taskId: string,
  answers: UgcStructuredAnswer[],
): Promise<Task> {
  const record = await loadUgcTaskAggregate(taskId);
  if (!record) {
    throw new Error(`task ${taskId} not found`);
  }
  if (!record.schemaPayload) {
    throw new Error(`task ${taskId} schema not ready yet`);
  }
  if (record.task.status !== 'awaiting_input' && record.task.status !== 'queued') {
    throw new Error(
      `task ${taskId} is in status ${record.task.status}, cannot accept answers`,
    );
  }

  // 校验 stepId 都在 schema 里
  const schemaStepIds = new Set(record.schemaPayload.steps.map((s) => s.id));
  for (const ans of answers) {
    if (!schemaStepIds.has(ans.stepId)) {
      throw new Error(`unknown stepId: ${ans.stepId}`);
    }
  }
  // 校验必填项都答了
  const answered = new Set(answers.map((a) => a.stepId));
  for (const step of record.schemaPayload.steps) {
    if (step.required && !answered.has(step.id)) {
      throw new Error(`missing required answer for step: ${step.id}`);
    }
  }

  // 落库
  record.structuredAnswers = Object.fromEntries(answers.map((a) => [a.stepId, a]));
  pushEvent(
    record,
    'answers_submitted',
    'info',
    `用户已提交 ${answers.length} 条结构化答案,准备进入执行阶段`,
    { stepCount: answers.length },
  );
  await persist(record);

  // 触发老执行(等价于把 answers "展开"为老 UgcTaskInput 后进 executeUnderstandingPhase)
  void executeUnderstandingPhaseFromAnswers(record.task.id);

  return toFrontendTask(record);
}

/**
 * submitUgcTaskAnswers 之后的执行入口。
 * 把结构化 answers 重新"展平"成老的 UgcTaskInput,走 executeUnderstandingPhase。
 *
 * 简化策略:
 *   - productAsset / productImage / talentImage 字段统一映射到 input.productImageUrl
 *   - 把所有 select/text/textarea 的 value 用 "；" 拼成 sellingPoint(老逻辑)
 *   - platform / effectGoal 用 schema 里的 prefill 或默认值
 */
async function executeUnderstandingPhaseFromAnswers(taskId: string): Promise<void> {
  const record = await loadUgcTaskAggregate(taskId);
  if (!record || !record.schemaPayload || !record.structuredAnswers) return;

  const answers = record.structuredAnswers;

  // 把结构化答案展平成 UgcTaskInput
  // 已知 stepId 优先 hardcode 映射,未知的兜底进 sellingPoint
  const input = { ...record.input };

  // 文件类 step
  const productAsset = answers['productAsset'] ?? answers['sourceVideo'] ?? answers['referenceImages'];
  if (productAsset?.fileUrl) {
    input.productImageUrl = productAsset.fileUrl;
    input.productImageName = productAsset.fileName;
  } else if (productAsset?.value?.startsWith('http')) {
    // upload 步骤如果 fileUrl 没填,降级到 value(用户直接传了 URL)
    input.productImageUrl = productAsset.value;
    if (productAsset.fileName) input.productImageName = productAsset.fileName;
  }

  // URL 类 step
  if (answers['referenceUrl']?.value) {
    input.referenceUrl = answers['referenceUrl'].value;
  }

  // 平台/effectGoal(从 prefill 或 step 答案里挑)
  const platform = (answers['targetPlatforms']?.values?.[0]) ?? '抖音';
  input.platform = platform;
  // effectGoal 留老默认值(后续可由 schema.prefill 提供)

  // sellingPoint = 所有文本类 step 的拼接(保留老逻辑,做后端兜底)
  const textAnswers = Object.entries(answers)
    .filter(([k]) =>
      !['referenceUrl', 'productAsset', 'sourceVideo', 'referenceImages', 'talentImage'].includes(k),
    )
    .map(([, v]) => v.value)
    .filter(Boolean)
    .join('；');
  if (textAnswers) input.sellingPoint = textAnswers;

  record.input = input;
  record.task.status = 'queued';
  pushEvent(record, 'execution_resumed', 'info', '结构化答案已展平为执行参数,准备开始 Hermes 执行');
  await persist(record);

  // 调老逻辑(从 executeUnderstandingPhase 入口继续)
  // 因为 executeUnderstandingPhase 是 module-internal 函数,我们用 taskId 重启 phase
  void executeUnderstandingPhase(taskId);
}
