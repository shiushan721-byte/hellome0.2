import type {
  AgentQuotaSnapshot,
  EnabledAgentSummary,
  HomeDashboardData,
  PromptMatchResult,
  RecommendedAction,
} from '../types/homeDashboard';
import type { Task, TaskStatus } from '../types/workbench';
import { getAgentById, AGENTS } from '../data/agentsCatalog';
import { getTabOrder } from './workbenchTabs';
import { getUsage, isLowBalance } from './usageStore';
import { getTasks } from './taskStore';
import { getAgentsPageData } from './agentsPageData';
import type { AgentMarketCard } from '../types/agentsPage';

const AGENT_KEYWORDS: Partial<Record<string, string[]>> = {
  geo: ['geo', '检测', '可见度', '品牌', 'ai', '搜索', '大模型', '优化', 'faq', '提及'],
  'media-seeding': ['视频', '种草', '抖音', '短视频', 'ugc', '样片', '新品'],
  sales: ['销售', '客户', '私信', '邮件', '获客', '外联', '跟进', '话术'],
  'faq-generator': ['faq', '问答', 'llms', '语料', '召回', '结构化', '批量'],
};

export const AGENT_TASK_TEMPLATES: Partial<
  Record<string, Array<{ id: string; title: string; prompt?: string }>>
> = {
  geo: [
    { id: 'geo-detect', title: '检测品牌 AI 可见度', prompt: '检测品牌在 AI 搜索里的可见度' },
    { id: 'geo-suggest', title: '生成 GEO 优化建议', prompt: '生成 GEO 优化建议' },
  ],
  media: [
    { id: 'media-article', title: '写公众号文章', prompt: '写一篇公众号文章' },
    { id: 'media-xhs', title: '小红书改写', prompt: '把内容改成小红书风格' },
  ],
  sales: [
    { id: 'sales-analyze', title: '分析客户网站', prompt: '分析客户网站' },
    { id: 'sales-dm', title: '生成销售私信', prompt: '生成销售私信' },
  ],
  'faq-generator': [
    { id: 'faq-batch', title: '批量生成 FAQ', prompt: '基于品牌语料批量生成 FAQ' },
    { id: 'faq-llms', title: '生成 LLMs.txt', prompt: '生成 LLMs.txt 提升 AI 召回' },
  ],
};

const ONBOARDING_AGENT_IDS = ['geo', 'media-seeding', 'sales', 'faq-generator'] as const;

const HOME_EMPTY_AGENT_IDS = [
  'geo',
  'media-seeding',
  'sales',
  'faq-generator',
  'schema-optimizer',
  'competitor-scan',
  'ppt-outline',
  'prompt-lab',
] as const;

function scoreAgent(prompt: string, agentId: string): number {
  const lower = prompt.toLowerCase();
  const keywords = AGENT_KEYWORDS[agentId];
  if (!keywords?.length) return 0;
  return keywords.reduce((score, kw) => {
    if (lower.includes(kw.toLowerCase())) return score + 1;
    return score;
  }, 0);
}

export function matchPromptToAgent(prompt: string): PromptMatchResult {
  const trimmed = prompt.trim();
  if (!trimmed) return { type: 'no_match' };

  let best: string | null = null;
  let bestScore = 0;
  for (const agent of AGENTS) {
    if (!agent.available) continue;
    const s = scoreAgent(trimmed, agent.id);
    if (s > bestScore) {
      bestScore = s;
      best = agent.id;
    }
  }

  if (!best || bestScore === 0) return { type: 'no_match' };

  const agent = getAgentById(best);
  return { type: 'match', agentId: best, agentName: agent?.name ?? best };
}

function taskUpdatedAt(task: Task): string {
  return task.completedAt ?? task.createdAt;
}

function buildRecentAgentSummaries(): EnabledAgentSummary[] {
  const tasks = getTasks();
  const result: EnabledAgentSummary[] = [];
  const openedIds = getTabOrder();

  for (const agentId of openedIds) {
    const agent = getAgentById(agentId);
    if (!agent) continue;

    const agentTasks = tasks
      .filter((t) => t.agentType === agentId)
      .sort((a, b) => new Date(taskUpdatedAt(b)).getTime() - new Date(taskUpdatedAt(a)).getTime());

    const latest = agentTasks[0];
    const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const monthTasks = agentTasks.filter(
      (t) => t.createdAt.startsWith(monthKey) && (t.status === 'completed' || t.status === 'failed'),
    );
    const monthlyTokenFromTasks = monthTasks.reduce((sum, t) => sum + t.tokenUsed, 0);

    result.push({
      agentId,
      name: agent.name,
      description: agent.desc,
      path: agent.path,
      iconSrc: agent.iconSrc,
      monthlyTaskCount: monthTasks.length,
      monthlyTokenUsed: monthlyTokenFromTasks,
      lastUsedAt: latest ? taskUpdatedAt(latest) : undefined,
      latestTask: latest
        ? {
            id: latest.id,
            name: latest.name,
            status: latest.status,
            updatedAt: taskUpdatedAt(latest),
          }
        : undefined,
      templates: AGENT_TASK_TEMPLATES[agentId] ?? [],
    });
  }

  return result;
}

function buildAgentQuota(): AgentQuotaSnapshot {
  const usage = getUsage();

  return {
    enabledCount: getTabOrder().length,
    tokenBalance: usage.tokenBalance,
  };
}

function buildRecommendedActions(): RecommendedAction[] {
  const actions: RecommendedAction[] = [];
  const tasks = getTasks();
  const openedIds = new Set(getTabOrder());

  const lastGeo = tasks.find((t) => t.agentType === 'geo' && t.status === 'completed');
  if (lastGeo) {
    actions.push({
      id: 'rec-geo-faq',
      title: '基于上次 GEO 报告，继续生成官网 FAQ',
      agentId: 'geo',
      sourceTaskId: lastGeo.id,
      estimatedTokenMin: 3000,
      estimatedTokenMax: 8000,
      requiresActivation: false,
    });
  }

  const lastContent = tasks.find((t) => t.status === 'completed');
  if (lastContent) {
    actions.push({
      id: 'rec-media-xhs',
      title: '基于上次内容，继续生成小红书改写版',
      agentId: 'media-seeding',
      sourceTaskId: lastContent.id,
      estimatedTokenMin: 2000,
      estimatedTokenMax: 8000,
      requiresActivation: false,
    });
  }

  if (openedIds.has('sales')) {
    actions.push({
      id: 'rec-sales-followup',
      title: '基于客户分析结果，继续生成跟进邮件',
      agentId: 'sales',
      estimatedTokenMin: 1500,
      estimatedTokenMax: 4000,
      requiresActivation: false,
    });
  }

  return actions.slice(0, 3);
}

function buildAddableAgentIds(): string[] {
  return AGENTS.filter((agent) => agent.available).map((agent) => agent.id);
}

function buildRecentTasks(): Task[] {
  return getTasks().slice(0, 8);
}

export function getHomeDashboardData(): HomeDashboardData {
  const usage = getUsage();
  const recentAgents = buildRecentAgentSummaries();

  return {
    usage,
    agentQuota: buildAgentQuota(),
    recentAgents,
    enabledAgents: recentAgents,
    recentTasks: buildRecentTasks(),
    recommendedActions: buildRecommendedActions(),
    addableAgentIds: buildAddableAgentIds(),
  };
}

export function getOnboardingAgents() {
  return ONBOARDING_AGENT_IDS.map((id) => getAgentById(id)).filter(Boolean);
}

export function getOnboardingMarketCards(): AgentMarketCard[] {
  const ids = new Set<string>(ONBOARDING_AGENT_IDS);
  return getAgentsPageData('market').marketAgents.filter((card) => ids.has(card.id));
}

export function getHomeEmptyMarketCards(): AgentMarketCard[] {
  const byId = new Map(
    getAgentsPageData('market').marketAgents.map((card) => [card.id, card]),
  );
  return HOME_EMPTY_AGENT_IDS.map((id) => byId.get(id)).filter(
    (card): card is AgentMarketCard => Boolean(card),
  );
}

export function statusLabel(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    draft: '草稿',
    queued: '排队中',
    awaiting_input: '等待参数',
    running: '进行中',
    waiting_confirmation: '等待确认',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消',
  };
  return map[status];
}

export function isLowBalanceUsage(): boolean {
  return isLowBalance(getUsage());
}
