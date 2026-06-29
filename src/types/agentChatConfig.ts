/**
 * 统一智能体交互配置类型
 *
 * 通过 JSON 配置驱动 Chat + Canvas 交互流程，
 * 新增 Agent 只需新增一份配置即可。
 */

/* ────────────────────────── Chat 步骤 ────────────────────────── */

export type ChatStepType = 'select' | 'upload' | 'url' | 'text';

export interface ChatStepBase {
  id: string;
  question: string;
  hint?: string;
  required: boolean;
}

export interface ChatStepSelect extends ChatStepBase {
  type: 'select';
  options: string[];
}

export interface ChatStepUpload extends ChatStepBase {
  type: 'upload';
  accept: string;
  maxSizeMb: number;
  uploadHint?: string;
}

export interface ChatStepUrl extends ChatStepBase {
  type: 'url';
  placeholder?: string;
}

export interface ChatStepText extends ChatStepBase {
  type: 'text';
  placeholder?: string;
  maxLength?: number;
  rows?: number;
}

export type ChatStep = ChatStepSelect | ChatStepUpload | ChatStepUrl | ChatStepText;

/* ────────────────────────── Canvas 配置 ────────────────────────── */

export type CanvasResultType = 'video' | 'image' | 'document' | 'report';

export interface CanvasStage {
  id: string;
  label: string;
  description: string;
  /** 模拟执行耗时（毫秒） */
  durationMs: number;
}

export interface CanvasConfig {
  stages: CanvasStage[];
  resultType: CanvasResultType;
  /** 完成后的结果标题 */
  resultTitle?: string;
  /** 完成后的结果描述 */
  resultDescription?: string;
}

/* ────────────────────────── Agent 完整配置 ────────────────────────── */

export interface AgentChatConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** 标签（如 "10秒" "9:16"） */
  tags: string[];
  /** Chat 流程的欢迎消息 */
  welcomeMessage: string;
  /** Chat 引导步骤 */
  steps: ChatStep[];
  /** Canvas 展示配置 */
  canvas: CanvasConfig;
  /** 交互模式 (A: 集中确认, B: 独立可逆, C: 混合) */
  interactionMode?: 'mode_a' | 'mode_b' | 'mode_c';
}

/* ────────────────────── 运行时状态 ────────────────────── */

export type WorkflowPhase = 'idle' | 'chatting' | 'confirming' | 'executing' | 'completed';

export interface ChatMessage {
  id: string;
  role: 'agent' | 'user';
  content: string;
  /** 关联的步骤 ID（用户回答时） */
  stepId?: string;
  timestamp: number;
}

export interface StepAnswer {
  stepId: string;
  value: string;
  /** 上传文件的预览 URL */
  filePreviewUrl?: string;
  fileName?: string;
}
