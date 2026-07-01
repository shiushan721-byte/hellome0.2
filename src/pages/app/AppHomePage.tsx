import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import MarketCard from '../../components/app/agents/MarketCard';
import HermesActionModal from '../../components/app/HermesActionModal';
import { getTasks, subscribeTasks } from '../../lib/taskStore';
import { getUsage, isLowBalance, subscribeUsage } from '../../lib/usageStore';
import {
  getHermesConnection,
  refreshHermesConnection,
  subscribeHermesConnection,
} from '../../lib/hermesConnection';
import { getHomeDashboardData, getHomeEmptyMarketCards } from '../../lib/homeDashboard';
import {
  getLastOpenedAgentId,
  getLastOpenedTabId,
  getWorkbenchTab,
  getVisibleRecentAgentIds,
  sortRecentAgentSummaries,
  subscribeWorkbenchTabs,
} from '../../lib/workbenchTabs';
import type { AgentEntryState } from '../../types/agentNavigation';
import { getAgentById } from '../../data/agentsCatalog';
import { isHermesConnected } from '../../lib/firstRunOnboarding';
import { replayPendingIntent } from '../../lib/pendingAgentIntent';
import { tryUseAgent } from '../../lib/useAgentAccess';
import { getAgentWorkbenchPath } from '../../lib/agentWorkbench';
import AgentProjectChoiceModal from '../../components/app/projects/AgentProjectChoiceModal';
import type { AgentMarketCard } from '../../types/agentsPage';
import { setPendingAgentContext } from '../../lib/projectStore';

export default function AppHomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showHermesModal, setShowHermesModal] = useState(false);
  const [projectChoiceAgent, setProjectChoiceAgent] = useState<AgentMarketCard | null>(null);

  useSyncExternalStore(subscribeTasks, getTasks, getTasks);
  useSyncExternalStore(subscribeUsage, getUsage, getUsage);
  const workbenchRevision = useSyncExternalStore(
    subscribeWorkbenchTabs,
    () => getVisibleRecentAgentIds().join(','),
    () => '',
  );
  const hermes = useSyncExternalStore(subscribeHermesConnection, getHermesConnection, getHermesConnection);

  const dashboard = getHomeDashboardData();
  const { recentAgents } = dashboard;
  const requestedAgentId = searchParams.get('agent');
  const lowBalance = isLowBalance(getUsage());

  const visibleAgents = useMemo(
    () => sortRecentAgentSummaries(recentAgents),
    [recentAgents, workbenchRevision],
  );

  useEffect(() => {
    if (!requestedAgentId) return;
    const agent = getAgentById(requestedAgentId);
    if (!agent?.available) return;

    const result = tryUseAgent(requestedAgentId, { lowBalance });
    if (result.reason === 'hermes') {
      setShowHermesModal(true);
      return;
    }
    if (result.reason === 'recharge') {
      navigate('/app/usage');
      return;
    }
    if (result.ok) {
      const marketAgent = getHomeEmptyMarketCards().find((card) => card.id === requestedAgentId);
      if (marketAgent) {
        setProjectChoiceAgent(marketAgent);
      } else {
        navigate(`${getAgentWorkbenchPath(requestedAgentId)}?launch=${Date.now()}`);
      }
    }
  }, [requestedAgentId, lowBalance, navigate]);

  const defaultAgentId = useMemo(() => {
    const waiting = visibleAgents.find((agent) => agent.latestTask?.status === 'waiting_confirmation');
    if (waiting?.agentId) return waiting.agentId;

    const lastOpened = getLastOpenedAgentId();
    if (lastOpened && visibleAgents.some((agent) => agent.agentId === lastOpened)) return lastOpened;

    return visibleAgents[0]?.agentId ?? null;
  }, [visibleAgents]);

  const activeAgentId =
    (requestedAgentId && visibleAgents.some((agent) => agent.agentId === requestedAgentId)
      ? requestedAgentId
      : null) ?? defaultAgentId;

  const handleUseAgent = (agentId: string) => {
    const result = tryUseAgent(agentId, { lowBalance });
    if (result.reason === 'hermes') {
      setShowHermesModal(true);
      return;
    }
    if (result.reason === 'recharge') {
      navigate('/app/usage');
      return;
    }
    if (result.ok) {
      const agent = getHomeEmptyMarketCards().find((card) => card.id === agentId);
      if (agent) setProjectChoiceAgent(agent);
      else navigate(getAgentWorkbenchPath(agentId));
    }
  };

  const openAgentAfterProjectChoice = (agentId: string, projectId: string, tabId: string) => {
    setProjectChoiceAgent(null);
    navigate(`${getAgentWorkbenchPath(agentId)}?project=${encodeURIComponent(projectId)}&tab=${encodeURIComponent(tabId)}&launch=${Date.now()}`);
  };

  if (
    requestedAgentId &&
    getVisibleRecentAgentIds().includes(requestedAgentId) &&
    getAgentById(requestedAgentId)?.available &&
    isHermesConnected() &&
    !lowBalance
  ) {
    const tab = getWorkbenchTab(getLastOpenedTabId() || '');
    if (tab?.agentId === requestedAgentId) {
      setPendingAgentContext({
        agentId: tab.agentId,
        taskScope: 'project',
        projectId: tab.projectId,
        projectName: tab.projectName,
        createdAt: new Date().toISOString(),
      });
    }
    const state: AgentEntryState = { from: getAgentWorkbenchPath(requestedAgentId), agentId: requestedAgentId };
    return <Navigate to={getAgentWorkbenchPath(requestedAgentId)} replace state={state} />;
  }

  if (activeAgentId && isHermesConnected() && !lowBalance) {
    const tab = getWorkbenchTab(getLastOpenedTabId() || '');
    if (tab?.agentId === activeAgentId) {
      setPendingAgentContext({
        agentId: tab.agentId,
        taskScope: 'project',
        projectId: tab.projectId,
        projectName: tab.projectName,
        createdAt: new Date().toISOString(),
      });
    }
    const state: AgentEntryState = { from: getAgentWorkbenchPath(activeAgentId), agentId: activeAgentId };
    return <Navigate to={getAgentWorkbenchPath(activeAgentId)} replace state={state} />;
  }

  return (
    <>
      <HomeEmptyState onUseAgent={handleUseAgent} onViewMarket={() => navigate('/app/agents')} />

      {showHermesModal && (
        <HermesActionModal
          variant="pairing"
          status={hermes.status}
          onClose={() => setShowHermesModal(false)}
          onOpenHermes={() => refreshHermesConnection()}
          onPairedComplete={() => {
            if (isHermesConnected()) {
              setShowHermesModal(false);
              const target = replayPendingIntent();
              navigate(target);
            }
          }}
        />
      )}

      {projectChoiceAgent ? (
        <AgentProjectChoiceModal
          agent={projectChoiceAgent}
          onClose={() => setProjectChoiceAgent(null)}
          onConfirm={openAgentAfterProjectChoice}
        />
      ) : null}
    </>
  );
}

function HomeEmptyState({
  onUseAgent,
  onViewMarket,
}: {
  onUseAgent: (agentId: string) => void;
  onViewMarket: () => void;
}) {
  const cards = getHomeEmptyMarketCards();

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full space-y-12">
      <section className="text-center pt-16 pb-10 sm:pt-20 sm:pb-12">
        <h1 className="text-2xl font-bold font-display">选择一个智能体开始</h1>
      </section>

      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((card) => (
            <MarketCard key={card.id} card={card} onEnter={() => onUseAgent(card.id)} />
          ))}
        </div>
      </section>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onViewMarket}
          className="px-5 py-3 text-xs font-bold border border-black/15 hover:bg-black/[0.02] rounded-lg"
        >
          去智能体市场
        </button>
      </div>
    </div>
  );
}
