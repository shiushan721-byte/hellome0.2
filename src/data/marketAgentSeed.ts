import { AGENT_SLUG_CATEGORY, resolveAgentCategorySlug } from './agentCategories';

/** 智能体市场默认上架的智能体（前台卡片、后台 seed、首页标签配置统一来源） */
export const MARKET_ONLINE_AGENT_SLUGS = [
  'geo',
  'media-seeding',
  'media-review',
  'media-conversion',
  'media-showcase',
  'media-demo',
  'media-proposal',
  'schema-optimizer',
  'competitor-scan',
  'sales',
  'outreach-mail',
  'computer-speed',
  'faq-generator',
  'ppt-outline',
  'hermes-report',
  'prompt-lab',
] as const;

export type MarketOnlineAgentSlug = (typeof MARKET_ONLINE_AGENT_SLUGS)[number];

const ONLINE_SLUG_SET = new Set<string>(MARKET_ONLINE_AGENT_SLUGS);

/** 纯文本元数据，供服务端 seed / 配置层使用（避免导入带图片资源的 agentsCatalog） */
export const MARKET_AGENT_META: Record<string, { name: string; description: string }> = {
  geo: {
    name: 'GEO 智能体',
    description: '检测品牌在 DeepSeek、豆包、Kimi 等 AI 回答里的可见度与推荐率。',
  },
  'media-seeding': {
    name: '新品种草视频',
    description: '更适合新品首发、真实种草和小品牌日常传播的短视频样片。',
  },
  'media-review': {
    name: '测评讲解视频',
    description: '更适合先讲效果、再给理由的测评口播和体验讲解类样片。',
  },
  'media-conversion': {
    name: '带货转化视频',
    description: '更适合强调行动引导、成交节奏和购买动机的短视频样片。',
  },
  'media-showcase': {
    name: '品牌宣传视频',
    description: '更适合门店宣传、空间展示和品牌形象露出的短视频样片。',
  },
  'media-demo': {
    name: '产品演示视频',
    description: '更适合设备展示、功能讲解和项目开工前演示的产品视频样片。',
  },
  'media-proposal': {
    name: '客户提案视频',
    description: '更适合给客户演示方案方向、提案思路和项目预期的视频样片。',
  },
  sales: {
    name: '销售获客智能体',
    description: '客户画像精准定位，私信与邮件跟进闭环，批量外联脚本生成。',
  },
  'schema-optimizer': {
    name: 'Schema 结构化优化',
    description: '诊断官网 JSON-LD 标记，输出大模型友好的结构化数据包。',
  },
  'competitor-scan': {
    name: '竞品占位分析',
    description: '模拟 20+ 对比问答场景，识别竞品在 AI 回答中的抢占权重。',
  },
  'hermes-report': {
    name: 'Hz-Hermes 诊断报告',
    description: '全通道 AI 提及率分析，4.5 秒产出可视化过程日志与工单。',
  },
  'faq-generator': {
    name: 'FAQ 批量生成',
    description: '基于品牌语料自动生成 FAQ 与 LLMs.txt，提升 AI 召回友好度。',
  },
  'ppt-outline': {
    name: 'PPT 大纲智能体',
    description: '输入主题自动生成演讲结构、分页要点与配图建议。',
  },
  'outreach-mail': {
    name: '外联开发信',
    description: 'B2B 买家决策链痛点提取，多段式精细化跟进邮件生成。',
  },
  'computer-speed': {
    name: '计算机速度优化智能体',
    description: '输入电脑卡顿、弹窗广告、桌宠开启等需求，生成普通用户也能照做的优化清单。',
  },
  'copy-audit': {
    name: '文案合规审计',
    description: '发布前政治敏感、错别字与品牌禁忌一键扫描，降低踩雷风险。',
  },
  'sov-tracker': {
    name: '声量份额追踪',
    description: '追踪核心竞品在 AI 首推词中的占位份额比例 (SoV)。',
  },
  'prompt-lab': {
    name: '提示词实验室',
    description: '针对垂直场景测试与迭代提示词，输出可复用 Skill 模板。',
  },
};

export function isMarketOnlineAgent(slug: string): boolean {
  return ONLINE_SLUG_SET.has(slug);
}

export function listMarketOnlineAgentSlugs(): string[] {
  return [...MARKET_ONLINE_AGENT_SLUGS];
}

export function listMarketCatalogSlugs(): string[] {
  return Object.keys(AGENT_SLUG_CATEGORY);
}

export function listMarketOfflineAgentSlugs(): string[] {
  return listMarketCatalogSlugs().filter((slug) => !isMarketOnlineAgent(slug));
}

export function getMarketAgentSeedMeta(slug: string) {
  const meta = MARKET_AGENT_META[slug];
  const category = resolveAgentCategorySlug(slug);
  if (!meta || !category) return null;
  return {
    slug,
    name: meta.name,
    description: meta.description,
    category,
  };
}
