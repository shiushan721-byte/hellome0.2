import { AGENTS } from '../data/agentsCatalog';
import type {
  AgentMarketCard,
  AgentQuotaSnapshot,
  AgentsPageData,
  AgentsTab,
} from '../types/agentsPage';
import { getUsage } from './usageStore';
import { mergePublishedMarketAgents } from './publishedMarketModel';
export { mergePublishedMarketAgents } from './publishedMarketModel';

export function normalizeAgentsTab(tab: string | null): AgentsTab {
  return 'market';
}

export function resolveAgentsTabFromPath(pathname: string, _tabParam: string | null): AgentsTab {
  if (pathname.endsWith('/agents/mine')) return 'mine';
  return 'market';
}

export function agentsTabPath(tab: AgentsTab): string {
  return tab === 'mine' ? '/app/agents/mine' : '/app/agents';
}

function parseTokenRange(tokenRange: string): { min: number; max: number } {
  const nums = tokenRange.match(/[\d,]+/g);
  if (!nums || nums.length < 2) return { min: 0, max: 0 };
  return {
    min: Number(nums[0].replace(/,/g, '')),
    max: Number(nums[1].replace(/,/g, '')),
  };
}

function buildQuotaSnapshot(): AgentQuotaSnapshot {
  const usage = getUsage();

  return {
    enabledCount: 0,
    tokenBalance: usage.tokenBalance,
  };
}

function buildMarketAgents(): AgentMarketCard[] {
  return AGENTS.map((agent) => {
    const { min, max } = parseTokenRange(agent.tokenRange);
    return {
      id: agent.id,
      name: agent.name,
      description: agent.desc,
      category: agent.category,
      tokenRange: agent.tokenRange,
      estimatedTokenMin: min,
      estimatedTokenMax: max,
      creator: agent.creator,
      creatorAvatar: agent.creatorAvatar,
      heat: agent.heat,
      likes: agent.likes,
      iconSrc: agent.iconSrc,
      status: agent.available ? 'available' : 'coming_soon',
      badge: agent.badge,
    };
  });
}

export function buildFilteredMarketAgents(
  onlineSlugs: Set<string> | null,
  publishedAgents: import('./skillStudioApi').PublishedMarketAgent[] = [],
): AgentMarketCard[] {
  let cards = buildMarketAgents();
  if (onlineSlugs !== null) {
    // 强制放行本地硬编码卡片
    const LOCAL_WHITELIST = ['geo', 'media-legacy', 'sales', 'schema-optimizer', 'competitor-scan', 'hermes-report', 'faq-generator', 'canvas-demo-a', 'canvas-demo-b', 'canvas-demo-c'];
    cards = cards.filter((card) => onlineSlugs.has(card.id) || LOCAL_WHITELIST.includes(card.id));
  }
  return mergePublishedMarketAgents(cards, publishedAgents).map((card) => {
    const published = publishedAgents.find((item) => item.agentId === card.id);
    if (!published?.iconUrl) return card;
    return { ...card, iconSrc: published.iconUrl };
  });
}

export function getGuestAgentsPageData(): AgentsPageData {
  return {
    activeTab: 'market',
    quota: { enabledCount: 0, tokenBalance: 0 },
    marketAgents: buildMarketAgents(),
    myAgents: [],
  };
}

export function getAgentsPageData(tab: AgentsTab | string | null): AgentsPageData {
  const activeTab =
    tab === 'market' || tab === 'mine' ? tab : normalizeAgentsTab(typeof tab === 'string' ? tab : null);

  return {
    activeTab,
    quota: buildQuotaSnapshot(),
    marketAgents: buildMarketAgents(),
    myAgents: [],
  };
}
