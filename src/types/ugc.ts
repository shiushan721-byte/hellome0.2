export type TaskExecutionMode = 'backend_silent' | 'local_debug';

export type TaskArtifactType = 'video' | 'image' | 'script' | 'report' | 'audio';

export type TaskRunState =
  | 'queued'
  | 'running'
  | 'waiting_confirmation'
  | 'interrupted'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type TaskPauseReasonType =
  | 'confirmation'
  | 'context_limit'
  | 'provider_error'
  | 'missing_input'
  | 'timeout';

export type TaskResumeMode =
  | 'continue'
  | 'retry_step'
  | 'require_input'
  | 'require_creator_fix';

export interface TaskRecoveryState {
  runState: Extract<TaskRunState, 'running' | 'waiting_confirmation' | 'interrupted' | 'completed' | 'failed'>;
  pauseReasonType?: TaskPauseReasonType;
  pauseReasonMessage?: string;
  resumeMode?: TaskResumeMode;
  recoverable?: boolean;
  artifactsPreserved?: string[];
  willChargeAgain?: boolean;
}

export interface UgcRoutePlan {
  id: string;
  label: string;
  providerHint: string;
  reason: string;
}

export interface UgcTaskInput {
  skillId?: string;
  productImageUrl?: string;
  productImageName?: string;
  talentImageUrl?: string;
  talentImageName?: string;
  sellingPoint: string;
  platform: string;
  effectGoal: string;
  referenceUrl?: string;
}

export interface UgcSystemUnderstanding {
  targetAudience: string;
  videoStyle: string;
  coreAngle: string;
  outputGoal: string;
  draftScript: string;
}

export interface UgcTaskArtifact {
  id: string;
  type: TaskArtifactType;
  label: string;
  fileName: string;
  url?: string;
  mimeType?: string;
  content?: string;
}

export interface UgcTaskEvent {
  id: string;
  type: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Hermes 动态 Schema (本地 Hermes skill 运行时返回的参数表单)
// v1:2026-06-30 - 配合 video-hermes-bundle 协议层落地
// =============================================================================

/**
 * Hermes skill 可下发的前端表单控件类型。
 * - select:        单选下拉
 * - multi-select:  多选
 * - upload:        文件上传(图片/视频)
 * - url:           URL 输入
 * - text:          单行文本
 * - textarea:      多行文本
 * - slider:        数字范围
 * - date:          日期
 */
export type HermesStepType =
  | 'select'
  | 'multi-select'
  | 'upload'
  | 'url'
  | 'text'
  | 'textarea'
  | 'slider'
  | 'date';

export interface HermesStepOption {
  /** 实际值(后端拿到) */
  value: string;
  /** UI 标签 */
  label: string;
  /** 备选说明,UI 用灰色小字显示 */
  hint?: string;
}

export interface HermesStep {
  id: string;
  type: HermesStepType;
  question: string;
  hint?: string;
  /** select/multi-select 选项 */
  options?: HermesStepOption[];
  /** text/textarea/url 占位符 */
  placeholder?: string;
  /** upload 接受 mime */
  accept?: string;
  /** upload 最大 MB */
  maxSizeMb?: number;
  required: boolean;
  /** 字段级约束 */
  constraints?: {
    min?: number;
    max?: number;
    pattern?: string;
    /** 条件显示: 当 stepId 的值为 value 时显示当前 step */
    dependsOn?: { stepId: string; value: string | string[] };
  };
}

export interface HermesCanvasStage {
  id: string;
  label: string;
  description: string;
  /** 预计耗时(ms),前端据此做进度动画 */
  estimatedMs: number;
}

export interface HermesDynamicSchema {
  /** schema 协议版本,前端必须严格匹配 */
  schemaVersion: 1;
  /** 关联的 skill slug */
  skillId: string;
  /** 中文标题,UI 顶部用 */
  title: string;
  /** 中文描述 */
  description: string;
  /** 必填首问(用户进来第一眼看到的),可空 */
  welcomeMessage?: string;
  /** 参数 step 列表 */
  steps: HermesStep[];
  /** 画布阶段(执行时显示) */
  canvasStages: HermesCanvasStage[];
  /** 由 Hermes 推荐的前端预填值 */
  prefill?: Record<string, unknown>;
}

export interface UgcTaskSchemaResponse {
  /** 当前 task 的 schema(可能尚未就绪) */
  ready: boolean;
  schema?: HermesDynamicSchema;
  /** 当 ready=false 时,后端在做什么(用于前端 spinner 文案) */
  pendingHint?: string;
}

export interface UgcStructuredAnswer {
  stepId: string;
  /** 文本/选项值;文件上传则填上传后 server 返回的 url */
  value?: string;
  /** 多选用数组 */
  values?: string[];
  /** 文件上传 */
  fileUrl?: string;
  fileName?: string;
}
