/**
 * 统一智能体交互配置类型
 *
 * 通过 JSON 配置驱动 Chat + Canvas 交互流程，
 * 新增 Agent 只需新增一份配置即可。
 *
 * v1.1: 支持 Hermes skill 异步返回的 schema (src/types/ugc.ts:HermesDynamicSchema)
 *       前端用 mapHermesSchemaToChatConfig() 把 Hermes schema 渲染成同样的 ChatStep 列表。
 */

/* ────────────────────────── Chat 步骤 ────────────────────────── */

export type ChatStepType = 'select' | 'multi-select' | 'upload' | 'url' | 'text' | 'textarea' | 'slider';

/**
 * 选项可以是字符串(老格式)或 {value, label} (Hermes 返回格式)。
 * 前端 ChatInputCard 统一按 string 处理,通过 normalizeOption() 取 label/value。
 */
export type ChatOption = string | { value: string; label: string; hint?: string };

export function normalizeOption(opt: ChatOption): { value: string; label: string; hint?: string } {
  if (typeof opt === 'string') return { value: opt, label: opt };
  return { value: opt.value, label: opt.label, hint: opt.hint };
}

export interface ChatStepBase {
  id: string;
  question: string;
  hint?: string;
  required: boolean;
}

export interface ChatStepSelect extends ChatStepBase {
  type: 'select';
  options: ChatOption[];
}

export interface ChatStepMultiSelect extends ChatStepBase {
  type: 'multi-select';
  options: ChatOption[];
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

export interface ChatStepTextarea extends ChatStepBase {
  type: 'textarea';
  placeholder?: string;
  maxLength?: number;
  rows?: number;
}

export interface ChatStepSlider extends ChatStepBase {
  type: 'slider';
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
}

export type ChatStep =
  | ChatStepSelect
  | ChatStepMultiSelect
  | ChatStepUpload
  | ChatStepUrl
  | ChatStepText
  | ChatStepTextarea
  | ChatStepSlider;

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
  /** 🆕 v1.1: 标记此 config 来自 Hermes 动态 schema (用于后端提交时区分 endpoint) */
  fromHermesSchema?: boolean;
  /** 🆕 v1.1: 关联的 taskId (schema-first 流程创建的任务) */
  hermesTaskId?: string;
}

/* ────────────────────── 运行时状态 ────────────────────── */

export type WorkflowPhase =
  | 'idle'
  | 'awaitingSchema'   // 🆕 v1.1: 等待 Hermes skill 返回参数 schema
  | 'chatting'
  | 'confirming'
  | 'executing'
  | 'completed';

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
  /** 🆕 v1.1: multi-select 时的数组值 (会被 serialize 成 value 用 ', ' 分隔) */
  values?: string[];
  /** 🆕 v1.1: slider 数值 */
  numericValue?: number;
}
