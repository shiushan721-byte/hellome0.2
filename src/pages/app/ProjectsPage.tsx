import { useEffect, useState, useSyncExternalStore } from 'react';
import { Bot, ChevronDown, Eye, FolderKanban, Plus, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  createProject,
  getProjects,
  setPendingAgentContext,
  subscribeProjects,
} from '../../lib/projectStore';
import {
  duplicateTask,
  getGlobalActiveTask,
  getQueuePosition,
  getQueuedTasks,
  getTasks,
  subscribeTasks,
} from '../../lib/taskStore';
import { listRemoteTasks } from '../../lib/taskApi';
import { runGeoTask } from '../../lib/geoTaskRunner';
import TaskStatusBadge, {
  agentLabel,
  formatDuration,
  formatTime,
} from '../../components/app/tasks/TaskStatusBadge';
import {
  getAgentSessions,
  loadAgentSessionsFromServer,
  subscribeAgentSessions,
  type AgentWorkSession,
} from '../../lib/agentSessionStore';
import { getAgentWorkbenchPath } from '../../lib/agentWorkbench';
import { formatTokenRange } from '../../lib/tokenBilling';
import type { ProjectProfile, Task } from '../../types/workbench';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const projects = useSyncExternalStore(subscribeProjects, getProjects, getProjects);
  const localTasks = useSyncExternalStore(subscribeTasks, getTasks, getTasks);
  const sessions = useSyncExternalStore(subscribeAgentSessions, getAgentSessions, getAgentSessions);
  const [remoteTasks, setRemoteTasks] = useState<Task[]>([]);
  const [expandedProjectIds, setExpandedProjectIds] = useState<string[]>([]);
  const tasks = mergeTasks(localTasks, remoteTasks);
  const activeTask = getGlobalActiveTask();
  const queuedCount = getQueuedTasks().length;

  useEffect(() => {
    if (expandedProjectIds.length === 0 && projects[0]) {
      setExpandedProjectIds([projects[0].id]);
      return;
    }
    const next = expandedProjectIds.filter((id) => projects.some((project) => project.id === id));
    if (next.length !== expandedProjectIds.length) setExpandedProjectIds(next);
  }, [expandedProjectIds, projects]);

  useEffect(() => {
    let mounted = true;
    loadAgentSessionsFromServer().catch(() => {});
    listRemoteTasks()
      .then((items) => {
        if (mounted) setRemoteTasks(items);
      })
      .catch(() => {
        if (mounted) setRemoteTasks([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleCreate = () => {
    const project = createProject({ name: '新项目' });
    setExpandedProjectIds((ids) => [project.id, ...ids]);
  };

  const handleRerunTask = (taskId: string) => {
    const task = duplicateTask(taskId);
    if (!task) return;
    runGeoTask(task.id);
    navigate(`/app/tasks/${task.id}`);
  };

  const handleOpenSession = (session: AgentWorkSession) => {
    setPendingAgentContext({
      agentId: session.agentId,
      taskScope: 'project',
      projectId: session.projectId,
      projectName: session.projectName,
      tabId: session.id,
      createdAt: new Date().toISOString(),
    });
    navigate(`${getAgentWorkbenchPath(session.agentId)}?project=${session.projectId}&tab=${encodeURIComponent(session.id)}`);
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjectIds((ids) =>
      ids.includes(projectId) ? ids.filter((id) => id !== projectId) : [projectId, ...ids],
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">项目中心</h1>
          <p className="mt-1 text-sm text-black/45">
            项目用于沉淀资料、管理任务队列，并按项目查看任务过程和结果。
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-black px-4 text-xs font-bold text-white"
        >
          <Plus className="h-4 w-4" />
          新建项目
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-black/8 bg-white p-10 text-center">
          <FolderKanban className="mx-auto h-10 w-10 text-black/25" />
          <p className="mt-4 text-sm font-bold text-black/70">还没有项目</p>
          <p className="mt-2 text-sm text-black/45">创建项目后，GEO、视频、销售等智能体可以复用同一套资料。</p>
          <button
            type="button"
            onClick={handleCreate}
            className="mt-5 rounded-lg bg-black px-4 py-2 text-xs font-bold text-white"
          >
            创建第一个项目
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <GlobalQueueSummary activeTask={activeTask} queuedCount={queuedCount} />
          <section className="rounded-2xl border border-black/8 bg-white p-2">
            {projects.map((project) => (
              <ProjectAccordion
                key={project.id}
                project={project}
                tasks={tasks.filter((task) => task.projectId === project.id)}
                sessions={sessions.filter((session) => session.projectId === project.id)}
                open={expandedProjectIds.includes(project.id)}
                onToggle={() => toggleProject(project.id)}
                onOpenSession={handleOpenSession}
                onOpenTask={(taskId) => navigate(`/app/tasks/${taskId}`)}
                onRerunTask={handleRerunTask}
              />
            ))}
          </section>
        </div>
      )}
    </div>
  );
}

function mergeTasks(localTasks: Task[], remoteTasks: Task[]): Task[] {
  const byId = new Map<string, Task>();
  for (const task of remoteTasks) byId.set(task.id, task);
  for (const task of localTasks) byId.set(task.id, task);
  return [...byId.values()];
}

function ProjectAccordion({
  project,
  tasks,
  sessions,
  open,
  onToggle,
  onOpenSession,
  onOpenTask,
  onRerunTask,
}: {
  project: ProjectProfile;
  tasks: Task[];
  sessions: AgentWorkSession[];
  open: boolean;
  onToggle: () => void;
  onOpenSession: (session: AgentWorkSession) => void;
  onOpenTask: (taskId: string) => void;
  onRerunTask: (taskId: string) => void;
}) {
  const runningCount = tasks.filter((task) => task.status !== 'completed').length;
  const completedCount = tasks.filter((task) => task.status === 'completed').length;
  const latestTask = [...tasks].sort(
    (a, b) =>
      new Date(b.updatedAt ?? b.completedAt ?? b.createdAt).getTime() -
      new Date(a.updatedAt ?? a.completedAt ?? a.createdAt).getTime(),
  )[0];
  const latestSession = [...sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )[0];
  const latestTaskTime = latestTask?.updatedAt ?? latestTask?.completedAt ?? latestTask?.createdAt;
  const latestTime =
    [latestTaskTime, latestSession?.updatedAt, project.updatedAt]
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || project.updatedAt;

  return (
    <article className="rounded-xl transition-colors hover:bg-black/[0.02]">
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
          open ? 'bg-[#F0F0F2]' : 'hover:bg-[#F7F7F8]'
        }`}
      >
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-black/35 transition-transform ${open ? '' : '-rotate-90'}`}
        />
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-black/82">{project.name}</p>
          <p className="mt-1 truncate text-xs text-black/40">
            {project.brandName || '未填写品牌名'} · 工作会话 {sessions.length} · 任务中 {runningCount} · 已完成 {completedCount}
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {latestTask ? <TaskStatusBadge status={latestTask.status} /> : null}
          <span className="min-w-12 text-right text-sm font-medium text-black/38">
            {formatRelativeTime(latestTime)}
          </span>
        </div>
      </button>

      {open ? (
        <div className="px-4 pb-4 pt-2">
          <ProjectSessionsList
            sessions={sessions}
            onOpenSession={onOpenSession}
          />
          <ProjectTasksList
            tasks={tasks}
            onOpenTask={onOpenTask}
            onRerunTask={onRerunTask}
          />
        </div>
      ) : null}
    </article>
  );
}

function ProjectSessionsList({
  sessions,
  onOpenSession,
}: {
  sessions: AgentWorkSession[];
  onOpenSession: (session: AgentWorkSession) => void;
}) {
  return (
    <div className="mb-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-black/75">工作会话</p>
        <span className="rounded-full bg-[#F2F0ED] px-2.5 py-1 text-[11px] font-semibold text-black/45">
          {sessions.length}
        </span>
      </div>
      {sessions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/10 bg-[#FCFCFD] px-4 py-5 text-center text-sm text-black/35">
          当前项目还没有已操作的智能体。打开智能体并填写内容后，会在这里展示。
        </p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="rounded-xl border border-black/8 bg-[#FCFCFD] px-4 py-3"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Bot className="h-4 w-4 text-black/35" />
                    <p className="truncate text-sm font-bold text-black/80">{session.agentName}</p>
                    <SessionStatusBadge status={session.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-black/40">
                    <span>{session.projectName}</span>
                    <span>{formatTime(session.updatedAt)}</span>
                    {session.taskId ? <span className="font-mono">任务 {session.taskId}</span> : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenSession(session)}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 text-xs font-bold text-black/65 hover:border-black/20"
                >
                  <Eye className="h-3.5 w-3.5" />
                  打开
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SessionStatusBadge({ status }: { status: AgentWorkSession['status'] }) {
  const config: Record<AgentWorkSession['status'], { label: string; className: string }> = {
    draft: { label: '已填写', className: 'bg-black/5 text-black/45' },
    queued: { label: '排队中', className: 'bg-violet-50 text-violet-700' },
    awaiting_input: { label: '等待参数', className: 'bg-cyan-50 text-cyan-700' },
    running: { label: '执行中', className: 'bg-blue-50 text-blue-700' },
    waiting_confirmation: { label: '等待确认', className: 'bg-amber-50 text-amber-700' },
    completed: { label: '已完成', className: 'bg-emerald-50 text-emerald-700' },
    failed: { label: '失败', className: 'bg-red-50 text-red-600' },
    cancelled: { label: '已取消', className: 'bg-black/5 text-black/45' },
  };
  const item = config[status];
  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${item.className}`}>
      {item.label}
    </span>
  );
}

function formatRelativeTime(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff) || diff < 0) return '刚刚';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 时`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天`;
  const months = Math.floor(days / 30);
  return `${months} 月`;
}

function GlobalQueueSummary({
  activeTask,
  queuedCount,
}: {
  activeTask?: Task;
  queuedCount: number;
}) {
  return (
    <section className="rounded-2xl border border-black/8 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-black/85">全局任务队列</p>
          <p className="mt-1 text-xs text-black/45">每次只运行一个任务，其他任务按创建时间排队。</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-[#F2F0ED] px-3 py-1 font-semibold text-black/55">
            队列中 {queuedCount}
          </span>
          {activeTask ? (
            <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
              当前执行：{activeTask.name}
            </span>
          ) : (
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
              当前空闲
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function ProjectTasksList({
  tasks,
  onOpenTask,
  onRerunTask,
}: {
  tasks: Task[];
  onOpenTask: (taskId: string) => void;
  onRerunTask: (taskId: string) => void;
}) {
  const activeTasks = tasks
    .filter((task) => task.status !== 'completed')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const completedTasks = tasks
    .filter((task) => task.status === 'completed')
    .sort((a, b) => new Date(b.completedAt ?? b.createdAt).getTime() - new Date(a.completedAt ?? a.createdAt).getTime());

  return tasks.length === 0 ? (
    <p className="rounded-xl border border-dashed border-black/10 bg-[#FCFCFD] px-4 py-5 text-center text-sm text-black/35">
      当前项目还没有任务。去首页选择智能体后，会在这里展示任务进度。
    </p>
  ) : (
    <div className="space-y-4">
      <TaskGroup
        title="任务中"
        empty="当前项目没有进行中任务"
        tasks={activeTasks}
        onOpenTask={onOpenTask}
        onRerunTask={onRerunTask}
      />
      <TaskGroup
        title="已完成"
        empty="当前项目还没有完成任务"
        tasks={completedTasks}
        onOpenTask={onOpenTask}
        onRerunTask={onRerunTask}
      />
    </div>
  );
}

function TaskGroup({
  title,
  empty,
  tasks,
  onOpenTask,
  onRerunTask,
}: {
  title: string;
  empty: string;
  tasks: Task[];
  onOpenTask: (taskId: string) => void;
  onRerunTask: (taskId: string) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-black/75">{title}</p>
        <span className="rounded-full bg-[#F2F0ED] px-2.5 py-1 text-[11px] font-semibold text-black/45">
          {tasks.length}
        </span>
      </div>
      {tasks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/10 bg-[#FCFCFD] px-4 py-5 text-center text-sm text-black/35">
          {empty}
        </p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onOpen={() => onOpenTask(task.id)}
              onRerun={() => onRerunTask(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  onOpen,
  onRerun,
}: {
  task: Task;
  onOpen: () => void;
  onRerun: () => void;
}) {
  const queuePosition = task.status === 'queued' ? getQueuePosition(task.id) : 0;

  return (
    <div className="rounded-xl border border-black/8 bg-[#FCFCFD] px-4 py-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-bold text-black/80">{task.name}</p>
            <TaskStatusBadge status={task.status} />
            {queuePosition > 0 ? (
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                第 {queuePosition} 位
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-black/40">
            <span>{agentLabel(task.agentType)}</span>
            <span>{formatTime(task.createdAt)}</span>
            <span>{formatDuration(task.durationMs)}</span>
            <span className="font-mono">
              {task.tokenUsed > 0
                ? `${task.tokenUsed.toLocaleString('zh-CN')} Token`
                : formatTokenRange({ min: task.estimatedTokenMin, max: task.estimatedTokenMax })}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 text-xs font-bold text-black/65 hover:border-black/20"
          >
            <Eye className="h-3.5 w-3.5" />
            查看
          </button>
          {task.agentType === 'geo' && (
            <button
              type="button"
              onClick={onRerun}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 text-xs font-bold text-black/65 hover:border-black/20"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              再运行
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
