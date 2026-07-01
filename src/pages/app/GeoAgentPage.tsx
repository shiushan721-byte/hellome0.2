import { useEffect, useState, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { getAgentById } from '../../data/agentsCatalog';
import type { AgentEntryState } from '../../types/agentNavigation';
import { DEFAULT_AGENT_RETURN_PATH } from '../../types/agentNavigation';
import {
  getHermesConnection,
  refreshHermesConnection,
  subscribeHermesConnection,
} from '../../lib/hermesConnection';
import HermesActionModal from '../../components/app/HermesActionModal';
import {
  buildGeoInputFromProject,
  consumePendingAgentContext,
  getActiveProjectId,
  getProject,
  subscribeProjects,
} from '../../lib/projectStore';
import { createGeoTask, getGlobalActiveTask } from '../../lib/taskStore';
import { runGeoTask } from '../../lib/geoTaskRunner';
import { DEFAULT_GEO_MODELS } from '../../types/workbench';
import {
  attachWorkbenchTabTask,
  getActiveWorkbenchTaskTab,
  getWorkbenchTabForProjectAgent,
  markWorkbenchTabDraft,
} from '../../lib/workbenchTabs';

const MODELS = ['豆包', 'DeepSeek', '腾讯元宝', 'Kimi', '文心一言', 'Qwen', '智谱', 'MiniMax'];

export default function GeoAgentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const launchKey = searchParams.get('launch') ?? '';
  const routeTabId = searchParams.get('tab') ?? '';
  const entry = (location.state as AgentEntryState | null) ?? {};
  const agent = getAgentById(entry.agentId ?? 'geo');
  const agentName = agent?.name ?? 'GEO 智能体';
  const returnPath = entry.from ?? DEFAULT_AGENT_RETURN_PATH;
  void returnPath;

  const [executionCollapsed, setExecutionCollapsed] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runProgress, setRunProgress] = useState(10);
  const [showHermesModal, setShowHermesModal] = useState(false);
  const activeProjectId = useSyncExternalStore(subscribeProjects, getActiveProjectId, getActiveProjectId);
  const [selectedProjectId, setSelectedProjectId] = useState(activeProjectId);
  const [brandName, setBrandName] = useState('');
  const [targetMarket, setTargetMarket] = useState('');
  const [productService, setProductService] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [keywords, setKeywords] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [contextReady, setContextReady] = useState(false);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const hermes = useSyncExternalStore(
    subscribeHermesConnection,
    getHermesConnection,
    getHermesConnection,
  );

  useEffect(() => {
    setIsRunning(false);
    setRunProgress(10);
    setExecutionCollapsed(false);
  }, []);

  useEffect(() => {
    setContextReady(false);
    setHasUserEdited(false);
    const context = consumePendingAgentContext('geo');
    if (context?.taskScope === 'project') {
      setSelectedProjectId(context.projectId);
      const project = getProject(context.projectId);
      if (project) {
        const preset = buildGeoInputFromProject(project);
        const tabDraft = (routeTabId ? undefined : getWorkbenchTabForProjectAgent(context.projectId, 'geo')?.draftInput) as
          | Partial<{
              brandName: string;
              websiteUrl: string;
              keywords: string;
              competitors: string;
              productService: string;
              targetMarket: string;
              notes: string;
            }>
          | undefined;
        setHasUserEdited(Boolean(tabDraft));
        setBrandName(tabDraft?.brandName || preset.brandName || '');
        setWebsiteUrl(tabDraft?.websiteUrl || preset.websiteUrl || '');
        setKeywords(tabDraft?.keywords || preset.keywords || '');
        setCompetitors(tabDraft?.competitors || preset.competitors || '');
        setProductService(tabDraft?.productService || project.productIntro || '');
        setTargetMarket(tabDraft?.targetMarket || '');
        setNotes(tabDraft?.notes || project.notes || '');
      }
    }
    setContextReady(true);
  }, [agentName, launchKey]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }
    const timer = window.setInterval(() => {
      setRunProgress((prev) => Math.min(98, prev + (prev < 40 ? 8 : prev < 70 ? 5 : 2)));
    }, 1800);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  const selectedProject = getProject(selectedProjectId);
  const draftInput = {
    brandName: brandName.trim(),
    websiteUrl: websiteUrl.trim(),
    keywords: keywords.trim() || productService.trim(),
    competitors: competitors.trim(),
    models: DEFAULT_GEO_MODELS,
    depth: 'standard' as const,
  };

  useEffect(() => {
    if (!contextReady || !selectedProjectId || !selectedProject) return;
    if (!hasUserEdited) return;
    const hasDraft =
      brandName.trim() ||
      websiteUrl.trim() ||
      keywords.trim() ||
      competitors.trim() ||
      productService.trim() ||
      targetMarket.trim() ||
      notes.trim();
    if (!hasDraft) return;
    markWorkbenchTabDraft({
      agentId: 'geo',
      agentName,
      projectId: selectedProject.id,
      tabId: routeTabId || undefined,
      projectName: selectedProject.name,
      draftInput: {
        brandName,
        websiteUrl,
        keywords,
        competitors,
        productService,
        targetMarket,
        notes,
      },
    });
  }, [
    agentName,
    brandName,
    competitors,
    contextReady,
    hasUserEdited,
    keywords,
    notes,
    productService,
    selectedProject,
    selectedProjectId,
    targetMarket,
    websiteUrl,
  ]);

  const handleExecute = () => {
    setError('');
    if (hermes.status !== 'connected') {
      setShowHermesModal(true);
      return;
    }
    if (!selectedProjectId || !selectedProject) {
      setError('使用智能体前请先从智能体市场选择或新建项目');
      return;
    }
    if (!brandName.trim()) {
      setError('请先填写品牌名称');
      return;
    }
    if (!websiteUrl.trim() && !notes.trim()) {
      setError('请至少填写官网 URL 或补充说明');
      return;
    }
    const activeTask = getGlobalActiveTask();
    const activeTab = getActiveWorkbenchTaskTab(routeTabId || undefined);
    if (activeTask || activeTab) {
      const ok = window.confirm('当前已有任务正在执行。继续提交后，本任务会进入排队，等前一个任务结束后自动开始。');
      if (!ok) return;
    }
    const task = createGeoTask(draftInput, { projectId: selectedProjectId });
    attachWorkbenchTabTask({
      agentId: 'geo',
      agentName,
      projectId: selectedProject.id,
      tabId: routeTabId || undefined,
      projectName: selectedProject.name,
      taskId: task.id,
      status: task.status,
    });
    runGeoTask(task.id);
    navigate(`/app/tasks/${task.id}`);
  };

  return (
    <div className="min-h-full bg-white">
      <div className="p-4 sm:p-6 lg:p-8 w-full">
        <div className="relative grid gap-4 lg:grid-cols-[188px_minmax(0,1fr)]">
          <aside className="hidden lg:flex flex-col bg-[#EEF1F3] border border-black/8 rounded-2xl p-3">
            <button
              type="button"
              className="w-full h-9 rounded-lg bg-[#14958A] text-white text-xs font-semibold hover:bg-[#128278]"
            >
              + 快速发起
            </button>
            <nav className="mt-3 space-y-1">
              {['工作台', '品牌管理', 'GEO 分析', 'GEO 监控', '积分与账户', '内容文件', 'Hz-Hermes 日志'].map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    className={`w-full text-left px-3 py-2 rounded-md text-xs ${
                      item === 'GEO 分析'
                        ? 'bg-white text-black/90 font-semibold'
                        : 'text-black/55 hover:bg-white/70'
                    }`}
                  >
                    {item}
                  </button>
                ),
              )}
            </nav>
          </aside>

          <div
            className={`grid gap-4 ${
              isRunning
                ? executionCollapsed
                  ? 'lg:grid-cols-[minmax(0,1fr)_56px]'
                  : 'lg:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]'
                : 'grid-cols-1'
            }`}
          >
            <div className="space-y-4 min-w-0">
            <section className="bg-white border border-black/8 rounded-2xl p-4 md:p-5">
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 text-xs rounded-lg bg-[#EEF5FF] text-[#3971C6] font-semibold">
                快速检测
              </button>
              <button className="px-3 py-1.5 text-xs rounded-lg text-black/50 hover:bg-black/[0.03]">深度分析</button>
            </div>

            <div className="mt-3">
              <h2 className="text-[28px] leading-none font-semibold tracking-tight text-black/85">GEO 快速检测</h2>
              <p className="mt-2 text-sm text-black/45">补齐品牌资料后即可提交，检测 AI 平台提及与内容缺口。</p>
            </div>

            <div className="mt-5 rounded-xl border border-black/8 bg-[#F7F8FA] p-3">
              <p className="text-sm font-semibold text-black/75">
                {selectedProject ? `当前项目：${selectedProject.name}` : '未选择项目'}
              </p>
              <p className="mt-1 text-xs text-black/42">
                {selectedProject
                  ? '已根据项目资料预填字段，可继续修改后发起任务。'
                  : '请返回智能体市场点击“使用智能体”，先选择或新建项目。'}
              </p>
            </div>

            <div className="mt-5 grid md:grid-cols-2 gap-3">
              <Field label="品牌名称 *" value={brandName} onChange={(value) => { setHasUserEdited(true); setBrandName(value); }} placeholder="例如：HelloMe" />
              <Field label="城市 / 目标市场" value={targetMarket} onChange={(value) => { setHasUserEdited(true); setTargetMarket(value); }} placeholder="例如：上海 / 全国" />
              <Field label="产品 / 服务" value={productService} onChange={(value) => { setHasUserEdited(true); setProductService(value); }} placeholder="例如：AI 智能体平台" />
              <Field label="官网 URL（可选）" value={websiteUrl} onChange={(value) => { setHasUserEdited(true); setWebsiteUrl(value); }} placeholder="https://example.com" />
            </div>

            <p className="mt-2 text-[11px] text-[#14958A] font-medium">
              本次检测引用：{agentName}（切换请使用顶部品牌选择器）
            </p>

            <section className="mt-4 rounded-xl bg-[#F7F8FA] border border-black/6 p-3">
              <h3 className="text-sm font-semibold text-black/80">输入材料 *</h3>
              <p className="mt-1 text-xs text-black/35">至少填写官网、一条参考链接或补充说明中的一项。</p>

              <div className="mt-3 rounded-xl bg-white border border-black/8 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-black/60">核心关键词</p>
                  <p className="text-[11px] text-black/35">可从项目资料自动带入</p>
                </div>
                <input
                  value={keywords}
                  onChange={(event) => {
                    setHasUserEdited(true);
                    setKeywords(event.target.value);
                  }}
                  className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm outline-none focus:border-[#14958A]/40"
                  placeholder="智能体平台, GEO 优化"
                />
              </div>

              <div className="mt-3 rounded-xl bg-white border border-black/8 p-3">
                <p className="text-xs font-medium text-black/60">竞品名称</p>
                <input
                  value={competitors}
                  onChange={(event) => {
                    setHasUserEdited(true);
                    setCompetitors(event.target.value);
                  }}
                  className="mt-2 h-10 w-full rounded-lg border border-black/10 px-3 text-sm outline-none focus:border-[#14958A]/40"
                  placeholder="竞品 A, 竞品 B"
                />
              </div>

              <div className="mt-3 rounded-xl bg-white border border-black/8 p-3">
                <p className="text-xs font-medium text-black/60">补充说明</p>
                <textarea
                  value={notes}
                  onChange={(event) => {
                    setHasUserEdited(true);
                    setNotes(event.target.value);
                  }}
                  className="mt-2 min-h-[96px] w-full rounded-lg border border-black/10 bg-[#FCFCFD] px-3 py-2 text-sm leading-relaxed outline-none focus:border-[#14958A]/40"
                  placeholder="可补充品牌背景、产品特点、目标客户，项目资料会自动带入这里。"
                />
                <p className="mt-1 text-right text-[11px] text-black/30">{notes.length}/300 字</p>
              </div>
            </section>

            <section className="mt-4">
              <p className="text-sm font-medium text-black/70">目标平台</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {MODELS.map((model) => (
                  <button
                    key={model}
                    type="button"
                    className={`px-3 py-1.5 rounded-full text-xs border ${
                      model === '豆包' || model === '腾讯元宝' || model === 'Kimi'
                        ? 'border-[#14958A]/35 text-[#14958A] bg-[#EAF6F4]'
                        : 'border-black/10 text-black/55 bg-white'
                    }`}
                  >
                    {model}
                  </button>
                ))}
              </div>
            </section>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            </section>

            <ExecutionPanel
              collapsed={false}
              onToggle={() => {}}
              onExecute={handleExecute}
              forceExpanded={isRunning}
              disableExecute={isRunning}
            />
          </div>

            {isRunning && !executionCollapsed ? (
              <RunningSidePanel
                onCollapse={() => setExecutionCollapsed(true)}
                progress={runProgress}
                onOpenTask={() => navigate('/app/tasks?agent=geo')}
                onOpenAll={() => navigate('/app/tasks')}
                onBack={() => setIsRunning(false)}
              />
            ) : null}

            {isRunning && executionCollapsed ? (
              <aside className="hidden lg:flex flex-col items-center shrink-0 w-14 min-w-[56px]">
                <button
                  type="button"
                  onClick={() => setExecutionCollapsed(false)}
                  className="sticky top-24 w-10 h-10 rounded-xl border border-black/12 bg-white hover:bg-black/[0.02] flex items-center justify-center shadow-sm"
                  aria-label="展开执行面板"
                  title="展开执行面板"
                >
                  <ChevronLeft className="w-4 h-4 text-black/55" />
                </button>
              </aside>
            ) : null}
          </div>
        </div>
        {showHermesModal && (
          <HermesActionModal
            status={hermes.status}
            onClose={() => setShowHermesModal(false)}
            onOpenHermes={refreshHermesConnection}
            onGoPair={() => {
              setShowHermesModal(false);
              navigate('/app');
            }}
          />
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <p className="text-sm text-black/65 mb-1.5">{label}</p>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-black/10 bg-white px-3 text-sm text-black/75 outline-none focus:border-[#14958A]/40 focus:ring-2 focus:ring-[#14958A]/15"
      />
    </div>
  );
}

function ExecutionPanel({
  collapsed,
  onToggle,
  onExecute,
  forceExpanded = false,
  disableExecute = false,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onExecute: () => void;
  forceExpanded?: boolean;
  disableExecute?: boolean;
}) {
  const actualCollapsed = forceExpanded ? false : collapsed;

  if (actualCollapsed) {
    return (
      <aside className="bg-white border border-black/8 rounded-2xl p-2">
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={onToggle}
            className="w-8 h-8 rounded-md border border-black/10 hover:bg-black/[0.02] flex items-center justify-center"
            aria-label="展开执行面板"
          >
            <ChevronLeft className="w-4 h-4 text-black/55" />
          </button>
          <span className="-rotate-90 mt-6 text-[10px] text-black/35 whitespace-nowrap">执行</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="bg-white border border-black/8 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[28px] leading-none font-semibold tracking-tight text-black/85">AI 拆解方案</h3>
        {!forceExpanded && (
          <button
            type="button"
            onClick={onToggle}
            className="w-8 h-8 rounded-md border border-black/10 hover:bg-black/[0.02] flex items-center justify-center"
            aria-label="收起执行面板"
          >
            <ChevronRight className="w-4 h-4 text-black/55" />
          </button>
        )}
      </div>
      <p className="mt-2 text-sm text-black/45">资料已齐，可提交 Hz-Hermes 分析</p>

      <div className="mt-4 space-y-2">
        {['品牌名称', '城市/目标市场', '产品/服务', '官网，链接或补充材料'].map((row) => (
          <div key={row} className="h-10 px-3 rounded-lg bg-[#EAF6F4] border border-[#14958A]/18 flex items-center justify-between">
            <span className="text-sm text-black/60">{row}</span>
            <span className="text-xs text-[#14958A] font-semibold">已填</span>
          </div>
        ))}
      </div>

      <section className="mt-4">
        <p className="text-sm font-semibold text-black/75">分析模式</p>
        <div className="mt-2 rounded-xl border border-[#3B82F6]/20 bg-[#F3F7FF] px-3 py-2">
          <p className="text-xl font-semibold leading-none text-black/85">快速检测</p>
          <p className="mt-1 text-xs text-black/45">平台提及与内容缺口，适合首次体检</p>
        </div>
      </section>

      <section className="mt-4 rounded-xl bg-[#F7F8FA] p-3 border border-black/6">
        <p className="text-sm text-black/45">AI 分析项</p>
        <p className="mt-1 text-3xl leading-none font-semibold text-black/85">12 条</p>
      </section>

      <section className="mt-4">
        <p className="text-sm font-semibold text-black/75">将执行</p>
        <div className="mt-2 space-y-1.5 text-sm text-black/50">
          <p className="flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" />
            平台提及巡检
          </p>
          <p className="flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" />
            内容可引用性快检
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-xl bg-white border border-black/10 p-3">
        <p className="text-sm font-semibold text-black/75">预计产物</p>
        <ul className="mt-2 text-sm text-black/50 space-y-1">
          <li>· AI 平台提及巡检摘要</li>
          <li>· 内容缺口与优先修复建议</li>
        </ul>
        <button type="button" className="mt-2 text-sm text-[#14958A] font-semibold hover:underline">
          查看任务详情
        </button>
      </section>

      <button
        type="button"
        onClick={onExecute}
        disabled={disableExecute}
        className="mt-5 w-full h-11 rounded-xl bg-[#87D1C8] hover:bg-[#6fc7bc] disabled:bg-black/10 disabled:text-black/35 text-white text-lg font-semibold"
      >
        提交 Hz-Hermes 快速检测
      </button>
    </aside>
  );
}

function RunningSidePanel({
  onCollapse,
  progress,
  onOpenTask,
  onOpenAll,
  onBack,
}: {
  onCollapse: () => void;
  progress: number;
  onOpenTask: () => void;
  onOpenAll: () => void;
  onBack: () => void;
}) {
  return (
    <aside className="bg-[#F5F6F8] border border-black/10 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full border-2 border-[#14958A] border-t-transparent animate-spin" />
          <h3 className="text-xl font-semibold text-black/85">Hz-Hermes 正在执行</h3>
        </div>
        <button
          type="button"
          onClick={onCollapse}
          className="w-8 h-8 rounded-md border border-black/10 hover:bg-white flex items-center justify-center"
          aria-label="收起执行面板"
        >
          <ChevronRight className="w-4 h-4 text-black/55" />
        </button>
      </div>
      <p className="mt-2 text-sm text-black/50">已创建任务： UU教育 · GEO 快速检测</p>
      <p className="mt-2 text-sm text-black/60">进度 {progress}%</p>
      <p className="mt-1 text-sm text-black/45">
        任务处理中，完成前暂无法提交新任务。可前往结果中心查看进度，完成后我们会通知你。
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpenTask}
          className="px-4 h-9 rounded-lg bg-[#14958A] text-white text-sm font-semibold hover:bg-[#128278]"
        >
          查看本任务分进度
        </button>
        <button
          type="button"
          onClick={onOpenAll}
          className="px-4 h-9 rounded-lg bg-white border border-black/12 text-sm font-medium hover:bg-black/[0.02]"
        >
          全部任务
        </button>
        <button
          type="button"
          onClick={onBack}
          className="px-4 h-9 rounded-lg bg-white border border-black/12 text-sm font-medium hover:bg-black/[0.02]"
        >
          返回工作台
        </button>
      </div>
    </aside>
  );
}
