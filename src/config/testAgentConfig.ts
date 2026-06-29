import type { AgentChatConfig } from '../types/agentChatConfig';
import { VIDEO_HERMES_AGENT_CONFIG } from './videoHermesAgentConfig';
import { VIDEO_AGENT_CHAT_CONFIGS } from './videoAgentChatConfigs';

/**
 * 测试智能体配置
 *
 * 用于演示 Chat + Canvas 统一交互架构的完整流程。
 * 新增 Agent 只需要按这个格式创建一份配置即可。
 */
export const TEST_CHAT_AGENT_CONFIG: AgentChatConfig = {
  id: 'test-chat',
  name: '品牌视频智能体 (测试)',
  icon: '🎬',
  description: '通过对话引导快速生成品牌短视频样片，适合门店宣传、新品种草和日常传播。',
  tags: ['10秒', '9:16 竖版', '样片生成'],
  welcomeMessage:
    '你好！我是品牌视频智能体 🎬\n\n我会通过几个简单的问题了解你的需求，然后为你生成一段品牌短视频样片。\n\n让我们开始吧 👇',

  steps: [
    {
      id: 'brand-type',
      type: 'select',
      question: '请先告诉我，你的品牌 / 门店属于哪个类型？',
      hint: '这会帮助我更好地理解你的业务场景',
      options: ['护肤品牌', '咖啡店', '服饰店', '烘焙店', '美甲店', '生活方式品牌'],
      required: true,
    },
    {
      id: 'target-audience',
      type: 'select',
      question: '这个视频主要是想播给谁看？',
      hint: '目标人群会影响最终视频的节奏和配乐',
      options: ['年轻学生党', '都市白领', '宝妈/家庭', '全年龄段通用'],
      required: true,
    },
    {
      id: 'product-image',
      type: 'upload',
      question: '请上传一张产品图或门店环境图。',
      hint: '支持 JPG / PNG / WebP，不超过 10MB',
      accept: 'image/jpeg,image/png,image/webp',
      maxSizeMb: 10,
      uploadHint: '点击或拖拽上传图片',
      required: true,
    },
    {
      id: 'reference-url',
      type: 'url',
      question: '有没有想要对标的爆款视频链接？（选填）',
      hint: '小红书或抖音的分享链接，帮助我模仿它的剪辑网感',
      placeholder: 'https://...',
      required: false,
    },
    {
      id: 'selling-point',
      type: 'text',
      question: '最后，请一句话概括你想在视频里突出的“核心卖点”。',
      hint: '比如：「补水不黏腻，夏天通勤10秒出门」',
      placeholder: '输入你的核心卖点...',
      maxLength: 100,
      rows: 2,
      required: true,
    },
  ],

  canvas: {
    resultType: 'video',
    resultTitle: '品牌短视频样片',
    resultDescription: '基于你的输入生成的 10 秒竖版品牌视频样片，可直接用于抖音/小红书投放。',
    stages: [
      {
        id: 'analyze',
        label: '分析业务场景',
        description: '理解品牌定位和目标受众，制定视频策略',
        durationMs: 2000,
      },
      {
        id: 'script',
        label: '生成脚本方案',
        description: '基于卖点和品牌调性生成视频脚本和分镜',
        durationMs: 3000,
      },
      {
        id: 'compose',
        label: '合成视频素材',
        description: '调用 AI 引擎合成视频画面和过渡效果',
        durationMs: 4000,
      },
      {
        id: 'polish',
        label: '优化与交付',
        description: '添加字幕、配乐和品牌水印，输出最终样片',
        durationMs: 2500,
      },
    ],
  },
};

/**
 * Agent 配置注册表
 * 后续新增 Agent 只需在这里 import 并添加即可
 */
export const CHAT_AGENT_CONFIGS: Record<string, AgentChatConfig> = {
  'test-chat': TEST_CHAT_AGENT_CONFIG,
  'video-hermes': VIDEO_HERMES_AGENT_CONFIG,
  'canvas-demo-a': { ...TEST_CHAT_AGENT_CONFIG, id: 'canvas-demo-a', name: '方案 A (集中确认体验馆)', interactionMode: 'mode_a' },
  'canvas-demo-b': { ...TEST_CHAT_AGENT_CONFIG, id: 'canvas-demo-b', name: '方案 B (独立可改体验馆)', interactionMode: 'mode_b' },
  'canvas-demo-c': { ...TEST_CHAT_AGENT_CONFIG, id: 'canvas-demo-c', name: '方案 C (混合体验馆)', interactionMode: 'mode_c' },
};

// 动态注册 6 个细分视频场景
VIDEO_AGENT_CHAT_CONFIGS.forEach(config => {
  CHAT_AGENT_CONFIGS[config.id] = config;
});

export function getChatAgentConfig(agentId: string): AgentChatConfig | undefined {
  return CHAT_AGENT_CONFIGS[agentId];
}
