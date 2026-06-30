import type { GeoResultData } from '../types';
import type {
  HermesDynamicSchema,
  TaskExecutionMode,
  TaskRecoveryState,
  UgcRoutePlan,
  UgcStructuredAnswer,
  UgcSystemUnderstanding,
  UgcTaskArtifact,
  UgcTaskInput,
} from './ugc';

export type TaskStatus =
  | 'draft'
  | 'queued'
  | 'awaiting_input'
  | 'running'
  | 'waiting_confirmation'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type AgentType = 'geo' | 'media' | 'sales';

export type StepStatus = 'pending' | 'active' | 'completed' | 'failed';

export type DetectionDepth = 'quick' | 'standard' | 'deep';

export type LedgerStatus = 'reserved' | 'settled' | 'refunded' | 'failed';

export type TaskScope = 'project';

export interface TaskStep {
  id: string;
  name: string;
  status: StepStatus;
  tokenUsed?: number;
}

export interface HermesLogEntry {
  id: string;
  timestamp: string;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
}

export interface GeoTaskInput {
  brandName: string;
  websiteUrl: string;
  keywords: string;
  competitors: string;
  models: string[];
  depth: DetectionDepth;
}

export interface Task {
  id: string;
  name: string;
  agentType: AgentType;
  status: TaskStatus;
  executionMode?: TaskExecutionMode;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  durationMs?: number;
  estimatedTokenMin: number;
  estimatedTokenMax: number;
  tokenUsed: number;
  currentTokenUsed?: number;
  costEstimate?: string;
  input?: GeoTaskInput | UgcTaskInput;
  steps: TaskStep[];
  logs: HermesLogEntry[];
  result?: GeoResultData;
  understanding?: UgcSystemUnderstanding;
  routePlan?: UgcRoutePlan;
  artifacts?: UgcTaskArtifact[];
  recoveryState?: TaskRecoveryState;
  pendingConfirmation?: {
    title: string;
    message: string;
    action: string;
  };
  taskScope?: TaskScope;
  projectId?: string;
  projectName?: string;
  /// 🆕 v1.1: Hermes 返回的动态参数 schema (前端渲染用)
  /// 只在 status='awaiting_input' / 'queued' 时返回
  schemaPayload?: HermesDynamicSchema;
  /// 🆕 v1.1: 用户提交的结构化答案 (按 stepId 索引)
  structuredAnswers?: Record<string, UgcStructuredAnswer>;
}

export interface ProjectProfile {
  id: string;
  name: string;
  description?: string;
  brandName?: string;
  websiteUrl?: string;
  productIntro?: string;
  targetAudience?: string;
  keywords?: string;
  competitors?: string;
  sellingPoints?: string;
  tone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsageSnapshot {
  planName: string;
  tokenBalance: number;
  monthlyTokenLimit: number;
  monthlyTokenUsed: number;
  resetAt: string;
  lowBalanceThreshold: number;
}

export interface UsageLedgerEntry {
  id: string;
  time: string;
  taskId: string;
  taskName: string;
  agent: string;
  estimatedTokenMin: number;
  estimatedTokenMax: number;
  tokenUsed: number;
  status: LedgerStatus;
  kind?: 'usage' | 'topup';
  note?: string;
}

export interface AuthStatus {
  browserAutomation: boolean;
  localFileAccess: boolean;
  wechatOfficial: boolean;
  xiaohongshu: boolean;
  feishu: boolean;
  email: boolean;
}

export const GEO_STEPS = [
  '生成检测问题',
  '调用模型检测',
  '分析品牌出现率',
  '分析 AI 推荐率',
  '分析竞品占位',
  '识别内容缺口',
  '生成优化建议',
  '生成报告',
] as const;

export const DEFAULT_GEO_MODELS = [
  'DeepSeek',
  '豆包',
  'Kimi',
  '通义',
  '文心',
  '腾讯元宝',
];

export const DEPTH_CONFIG: Record<
  DetectionDepth,
  {
    label: string;
    desc: string;
    duration: string;
    estimatedTokenMin: number;
    estimatedTokenMax: number;
  }
> = {
  quick: {
    label: '快速检测',
    desc: '约 1-2 分钟，约 5,000-10,000 Token',
    duration: '1-2 分钟',
    estimatedTokenMin: 5000,
    estimatedTokenMax: 10000,
  },
  standard: {
    label: '标准检测',
    desc: '约 3-5 分钟，约 12,000-25,000 Token',
    duration: '3-5 分钟',
    estimatedTokenMin: 12000,
    estimatedTokenMax: 25000,
  },
  deep: {
    label: '深度检测',
    desc: '约 8-15 分钟，约 30,000-80,000 Token',
    duration: '8-15 分钟',
    estimatedTokenMin: 30000,
    estimatedTokenMax: 80000,
  },
};

export const SIGNUP_BONUS_TOKENS = 20_000;
