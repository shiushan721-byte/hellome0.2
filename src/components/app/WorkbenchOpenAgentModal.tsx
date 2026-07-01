import { useMemo, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { FolderPlus, Search, X } from 'lucide-react';
import AgentIcon from './agents/AgentIcon';
import { CATEGORIES, getAgentById, type AgentCategory } from '../../data/agentsCatalog';
import { getFullyRunAgentIds, getTasks, subscribeTasks } from '../../lib/taskStore';
import { openWorkbenchTab } from '../../lib/workbenchTabs';
import type { EnabledAgentSummary } from '../../types/homeDashboard';
import {
  createProject,
  getProjects,
  setActiveProjectId,
  setPendingAgentContext,
  subscribeProjects,
} from '../../lib/projectStore';

type OpenAgentFilter = AgentCategory | 'recent';

const FILTER_TABS: Array<{ id: OpenAgentFilter; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'recent', label: '最近使用' },
  ...CATEGORIES.filter((cat) => cat.id !== 'all'),
];

const CARD_MIN_HEIGHT = 180;
const GRID_GAP = 12;
const GRID_COLS = 3;

function gridContentHeight(agentCount: number): number {
  const rows = Math.max(1, Math.ceil(agentCount / GRID_COLS));
  return rows * CARD_MIN_HEIGHT + (rows - 1) * GRID_GAP;
}

interface WorkbenchOpenAgentModalProps {
  agents: EnabledAgentSummary[];
  defaultProjectId?: string;
  onOpen: (agentId: string, projectId: string, tabId: string) => void;
  onClose: () => void;
}

function OpenAgentPickerCard({
  agent,
  onOpen,
}: {
  agent: EnabledAgentSummary;
  onOpen: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-black/[0.04] shadow-sm flex flex-col h-[180px]">
      <AgentIcon src={agent.iconSrc} alt={agent.name} size="md" className="mb-3" />
      <h3 className="text-sm font-bold text-[#1A1A1A] mb-1.5">{agent.name}</h3>
      <p className="text-xs text-black/45 leading-relaxed line-clamp-2 flex-1 mb-3">{agent.description}</p>
      <button
        type="button"
        onClick={onOpen}
        className="w-full py-2 text-xs font-bold rounded-lg bg-black text-white hover:bg-black/85"
      >
        打开智能体
      </button>
    </div>
  );
}

export default function WorkbenchOpenAgentModal({
  agents,
  defaultProjectId,
  onOpen,
  onClose,
}: WorkbenchOpenAgentModalProps) {
  const projects = useSyncExternalStore(subscribeProjects, getProjects, getProjects);
  const [category, setCategory] = useState<OpenAgentFilter>('all');
  const [query, setQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId || projects[0]?.id || '');
  const [creatingProject, setCreatingProject] = useState(projects.length === 0);
  const [projectName, setProjectName] = useState('');
  const taskRevision = useSyncExternalStore(
    subscribeTasks,
    () => getTasks().map((task) => `${task.id}:${task.status}:${task.updatedAt}`).join(','),
    () => '',
  );

  const fullyRunAgentIds = useMemo(() => getFullyRunAgentIds(), [taskRevision]);

  const filteredAgents = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = agents.filter((agent) => {
      const catalog = getAgentById(agent.agentId);
      const matchCategory =
        category === 'all'
          ? true
          : category === 'recent'
            ? fullyRunAgentIds.includes(agent.agentId)
            : catalog?.category === category;
      const matchQuery =
        !q ||
        agent.name.toLowerCase().includes(q) ||
        agent.description.toLowerCase().includes(q) ||
        catalog?.creator.toLowerCase().includes(q);
      return matchCategory && matchQuery;
    });

    if (category !== 'recent') return filtered;

    return filtered.sort(
      (a, b) => fullyRunAgentIds.indexOf(a.agentId) - fullyRunAgentIds.indexOf(b.agentId),
    );
  }, [agents, category, fullyRunAgentIds, query]);

  const listHeight = useMemo(
    () => gridContentHeight(filteredAgents.length),
    [filteredAgents.length],
  );

  const openWithProject = (agent: EnabledAgentSummary) => {
    let project = projects.find((item) => item.id === selectedProjectId) ?? null;
    if (creatingProject || !project) {
      project = createProject({ name: projectName.trim() || `${agent.name} 项目` });
    }
    if (!project) return;

    const tab = openWorkbenchTab({
      agentId: agent.agentId,
      agentName: agent.name,
      projectId: project.id,
      projectName: project.name,
      status: 'opened',
    });
    setActiveProjectId(project.id);
    setPendingAgentContext({
      agentId: agent.agentId,
      taskScope: 'project',
      projectId: project.id,
      projectName: project.name,
      tabId: tab.id,
      createdAt: new Date().toISOString(),
    });
    onOpen(agent.agentId, project.id, tab.id);
  };

  const modal = (
    <div className="fixed inset-0 z-[100] bg-black/25 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-5xl bg-white border border-black/10 rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-black/8 flex items-center gap-3 bg-white">
          <h3 className="text-sm font-semibold shrink-0">打开智能体</h3>
          <div className="relative flex-1 max-w-[168px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/30" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F5F5F7] rounded-full border border-black/6 outline-none focus:ring-1 focus:ring-black/5"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 shrink-0 rounded-md border border-black/10 hover:bg-[#F2F0ED] flex items-center justify-center ml-auto"
            aria-label="关闭"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-4 py-3 bg-[#F5F5F7] border-b border-black/6 space-y-3">
          <div className="flex flex-col gap-2 rounded-xl border border-black/8 bg-white p-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-xs font-semibold text-black/70">
              <FolderPlus className="h-4 w-4 text-black/45" />
              项目
            </div>
            {creatingProject ? (
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="输入新项目名称"
                className="h-9 min-w-0 flex-1 rounded-lg border border-black/10 bg-[#F7F8FA] px-3 text-sm outline-none focus:border-black/25"
              />
            ) : (
              <select
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                className="h-9 min-w-0 flex-1 rounded-lg border border-black/10 bg-[#F7F8FA] px-3 text-sm outline-none focus:border-black/25"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => setCreatingProject((value) => !value)}
              className="h-9 shrink-0 rounded-lg border border-black/10 px-3 text-xs font-bold text-black/62 hover:bg-black/[0.03]"
            >
              {creatingProject ? '选择已有项目' : '新建项目'}
            </button>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1">
            {FILTER_TABS.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`shrink-0 px-4 py-2 text-sm rounded-xl transition-colors ${
                  category === cat.id
                    ? 'bg-white text-[#1A1A1A] font-medium shadow-sm'
                    : 'text-black/45 hover:text-black/70'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div
          className="p-4 overflow-y-auto bg-[#F5F5F7]"
          style={{ maxHeight: `min(${listHeight + 32}px, 60vh)` }}
        >
          {filteredAgents.length === 0 ? (
            <p className="py-8 text-center text-xs text-black/45">
              {category === 'recent' ? '暂无完整运行过的智能体' : '未找到匹配的智能体'}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filteredAgents.map((agent) => (
                <OpenAgentPickerCard
                  key={agent.agentId}
                  agent={agent}
                  onOpen={() => openWithProject(agent)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
