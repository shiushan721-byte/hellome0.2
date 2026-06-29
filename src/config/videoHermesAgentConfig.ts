import type { AgentChatConfig } from '../types/agentChatConfig';

export const VIDEO_HERMES_AGENT_CONFIG: AgentChatConfig = {
  id: 'video-hermes',
  name: '视频生产专家管家',
  icon: '🎬',
  description: '全能的前沿视频生产管家，自动分析你的需求，并调度概念构建、剪辑、动效等九大专员为你服务。',
  tags: ['智能路由', '多专员协作', '视频管家'],
  welcomeMessage:
    '你好！我是视频生产专家管家 🎬\n\n我可以帮你对接概念构建、风格翻译、讲者剪辑、动效设计等9位专业视频制作人。告诉我你需要什么类型的视频，或者目前手头有什么素材，我会为你安排最合适的制作流。',

  steps: [
    {
      id: 'production-goal',
      type: 'text',
      question: '首先，请描述你这次的核心视频制作目标是什么？',
      hint: '比如：「我想把这篇长文转成一个适合抖音的10秒口播」或「我需要一个产品功能的演示视频」',
      placeholder: '输入你的制作目标...',
      maxLength: 300,
      rows: 3,
      required: true,
    },
    {
      id: 'current-stage',
      type: 'select',
      question: '你目前处于哪个阶段？',
      hint: '这能帮助我判断是先做概念开发，还是直接进入剪辑和执行。',
      options: ['💡 只有一个初步想法', '📝 正在准备素材和脚本', '✂️ 已经有素材，需要直接剪辑执行', '🔄 已有初稿，需要优化和修改'],
      required: true,
    },
    {
      id: 'source-assets',
      type: 'upload',
      question: '请上传你目前已有的核心素材（如果有的话）。',
      hint: '支持图片、参考截图，如果是视频较大请在下一步提供网盘链接。',
      accept: 'image/jpeg,image/png,image/webp,video/mp4',
      maxSizeMb: 50,
      uploadHint: '点击或拖拽上传素材',
      required: false,
    },
    {
      id: 'style-reference',
      type: 'url',
      question: '有没有任何参考视频、品牌链接或网盘素材链接？',
      hint: '可以帮助「风格翻译专员」更好地理解你的预期。',
      placeholder: 'https://...',
      required: false,
    },
  ],

  canvas: {
    resultType: 'video',
    resultTitle: '视频生成交付',
    resultDescription: '由后台多名专家专员协作完成的最终视频内容。',
    stages: [
      {
        id: 'front-door-routing',
        label: '目标分析与智能路由',
        description: '由总管家理解目标，明确假设，并选择最佳的下游处理专员（如：动效设计、故事剪辑等）',
        durationMs: 2500,
      },
      {
        id: 'specialist-execution',
        label: '专员介入执行',
        description: '所选视频专家（如 video-demo-director 或 video-clips-editor）进行深度处理与创作',
        durationMs: 4000,
      },
      {
        id: 'story-editing',
        label: '故事逻辑与节奏优化',
        description: '进行情感推进、蒙太奇逻辑与电影级形态编排',
        durationMs: 3000,
      },
      {
        id: 'final-delivery',
        label: '渲染与交付输出',
        description: '生成结构化移交包与最终视频',
        durationMs: 2000,
      },
    ],
  },
};
