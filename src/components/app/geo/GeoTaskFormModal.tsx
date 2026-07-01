import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, X } from 'lucide-react';
import {
  DEFAULT_GEO_MODELS,
  DEPTH_CONFIG,
  type DetectionDepth,
  type GeoTaskInput,
} from '../../../types/workbench';
import { createGeoTask, getGlobalActiveTask } from '../../../lib/taskStore';
import { canAffordTask, getUsage } from '../../../lib/usageStore';
import { runGeoTask } from '../../../lib/geoTaskRunner';
import { estimateGeoTokens, formatToken, formatTokenRange } from '../../../lib/tokenBilling';
import ProjectContextSelector from '../projects/ProjectContextSelector';
import {
  buildGeoInputFromProject,
  getActiveProjectId,
  getProject,
  subscribeProjects,
} from '../../../lib/projectStore';
import type { ProjectProfile } from '../../../types/workbench';
import {
  attachWorkbenchTabTask,
  getActiveWorkbenchTaskTab,
  markWorkbenchTabDraft,
} from '../../../lib/workbenchTabs';

interface GeoTaskFormModalProps {
  open: boolean;
  onClose: () => void;
  initialKeywords?: string;
  geoActive: boolean;
}

export default function GeoTaskFormModal({
  open,
  onClose,
  initialKeywords = '',
  geoActive,
}: GeoTaskFormModalProps) {
  const navigate = useNavigate();
  const [brandName, setBrandName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [keywords, setKeywords] = useState(initialKeywords);
  const [competitors, setCompetitors] = useState('');
  const [models, setModels] = useState<string[]>([...DEFAULT_GEO_MODELS]);
  const [depth, setDepth] = useState<DetectionDepth>('standard');
  const [error, setError] = useState('');
  const activeProjectId = useSyncExternalStore(subscribeProjects, getActiveProjectId, getActiveProjectId);
  const [selectedProjectId, setSelectedProjectId] = useState(activeProjectId);

  const usage = getUsage();

  const draftInput = useMemo(
    (): GeoTaskInput => ({
      brandName: brandName.trim(),
      websiteUrl: websiteUrl.trim(),
      keywords: keywords.trim(),
      competitors: competitors.trim(),
      models,
      depth,
    }),
    [brandName, websiteUrl, keywords, competitors, models, depth],
  );

  const estimate = useMemo(() => estimateGeoTokens(draftInput), [draftInput]);
  const affordable = canAffordTask(estimate.max, usage);
  const remainMin = Math.max(0, usage.tokenBalance - estimate.max);
  const remainMax = Math.max(0, usage.tokenBalance - estimate.min);

  const toggleModel = (m: string) => {
    setModels((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!brandName.trim()) {
      setError('请填写品牌名');
      return;
    }
    if (!websiteUrl.trim()) {
      setError('请填写官网 URL');
      return;
    }
    if (models.length === 0) {
      setError('请至少选择一个检测模型');
      return;
    }
    if (!affordable) {
      setError('当前余额不足以启动该任务，请充值或降低检测深度');
      return;
    }
    if (!geoActive) {
      setError('请先启用 GEO 智能体后再发起任务');
      return;
    }

    if (!selectedProjectId || !selectedProject) {
      setError('使用智能体前请先选择或新建项目');
      return;
    }

    const activeTask = getGlobalActiveTask();
    const activeTab = getActiveWorkbenchTaskTab();
    if (activeTask || activeTab) {
      const ok = window.confirm('当前已有任务正在执行。继续提交后，本任务会进入排队，等前一个任务结束后自动开始。');
      if (!ok) return;
    }

    const task = createGeoTask(draftInput, { projectId: selectedProjectId });
    attachWorkbenchTabTask({
      agentId: 'geo',
      agentName: 'GEO 智能体',
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      taskId: task.id,
      status: task.status,
    });
    runGeoTask(task.id);
    onClose();
    navigate(`/app/tasks/${task.id}`);
  };

  const handleSelectProject = (project: ProjectProfile | null) => {
    setSelectedProjectId(project?.id ?? '');
    if (!project) return;
    const preset = buildGeoInputFromProject(project);
    setBrandName((value) => value || preset.brandName || '');
    setWebsiteUrl((value) => value || preset.websiteUrl || '');
    setKeywords((value) => value || preset.keywords || '');
    setCompetitors((value) => value || preset.competitors || '');
  };

  const selectedProject = getProject(selectedProjectId);

  useEffect(() => {
    if (!open || !selectedProject) return;
    if (!brandName.trim() && !websiteUrl.trim() && !keywords.trim() && !competitors.trim()) return;
    markWorkbenchTabDraft({
      agentId: 'geo',
      agentName: 'GEO 智能体',
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      draftInput,
    });
  }, [brandName, competitors, draftInput, keywords, open, selectedProject, websiteUrl]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="关闭"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar bg-white rounded-2xl shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-black/8 bg-white rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold">新建 GEO 检测</h2>
            <p className="text-xs text-black/45 mt-0.5">收集检测参数，启动品牌 AI 可见度检测任务</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#F2F0ED] text-black/50"
            aria-label="关闭弹窗"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {!geoActive && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-xs text-amber-900 rounded-xl">
              <p className="font-bold mb-1">GEO 智能体尚未启用</p>
              <p>
                请前往
                <Link to="/app/agents/market" className="font-bold underline mx-1">
                  智能体市场
                </Link>
                启用后再发起任务。
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-[#F2F0ED] text-xs text-black/60 rounded-xl">
            <Shield className="w-4 h-4 shrink-0 mt-0.5" />
            <p>本任务将访问公开网页，不会执行发布、提交、删除等高风险动作。</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <ProjectContextSelector
              selectedProjectId={selectedProjectId}
              onSelectProject={handleSelectProject}
              seed={draftInput}
            />

            {selectedProject ? (
              <p className="text-xs text-[#0F766E]">
                当前将创建项目任务：{selectedProject.name}
              </p>
            ) : null}

            <Field label="品牌名 *">
              <input
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full py-2.5 px-3 text-sm bg-white border border-black/10 rounded-lg outline-none focus:ring-2 focus:ring-[#14958A]/20 focus:border-[#14958A]/40"
                placeholder="例如：HelloMe"
              />
            </Field>

            <Field label="官网 URL *">
              <input
                required
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full py-2.5 px-3 text-sm bg-white border border-black/10 rounded-lg outline-none focus:ring-2 focus:ring-[#14958A]/20 focus:border-[#14958A]/40"
                placeholder="https://example.com"
              />
            </Field>

            <Field label="核心关键词">
              <input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="w-full py-2.5 px-3 text-sm bg-white border border-black/10 rounded-lg outline-none focus:ring-2 focus:ring-[#14958A]/20 focus:border-[#14958A]/40"
                placeholder="智能体平台, GEO 优化"
              />
            </Field>

            <Field label="竞品名称">
              <input
                value={competitors}
                onChange={(e) => setCompetitors(e.target.value)}
                className="w-full py-2.5 px-3 text-sm bg-white border border-black/10 rounded-lg outline-none focus:ring-2 focus:ring-[#14958A]/20 focus:border-[#14958A]/40"
                placeholder="竞品 A, 竞品 B"
              />
            </Field>

            <Field label="检测模型">
              <div className="flex flex-wrap gap-2">
                {DEFAULT_GEO_MODELS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleModel(m)}
                    className={`px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
                      models.includes(m)
                        ? 'bg-[#14958A] text-white border-[#14958A]'
                        : 'border-black/15 hover:bg-[#F2F0ED]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="检测深度">
              <div className="space-y-2">
                {(Object.keys(DEPTH_CONFIG) as DetectionDepth[]).map((d) => {
                  const cfg = DEPTH_CONFIG[d];
                  return (
                    <label
                      key={d}
                      className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                        depth === d
                          ? 'border-[#14958A]/50 bg-[#14958A]/5'
                          : 'border-black/10 hover:bg-[#F2F0ED]/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="depth"
                        checked={depth === d}
                        onChange={() => setDepth(d)}
                        className="mt-1 accent-[#14958A]"
                      />
                      <div>
                        <p className="text-sm font-bold">{cfg.label}</p>
                        <p className="text-xs text-black/50">{cfg.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </Field>

            <div className="p-4 bg-[#F2F0ED]/80 border border-black/8 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-black/50">预计消耗</span>
                <span className="font-bold font-mono">{formatTokenRange(estimate)} Token</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/50">当前余额</span>
                <span className="font-mono">{formatToken(usage.tokenBalance)} Token</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/50">预计完成后剩余</span>
                <span className="font-mono text-black/70">
                  约 {formatToken(remainMin)}-{formatToken(remainMax)} Token
                </span>
              </div>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            {!affordable && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDepth('quick')}
                  className="px-3 py-2 text-xs font-bold border border-black/15 rounded-lg hover:bg-[#F2F0ED]"
                >
                  降低为快速检测
                </button>
                <Link
                  to="/app/usage"
                  className="px-3 py-2 text-xs font-bold bg-[#14958A] text-white rounded-lg hover:bg-[#128278]"
                >
                  充值 Token
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={!affordable || !geoActive}
              className="w-full py-3 bg-[#14958A] text-white text-sm font-bold flex items-center justify-center gap-2 rounded-xl hover:bg-[#128278] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              开始任务
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-black/60 mb-2">{label}</label>
      {children}
    </div>
  );
}
