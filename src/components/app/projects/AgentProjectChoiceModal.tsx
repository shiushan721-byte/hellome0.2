import { useMemo, useState, useSyncExternalStore } from 'react';
import { FolderKanban, X } from 'lucide-react';
import {
  createProject,
  getProjects,
  setActiveProjectId,
  setPendingAgentContext,
  subscribeProjects,
} from '../../../lib/projectStore';
import { openWorkbenchTab } from '../../../lib/workbenchTabs';
import type { AgentMarketCard } from '../../../types/agentsPage';

interface AgentProjectChoiceModalProps {
  agent: Pick<AgentMarketCard, 'id' | 'name' | 'description'>;
  onClose: () => void;
  onConfirm: (agentId: string, projectId: string, tabId: string) => void;
}

export default function AgentProjectChoiceModal({
  agent,
  onClose,
  onConfirm,
}: AgentProjectChoiceModalProps) {
  const projects = useSyncExternalStore(subscribeProjects, getProjects, getProjects);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? '');
  const [creating, setCreating] = useState(projects.length === 0);
  const [projectName, setProjectName] = useState('');

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );
  const confirmProject = () => {
    let project = selectedProject;
    if (creating) {
      project = createProject({ name: projectName.trim() || `${agent.name} 项目` });
    }
    if (!project) return;
    const tab = openWorkbenchTab({
      agentId: agent.id,
      agentName: agent.name,
      projectId: project.id,
      projectName: project.name,
      status: 'opened',
    });
    setActiveProjectId(project.id);
    setPendingAgentContext({
      agentId: agent.id,
      taskScope: 'project',
      projectId: project.id,
      projectName: project.name,
      tabId: tab.id,
      createdAt: new Date().toISOString(),
    });
    onConfirm(agent.id, project.id, tab.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/35"
        aria-label="关闭"
        onClick={onClose}
      />
      <section className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-black/8">
        <div className="flex items-start justify-between gap-4 border-b border-black/8 px-5 py-4">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF6F4] text-[#0F766E]">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-black/85">使用 {agent.name}</h2>
              <p className="mt-1 text-sm leading-6 text-black/48">
                使用智能体前需要选择或新建项目。项目会隔离 Hermes 记忆，并复用你的业务资料。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-black/35 hover:bg-black/[0.04] hover:text-black"
            aria-label="关闭弹窗"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-xl border border-black/8 bg-[#F7F8FA] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-black/75">项目任务</p>
                <p className="mt-1 text-xs leading-5 text-black/45">
                  读取项目资料，生成结果会沉淀到项目。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreating((value) => !value)}
                className="shrink-0 text-xs font-bold text-[#0F766E] hover:underline"
              >
                {creating ? '选择已有' : '新建项目'}
              </button>
            </div>

            {creating ? (
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder={`${agent.name} 项目`}
                className="mt-3 h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#14958A]/40"
              />
            ) : (
              <select
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                className="mt-3 h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#14958A]/40"
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
              onClick={confirmProject}
              disabled={!creating && !selectedProject}
              className="mt-3 h-10 w-full rounded-lg bg-black text-xs font-bold text-white disabled:opacity-35"
            >
              使用项目进入
            </button>
          </div>

        </div>
      </section>
    </div>
  );
}
