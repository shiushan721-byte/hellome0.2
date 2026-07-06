import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from 'react';
import { useLocation } from 'react-router-dom';
import {
  BriefcaseBusiness,
  CheckCircle2,
  Clipboard,
  Download,
  GraduationCap,
  Loader2,
  Target,
  UploadCloud,
} from 'lucide-react';
import { getAgentById } from '../../data/agentsCatalog';
import { consumePendingAgentContext, getProject, setPendingAgentContext } from '../../lib/projectStore';
import {
  attachWorkbenchTabTask,
  getLastOpenedTabId,
  getVisibleWorkbenchTabs,
  getWorkbenchTab,
  getWorkbenchTabForProjectAgent,
  markWorkbenchTabDraft,
} from '../../lib/workbenchTabs';
import {
  canStoreBytes,
  formatBytes,
  getRemainingStorageBytes,
  getStorageUsage,
  reserveStorageBytes,
  subscribeStorageUsage,
} from '../../lib/storageQuotaStore';
import { buildCanvasSkillDocument, buildResumeResult } from '../../lib/resumeReport';
import type { ResumeDraft, ResumeResult } from '../../types/resume';

type IntakeStepId = 'material' | 'profile' | 'experience' | 'preference';
type CanvasSkillId = 'profile' | 'recommendations' | 'resume' | 'outreach' | 'interview';
type CanvasStatus = 'running' | 'ready' | 'confirmed';

type JobMatchDraft = {
  materialText: string;
  materialFileName: string;
  school: string;
  degree: string;
  major: string;
  studentStage: string;
  courses: string;
  awards: string;
  skills: string;
  projects: string;
  campusExperience: string;
  preferredCities: string;
  avoidRoles: string;
  targetIndustry: string;
  notes: string;
};

type JobRecommendation = {
  role: string;
  matchScore: number;
  reason: string;
  strengths: string[];
  gaps: string[];
  sampleJd: string;
};

type CanvasCard = {
  id: CanvasSkillId;
  title: string;
  skillName: string;
  description: string;
  content: string;
  status: CanvasStatus;
  recommendations?: JobRecommendation[];
};

const AGENT_ID = 'internship-job-match';

const initialDraft: JobMatchDraft = {
  materialText: '',
  materialFileName: '',
  school: '',
  degree: '本科',
  major: '',
  studentStage: '大三',
  courses: '',
  awards: '',
  skills: '',
  projects: '',
  campusExperience: '',
  preferredCities: '',
  avoidRoles: '',
  targetIndustry: '',
  notes: '',
};

const intakeSteps: Array<{ id: IntakeStepId; title: string; desc: string }> = [
  { id: 'material', title: '上传或粘贴学生材料', desc: '可以上传简历、成绩单、奖项截图、作品集说明，也可以直接粘贴文字。' },
  { id: 'profile', title: '专业与课程', desc: '补充专业、年级、核心课程，系统会先建立能力画像。' },
  { id: 'experience', title: '经历与能力', desc: '填写奖项、项目、校园经历和技能关键词。' },
  { id: 'preference', title: '投递偏好', desc: '如果有城市、行业或不想投的岗位，可以提前说明。' },
];

const canvasFlow: Array<{ id: CanvasSkillId; title: string; skillName: string; description: string }> = [
  { id: 'profile', title: '学生能力画像', skillName: 'student.profile.extract', description: '解析专业、课程、奖项和经历，生成能力画像。' },
  { id: 'recommendations', title: '岗位方向推荐', skillName: 'student.job.match', description: '参考常见招聘平台岗位要求，推荐适合投递的岗位方向。' },
  { id: 'resume', title: '岗位定向简历', skillName: 'resume.targeted.generate', description: '确认目标岗位后，生成岗位定向简历。' },
  { id: 'outreach', title: '投递话术', skillName: 'resume.outreach', description: '基于目标岗位生成 HR 私信和投递邮件。' },
  { id: 'interview', title: '面试准备', skillName: 'resume.interview', description: '生成面试问题、回答和口语化表达。' },
];

export default function InternshipJobMatchAgentPage() {
  const location = useLocation();
  const materialInputRef = useRef<HTMLInputElement | null>(null);
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routeProjectId = searchParams.get('project') || '';
  const routeTabId = searchParams.get('tab') || '';
  const agent = getAgentById(AGENT_ID);
  const [projectId, setProjectId] = useState(routeProjectId);
  const [draft, setDraft] = useState<JobMatchDraft>(initialDraft);
  const [intakeStep, setIntakeStep] = useState<IntakeStepId>('material');
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [cards, setCards] = useState<CanvasCard[]>([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [result, setResult] = useState<ResumeResult | null>(null);
  const [copiedKey, setCopiedKey] = useState('');
  const project = getProject(projectId);
  const storageUsage = useSyncExternalStore(subscribeStorageUsage, getStorageUsage, getStorageUsage);
  const storageRemaining = getRemainingStorageBytes(storageUsage);
  const stepIndex = intakeSteps.findIndex((step) => step.id === intakeStep);

  useEffect(() => {
    const context = consumePendingAgentContext(AGENT_ID);
    const lastTabId = getLastOpenedTabId();
    const visibleTabs = getVisibleWorkbenchTabs().filter((tab) => tab.agentId === AGENT_ID);
    const routeTab = routeTabId ? getWorkbenchTab(routeTabId) : null;
    const lastTab = lastTabId ? getWorkbenchTab(lastTabId) : null;
    const fallbackTab =
      routeTab?.agentId === AGENT_ID
        ? routeTab
        : lastTab?.agentId === AGENT_ID
          ? lastTab
          : visibleTabs.length === 1
            ? visibleTabs[0]
            : null;
    const nextProjectId = context?.projectId || routeProjectId || fallbackTab?.projectId || '';
    if (nextProjectId) setProjectId(nextProjectId);

    const draftSource = context?.tabId || routeTabId || fallbackTab?.id || '';
    const savedDraft = (draftSource
      ? getWorkbenchTab(draftSource)?.draftInput
      : nextProjectId
        ? getWorkbenchTabForProjectAgent(nextProjectId, AGENT_ID)?.draftInput
        : null) as Partial<JobMatchDraft> | null;

    if (savedDraft) {
      setDraft({ ...initialDraft, ...savedDraft });
      setHasUserEdited(true);
    }
  }, [routeProjectId, routeTabId]);

  useEffect(() => {
    if (!hasUserEdited || !project) return;
    if (!draft.materialText.trim() && !draft.materialFileName && !draft.major.trim() && !draft.courses.trim() && !draft.projects.trim()) return;
    markWorkbenchTabDraft({
      agentId: AGENT_ID,
      agentName: agent?.name,
      projectId: project.id,
      projectName: project.name,
      tabId: routeTabId || undefined,
      draftInput: draft,
    });
  }, [agent?.name, draft, hasUserEdited, project, routeTabId]);

  const updateDraft = <K extends keyof JobMatchDraft>(key: K, value: JobMatchDraft[K]) => {
    setHasUserEdited(true);
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleUpload = async (file?: File) => {
    if (!file) return;
    if (!canStoreBytes(file.size)) {
      setError(`云端空间不足。当前剩余 ${formatBytes(storageRemaining)}，该文件需要 ${formatBytes(file.size)}。请先购买空间后再上传。`);
      return;
    }
    const text = file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md') ? await file.text() : '';
    const saved = reserveStorageBytes(file.size);
    if (saved.ok === false) {
      setError(`云端空间不足。当前剩余 ${formatBytes(saved.remainingBytes)}，该文件需要 ${formatBytes(file.size)}。请先购买空间后再上传。`);
      return;
    }
    setHasUserEdited(true);
    setError('');
    setDraft((current) => ({ ...current, materialFileName: file.name, materialText: text || current.materialText }));
  };

  const runMatch = async () => {
    if (!project) {
      setError('使用智能体前需要先从首页或智能体市场选择项目。');
      return;
    }
    if (!draft.materialText.trim() && !draft.materialFileName && !draft.major.trim() && !draft.courses.trim() && !draft.projects.trim() && !draft.awards.trim()) {
      setError('请至少上传材料，或填写专业、课程、奖项、项目经历中的一项。');
      return;
    }
    setError('');
    setRunning(true);
    setCards([]);
    setSelectedRole('');
    setResult(null);

    const profile = buildProfileDocument(draft);
    const recommendations = buildJobRecommendations(draft);
    const recommendationDoc = buildRecommendationDocument(recommendations);
    const bytes = new Blob([profile, recommendationDoc], { type: 'text/plain;charset=utf-8' }).size;
    const saved = reserveStorageBytes(bytes);
    if (saved.ok === false) {
      setRunning(false);
      setError(`岗位匹配结果需要保存到云端空间，当前剩余 ${formatBytes(saved.remainingBytes)}，本次结果约 ${formatBytes(bytes)}。请先购买空间后再生成。`);
      return;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 420));
    setCards([
      { ...canvasFlow[0], content: profile, status: 'ready' },
      { ...canvasFlow[1], content: recommendationDoc, status: 'ready', recommendations },
    ]);
    setRunning(false);
    attachWorkbenchTabTask({
      agentId: AGENT_ID,
      agentName: agent?.name,
      projectId: project.id,
      projectName: project.name,
      tabId: routeTabId || undefined,
      taskId: `job-match-${Date.now()}`,
      status: 'waiting_confirmation',
    });
    setPendingAgentContext({
      agentId: AGENT_ID,
      taskScope: 'project',
      projectId: project.id,
      projectName: project.name,
      tabId: routeTabId || undefined,
      createdAt: new Date().toISOString(),
    });
  };

  const chooseRole = async (role: string, sampleJd: string) => {
    setSelectedRole(role);
    setCards((current) => current.map((card) => (card.id === 'recommendations' ? { ...card, status: 'confirmed' } : card)));
    const resumeDraft = buildResumeDraftFromMatch(draft, role, sampleJd);
    const nextResult = buildResumeResult(resumeDraft);
    setResult(nextResult);

    const generated = [
      { ...canvasFlow[2], content: nextResult.finalResume, status: 'ready' as CanvasStatus },
      { ...canvasFlow[3], content: buildCanvasSkillDocument('outreach', nextResult), status: 'ready' as CanvasStatus },
      { ...canvasFlow[4], content: buildCanvasSkillDocument('interview', nextResult), status: 'ready' as CanvasStatus },
    ];
    const bytes = new Blob(generated.map((item) => item.content), { type: 'text/plain;charset=utf-8' }).size;
    const saved = reserveStorageBytes(bytes);
    if (saved.ok === false) {
      setError(`生成「${role}」后续材料需要保存到云端空间，当前剩余 ${formatBytes(saved.remainingBytes)}，本次结果约 ${formatBytes(bytes)}。请先购买空间后再继续。`);
      return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    setCards((current) => [...current.filter((card) => !['resume', 'outreach', 'interview'].includes(card.id)), ...generated]);
  };

  const copyText = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(''), 1200);
  };

  return (
    <div className="min-h-full bg-[#F5F5F7] px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
      <div className="grid min-h-[calc(100vh-112px)] gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col rounded-2xl border border-black/8 bg-white shadow-sm">
          <header className="border-b border-black/8 px-5 py-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EEF7F1] text-[#246B3D]">
                <Target className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-black/85">{agent?.name ?? '实习岗位匹配智能体'}</h1>
                <p className="mt-1 text-sm leading-6 text-black/48">
                  不知道该投什么岗位时，先根据专业、课程、奖项和经历推荐实习方向。
                </p>
                {project ? <p className="mt-2 text-xs font-semibold text-[#246B3D]">当前项目：{project.name}</p> : null}
                <p className="mt-1 text-xs text-black/38">
                  云端空间：已用 {formatBytes(storageUsage.usedBytes)} / {formatBytes(storageUsage.quotaBytes)}
                </p>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="space-y-5">
              <JobMatchIntake
                step={intakeStep}
                stepIndex={stepIndex}
                totalSteps={intakeSteps.length}
                draft={draft}
                inputRef={materialInputRef}
                onUpload={handleUpload}
                onChange={updateDraft}
                onPrev={() => {
                  const previous = intakeSteps[stepIndex - 1];
                  if (previous) setIntakeStep(previous.id);
                }}
                onNext={() => {
                  const next = intakeSteps[stepIndex + 1];
                  if (next) setIntakeStep(next.id);
                }}
              />
              {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{error}</p> : null}
              {intakeStep === 'preference' ? (
                <button
                  type="button"
                  onClick={() => void runMatch()}
                  disabled={running}
                  className="h-12 w-full rounded-xl bg-black text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {running ? '匹配岗位中...' : '生成岗位推荐'}
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="min-h-0 rounded-2xl border border-black/8 bg-white shadow-sm">
          <div className="flex h-full min-h-0 flex-col">
            <header className="border-b border-black/8 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-black/85">岗位匹配画布</p>
                  <p className="mt-1 text-sm text-black/45">先确认推荐岗位，再生成定向简历、投递话术和面试准备。</p>
                </div>
                <span className="rounded-full bg-[#EEF7F1] px-3 py-1 text-xs font-bold text-[#246B3D]">
                  {selectedRole || '等待匹配'}
                </span>
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.12)_1px,transparent_0)] bg-[length:24px_24px] p-5">
              {cards.length === 0 ? (
                <EmptyCanvas />
              ) : (
                <div className="mx-auto flex max-w-3xl flex-col gap-5 pb-8">
                  {cards.map((card) => (
                    <CanvasCardView
                      key={card.id}
                      card={card}
                      selectedRole={selectedRole}
                      copied={copiedKey === card.id}
                      onCopy={() => void copyText(card.id, card.content)}
                      onChooseRole={(role, sampleJd) => void chooseRole(role, sampleJd)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function JobMatchIntake({
  step,
  stepIndex,
  totalSteps,
  draft,
  inputRef,
  onUpload,
  onChange,
  onPrev,
  onNext,
}: {
  step: IntakeStepId;
  stepIndex: number;
  totalSteps: number;
  draft: JobMatchDraft;
  inputRef: RefObject<HTMLInputElement | null>;
  onUpload: (file?: File) => void | Promise<void>;
  onChange: <K extends keyof JobMatchDraft>(key: K, value: JobMatchDraft[K]) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const meta = intakeSteps[stepIndex] ?? intakeSteps[0];
  const isLast = stepIndex === totalSteps - 1;

  return (
    <div className="rounded-2xl border border-black/8 bg-[#FCFCFD] p-3">
      <div className="rounded-2xl border border-black/8 bg-white p-4">
        <div className="mb-4">
          <p className="text-xs font-bold text-black/35">第 {stepIndex + 1} 步 / 共 {totalSteps} 步</p>
          <p className="mt-1 text-sm font-bold text-black/80">{meta.title}</p>
          <p className="mt-1 text-xs leading-5 text-black/40">{meta.desc}</p>
        </div>

        {step === 'material' ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex h-16 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-black/15 bg-[#FCFCFD] text-sm font-bold text-black/55 hover:border-black/25"
            >
              <UploadCloud className="h-5 w-5" />
              {draft.materialFileName || '上传简历 / 成绩单 / 奖项材料'}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md"
              className="hidden"
              onChange={(event) => void onUpload(event.target.files?.[0])}
            />
            <textarea
              value={draft.materialText}
              onChange={(event) => onChange('materialText', event.target.value)}
              placeholder="也可以直接粘贴：专业、课程、奖项、项目经历、证书、作品链接、社团活动等。"
              className="min-h-36 w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[#246B3D]/40"
            />
          </div>
        ) : null}

        {step === 'profile' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <TextField label="学校" value={draft.school} onChange={(value) => onChange('school', value)} placeholder="例如：XX 大学" />
              <TextField label="专业" value={draft.major} onChange={(value) => onChange('major', value)} placeholder="例如：市场营销" />
              <SelectField label="学历" value={draft.degree} onChange={(value) => onChange('degree', value)} options={['大专', '本科', '硕士', '博士']} />
              <SelectField label="当前身份" value={draft.studentStage} onChange={(value) => onChange('studentStage', value)} options={['大一', '大二', '大三', '大四', '研究生', '应届生']} />
            </div>
            <textarea
              value={draft.courses}
              onChange={(event) => onChange('courses', event.target.value)}
              placeholder="学过的课程：用户研究、数据分析、消费者行为学、Python、SQL、传播学、会计学..."
              className="min-h-24 w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[#246B3D]/40"
            />
          </div>
        ) : null}

        {step === 'experience' ? (
          <div className="space-y-3">
            <textarea value={draft.awards} onChange={(event) => onChange('awards', event.target.value)} placeholder="奖项 / 证书：比赛、奖学金、四六级、专业证书等。" className="min-h-20 w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[#246B3D]/40" />
            <textarea value={draft.projects} onChange={(event) => onChange('projects', event.target.value)} placeholder="项目 / 作品：课程项目、调研报告、作品集、代码仓库、自媒体账号等。" className="min-h-24 w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[#246B3D]/40" />
            <textarea value={draft.skills} onChange={(event) => onChange('skills', event.target.value)} placeholder="技能：Excel、PPT、飞书、Figma、剪映、Python、SQL、PS 等。" className="min-h-20 w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[#246B3D]/40" />
          </div>
        ) : null}

        {step === 'preference' ? (
          <div className="space-y-3">
            <TextField label="期望城市" value={draft.preferredCities} onChange={(value) => onChange('preferredCities', value)} placeholder="例如：上海、杭州、深圳，可为空" />
            <TextField label="目标行业" value={draft.targetIndustry} onChange={(value) => onChange('targetIndustry', value)} placeholder="例如：互联网、消费品、教育，可为空" />
            <TextField label="不想投的岗位" value={draft.avoidRoles} onChange={(value) => onChange('avoidRoles', value)} placeholder="例如：纯销售、纯客服，可为空" />
            <textarea value={draft.notes} onChange={(event) => onChange('notes', event.target.value)} placeholder="补充说明：性格倾向、想做的工作方式、担心点、已有目标公司等。" className="min-h-24 w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[#246B3D]/40" />
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" onClick={onPrev} disabled={stepIndex === 0} className="h-10 rounded-xl border border-black/10 bg-white px-4 text-sm font-bold text-black/55 disabled:cursor-not-allowed disabled:opacity-35">上一步</button>
          <button type="button" onClick={onNext} disabled={isLast} className="h-10 rounded-xl bg-black px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-35">
            {isLast ? '可以生成岗位推荐' : '确认，下一步'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CanvasCardView({
  card,
  selectedRole,
  copied,
  onCopy,
  onChooseRole,
}: {
  card: CanvasCard;
  selectedRole: string;
  copied: boolean;
  onCopy: () => void;
  onChooseRole: (role: string, sampleJd: string) => void;
}) {
  return (
    <article className="rounded-3xl border border-black/10 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-black/8 px-5 py-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-black/85">{card.title}</h3>
            <span className="rounded-full bg-[#F2F0ED] px-2 py-0.5 text-[11px] font-bold text-black/45">{card.skillName}</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-black/45">{card.description}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${card.status === 'confirmed' ? 'bg-[#EEF7F1] text-[#246B3D]' : 'bg-black text-white'}`}>
          {card.status === 'confirmed' ? '已确认' : '待确认'}
        </span>
      </header>
      <div className="px-5 py-5">
        {card.recommendations ? (
          <div className="space-y-3">
            {card.recommendations.map((item) => (
              <section key={item.role} className="rounded-2xl border border-black/8 bg-[#FCFCFD] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-black/82">{item.role}</p>
                    <p className="mt-1 text-xs leading-5 text-black/50">{item.reason}</p>
                  </div>
                  <span className="rounded-full bg-[#EEF7F1] px-2.5 py-1 text-xs font-bold text-[#246B3D]">{item.matchScore}%</span>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <MiniList title="已有优势" items={item.strengths} />
                  <MiniList title="需要补强" items={item.gaps} />
                </div>
                <button
                  type="button"
                  onClick={() => onChooseRole(item.role, item.sampleJd)}
                  disabled={Boolean(selectedRole)}
                  className="mt-4 h-9 rounded-lg bg-black px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {selectedRole === item.role ? '已选择' : '选择这个岗位继续'}
                </button>
              </section>
            ))}
          </div>
        ) : (
          <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-2xl bg-[#FCFCFD] px-4 py-4 text-sm leading-7 text-black/72">{card.content}</pre>
        )}
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-black/8 px-5 py-4">
        <CopyButton copied={copied} onClick={onCopy} />
        {card.id === 'resume' ? <DownloadButton fileName={`${selectedRole || '岗位定向'}-简历.txt`} content={card.content} /> : null}
      </footer>
    </article>
  );
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-xs font-bold text-black/45">{title}</p>
      <ul className="mt-2 space-y-1">
        {items.map((item) => <li key={item} className="text-xs leading-5 text-black/62">- {item}</li>)}
      </ul>
    </div>
  );
}

function EmptyCanvas() {
  return (
    <div className="flex min-h-[560px] items-center justify-center">
      <div className="max-w-sm rounded-3xl border border-black/8 bg-white px-8 py-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF7F1] text-[#246B3D]">
          <BriefcaseBusiness className="h-7 w-7" />
        </div>
        <p className="mt-4 text-lg font-bold text-black/80">等待生成岗位推荐</p>
        <p className="mt-2 text-sm leading-6 text-black/45">左侧填写学生资料后，画布会先输出能力画像和岗位方向推荐。</p>
      </div>
    </div>
  );
}

function TextField({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-bold text-black/45">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#246B3D]/40" />
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-bold text-black/45">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#246B3D]/40">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function CopyButton({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 text-xs font-bold text-black/55 hover:border-black/20">
      <Clipboard className="h-3.5 w-3.5" />
      {copied ? '已复制' : '复制'}
    </button>
  );
}

function DownloadButton({ fileName, content }: { fileName: string; content: string }) {
  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <button type="button" onClick={handleDownload} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 text-xs font-bold text-black/55 hover:border-black/20">
      <Download className="h-3.5 w-3.5" />
      下载
    </button>
  );
}

function buildProfileDocument(draft: JobMatchDraft): string {
  const tendency = inferTendency(draft);
  return [
    '# 学生能力画像',
    '',
    `专业背景：${draft.school || '未填写学校'} ｜ ${draft.major || '未填写专业'} ｜ ${draft.degree} ｜ ${draft.studentStage}`,
    `能力倾向：${tendency}`,
    '',
    '## 课程与知识',
    draft.courses || '暂未填写课程，可继续补充主修课、课程项目或专业方向。',
    '',
    '## 奖项与证明',
    draft.awards || '暂未填写奖项，可补充比赛、奖学金、证书和作品链接。',
    '',
    '## 项目与实践',
    draft.projects || draft.materialText || '暂未填写项目，可补充课程项目、社团实践、作品集或账号经历。',
    '',
    '## 初步判断',
    `建议优先尝试与「${tendency}」相关的实习岗位，再根据岗位 JD 调整简历表达。`,
  ].join('\n');
}

function buildJobRecommendations(draft: JobMatchDraft): JobRecommendation[] {
  const text = `${draft.major}\n${draft.courses}\n${draft.awards}\n${draft.skills}\n${draft.projects}\n${draft.materialText}\n${draft.notes}`;
  const hasData = /数据|统计|SQL|Python|建模|分析|Excel|可视化/i.test(text);
  const hasContent = /传播|新媒体|公众号|小红书|内容|剪映|视频|文案|社群/i.test(text);
  const hasProduct = /用户|调研|竞品|原型|需求|产品|Axure|Figma/i.test(text);
  const hasMarket = /市场|营销|消费者|品牌|活动|策划|商务|销售/i.test(text);

  const pool: JobRecommendation[] = [
    {
      role: '数据分析实习',
      matchScore: hasData ? 88 : 72,
      reason: '适合有数据、统计、Excel、SQL、Python 或课程分析经历的学生。',
      strengths: ['课程和项目容易转化为分析案例', '岗位要求相对清晰，简历可量化'],
      gaps: ['需要补充数据工具熟练度', '最好准备 1 个完整分析项目'],
      sampleJd: '负责业务数据整理、报表搭建、用户行为分析和策略复盘，熟悉 Excel / SQL / Python 优先。',
    },
    {
      role: '产品运营实习',
      matchScore: hasProduct || hasMarket ? 86 : 76,
      reason: '适合既能理解用户，又能做执行、沟通和复盘的学生。',
      strengths: ['校园项目和活动经历可迁移', '对专业限制较低，入门友好'],
      gaps: ['需要补充用户需求、数据复盘、活动结果', '避免只写参与和协助'],
      sampleJd: '协助产品运营、用户调研、活动策划、数据复盘和需求整理，有互联网产品理解优先。',
    },
    {
      role: '新媒体运营实习',
      matchScore: hasContent ? 90 : 74,
      reason: '适合有内容创作、账号运营、视频剪辑、活动宣传或文案经历的学生。',
      strengths: ['作品和账号可以直接证明能力', '适合快速建立投递样本'],
      gaps: ['需要补充内容数据和爆款复盘', '要准备 2-3 个标题/选题案例'],
      sampleJd: '负责小红书、公众号、视频号内容策划与发布，跟进数据表现，输出选题和内容复盘。',
    },
    {
      role: '市场实习',
      matchScore: hasMarket ? 87 : 73,
      reason: '适合市场营销、传播、商科、活动策划和品牌相关背景的学生。',
      strengths: ['专业课程与岗位关联度高', '活动、比赛和调研经历容易包装'],
      gaps: ['需要补充消费者洞察和项目结果', '最好明确行业方向'],
      sampleJd: '协助市场活动、用户调研、品牌传播、物料整理和项目执行，有活动策划经验优先。',
    },
  ];

  return pool
    .filter((item) => !draft.avoidRoles || !draft.avoidRoles.includes(item.role.replace('实习', '')))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);
}

function buildRecommendationDocument(recommendations: JobRecommendation[]): string {
  return [
    '# 岗位方向推荐',
    '',
    ...recommendations.flatMap((item, index) => [
      `## ${index + 1}. ${item.role}（匹配度 ${item.matchScore}%）`,
      item.reason,
      '',
      '已有优势：',
      ...item.strengths.map((text) => `- ${text}`),
      '',
      '需要补强：',
      ...item.gaps.map((text) => `- ${text}`),
      '',
    ]),
  ].join('\n');
}

function inferTendency(draft: JobMatchDraft): string {
  const text = `${draft.major}\n${draft.courses}\n${draft.skills}\n${draft.projects}\n${draft.materialText}`;
  if (/数据|统计|SQL|Python|分析|建模/i.test(text)) return '数据分析 / 业务分析';
  if (/传播|新媒体|内容|视频|文案|剪映|公众号|小红书/i.test(text)) return '内容运营 / 新媒体运营';
  if (/用户|调研|产品|需求|原型|竞品|Figma/i.test(text)) return '产品运营 / 产品经理';
  if (/市场|营销|消费者|品牌|活动|商务/i.test(text)) return '市场 / 品牌 / 商务';
  return '运营 / 市场 / 内容等通用实习方向';
}

function buildResumeDraftFromMatch(draft: JobMatchDraft, role: string, sampleJd: string): ResumeDraft {
  return {
    mode: 'no_resume',
    resumeText: draft.materialText,
    resumeFileName: draft.materialFileName,
    studentName: '',
    phone: '',
    email: '',
    school: draft.school,
    degree: draft.degree,
    major: draft.major,
    enrollmentDate: '',
    graduationDate: '',
    gpa: '',
    city: draft.preferredCities,
    jobStatus: '正在找实习',
    expectedSalary: '面议',
    internshipDays: '每周 4 天',
    internshipDuration: '3 个月以上',
    courses: draft.courses,
    skills: draft.skills,
    internshipExperience: '',
    projectExperience: draft.projects,
    campusExperience: draft.campusExperience,
    certificates: draft.awards,
    jdText: sampleJd,
    jdImageName: '',
    targetRole: role,
    studentStage: draft.studentStage,
    companyType: draft.targetIndustry || '不确定',
    goal: 'full',
    tone: '自然学生感',
    question: '你为什么想投这个岗位？',
    notes: draft.notes,
  };
}
