import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from 'react';
import { useLocation } from 'react-router-dom';
import {
  BriefcaseBusiness,
  CheckCircle2,
  Clipboard,
  Download,
  FileText,
  GraduationCap,
  Loader2,
  MessageSquareText,
  Mic2,
  UploadCloud,
} from 'lucide-react';
import { getAgentById } from '../../data/agentsCatalog';
import {
  consumePendingAgentContext,
  getProject,
  setPendingAgentContext,
} from '../../lib/projectStore';
import {
  attachWorkbenchTabTask,
  getLastOpenedTabId,
  getVisibleWorkbenchTabs,
  getWorkbenchTab,
  getWorkbenchTabForProjectAgent,
  markWorkbenchTabDraft,
} from '../../lib/workbenchTabs';
import { createRemoteResumeDiagnosisTask } from '../../lib/taskApi';
import { buildCanvasSkillDocument } from '../../lib/resumeReport';
import type { ResumeDraft, ResumeGoal, ResumeMode, ResumeResult } from '../../types/resume';
import {
  canStoreBytes,
  formatBytes,
  getRemainingStorageBytes,
  getStorageUsage,
  reserveStorageBytes,
  subscribeStorageUsage,
} from '../../lib/storageQuotaStore';

type ResultTab = 'report' | 'rewrite' | 'outreach' | 'interview' | 'spoken';
type CanvasSkillId = 'diagnosis' | 'resume' | 'outreach' | 'interview';
type CanvasCardStatus = 'running' | 'ready' | 'confirmed';
type IntakeStepId =
  | 'mode'
  | 'resume'
  | 'material'
  | 'intention'
  | 'basic'
  | 'education'
  | 'experience'
  | 'skills'
  | 'job'
  | 'jobSettings'
  | 'goal';

type ResumeCanvasCard = {
  id: CanvasSkillId;
  skillName: string;
  title: string;
  description: string;
  content: string;
  status: CanvasCardStatus;
};

const AGENT_ID = 'internship-resume';

const initialDraft: ResumeDraft = {
  mode: 'has_resume',
  resumeText: '',
  resumeFileName: '',
  studentName: '',
  phone: '',
  email: '',
  school: '',
  degree: '本科',
  major: '',
  enrollmentDate: '',
  graduationDate: '',
  gpa: '',
  city: '',
  jobStatus: '正在找实习',
  expectedSalary: '面议',
  internshipDays: '每周 4 天',
  internshipDuration: '3 个月以上',
  courses: '',
  skills: '',
  internshipExperience: '',
  projectExperience: '',
  campusExperience: '',
  certificates: '',
  jdText: '',
  jdImageName: '',
  targetRole: '运营实习',
  studentStage: '大三',
  companyType: '互联网公司',
  goal: 'full',
  tone: '自然学生感',
  question: '你为什么想投这个岗位？',
  notes: '',
};

const steps = [
  '解析简历内容',
  '分析岗位 JD',
  '检索岗位与行业知识',
  '匹配简历经历',
  '生成简历诊断',
  '改写关键经历',
  '生成投递话术',
  '生成面试回答',
  '口语化表达',
];

const skillFlow: Array<{ id: CanvasSkillId; skillName: string; title: string; description: string }> = [
  {
    id: 'diagnosis',
    skillName: 'resume.diagnosis',
    title: '诊断报告',
    description: '基于简历、岗位 JD 和行业知识库，生成岗位匹配诊断。',
  },
  {
    id: 'resume',
    skillName: 'resume.rewrite',
    title: '简历生成与改写',
    description: '用户确认诊断后，生成可下载的最终简历版本。',
  },
  {
    id: 'outreach',
    skillName: 'resume.outreach',
    title: '投递话术',
    description: '基于已确认简历，生成 HR 私信和投递邮件。',
  },
  {
    id: 'interview',
    skillName: 'resume.interview',
    title: '面试准备',
    description: '生成面试回答，并转换成自然口语表达。',
  },
];

const intakeStepMeta: Record<IntakeStepId, { title: string; desc: string }> = {
  mode: { title: '先告诉我你的简历状态', desc: '系统会根据你的情况决定后面要问什么。' },
  resume: { title: '上传或粘贴简历', desc: '可以上传 PDF / Word / TXT，也可以直接复制简历内容。' },
  material: { title: '上传材料', desc: '先上传或粘贴已有资料' },
  intention: { title: '求职意向', desc: '确认投递方向和到岗情况' },
  basic: { title: '基本信息', desc: '补充联系方式和所在城市' },
  education: { title: '教育经历', desc: '填写学校、专业和时间' },
  experience: { title: '经历补充', desc: '整理项目、校园或实习经历' },
  skills: { title: '技能作品', desc: '补充技能、证书和作品' },
  job: { title: '岗位信息', desc: '上传岗位截图，或粘贴岗位 JD。' },
  jobSettings: { title: '岗位偏好', desc: '确认目标岗位、身份、公司类型和回答风格。' },
  goal: { title: '本次目标', desc: '确认这次要重点生成什么，以及想准备的问题。' },
};

const hasResumeFlow: IntakeStepId[] = ['mode', 'resume', 'job', 'jobSettings', 'goal'];
const noResumeFlow: IntakeStepId[] = ['mode', 'material', 'intention', 'basic', 'education', 'experience', 'skills', 'job', 'jobSettings', 'goal'];

export default function InternshipResumeAgentPage() {
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const jdImageInputRef = useRef<HTMLInputElement | null>(null);
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routeProjectId = searchParams.get('project') || '';
  const routeTabId = searchParams.get('tab') || '';
  const agent = getAgentById(AGENT_ID);
  const [projectId, setProjectId] = useState(routeProjectId);
  const [draft, setDraft] = useState<ResumeDraft>(initialDraft);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [result, setResult] = useState<ResumeResult | null>(null);
  const [canvasCards, setCanvasCards] = useState<ResumeCanvasCard[]>([]);
  const [editingCardId, setEditingCardId] = useState<CanvasSkillId | null>(null);
  const [intakeStep, setIntakeStep] = useState<IntakeStepId>('mode');
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const project = getProject(projectId);
  const storageUsage = useSyncExternalStore(subscribeStorageUsage, getStorageUsage, getStorageUsage);
  const storageRemaining = getRemainingStorageBytes(storageUsage);

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
        : null) as Partial<ResumeDraft> | null;

    if (savedDraft) {
      setDraft({ ...initialDraft, ...savedDraft });
      setHasUserEdited(true);
    }
  }, [routeProjectId, routeTabId]);

  useEffect(() => {
    if (project && error === '使用智能体前需要先从首页或智能体市场选择项目。') {
      setError('');
    }
  }, [error, project]);

  useEffect(() => {
    if (!hasUserEdited || !project) return;
    if (
      !draft.resumeText.trim() &&
      !draft.resumeFileName &&
      !draft.school.trim() &&
      !draft.major.trim() &&
      !draft.enrollmentDate.trim() &&
      !draft.graduationDate.trim() &&
      !draft.courses.trim() &&
      !draft.internshipExperience.trim() &&
      !draft.projectExperience.trim() &&
      !draft.campusExperience.trim() &&
      !draft.jdText.trim() &&
      !draft.jdImageName &&
      !draft.notes.trim()
    ) return;
    markWorkbenchTabDraft({
      agentId: AGENT_ID,
      agentName: agent?.name,
      projectId: project.id,
      projectName: project.name,
      tabId: routeTabId || undefined,
      draftInput: draft,
    });
  }, [agent?.name, draft, hasUserEdited, project, routeTabId]);

  const updateDraft = <K extends keyof ResumeDraft>(key: K, value: ResumeDraft[K]) => {
    setHasUserEdited(true);
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const intakeFlow = draft.mode === 'has_resume' ? hasResumeFlow : noResumeFlow;
  const intakeStepIndex = Math.max(0, intakeFlow.indexOf(intakeStep));
  const goNextIntakeStep = () => {
    const next = intakeFlow[intakeStepIndex + 1];
    if (next) setIntakeStep(next);
  };
  const goPrevIntakeStep = () => {
    const previous = intakeFlow[intakeStepIndex - 1];
    if (previous) setIntakeStep(previous);
  };
  const selectResumeMode = (mode: ResumeMode) => {
    updateDraft('mode', mode);
    setIntakeStep(mode === 'has_resume' ? 'resume' : 'material');
  };

  const handleUpload = async (file?: File) => {
    if (!file) return;
    if (!canStoreBytes(file.size)) {
      setError(`云端空间不足。当前剩余 ${formatBytes(storageRemaining)}，该文件需要 ${formatBytes(file.size)}。请先购买空间后再上传。`);
      return;
    }
    setHasUserEdited(true);
    const isText = file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md');
    const text = isText ? await file.text() : '';
    const saved = reserveStorageBytes(file.size);
    if (saved.ok === false) {
      setError(`云端空间不足。当前剩余 ${formatBytes(saved.remainingBytes)}，该文件需要 ${formatBytes(file.size)}。请先购买空间后再上传。`);
      return;
    }
    setError('');
    setDraft((current) => ({
      ...current,
      resumeFileName: file.name,
      resumeText: text || current.resumeText,
    }));
  };

  const handleJdImageUpload = (file?: File) => {
    if (!file) return;
    if (!canStoreBytes(file.size)) {
      setError(`云端空间不足。当前剩余 ${formatBytes(storageRemaining)}，该图片需要 ${formatBytes(file.size)}。请先购买空间后再上传。`);
      return;
    }
    const saved = reserveStorageBytes(file.size);
    if (saved.ok === false) {
      setError(`云端空间不足。当前剩余 ${formatBytes(saved.remainingBytes)}，该图片需要 ${formatBytes(file.size)}。请先购买空间后再上传。`);
      return;
    }
    setHasUserEdited(true);
    setError('');
    setDraft((current) => ({
      ...current,
      jdImageName: file.name,
    }));
  };

  const runAnalysis = async () => {
    if (!project) {
      setError('使用智能体前需要先从首页或智能体市场选择项目。');
      return;
    }
    if (draft.mode === 'has_resume' && !draft.resumeText.trim() && !draft.resumeFileName) {
      setError('请先上传简历，或粘贴简历内容。');
      return;
    }
    if (
      draft.mode === 'no_resume' &&
      !draft.school.trim() &&
      !draft.major.trim() &&
      !draft.enrollmentDate.trim() &&
      !draft.graduationDate.trim() &&
      !draft.courses.trim() &&
      !draft.internshipExperience.trim() &&
      !draft.projectExperience.trim() &&
      !draft.campusExperience.trim()
    ) {
      setError('还没有简历时，请至少填写学校、专业、课程、项目或校园经历中的一项。');
      return;
    }
    if (!draft.jdText.trim() && !draft.jdImageName) {
      setError('请粘贴岗位 JD，或上传岗位截图，这样才能生成岗位匹配和面试回答。');
      return;
    }

    setError('');
    setResult(null);
    setCanvasCards([]);
    setEditingCardId(null);
    for (let i = 0; i < steps.length; i += 1) {
      setActiveStep(i);
      await new Promise((resolve) => window.setTimeout(resolve, 180));
    }

    let diagnosis;
    try {
      diagnosis = await createRemoteResumeDiagnosisTask(draft);
    } catch (requestError) {
      setActiveStep(-1);
      setError(requestError instanceof Error ? requestError.message : '简历诊断生成失败，请稍后重试。');
      return;
    }
    const next = diagnosis.result;
    const diagnosisContent = diagnosis.reportDocument;
    const artifactBytes = new Blob([diagnosisContent], { type: 'text/plain;charset=utf-8' }).size;
    const saved = reserveStorageBytes(artifactBytes);
    if (saved.ok === false) {
      setActiveStep(-1);
      setError(`诊断报告需要保存到云端空间，当前剩余 ${formatBytes(saved.remainingBytes)}，本次结果约 ${formatBytes(artifactBytes)}。请先购买空间后再生成。`);
      return;
    }
    setResult(next);
    setCanvasCards([
      {
        ...skillFlow[0],
        content: diagnosisContent,
        status: 'ready',
      },
    ]);
    setActiveStep(steps.length);
    attachWorkbenchTabTask({
      agentId: AGENT_ID,
      agentName: agent?.name,
      projectId: project.id,
      projectName: project.name,
      tabId: routeTabId || undefined,
      taskId: diagnosis.taskId,
      status: 'completed',
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

  const copyText = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(''), 1200);
  };

  const updateCanvasCard = (id: CanvasSkillId, content: string) => {
    setCanvasCards((current) =>
      current.map((card) => (card.id === id ? { ...card, content } : card)),
    );
  };

  const confirmCanvasCard = async (id: CanvasSkillId) => {
    if (!result) return;
    const cardIndex = skillFlow.findIndex((item) => item.id === id);
    const nextSkill = skillFlow[cardIndex + 1];

    setEditingCardId(null);
    setCanvasCards((current) =>
      current.map((card) => (card.id === id ? { ...card, status: 'confirmed' } : card)),
    );

    if (!nextSkill) return;

    setCanvasCards((current) => {
      if (current.some((card) => card.id === nextSkill.id)) return current;
      return [
        ...current,
        {
          ...nextSkill,
          content: '',
          status: 'running',
        },
      ];
    });
    await new Promise((resolve) => window.setTimeout(resolve, 420));

    const content = buildCanvasSkillDocument(nextSkill.id, result);
    const artifactBytes = new Blob([content], { type: 'text/plain;charset=utf-8' }).size;
    const saved = reserveStorageBytes(artifactBytes);
    if (saved.ok === false) {
      setCanvasCards((current) => current.filter((card) => card.id !== nextSkill.id));
      setError(`生成「${nextSkill.title}」需要保存到云端空间，当前剩余 ${formatBytes(saved.remainingBytes)}，本次结果约 ${formatBytes(artifactBytes)}。请先购买空间后再继续。`);
      return;
    }

    setCanvasCards((current) =>
      current.map((card) =>
        card.id === nextSkill.id
          ? {
              ...card,
              content,
              status: 'ready',
            }
          : card,
      ),
    );
  };

  return (
    <div className="min-h-full bg-[#F5F5F7] px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
      <div className="grid min-h-[calc(100vh-112px)] gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col rounded-2xl border border-black/8 bg-white shadow-sm">
          <header className="border-b border-black/8 px-5 py-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EEF7F1] text-[#246B3D]">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-black/85">{agent?.name ?? '实习简历智能体'}</h1>
                <p className="mt-1 text-sm leading-6 text-black/48">
                  上传简历和岗位 JD，生成简历诊断、岗位匹配、投递话术和面试口语回答。
                </p>
                {project ? (
                  <p className="mt-2 text-xs font-semibold text-[#246B3D]">当前项目：{project.name}</p>
                ) : null}
                <p className="mt-1 text-xs text-black/38">
                  云端空间：已用 {formatBytes(storageUsage.usedBytes)} / {formatBytes(storageUsage.quotaBytes)}
                </p>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="space-y-5">
              <ResumeIntakeWizard
                step={intakeStep}
                stepIndex={intakeStepIndex}
                totalSteps={intakeFlow.length}
                draft={draft}
                fileInputRef={fileInputRef}
                jdImageInputRef={jdImageInputRef}
                onSelectMode={selectResumeMode}
                onUpload={handleUpload}
                onJdImageUpload={handleJdImageUpload}
                onChange={updateDraft}
                onPrev={goPrevIntakeStep}
                onNext={goNextIntakeStep}
              />

              {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{error}</p> : null}

              {intakeStep === 'goal' ? (
                <button
                  type="button"
                  onClick={() => void runAnalysis()}
                  disabled={activeStep >= 0 && activeStep < steps.length}
                  className="h-12 w-full rounded-xl bg-black text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {activeStep >= 0 && activeStep < steps.length
                    ? '分析中...'
                    : '生成诊断报告'}
                </button>
              ) : null}
            </div>

            <div className="mt-6 rounded-2xl border border-black/8 bg-[#FCFCFD] p-4">
              <p className="text-sm font-bold text-black/75">执行过程</p>
              <div className="mt-3 space-y-2">
                {steps.map((step, index) => {
                  const done = activeStep > index;
                  const active = activeStep === index;
                  return (
                    <div key={step} className="flex items-center gap-2 text-sm">
                      {active ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#246B3D]" />
                      ) : done ? (
                        <CheckCircle2 className="h-4 w-4 text-[#246B3D]" />
                      ) : (
                        <span className="h-4 w-4 rounded-full border border-black/15" />
                      )}
                      <span className={done || active ? 'font-semibold text-black/75' : 'text-black/35'}>{step}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="min-h-0 rounded-2xl border border-black/8 bg-white shadow-sm">
          <div className="flex h-full min-h-0 flex-col">
            <header className="border-b border-black/8 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-black/85">求职智能体画布</p>
                  <p className="mt-1 text-sm text-black/45">Hermes 会按顺序执行 skill。确认上一张卡片后，才会生成下一张卡片。</p>
                </div>
                <span className="rounded-full bg-[#EEF7F1] px-3 py-1 text-xs font-bold text-[#246B3D]">
                  {result ? `简历竞争力 ${result.score}/100` : '等待输入'}
                </span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                {skillFlow.map((skill, index) => {
                  const card = canvasCards.find((item) => item.id === skill.id);
                  const current = card?.status === 'running';
                  const confirmed = card?.status === 'confirmed';
                  const ready = card?.status === 'ready';
                  return (
                    <div
                      key={skill.id}
                      className={`rounded-xl border px-3 py-2 ${
                        confirmed
                          ? 'border-[#246B3D]/20 bg-[#EEF7F1] text-[#246B3D]'
                          : ready
                            ? 'border-black/15 bg-white text-black/75'
                            : current
                              ? 'border-amber-200 bg-amber-50 text-amber-800'
                              : 'border-black/8 bg-[#F7F7F8] text-black/35'
                      }`}
                    >
                      <p className="text-[11px] font-bold">步骤 {index + 1}</p>
                      <p className="mt-0.5 truncate text-xs font-bold">{skill.title}</p>
                    </div>
                  );
                })}
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.12)_1px,transparent_0)] bg-[length:24px_24px] p-5">
              {canvasCards.length === 0 ? (
                <EmptyCanvas />
              ) : (
                <div className="mx-auto flex max-w-3xl flex-col gap-5 pb-8">
                  {canvasCards.map((card) => (
                    <CanvasSkillCard
                      key={card.id}
                      card={card}
                      editing={editingCardId === card.id}
                      copied={copiedKey === card.id}
                      onEdit={() => setEditingCardId(card.id)}
                      onCancelEdit={() => setEditingCardId(null)}
                      onChange={(content) => updateCanvasCard(card.id, content)}
                      onCopy={() => void copyText(card.id, card.content)}
                      onConfirm={() => void confirmCanvasCard(card.id)}
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

function FieldGroup({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-bold text-black/75">
        <span className="text-[#246B3D]">{icon}</span>
        {title}
      </div>
      {children}
    </section>
  );
}

function ModeCard({ active, title, desc, onClick }: { active: boolean; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition-colors ${
        active ? 'border-black bg-black text-white' : 'border-black/10 bg-white text-black/70 hover:border-black/25'
      }`}
    >
      <p className="text-sm font-bold">{title}</p>
      <p className={`mt-1 text-xs leading-5 ${active ? 'text-white/65' : 'text-black/40'}`}>{desc}</p>
    </button>
  );
}

function FormSection({ index, title, children }: { index: string; title: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-2xl border border-black/8 bg-[#FCFCFD] p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black text-[11px] font-bold text-white">
          {index}
        </span>
        <p className="text-sm font-bold text-black/75">{title}</p>
      </div>
      {children}
    </div>
  );
}

function TextField({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-bold text-black/45">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#246B3D]/40"
      />
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-bold text-black/45">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#246B3D]/40"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ResumeIntakeWizard({
  step,
  stepIndex,
  totalSteps,
  draft,
  fileInputRef,
  jdImageInputRef,
  onSelectMode,
  onUpload,
  onJdImageUpload,
  onChange,
  onPrev,
  onNext,
}: {
  step: IntakeStepId;
  stepIndex: number;
  totalSteps: number;
  draft: ResumeDraft;
  fileInputRef: RefObject<HTMLInputElement | null>;
  jdImageInputRef: RefObject<HTMLInputElement | null>;
  onSelectMode: (mode: ResumeMode) => void;
  onUpload: (file?: File) => void | Promise<void>;
  onJdImageUpload: (file?: File) => void;
  onChange: <K extends keyof ResumeDraft>(key: K, value: ResumeDraft[K]) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const meta = intakeStepMeta[step];
  const isLast = stepIndex === totalSteps - 1;

  return (
    <div className="rounded-2xl border border-black/8 bg-[#FCFCFD] p-3">
      <div className="rounded-2xl border border-black/8 bg-white p-4">
        <div className="mb-4">
          <p className="text-xs font-bold text-black/35">
            第 {stepIndex + 1} 步 / 共 {totalSteps} 步
          </p>
          <p className="mt-1 text-sm font-bold text-black/80">{meta.title}</p>
          <p className="mt-1 text-xs leading-5 text-black/40">{meta.desc}</p>
        </div>

        {step === 'mode' ? (
          <div className="grid grid-cols-2 gap-3">
            <ModeCard
              active={draft.mode === 'has_resume'}
              title="我已有简历"
              desc="上传简历，针对岗位 JD 做诊断和改写"
              onClick={() => onSelectMode('has_resume')}
            />
            <ModeCard
              active={draft.mode === 'no_resume'}
              title="我还没有简历"
              desc="先补充材料和经历，再生成诊断"
              onClick={() => onSelectMode('no_resume')}
            />
          </div>
        ) : null}

        {step === 'resume' ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-16 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-black/15 bg-[#FCFCFD] text-sm font-bold text-black/55 hover:border-black/25"
            >
              <UploadCloud className="h-5 w-5" />
              {draft.resumeFileName || '上传简历 PDF / Word / TXT'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md"
              className="hidden"
              onChange={(event) => void onUpload(event.target.files?.[0])}
            />
            <textarea
              value={draft.resumeText}
              onChange={(event) => onChange('resumeText', event.target.value)}
              placeholder="也可以直接粘贴简历内容，例如教育经历、项目经历、校园经历、技能等。"
              className="min-h-32 w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[#246B3D]/40"
            />
          </div>
        ) : null}

        {step === 'material' ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-16 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-black/15 bg-[#FCFCFD] text-sm font-bold text-black/55 hover:border-black/25"
            >
              <UploadCloud className="h-5 w-5" />
              {draft.resumeFileName || '上传成绩单 / 作品集 / 经历材料'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md"
              className="hidden"
              onChange={(event) => void onUpload(event.target.files?.[0])}
            />
            <textarea
              value={draft.resumeText}
              onChange={(event) => onChange('resumeText', event.target.value)}
              placeholder="也可以先把已有材料粘贴在这里：课程作业、项目经历、社团活动、比赛经历、证书奖项、作品链接等。"
              className="min-h-32 w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[#246B3D]/40"
            />
          </div>
        ) : null}

        {step === 'intention' ? (
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="求职状态" value={draft.jobStatus} onChange={(value) => onChange('jobStatus', value)} options={['正在找实习', '看机会', '暂不着急', '准备校招']} />
            <SelectField label="期望薪资" value={draft.expectedSalary} onChange={(value) => onChange('expectedSalary', value)} options={['面议', '100-150/天', '150-200/天', '200-300/天', '300+/天']} />
            <SelectField label="到岗天数" value={draft.internshipDays} onChange={(value) => onChange('internshipDays', value)} options={['每周 3 天', '每周 4 天', '每周 5 天', '可全勤']} />
            <SelectField label="实习时长" value={draft.internshipDuration} onChange={(value) => onChange('internshipDuration', value)} options={['1-2 个月', '3 个月以上', '6 个月以上', '可长期实习']} />
          </div>
        ) : null}

        {step === 'basic' ? (
          <div className="grid grid-cols-2 gap-3">
            <TextField label="姓名" value={draft.studentName} onChange={(value) => onChange('studentName', value)} placeholder="例如：张同学" />
            <TextField label="所在城市" value={draft.city} onChange={(value) => onChange('city', value)} placeholder="北京 / 上海 / 杭州" />
            <TextField label="手机" value={draft.phone} onChange={(value) => onChange('phone', value)} placeholder="用于简历联系方式" />
            <TextField label="邮箱" value={draft.email} onChange={(value) => onChange('email', value)} placeholder="用于简历联系方式" />
          </div>
        ) : null}

        {step === 'education' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <TextField label="学校" value={draft.school} onChange={(value) => onChange('school', value)} placeholder="例如：XX 大学" />
              <TextField label="专业" value={draft.major} onChange={(value) => onChange('major', value)} placeholder="例如：市场营销" />
              <SelectField label="学历" value={draft.degree} onChange={(value) => onChange('degree', value)} options={['大专', '本科', '硕士', '博士']} />
              <SelectField label="当前身份" value={draft.studentStage} onChange={(value) => onChange('studentStage', value)} options={['大一', '大二', '大三', '大四', '研究生', '应届生']} />
              <TextField label="入学时间" value={draft.enrollmentDate} onChange={(value) => onChange('enrollmentDate', value)} placeholder="例如：2022.09" />
              <TextField label="毕业时间" value={draft.graduationDate} onChange={(value) => onChange('graduationDate', value)} placeholder="例如：2026.06" />
            </div>
            <TextField label="GPA / 排名" value={draft.gpa} onChange={(value) => onChange('gpa', value)} placeholder="例如：GPA 3.6/4.0，专业前 20%" />
            <textarea
              value={draft.courses}
              onChange={(event) => onChange('courses', event.target.value)}
              placeholder="主修课程：消费者行为学、用户研究、数据分析、传播学、Python、SQL..."
              className="min-h-20 w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[#246B3D]/40"
            />
          </div>
        ) : null}

        {step === 'experience' ? (
          <div className="space-y-3">
            <textarea
              value={draft.internshipExperience}
              onChange={(event) => onChange('internshipExperience', event.target.value)}
              placeholder="实习经历：公司/组织、岗位、时间、你负责什么、做了哪些动作、结果是什么。没有可以先空着。"
              className="min-h-20 w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[#246B3D]/40"
            />
            <textarea
              value={draft.projectExperience}
              onChange={(event) => onChange('projectExperience', event.target.value)}
              placeholder="项目经历：课程项目、竞赛项目、作品集、自媒体账号。写项目名称、背景、你的职责、动作和结果。"
              className="min-h-24 w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[#246B3D]/40"
            />
            <textarea
              value={draft.campusExperience}
              onChange={(event) => onChange('campusExperience', event.target.value)}
              placeholder="校园经历：社团、学生会、班委、活动策划、宣传报名、沟通执行、复盘。"
              className="min-h-20 w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[#246B3D]/40"
            />
          </div>
        ) : null}

        {step === 'skills' ? (
          <div className="space-y-3">
            <textarea
              value={draft.skills}
              onChange={(event) => onChange('skills', event.target.value)}
              placeholder="工具和技能：Excel、PPT、飞书、Figma、剪映、Python、SQL、PS..."
              className="min-h-20 w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[#246B3D]/40"
            />
            <textarea
              value={draft.certificates}
              onChange={(event) => onChange('certificates', event.target.value)}
              placeholder="证书 / 奖项 / 作品链接：四六级、奖学金、比赛、作品集链接等。"
              className="min-h-20 w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[#246B3D]/40"
            />
          </div>
        ) : null}

        {step === 'job' ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => jdImageInputRef.current?.click()}
              className="flex h-16 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-black/15 bg-[#FCFCFD] text-sm font-bold text-black/55 hover:border-black/25"
            >
              <UploadCloud className="h-5 w-5" />
              {draft.jdImageName || '上传岗位截图 / JD 图片'}
            </button>
            <input
              ref={jdImageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => onJdImageUpload(event.target.files?.[0])}
            />
            <textarea
              value={draft.jdText}
              onChange={(event) => onChange('jdText', event.target.value)}
              placeholder="粘贴岗位 JD：岗位职责、任职要求、公司介绍等。也可以先上传岗位截图。"
              className="min-h-32 w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[#246B3D]/40"
            />
          </div>
        ) : null}

        {step === 'jobSettings' ? (
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="目标岗位" value={draft.targetRole} onChange={(value) => onChange('targetRole', value)} options={['运营实习', '产品实习', '新媒体实习', '市场实习', '数据分析实习', '设计实习', '研发实习', '人力实习']} />
            <SelectField label="当前身份" value={draft.studentStage} onChange={(value) => onChange('studentStage', value)} options={['大一', '大二', '大三', '大四', '研究生', '应届生']} />
            <SelectField label="公司类型" value={draft.companyType} onChange={(value) => onChange('companyType', value)} options={['互联网公司', '创业公司', '外企', '国企', '咨询/投行/快消', '不确定']} />
            <SelectField label="回答风格" value={draft.tone} onChange={(value) => onChange('tone', value)} options={['自然学生感', '稳重专业', '自信有冲劲', '简洁直接']} />
          </div>
        ) : null}

        {step === 'goal' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                ['full', '全部生成'],
                ['diagnosis', '简历诊断'],
                ['rewrite', '简历改写'],
                ['outreach', '投递话术'],
                ['interview', '面试回答'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange('goal', value as ResumeGoal)}
                  className={`h-10 rounded-lg border text-xs font-bold ${
                    draft.goal === value
                      ? 'border-black bg-black text-white'
                      : 'border-black/10 bg-white text-black/55 hover:border-black/20'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              value={draft.question}
              onChange={(event) => onChange('question', event.target.value)}
              placeholder="想重点准备的面试问题"
              className="h-11 w-full rounded-xl border border-black/10 px-3 text-sm outline-none focus:border-[#246B3D]/40"
            />
            <textarea
              value={draft.notes}
              onChange={(event) => onChange('notes', event.target.value)}
              placeholder="补充说明：想突出什么、担心什么、是否有目标公司。"
              className="min-h-20 w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[#246B3D]/40"
            />
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onPrev}
            disabled={stepIndex === 0}
            className="h-10 rounded-xl border border-black/10 bg-white px-4 text-sm font-bold text-black/55 disabled:cursor-not-allowed disabled:opacity-35"
          >
            上一步
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={isLast}
            className="h-10 rounded-xl bg-black px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            {isLast ? '可以生成诊断报告' : step === 'material' && !draft.resumeFileName && !draft.resumeText.trim() ? '没有材料，继续填写' : '确认，下一步'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyCanvas() {
  return (
    <div className="flex min-h-[560px] items-center justify-center">
      <div className="max-w-sm rounded-3xl border border-black/8 bg-white px-8 py-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF7F1] text-[#246B3D]">
          <Mic2 className="h-7 w-7" />
        </div>
        <p className="mt-4 text-lg font-bold text-black/80">画布等待 Hermes 输出</p>
        <p className="mt-2 text-sm leading-6 text-black/45">
          左侧填写资料后先生成诊断报告。确认诊断后，画布会继续生成简历、投递话术和面试准备。
        </p>
      </div>
    </div>
  );
}

function CanvasSkillCard({
  card,
  editing,
  copied,
  onEdit,
  onCancelEdit,
  onChange,
  onCopy,
  onConfirm,
}: {
  card: ResumeCanvasCard;
  editing: boolean;
  copied: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onChange: (content: string) => void;
  onCopy: () => void;
  onConfirm: () => void;
}) {
  const running = card.status === 'running';
  const confirmed = card.status === 'confirmed';

  return (
    <article className="rounded-3xl border border-black/10 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-black/8 px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-black/85">{card.title}</h3>
            <span className="rounded-full bg-[#F2F0ED] px-2 py-0.5 text-[11px] font-bold text-black/45">
              {card.skillName}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-black/45">{card.description}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            running
              ? 'bg-amber-50 text-amber-700'
              : confirmed
                ? 'bg-[#EEF7F1] text-[#246B3D]'
                : 'bg-black text-white'
          }`}
        >
          {running ? 'Hermes 执行中' : confirmed ? '已确认' : '待确认'}
        </span>
      </header>

      <div className="px-5 py-5">
        {running ? (
          <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-black/10 bg-[#FCFCFD]">
            <div className="flex items-center gap-2 text-sm font-bold text-black/45">
              <Loader2 className="h-4 w-4 animate-spin" />
              Hermes 正在执行 {card.skillName}
            </div>
          </div>
        ) : editing ? (
          <textarea
            value={card.content}
            onChange={(event) => onChange(event.target.value)}
            className="min-h-[360px] w-full resize-y rounded-2xl border border-black/10 bg-[#FCFCFD] px-4 py-4 text-sm leading-7 outline-none focus:border-[#246B3D]/40"
          />
        ) : (
          <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-2xl bg-[#FCFCFD] px-4 py-4 text-sm leading-7 text-black/72">
            {card.content}
          </pre>
        )}
      </div>

      {!running ? (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-black/8 px-5 py-4">
          <div className="flex flex-wrap gap-2">
            <CopyButton copied={copied} onClick={onCopy} />
            {card.id === 'resume' ? <DownloadButton fileName="实习简历优化版.txt" content={card.content} /> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {editing ? (
              <button
                type="button"
                onClick={onCancelEdit}
                className="h-9 rounded-lg border border-black/10 bg-white px-3 text-xs font-bold text-black/55 hover:border-black/20"
              >
                完成修改
              </button>
            ) : (
              <button
                type="button"
                onClick={onEdit}
                disabled={confirmed}
                className="h-9 rounded-lg border border-black/10 bg-white px-3 text-xs font-bold text-black/55 hover:border-black/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                修改卡片
              </button>
            )}
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmed || editing}
              className="h-9 rounded-lg bg-black px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              {card.id === 'interview' ? '确认完成' : '确认并继续'}
            </button>
          </div>
        </footer>
      ) : null}
    </article>
  );
}

function EmptyResult() {
  return (
    <div className="flex min-h-[520px] items-center justify-center rounded-2xl border border-dashed border-black/10 bg-[#FCFCFD]">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF7F1] text-[#246B3D]">
          <Mic2 className="h-7 w-7" />
        </div>
        <p className="mt-4 text-lg font-bold text-black/80">准备你的第一份实习投递</p>
        <p className="mt-2 text-sm leading-6 text-black/45">
          上传简历，贴上岗位 JD，系统会生成诊断报告、改写建议、投递话术和自然口语回答。
        </p>
      </div>
    </div>
  );
}

function ResultContent({
  tab,
  result,
  copiedKey,
  onCopy,
}: {
  tab: ResultTab;
  result: ResumeResult;
  copiedKey: string;
  onCopy: (key: string, value: string) => void;
}) {
  if (tab === 'report') {
    return (
      <div className="space-y-4">
        <ResultCard title="结论摘要" action={<CopyButton copied={copiedKey === 'summary'} onClick={() => onCopy('summary', result.summary)} />}>
          <p className="text-sm leading-7 text-black/65">{result.summary}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Metric label="简历竞争力" value={`${result.score}/100`} />
            <Metric label="岗位匹配度" value={result.match} />
            <Metric label="建议" value={result.score >= 78 ? '可以投递' : '修改后投'} />
          </div>
        </ResultCard>
        <TwoColumnList leftTitle="优势点" leftItems={result.strengths} rightTitle="风险点" rightItems={result.risks} />
        <ResultCard title="缺失关键词">
          <div className="flex flex-wrap gap-2">
            {result.missingKeywords.map((item) => (
              <span key={item} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{item}</span>
            ))}
          </div>
        </ResultCard>
      </div>
    );
  }

  if (tab === 'rewrite') {
    return (
      <div className="space-y-3">
        <ResultCard
          title="最终简历"
          action={
            <div className="flex items-center gap-2">
              <CopyButton copied={copiedKey === 'final-resume'} onClick={() => onCopy('final-resume', result.finalResume)} />
              <DownloadButton fileName={`${result.targetRole}-简历优化版.txt`} content={result.finalResume} />
            </div>
          }
        >
          <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl bg-white px-4 py-4 text-sm leading-7 text-black/72">
            {result.finalResume}
          </pre>
        </ResultCard>
        {result.rewrites.map((item, index) => (
          <ResultCard
            key={item.original}
            title={`经历改写 ${index + 1}`}
            action={<CopyButton copied={copiedKey === `rewrite-${index}`} onClick={() => onCopy(`rewrite-${index}`, item.improved)} />}
          >
            <Block label="原文" text={item.original} />
            <Block label="问题" text={item.issue} />
            <Block label="改写后" text={item.improved} strong />
          </ResultCard>
        ))}
      </div>
    );
  }

  if (tab === 'outreach') {
    return (
      <div className="space-y-3">
        {result.outreach.map((item, index) => (
          <ResultCard
            key={item.title}
            title={item.title}
            action={<CopyButton copied={copiedKey === `outreach-${index}`} onClick={() => onCopy(`outreach-${index}`, item.content)} />}
          >
            <p className="whitespace-pre-wrap text-sm leading-7 text-black/68">{item.content}</p>
          </ResultCard>
        ))}
      </div>
    );
  }

  const rows = tab === 'spoken' ? result.interview.map((item) => ({ title: item.question, body: item.spoken })) : result.interview.map((item) => ({ title: item.question, body: `考察点：${item.focus}\n\n${item.answer}` }));
  return (
    <div className="space-y-3">
      {rows.map((item, index) => (
        <ResultCard
          key={item.title}
          title={item.title}
          action={<CopyButton copied={copiedKey === `${tab}-${index}`} onClick={() => onCopy(`${tab}-${index}`, item.body)} />}
        >
          <p className="whitespace-pre-wrap text-sm leading-7 text-black/68">{item.body}</p>
        </ResultCard>
      ))}
    </div>
  );
}

function ResultCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/8 bg-[#FCFCFD] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-black/80">{title}</p>
        {action}
      </div>
      {children}
    </section>
  );
}

function CopyButton({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 text-xs font-bold text-black/55 hover:border-black/20"
    >
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
    <button
      type="button"
      onClick={handleDownload}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 text-xs font-bold text-black/55 hover:border-black/20"
    >
      <Download className="h-3.5 w-3.5" />
      下载
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/8 bg-white p-3">
      <p className="text-xs text-black/38">{label}</p>
      <p className="mt-1 text-lg font-bold text-black/78">{value}</p>
    </div>
  );
}

function TwoColumnList({ leftTitle, leftItems, rightTitle, rightItems }: { leftTitle: string; leftItems: string[]; rightTitle: string; rightItems: string[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ResultCard title={leftTitle}>
        <List items={leftItems} tone="green" />
      </ResultCard>
      <ResultCard title={rightTitle}>
        <List items={rightItems} tone="amber" />
      </ResultCard>
    </div>
  );
}

function List({ items, tone }: { items: string[]; tone: 'green' | 'amber' }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm leading-6 text-black/65">
          <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${tone === 'green' ? 'bg-[#246B3D]' : 'bg-amber-500'}`} />
          {item}
        </li>
      ))}
    </ul>
  );
}

function Block({ label, text, strong = false }: { label: string; text: string; strong?: boolean }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1 text-xs font-bold text-black/38">{label}</p>
      <p className={`rounded-xl bg-white px-3 py-2 text-sm leading-7 ${strong ? 'font-semibold text-black/78' : 'text-black/58'}`}>
        {text}
      </p>
    </div>
  );
}
