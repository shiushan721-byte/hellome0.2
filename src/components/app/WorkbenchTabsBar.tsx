import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { getHomeDashboardData } from '../../lib/homeDashboard';
import { getTasks, subscribeTasks } from '../../lib/taskStore';
import { useSyncExternalStore } from 'react';
import {
  getHermesConnection,
  refreshHermesConnection,
  subscribeHermesConnection,
} from '../../lib/hermesConnection';
import {
  closeAgentTab,
  closeWorkbenchTab,
  getLastOpenedTabId,
  getHiddenTabIds,
  getTabOrder,
  getVisibleWorkbenchTabs,
  pruneWorkbenchTabs,
  setTabOrder,
  setWorkbenchTabOrder,
  sortRecentAgentSummaries,
  subscribeWorkbenchTabs,
  type WorkbenchAgentTab,
} from '../../lib/workbenchTabs';
import type { EnabledAgentSummary } from '../../types/homeDashboard';
import HermesActionModal from './HermesActionModal';
import WorkbenchOpenAgentModal from './WorkbenchOpenAgentModal';
import { AGENTS } from '../../data/agentsCatalog';
import { isHermesConnected } from '../../lib/firstRunOnboarding';
import { replayPendingIntent } from '../../lib/pendingAgentIntent';
import { getAgentWorkspacePath } from '../../lib/openAgentWorkspace';
import { tryUseAgent } from '../../lib/useAgentAccess';
import { isLowBalance, getUsage, subscribeUsage } from '../../lib/usageStore';
import { setPendingAgentContext } from '../../lib/projectStore';
import AgentProjectChoiceModal from './projects/AgentProjectChoiceModal';
import type { AgentMarketCard } from '../../types/agentsPage';

const TAB_ACTIVE_BG = '#FDFCFB';
interface WorkbenchTabsBarProps {
  variant?: 'chrome' | 'topbar';
}

export default function WorkbenchTabsBar({ variant = 'chrome' }: WorkbenchTabsBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
  const [openAgentModal, setOpenAgentModal] = useState(false);
  const [showHermesModal, setShowHermesModal] = useState(false);
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const [projectChoiceAgent, setProjectChoiceAgent] = useState<AgentMarketCard | null>(null);

  useSyncExternalStore(subscribeTasks, getTasks, getTasks);
  useSyncExternalStore(subscribeUsage, getUsage, getUsage);
  const workbenchRevision = useSyncExternalStore(
    subscribeWorkbenchTabs,
    () =>
      `${getHiddenTabIds().join(',')}|${getTabOrder().join(',')}|${getVisibleWorkbenchTabs()
        .map((tab) => `${tab.id}:${tab.status}:${tab.updatedAt}`)
        .join(',')}`,
    () => '',
  );
  const hermes = useSyncExternalStore(
    subscribeHermesConnection,
    getHermesConnection,
    getHermesConnection,
  );
  const lowBalance = isLowBalance(getUsage());
  const routeSearchParams = new URLSearchParams(location.search);
  const routeProjectId = routeSearchParams.get('project') || '';
  const routeTabId = routeSearchParams.get('tab') || '';

  const activeAgentId = useMemo(() => {
    if (location.pathname === '/app') {
      return new URLSearchParams(location.search).get('agent');
    }
    const match = location.pathname.match(/^\/app\/agents\/([^/]+)$/);
    return match?.[1] ?? null;
  }, [location.pathname, location.search]);

  const projectTabs = useMemo(() => getVisibleWorkbenchTabs(), [workbenchRevision]);
  const activeRouteTab = useMemo(
    () => projectTabs.find((tab) => tab.id === routeTabId) ?? null,
    [projectTabs, routeTabId],
  );

  const recentAgents = useMemo(
    () => sortRecentAgentSummaries(getHomeDashboardData().recentAgents),
    [workbenchRevision],
  );

  const availableAgents = useMemo<EnabledAgentSummary[]>(
    () =>
      AGENTS.filter((agent) => agent.available).map((agent) => {
        const existing = recentAgents.find((item) => item.agentId === agent.id);
        return (
          existing ?? {
            agentId: agent.id,
            name: agent.name,
            description: agent.desc,
            path: agent.path,
            iconSrc: agent.iconSrc,
            monthlyTaskCount: 0,
            monthlyTokenUsed: 0,
            templates: [],
          }
        );
      }),
    [recentAgents],
  );

  const availableIds = useMemo(
    () => new Set(AGENTS.filter((a) => a.available).map((a) => a.id)),
    [],
  );

  useEffect(() => {
    pruneWorkbenchTabs(availableIds);
  }, [availableIds]);

  const visibleAgents = recentAgents;
  const tabItems = useMemo(() => {
    if (projectTabs.length === 0) {
      return visibleAgents.map((agent) => ({
        id: agent.agentId,
        agentId: agent.agentId,
        agentName: agent.name,
        projectId: '',
        projectName: '',
        status: agent.latestTask?.status,
        iconSrc: agent.iconSrc,
        latestTask: agent.latestTask,
        legacy: true,
      }));
    }

    return projectTabs.map((tab) => {
      const agent = availableAgents.find((item) => item.agentId === tab.agentId);
      return {
        ...tab,
        iconSrc: agent?.iconSrc,
        latestTask: agent?.latestTask,
        legacy: false,
      };
    });
  }, [availableAgents, projectTabs, visibleAgents]);

  const clearHoverState = () => {
    setHoveredTabId(null);
  };

  const openAgent = (agentId: string, tab?: WorkbenchAgentTab) => {
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
      if (tab) {
        setPendingAgentContext({
          agentId: tab.agentId,
          taskScope: 'project',
          projectId: tab.projectId,
          projectName: tab.projectName,
          tabId: tab.id,
          createdAt: new Date().toISOString(),
        });
        navigate(`${getAgentWorkspacePath(agentId)}?project=${encodeURIComponent(tab.projectId)}&tab=${encodeURIComponent(tab.id)}`);
        return;
      }
      const agent = availableAgents.find((item) => item.agentId === agentId);
      if (agent) {
        setProjectChoiceAgent({
          id: agent.agentId,
          name: agent.name,
          description: agent.description,
          tokenRange: '',
          estimatedTokenMin: 0,
          estimatedTokenMax: 0,
          category: 'all',
          creator: 'HelloMe',
          creatorAvatar: 'H',
          heat: '',
          likes: '',
          iconSrc: agent.iconSrc,
          status: 'available',
        });
      } else {
        navigate(getAgentWorkspacePath(agentId));
      }
    }
  };

  const closeTab = (e: MouseEvent, tabId: string, agentId: string, legacy: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    const fallback = legacy ? null : closeWorkbenchTab(tabId);
    if (legacy) closeAgentTab(agentId);
    clearHoverState();

    if (activeAgentId !== agentId) return;

    if (fallback && fallback.id !== tabId) {
      setPendingAgentContext({
        agentId: fallback.agentId,
        taskScope: 'project',
        projectId: fallback.projectId,
        projectName: fallback.projectName,
        tabId: fallback.id,
        createdAt: new Date().toISOString(),
      });
      navigate(`${getAgentWorkspacePath(fallback.agentId)}?project=${encodeURIComponent(fallback.projectId)}&tab=${encodeURIComponent(fallback.id)}`);
      return;
    }

    navigate('/app', { replace: true });
  };

  const reorderByDrop = (targetId: string) => {
    if (!draggingTabId || draggingTabId === targetId) return;
    const visibleIds = tabItems.map((tab) => tab.id);
    const sourceIndex = visibleIds.indexOf(draggingTabId);
    const targetIndex = visibleIds.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const nextVisible = [...visibleIds];
    nextVisible.splice(sourceIndex, 1);
    nextVisible.splice(targetIndex, 0, draggingTabId);
    if (projectTabs.length > 0) {
      setWorkbenchTabOrder(nextVisible);
      return;
    }
    const leftovers = getTabOrder().filter((id) => !nextVisible.includes(id));
    setTabOrder([...nextVisible, ...leftovers]);
  };

  if (tabItems.length === 0) {
    return null;
  }

  const lastTab = tabItems[tabItems.length - 1];
  const activeProjectTabId = getLastOpenedTabId();
  const lastTabIsActive = lastTab.agentId === activeAgentId && (!activeProjectTabId || lastTab.id === activeProjectTabId);
  const lastTabIsHovered = lastTab.id === hoveredTabId;
  const showPlusSeparator = !lastTabIsActive && !lastTabIsHovered;

  const tabList = (
    <>
      {tabItems.map((tab, index) => {
        const isActive = tab.agentId === activeAgentId && (tab.legacy || !activeProjectTabId || tab.id === activeProjectTabId);
        const isHovered = tab.id === hoveredTabId;
        const isPrevActiveOrHovered =
          index > 0 &&
          ((tabItems[index - 1].agentId === activeAgentId &&
            (tabItems[index - 1].legacy || !activeProjectTabId || tabItems[index - 1].id === activeProjectTabId)) ||
            tabItems[index - 1].id === hoveredTabId);
        const showSeparator = !isActive && !isHovered && !isPrevActiveOrHovered && index !== 0;

        const tabHeightClass = variant === 'topbar' ? 'h-full' : 'h-[36px]';
        const tabTextClass = variant === 'topbar' ? 'text-[13px]' : 'text-xs';

        return (
          <div
            key={tab.id}
            draggable
            onDragStart={() => setDraggingTabId(tab.id)}
            onDragEnd={() => setDraggingTabId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => reorderByDrop(tab.id)}
            onMouseEnter={() => setHoveredTabId(tab.id)}
            onMouseLeave={clearHoverState}
            onClick={() => openAgent(tab.agentId, tab.legacy ? undefined : tab)}
            className={`group relative flex items-center ${tabHeightClass} min-w-[60px] max-w-[220px] flex-1 shrink cursor-pointer px-2.5 rounded-t-[8px] transition-colors duration-150 ease-in-out ${
              isActive ? 'z-20' : isHovered ? 'z-10 bg-[#ebeced]' : 'z-0 bg-transparent hover:bg-[#ebeced]'
            }`}
            style={isActive ? { backgroundColor: TAB_ACTIVE_BG } : undefined}
          >
            {isActive && (
              <>
                <div
                  className="absolute -left-2 bottom-0 w-2 h-2 rounded-br-[8px] pointer-events-none"
                  style={{ boxShadow: `4px 0 0 0 ${TAB_ACTIVE_BG}` }}
                />
                <div
                  className="absolute -right-2 bottom-0 w-2 h-2 rounded-bl-[8px] pointer-events-none"
                  style={{ boxShadow: `-4px 0 0 0 ${TAB_ACTIVE_BG}` }}
                />
              </>
            )}

            {showSeparator && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-4 bg-gray-400/60 pointer-events-none" />
            )}

            <div className="relative shrink-0 w-[18px] h-[18px] mr-1.5">
              <img
                src={tab.iconSrc}
                alt=""
                className="w-[18px] h-[18px] rounded-full object-cover bg-white"
                loading="lazy"
              />
              {(tab.latestTask?.status === 'running' || tab.status === 'running') && (
                <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-white" />
              )}
              {(tab.latestTask?.status === 'waiting_confirmation' || tab.status === 'waiting_confirmation') && (
                <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 ring-1 ring-white" />
              )}
              {(tab.status === 'queued' || tab.status === 'awaiting_input') && (
                <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-blue-400 ring-1 ring-white" />
              )}
            </div>

            <div className={`flex-1 min-w-0 overflow-hidden text-[#3c4043] leading-none ${tabTextClass}`}>
              <div className="truncate">{tab.agentName}</div>
              {!tab.legacy && variant === 'topbar' ? (
                <div className="mt-0.5 truncate text-[10px] leading-none text-black/38">{tab.projectName}</div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={(e) => closeTab(e, tab.id, tab.agentId, tab.legacy)}
              aria-label={`关闭 ${tab.agentName} 标签`}
              className={`shrink-0 ml-1 w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-200 transition-all ${
                isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
            >
              <X size={13} className="text-gray-600" />
            </button>
          </div>
        );
      })}

      <div className="relative shrink-0 flex items-center h-full pl-1.5">
        {showPlusSeparator && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-4 bg-gray-400/60 pointer-events-none" />
        )}
        <button
          type="button"
          onClick={() => {
            if (!isHermesConnected()) setShowHermesModal(true);
            else setOpenAgentModal(true);
          }}
          title="打开智能体"
          aria-label="打开智能体"
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#d0d4cd] transition-colors"
        >
          <Plus size={18} className="text-gray-600" />
        </button>
      </div>
    </>
  );

  const topbarTabStrip = (
    <div className="flex items-stretch w-full h-full pl-1 pr-0 overflow-hidden select-none">
      <div className="flex flex-1 h-full min-w-0 items-start overflow-x-auto custom-scrollbar relative pr-4">
        {tabList}
      </div>
    </div>
  );

  return (
    <div className={variant === 'topbar' ? 'min-w-0 w-full h-full flex items-stretch overflow-hidden' : 'relative'}>
      {variant === 'topbar' ? topbarTabStrip : (
        <div className="flex items-end w-full h-[46px] bg-[#dee1e6] px-2 pt-2 overflow-hidden select-none">
          <div className="flex flex-1 h-full min-w-0 items-end overflow-hidden relative pr-2">
            {tabList}
          </div>
        </div>
      )}

      {openAgentModal && (
        <WorkbenchOpenAgentModal
          agents={availableAgents}
          defaultProjectId={activeRouteTab?.projectId || routeProjectId || projectTabs[projectTabs.length - 1]?.projectId}
          onOpen={(agentId, projectId, tabId) => {
            navigate(`${getAgentWorkspacePath(agentId)}?project=${encodeURIComponent(projectId)}&tab=${encodeURIComponent(tabId)}&launch=${Date.now()}`);
            setOpenAgentModal(false);
          }}
          onClose={() => setOpenAgentModal(false)}
        />
      )}

      {projectChoiceAgent ? (
        <AgentProjectChoiceModal
          agent={projectChoiceAgent}
          onClose={() => setProjectChoiceAgent(null)}
          onConfirm={(agentId, projectId, tabId) => {
            setProjectChoiceAgent(null);
            navigate(`${getAgentWorkspacePath(agentId)}?project=${encodeURIComponent(projectId)}&tab=${encodeURIComponent(tabId)}&launch=${Date.now()}`);
          }}
        />
      ) : null}

      {showHermesModal && (
        <HermesActionModal
          variant="pairing"
          status={hermes.status}
          onClose={() => setShowHermesModal(false)}
          onOpenHermes={() => refreshHermesConnection()}
          onPairedComplete={() => {
            if (isHermesConnected()) {
              setShowHermesModal(false);
              navigate(replayPendingIntent());
            }
          }}
        />
      )}
    </div>
  );
}
