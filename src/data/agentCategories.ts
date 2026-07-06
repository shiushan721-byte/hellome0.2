export type AgentCategory =
  | 'all'
  | 'geo'
  | 'content'
  | 'sales'
  | 'office'
  | 'student'
  | 'growth'
  | 'data'
  | 'tech';

export const CATEGORIES: { id: AgentCategory; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'geo', label: 'GEO 营销' },
  { id: 'content', label: '内容创作' },
  { id: 'sales', label: '销售获客' },
  { id: 'office', label: '办公协同' },
  { id: 'student', label: '学生求职' },
  { id: 'growth', label: '品牌增长' },
  { id: 'data', label: '数据分析' },
  { id: 'tech', label: '技术工程' },
];

/** 智能体 slug → 市场分类（与 agentsCatalog 保持一致，供后台/配置层使用） */
export const AGENT_SLUG_CATEGORY: Record<string, Exclude<AgentCategory, 'all'>> = {
  geo: 'geo',
  'media-seeding': 'content',
  'media-review': 'content',
  'media-conversion': 'content',
  'media-showcase': 'content',
  'media-demo': 'content',
  'media-proposal': 'content',
  sales: 'sales',
  'schema-optimizer': 'geo',
  'competitor-scan': 'geo',
  'hermes-report': 'data',
  'faq-generator': 'content',
  'ppt-outline': 'office',
  'outreach-mail': 'sales',
  'internship-resume': 'student',
  'internship-job-match': 'student',
  'computer-speed': 'tech',
  'copy-audit': 'content',
  'sov-tracker': 'growth',
  'prompt-lab': 'tech',
};

export function resolveAgentCategorySlug(agentId: string): Exclude<AgentCategory, 'all'> | null {
  if (agentId === 'media') return AGENT_SLUG_CATEGORY['media-seeding'] ?? null;
  return AGENT_SLUG_CATEGORY[agentId] ?? null;
}

export function listAgentSlugsForCategory(categoryId: AgentCategory): string[] {
  if (categoryId === 'all') return Object.keys(AGENT_SLUG_CATEGORY);
  return Object.entries(AGENT_SLUG_CATEGORY)
    .filter(([, category]) => category === categoryId)
    .map(([slug]) => slug);
}
