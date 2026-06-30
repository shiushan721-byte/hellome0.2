/**
 * hermesSchemaAdapter — 把 Hermes skill 返回的 HermesDynamicSchema
 * 适配成前端 ChatPanel/CanvasPanel 直接消费的 AgentChatConfig。
 *
 * v1:2026-06-30
 *
 * 设计目标:
 *   - AgentChatCanvasPage 拿到 schema 后,直接 setDynamicConfig() 就能渲染
 *   - 标记 fromHermesSchema=true,后续提交答案时走 /api/tasks/:id/answers 而非 /api/tasks/ugc
 *   - 不修改 Hermes 协议本身,只在 UI 层做"瘦适配"
 */
import type { AgentChatConfig, ChatOption, ChatStep } from '../types/agentChatConfig';
import type { HermesDynamicSchema } from '../types/ugc';

/**
 * Skill slug → emoji icon (与 videoAgentChatConfigs.ts 保持一致)
 */
const SKILL_ICONS: Record<string, string> = {
  'media-seeding': '🛍️',
  'media-review': '🎤',
  'media-conversion': '💰',
  'media-showcase': '🏪',
  'media-demo': '💻',
  'media-proposal': '🤝',
  'media-longform-cut': '✂️',
  'media-animation': '🎨',
  'media-localization': '🌐',
};

/**
 * Skill slug → 中文 tags (10秒/9:16/抖音 等,显示在 ChatPanel header)
 */
const SKILL_TAGS: Record<string, string[]> = {
  'media-seeding': ['10秒', '9:16', '抖音'],
  'media-review': ['10秒', '9:16', '视频号'],
  'media-conversion': ['15秒', '9:16', '抖音电商'],
  'media-showcase': ['15秒', '9:16', '氛围感'],
  'media-demo': ['30秒', '9:16', '功能解析'],
  'media-proposal': ['60秒', '9:16', '客户沟通'],
  'media-longform-cut': ['拆条', '批量', '9:16'],
  'media-animation': ['MG动画', '示意图', '16:9'],
  'media-localization': ['翻译', '配音', '多语'],
};

/**
 * 把单个 HermesStep 转成前端 ChatStep。
 * 关键映射:
 *   - select      → ChatStepSelect
 *   - multi-select → ChatStepMultiSelect
 *   - upload      → ChatStepUpload (accept / maxSizeMb 透传)
 *   - url         → ChatStepUrl
 *   - text        → ChatStepText
 *   - textarea    → ChatStepTextarea
 *   - slider      → ChatStepSlider (用 constraints.min/max)
 *   - date        → 降级成 ChatStepText (placeholder "YYYY-MM-DD")
 */
export function hermesStepToChatStep(hs: HermesDynamicSchema['steps'][number]): ChatStep {
  const base = {
    id: hs.id,
    question: hs.question,
    hint: hs.hint,
    required: hs.required,
  };

  switch (hs.type) {
    case 'select': {
      return {
        ...base,
        type: 'select',
        options: (hs.options ?? []).map((o) => ({ value: o.value, label: o.label })),
      };
    }
    case 'multi-select': {
      return {
        ...base,
        type: 'multi-select',
        options: (hs.options ?? []).map((o) => ({ value: o.value, label: o.label })),
      };
    }
    case 'upload': {
      return {
        ...base,
        type: 'upload',
        accept: hs.accept ?? 'image/*',
        maxSizeMb: hs.maxSizeMb ?? 50,
        uploadHint: hs.hint ?? '点击或拖拽上传',
      };
    }
    case 'url': {
      return {
        ...base,
        type: 'url',
        placeholder: hs.placeholder ?? 'https://...',
      };
    }
    case 'text': {
      return {
        ...base,
        type: 'text',
        placeholder: hs.placeholder,
      };
    }
    case 'textarea': {
      return {
        ...base,
        type: 'textarea',
        placeholder: hs.placeholder,
        maxLength: undefined, // Hermes schema 没单独约束 maxLength
        rows: 4,
      };
    }
    case 'slider': {
      const min = hs.constraints?.min ?? 1;
      const max = hs.constraints?.max ?? 100;
      return {
        ...base,
        type: 'slider',
        min,
        max,
        step: 1,
        defaultValue: min,
      };
    }
    case 'date': {
      return {
        ...base,
        type: 'text',
        placeholder: hs.placeholder ?? 'YYYY-MM-DD',
      };
    }
    default: {
      // 未知 type 兜底为 text,UI 至少能渲染
      return {
        ...base,
        type: 'text',
        placeholder: hs.placeholder,
      };
    }
  }
}

/**
 * 完整转换:HermesDynamicSchema → AgentChatConfig。
 *
 * 返回的 config 可以直接 setDynamicConfig() 给 ChatPanel/CanvasPanel 用。
 *
 * @param schema      Hermes 返回的 schema
 * @param hermesTaskId 关联的 taskId (用于提交答案时走 /api/tasks/:id/answers)
 */
export function mapHermesSchemaToChatConfig(
  schema: HermesDynamicSchema,
  hermesTaskId: string,
): AgentChatConfig {
  return {
    id: schema.skillId,
    name: schema.title,
    icon: SKILL_ICONS[schema.skillId] ?? '🎬',
    description: schema.description,
    tags: SKILL_TAGS[schema.skillId] ?? [],
    welcomeMessage:
      schema.welcomeMessage ?? `你好!我是${schema.title}专员。请按以下步骤提供信息:`,
    steps: schema.steps.map(hermesStepToChatStep),
    canvas: {
      resultType: 'video',
      resultTitle: schema.title,
      resultDescription: schema.description,
      stages: schema.canvasStages.map((s) => ({
        id: s.id,
        label: s.label,
        description: s.description,
        durationMs: s.estimatedMs,
      })),
    },
    interactionMode: 'mode_a', // schema-first 流程默认 mode_a (集中确认)
    fromHermesSchema: true,
    hermesTaskId,
  };
}

/**
 * Helper:把 ChatOption 转回 string[] (用于 ChatInputCard 等老代码兼容)
 */
export function optionsToStrings(options: ChatOption[] | undefined): string[] {
  if (!options) return [];
  return options.map((o) => (typeof o === 'string' ? o : o.label));
}