import { type ReactNode, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Clock3,
  ImagePlus,
  Link2,
  ListTodo,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { getAgentById } from '../../data/agentsCatalog';
import { getVideoAgentProfile } from '../../config/videoAgentProfiles';
import type { AgentEntryState } from '../../types/agentNavigation';
import {
  cancelRemoteTask,
  confirmRemoteTask,
  createRemoteUgcTask,
  getRemoteTask,
  retryRemoteTask,
  uploadTaskFile,
} from '../../lib/taskApi';
import { getSkillExperienceConfig } from '../../lib/skillStudioApi';
import type { SkillExperienceConfig } from '../../types/skills';
import { buildWorkbenchShowcaseVideo } from '../../lib/publishedMarketModel';
import type { UgcTaskEvent, UgcTaskInput } from '../../types/ugc';
import type { Task, TaskStatus } from '../../types/workbench';
import ConfirmationNode from '../../components/app/tasks/ConfirmationNode';
import HermesLogPanel from '../../components/app/tasks/HermesLogPanel';
import TaskStatusBadge from '../../components/app/tasks/TaskStatusBadge';
import UgcDeliveryPanel from '../../components/app/tasks/UgcDeliveryPanel';
import {
  consumePendingAgentContext,
  getActiveProjectId,
  getProject,
  subscribeProjects,
} from '../../lib/projectStore';
import { getGlobalActiveTask } from '../../lib/taskStore';
import {
  attachWorkbenchTabTask,
  getActiveWorkbenchTaskTab,
  getWorkbenchTab,
  getWorkbenchTabForProjectAgent,
  markWorkbenchTabDraft,
} from '../../lib/workbenchTabs';

type ExecutionPreset = {
  platform: string;
  effectGoal: string;
  formatLabel: string;
};

type UploadedAsset = {
  url: string;
  fileName: string;
};

type UploadKind = 'product' | 'talent';

type BusinessOptionGroup = {
  id: string;
  title: string;
  options: string[];
};

type BusinessBlueprint = {
  directionSummary: string[];
  groups: BusinessOptionGroup[];
  objective: string;
  scenarioLabel: string;
  draftLabel: string;
  defaultShowcaseTitle: string;
  defaultShowcaseCopy: string;
  examples: string[];
  stageHints: [string, string, string];
};

type LiveRemoteTask = Task & {
  events: UgcTaskEvent[];
};

const ALLOWED_UPLOAD_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_UPLOAD_LABEL = 'JPG / PNG / WebP';
const MAX_UPLOAD_FILE_SIZE = 10 * 1024 * 1024;

const BUSINESS_BLUEPRINTS: Record<string, BusinessBlueprint> = {
  'media-seeding': {
    directionSummary: ['真人种草表达', '更适合抖音分发', '10 秒轻量样片'],
    groups: [
      { id: 'businessType', title: '品牌 / 门店类型', options: ['护肤品牌', '咖啡店', '服饰店', '生活方式品牌'] },
      { id: 'campaignFocus', title: '本次主打内容', options: ['新品上新', '爆款推荐', '夏日专题', '礼盒种草'] },
      { id: 'messageFocus', title: '更想让用户记住什么', options: ['真实使用感', '颜值好看', '送礼体面', '轻松入门'] },
    ],
    objective: '让用户更快记住产品卖点并产生种草兴趣',
    scenarioLabel: '新品种草场景',
    draftLabel: '种草样片草案',
    defaultShowcaseTitle: '把真实使用感做成更容易传播的短视频表达',
    defaultShowcaseCopy: '更适合新品首发、小品牌传播和生活化表达。',
    examples: ['通勤护肤种草', '礼盒送礼种草', '生活方式种草'],
    stageHints: ['先选业务', '系统整理种草表达', '确认后生成样片'],
  },
  'media-review': {
    directionSummary: ['测评讲解表达', '更适合视频号分发', '10 秒讲解样片'],
    groups: [
      { id: 'productCategory', title: '产品类型', options: ['护肤产品', '家电设备', '办公工具', '食品饮品'] },
      { id: 'reviewFocus', title: '本次主要讲什么', options: ['使用体验', '核心功能', '对比优势', '购买建议'] },
      { id: 'trustPoint', title: '更想建立哪种信任感', options: ['更真实', '更专业', '更好理解', '更像亲测总结'] },
    ],
    objective: '让用户更快理解产品体验和结论',
    scenarioLabel: '测评讲解场景',
    draftLabel: '讲解样片草案',
    defaultShowcaseTitle: '把真实体验讲得更容易被看懂和相信',
    defaultShowcaseCopy: '更适合讲效果、讲理由和建立使用信任感。',
    examples: ['护肤测评', '设备讲解', '开箱对比'],
    stageHints: ['先选讲解对象', '系统整理讲解结构', '确认后生成样片'],
  },
  'media-conversion': {
    directionSummary: ['带货转化表达', '更适合抖音成交', '10 秒转化样片'],
    groups: [
      { id: 'productType', title: '商品类型', options: ['日用品', '零食饮品', '护肤彩妆', '服饰配件'] },
      { id: 'promotionType', title: '本次成交理由', options: ['活动价', '新品首发', '限时优惠', '组合套餐'] },
      { id: 'ctaFocus', title: '更想推动什么动作', options: ['立即下单', '先领券再买', '进店咨询', '加购收藏'] },
    ],
    objective: '让用户更快形成购买动机并产生行动',
    scenarioLabel: '带货转化场景',
    draftLabel: '转化样片草案',
    defaultShowcaseTitle: '把卖点和行动引导压缩进更短的节奏里',
    defaultShowcaseCopy: '更适合活动转化、限时优惠和强行动引导。',
    examples: ['活动带货', '限时转化', '套餐促销'],
    stageHints: ['先选成交目标', '系统整理转化表达', '确认后生成样片'],
  },
  'media-showcase': {
    directionSummary: ['品牌宣传表达', '更适合门店传播', '10 秒氛围样片'],
    groups: [
      { id: 'storeType', title: '门店 / 品牌类型', options: ['咖啡店', '烘焙店', '服饰店', '美甲店'] },
      { id: 'campaignStage', title: '本次主打内容', options: ['新店开业', '新品上新', '主推爆款', '日常宣传'] },
      { id: 'brandFocus', title: '这次更想强调什么', options: ['氛围感', '到店理由', '产品细节', '品牌气质'] },
    ],
    objective: '让用户快速感受到门店氛围并提升到店兴趣',
    scenarioLabel: '品牌宣传场景',
    draftLabel: '宣传样片草案',
    defaultShowcaseTitle: '把真实门店氛围做成更容易传播的品牌视频',
    defaultShowcaseCopy: '更适合空间展示、品牌露出和门店日常传播。',
    examples: ['咖啡店宣传', '烘焙店开业', '门店氛围传播'],
    stageHints: ['先选门店业务', '系统整理宣传方向', '确认后生成样片'],
  },
  'media-demo': {
    directionSummary: ['产品演示表达', '更适合项目沟通', '10 秒演示样片'],
    groups: [
      { id: 'demoType', title: '演示对象类型', options: ['流水线设备', '生产机械', '软件系统', '家电产品'] },
      { id: 'demoGoal', title: '本次重点演示什么', options: ['核心流程', '效率提升', '操作方式', '应用场景'] },
      { id: 'viewerNeed', title: '更想让客户感受到什么', options: ['更专业', '更容易理解', '更可信', '更适合提案'] },
    ],
    objective: '让客户更快看懂功能亮点和使用场景',
    scenarioLabel: '产品演示场景',
    draftLabel: '演示样片草案',
    defaultShowcaseTitle: '把复杂功能压缩成客户更容易理解的演示视频',
    defaultShowcaseCopy: '更适合设备演示、流程讲解和项目开工前沟通。',
    examples: ['设备流程演示', '系统功能演示', '项目开工提案'],
    stageHints: ['先选演示重点', '系统整理演示逻辑', '确认后生成样片'],
  },
  'media-proposal': {
    directionSummary: ['提案展示表达', '更适合客户沟通', '10 秒方案样片'],
    groups: [
      { id: 'proposalClient', title: '客户类型', options: ['本地门店', '消费品牌', '商业空间', '活动项目'] },
      { id: 'proposalTheme', title: '本次方案重点', options: ['空间升级', '内容方向', '活动推广', '品牌焕新'] },
      { id: 'proposalValue', title: '更想让客户看到什么', options: ['落地效果', '品牌气质', '传播想象', '执行可行性'] },
    ],
    objective: '让客户更快理解方案方向并建立合作信心',
    scenarioLabel: '客户提案场景',
    draftLabel: '提案样片草案',
    defaultShowcaseTitle: '把方案方向变成客户更容易感知的提案视频',
    defaultShowcaseCopy: '更适合方案提案、方向演示和项目预期表达。',
    examples: ['门店升级提案', '活动提案', '品牌焕新提案'],
    stageHints: ['先选提案目标', '系统整理提案表达', '确认后生成样片'],
  },
};

export default function UgcVideoAgentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routeTabId = searchParams.get('tab') ?? '';
  const entry = (location.state as AgentEntryState | null) ?? {};
  const routeAgentId = resolveUgcAgentId(location.pathname);
  const currentAgentId = entry.agentId ?? routeAgentId;
  const executionPreset = useMemo(() => resolveExecutionPreset(currentAgentId), [currentAgentId]);
  const agent = getAgentById(currentAgentId);
  const agentName = agent?.name ?? '视频智能体';
  const profile = getVideoAgentProfile(currentAgentId);
  const businessBlueprint = useMemo(
    () => resolveBusinessBlueprint(currentAgentId, executionPreset),
    [currentAgentId, executionPreset],
  );

  const productInputRef = useRef<HTMLInputElement | null>(null);
  const talentInputRef = useRef<HTMLInputElement | null>(null);

  const [referenceUrl, setReferenceUrl] = useState('');
  const [productAsset, setProductAsset] = useState<UploadedAsset | null>(null);
  const [talentAsset, setTalentAsset] = useState<UploadedAsset | null>(null);
  const [uploadingKind, setUploadingKind] = useState<UploadKind | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Partial<Record<UploadKind, string>>>({});
  const [skillExperience, setSkillExperience] = useState<SkillExperienceConfig | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [businessDescription, setBusinessDescription] = useState('');
  const [businessDescriptionTouched, setBusinessDescriptionTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showOptionalSettings, setShowOptionalSettings] = useState(false);
  const [activeTask, setActiveTask] = useState<LiveRemoteTask | null>(null);
  const [taskError, setTaskError] = useState('');
  const activeProjectId = useSyncExternalStore(subscribeProjects, getActiveProjectId, getActiveProjectId);
  const [selectedProjectId, setSelectedProjectId] = useState(activeProjectId);
  const [contextReady, setContextReady] = useState(false);
  const [hasUserEdited, setHasUserEdited] = useState(false);

  const title = skillExperience?.title ?? profile?.title ?? '视频智能体';
  const promiseLine =
    skillExperience?.businessFrame.result.promiseLine ?? profile?.workbenchSubtitle ?? '适合门店宣传、新品种草和小品牌日常传播';
  const showcaseVideo = buildWorkbenchShowcaseVideo(skillExperience);
  const orientationTags = skillExperience?.businessFrame.result.orientationTags?.slice(0, 3) ?? profile?.orientationTags ?? [
    '10秒',
    '9:16',
    '视频样片',
  ];
  const costEstimateLabel = '样片阶段 ￥120 - ￥260';

  useEffect(() => {
    let cancelled = false;

    void getSkillExperienceConfig(currentAgentId)
      .then((config) => {
        if (cancelled) return;
        setSkillExperience(config);
      })
      .catch(() => {
        if (cancelled) return;
      });

    return () => {
      cancelled = true;
    };
  }, [currentAgentId]);

  useEffect(() => {
    const defaults = Object.fromEntries(
      businessBlueprint.groups.map((group) => [group.id, group.options[0] ?? '']),
    );
    setSelectedOptions(defaults);
    setBusinessDescriptionTouched(false);
  }, [businessBlueprint]);

  useEffect(() => {
    if (contextReady) return;
    const context = consumePendingAgentContext(currentAgentId);
    if (context?.taskScope === 'project') {
      setSelectedProjectId(context.projectId);
      const tabDraft = (routeTabId
        ? getWorkbenchTab(routeTabId)?.draftInput
        : getWorkbenchTabForProjectAgent(context.projectId, currentAgentId)?.draftInput) as
        | Partial<{
            referenceUrl: string;
            productAsset: UploadedAsset | null;
            talentAsset: UploadedAsset | null;
            selectedOptions: Record<string, string>;
            businessDescription: string;
            businessDescriptionTouched: boolean;
            showOptionalSettings: boolean;
          }>
        | undefined;
      setHasUserEdited(Boolean(tabDraft));
      if (tabDraft) {
        setReferenceUrl(tabDraft.referenceUrl || '');
        setProductAsset(tabDraft.productAsset ?? null);
        setTalentAsset(tabDraft.talentAsset ?? null);
        if (tabDraft.selectedOptions) setSelectedOptions(tabDraft.selectedOptions);
        if (tabDraft.businessDescription) {
          setBusinessDescription(tabDraft.businessDescription);
          setBusinessDescriptionTouched(tabDraft.businessDescriptionTouched ?? true);
        }
        setShowOptionalSettings(Boolean(tabDraft.showOptionalSettings || tabDraft.referenceUrl));
      }
    }
    setContextReady(true);
  }, [agentName, contextReady, currentAgentId, routeTabId]);

  const autoBusinessDescription = useMemo(
    () => buildBusinessDescription(title, businessBlueprint, selectedOptions),
    [businessBlueprint, selectedOptions, title],
  );

  useEffect(() => {
    if (!businessDescriptionTouched) {
      setBusinessDescription(autoBusinessDescription);
    }
  }, [autoBusinessDescription, businessDescriptionTouched]);

  const selectionReady = businessBlueprint.groups.every((group) => Boolean(selectedOptions[group.id]));
  const hasCoreInput = Boolean(productAsset && selectionReady && businessDescription.trim());
  const taskStatus = activeTask?.status;
  const taskIsTerminal = taskStatus ? isTerminalTaskStatus(taskStatus) : false;
  const formLocked = Boolean(activeTask && !taskIsTerminal);
  const stage: 'default' | 'prepared' | 'live' = activeTask ? 'live' : hasCoreInput ? 'prepared' : 'default';
  const primaryActionLabel = resolvePrimaryActionLabel({
    isSubmitting,
    activeTask,
    hasCoreInput,
  });
  const materialStatus = productAsset
    ? talentAsset
      ? '已上传产品图与人物图'
      : '已上传产品图，可直接开始'
    : '待上传至少一张产品图';
  const conciseSpec = `${executionPreset.platform} · ${executionPreset.formatLabel}`;
  const stageHeadline =
    stage === 'prepared' ? `系统将按这次内容生成${businessBlueprint.draftLabel}` : businessBlueprint.defaultShowcaseTitle;
  const stageDescription =
    stage === 'prepared'
      ? businessDescription.trim()
      : businessBlueprint.defaultShowcaseCopy;
  const selectedProject = getProject(selectedProjectId);

  useEffect(() => {
    if (!contextReady || !selectedProject || formLocked) return;
    if (!hasUserEdited) return;
    const hasDraft =
      referenceUrl.trim() ||
      productAsset ||
      talentAsset ||
      businessDescription.trim() ||
      Object.values(selectedOptions).some(Boolean);
    if (!hasDraft) return;
    markWorkbenchTabDraft({
      agentId: currentAgentId,
      agentName,
      projectId: selectedProject.id,
      tabId: routeTabId || undefined,
      projectName: selectedProject.name,
      draftInput: {
        referenceUrl,
        productAsset,
        talentAsset,
        selectedOptions,
        businessDescription,
        businessDescriptionTouched,
        showOptionalSettings,
      },
    });
  }, [
    agentName,
    businessDescription,
    businessDescriptionTouched,
    contextReady,
    currentAgentId,
    formLocked,
    hasUserEdited,
    productAsset,
    referenceUrl,
    selectedOptions,
    selectedProject,
    showOptionalSettings,
    talentAsset,
  ]);

  useEffect(() => {
    if (!activeTask?.id || !activeTask.status || isTerminalTaskStatus(activeTask.status)) return;
    let cancelled = false;
    const taskId = activeTask.id;

    const load = async () => {
      try {
        const next = await getRemoteTask(taskId);
        if (!cancelled) {
          setActiveTask(next);
          if (selectedProject) {
            attachWorkbenchTabTask({
              agentId: currentAgentId,
              agentName,
              projectId: selectedProject.id,
              tabId: routeTabId || undefined,
              projectName: selectedProject.name,
              taskId: next.id,
              status: next.status,
            });
          }
          setTaskError('');
        }
      } catch (fetchError) {
        if (!cancelled) {
          setTaskError(fetchError instanceof Error ? fetchError.message : '读取任务状态失败');
        }
      }
    };

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeTask?.id, activeTask?.status, agentName, currentAgentId, routeTabId, selectedProject]);

  const handleUpload = async (file: File | undefined, kind: UploadKind) => {
    if (!file) return;
    if (formLocked) return;
    setError('');
    const validationError = validateUploadFile(file);
    if (validationError) {
      setUploadErrors((current) => ({
        ...current,
        [kind]: validationError,
      }));
      return;
    }
    setUploadErrors((current) => ({
      ...current,
      [kind]: undefined,
    }));
    setUploadingKind(kind);
    try {
      const uploaded = await uploadTaskFile(file);
      setHasUserEdited(true);
      if (kind === 'product') {
        setProductAsset({ url: uploaded.url, fileName: uploaded.fileName });
      } else {
        setTalentAsset({ url: uploaded.url, fileName: uploaded.fileName });
      }
    } catch (uploadError) {
      setUploadErrors((current) => ({
        ...current,
        [kind]: uploadError instanceof Error ? uploadError.message : '上传失败，请重试',
      }));
    } finally {
      setUploadingKind((current) => (current === kind ? null : current));
    }
  };

  const handleRemoveAsset = (kind: UploadKind) => {
    if (formLocked) return;
    setHasUserEdited(true);
    setUploadErrors((current) => ({
      ...current,
      [kind]: undefined,
    }));
    if (kind === 'product') {
      setProductAsset(null);
      if (productInputRef.current) productInputRef.current.value = '';
      return;
    }
    setTalentAsset(null);
    if (talentInputRef.current) talentInputRef.current.value = '';
  };

  const handleSelectOption = (groupId: string, value: string) => {
    if (formLocked) return;
    setHasUserEdited(true);
    setSelectedOptions((current) => ({
      ...current,
      [groupId]: value,
    }));
  };

  const handleCreateTask = async () => {
    if (!productAsset) {
      setError('请先上传产品图或素材图。');
      return;
    }

    if (!selectionReady) {
      setError('请先把本次业务选项补齐。');
      return;
    }

    if (!businessDescription.trim()) {
      setError('请先确认系统整理的业务描述。');
      return;
    }
    if (!selectedProject) {
      setError('使用智能体前请先从智能体市场选择或新建项目。');
      return;
    }

    const runningTask = getGlobalActiveTask();
    const activeTab = getActiveWorkbenchTaskTab(routeTabId || undefined);
    if (runningTask || activeTab) {
      const ok = window.confirm('当前已有任务正在执行。继续提交后，本任务会进入排队，等前一个任务结束后自动开始。');
      if (!ok) return;
    }

    setIsSubmitting(true);
    setError('');

    const payload: UgcTaskInput = {
      skillId: currentAgentId,
      productImageUrl: productAsset.url,
      productImageName: productAsset.fileName,
      talentImageUrl: talentAsset?.url,
      talentImageName: talentAsset?.fileName,
      sellingPoint: businessDescription.trim(),
      platform: executionPreset.platform,
      effectGoal: executionPreset.effectGoal,
      referenceUrl: referenceUrl.trim() || undefined,
    };

    try {
      const taskContext = {
        taskScope: 'project' as const,
        projectId: selectedProject.id,
        projectName: selectedProject.name,
      };
      const task = await createRemoteUgcTask(payload, taskContext);
      attachWorkbenchTabTask({
        agentId: currentAgentId,
        agentName,
        projectId: selectedProject.id,
        tabId: routeTabId || undefined,
        projectName: selectedProject.name,
        taskId: task.id,
        status: task.status,
      });
      setActiveTask({
        ...task,
        ...taskContext,
        events: [],
      });
      setTaskError('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '创建任务失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!contextReady || !selectedProject || businessDescriptionTouched) return;
    const projectLines = [
      selectedProject.brandName ? `品牌：${selectedProject.brandName}` : '',
      selectedProject.productIntro ? `产品/服务：${selectedProject.productIntro}` : '',
      selectedProject.sellingPoints ? `卖点：${selectedProject.sellingPoints}` : '',
      selectedProject.targetAudience ? `目标人群：${selectedProject.targetAudience}` : '',
    ].filter(Boolean);
    if (projectLines.length > 0) {
      setBusinessDescription(`${autoBusinessDescription}\n${projectLines.join('\n')}`);
    }
    if (selectedProject.websiteUrl && !referenceUrl.trim()) {
      setReferenceUrl(selectedProject.websiteUrl);
    }
  }, [autoBusinessDescription, businessDescriptionTouched, contextReady, referenceUrl, selectedProject]);

  const handlePrimaryAction = async () => {
    if (isSubmitting) return;

    if (!activeTask) {
      await handleCreateTask();
      return;
    }

    setTaskError('');
    try {
      if (activeTask.status === 'waiting_confirmation') {
        const next = await confirmRemoteTask(activeTask.id);
        if (selectedProject) {
          attachWorkbenchTabTask({
            agentId: currentAgentId,
            agentName,
            projectId: selectedProject.id,
            tabId: routeTabId || undefined,
            projectName: selectedProject.name,
            taskId: next.id,
            status: next.status,
          });
        }
        setActiveTask({ ...next, events: activeTask.events });
        return;
      }

      if (
        activeTask.recoveryState?.runState === 'interrupted' &&
        (activeTask.recoveryState.resumeMode === 'continue' ||
          activeTask.recoveryState.resumeMode === 'retry_step')
      ) {
        const next = await retryRemoteTask(activeTask.id);
        if (selectedProject) {
          attachWorkbenchTabTask({
            agentId: currentAgentId,
            agentName,
            projectId: selectedProject.id,
            tabId: routeTabId || undefined,
            projectName: selectedProject.name,
            taskId: next.id,
            status: next.status,
          });
        }
        setActiveTask({ ...next, events: activeTask.events });
      }
    } catch (actionError) {
      setTaskError(actionError instanceof Error ? actionError.message : '任务操作失败');
    }
  };

  const handleCancelLiveTask = async () => {
    if (!activeTask) return;
    try {
      const next = await cancelRemoteTask(activeTask.id);
      if (selectedProject) {
        attachWorkbenchTabTask({
          agentId: currentAgentId,
          agentName,
          projectId: selectedProject.id,
          tabId: routeTabId || undefined,
          projectName: selectedProject.name,
          taskId: next.id,
          status: next.status,
        });
      }
      setActiveTask({ ...next, events: activeTask.events });
      setTaskError('');
    } catch (cancelError) {
      setTaskError(cancelError instanceof Error ? cancelError.message : '取消任务失败');
    }
  };

  const handleResetWorkbench = () => {
    setActiveTask(null);
    setTaskError('');
    setError('');
  };

  return (
    <div className="min-h-full bg-[#F5F5F7] px-4 pt-4 pb-6 sm:px-6 lg:px-8 lg:pt-5 lg:pb-8 xl:px-10">
      <div className="w-full space-y-5">
        <header className="rounded-[28px] border border-black/[0.05] bg-white px-5 py-5 shadow-sm sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-[11px] text-black/35">
                <span>{agentName}</span>
              </div>
              <div>
                <h1 className="text-[28px] leading-none font-semibold tracking-tight text-[#1A1A1A]">
                  {title}
                </h1>
                <p className="mt-3 text-sm leading-6 text-black/48">{promiseLine}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {orientationTags.map((tag) => (
                <StatusPill key={tag} label={tag} />
              ))}
            </div>
          </div>
        </header>

        <input
          ref={productInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            void handleUpload(event.target.files?.[0], 'product');
            event.target.value = '';
          }}
        />
        <input
          ref={talentInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            void handleUpload(event.target.files?.[0], 'talent');
            event.target.value = '';
          }}
        />

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <WorkbenchPanel title="配置与结算">
              <div className="space-y-5">
                <ReadonlyDirectionCard
                  title="当前智能体方向"
                  items={businessBlueprint.directionSummary}
                />

                <div className="rounded-2xl border border-black/[0.06] bg-[#F7F8FA] px-4 py-3">
                  <p className="text-sm font-semibold text-black/75">
                    {selectedProject ? `当前项目：${selectedProject.name}` : '未选择项目'}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-black/42">
                    {selectedProject
                      ? '已根据项目资料推荐业务描述，可继续修改后发起任务。'
                      : '请返回智能体市场点击“使用智能体”，先选择或新建项目。'}
                  </p>
                </div>

                <div className="space-y-4">
                  <SectionTitle
                    title="业务需求选择"
                    helper="先把这次业务场景选清楚，系统会自动整理成任务描述。"
                  />
                  {businessBlueprint.groups.map((group) => (
                    <OptionGroup
                      key={group.id}
                      title={group.title}
                      options={group.options}
                      selectedValue={selectedOptions[group.id]}
                      disabled={formLocked}
                      onSelect={(value) => handleSelectOption(group.id, value)}
                    />
                  ))}
                </div>

                <div className="space-y-3">
                  <SectionTitle
                    title="素材上传"
                    helper="至少上传一张产品图 / 素材图，人物图可选。"
                  />
                  <UploadCard
                    title="产品图 / 素材图"
                    subtitle={
                      productAsset?.fileName ??
                      skillExperience?.inputConfig.productImageHint ??
                      '上传包装图 / 单品图 / 门店图'
                    }
                    helper={productAsset ? '已上传，可继续替换' : '上传后会作为这次任务的基础素材'}
                    uploaded={Boolean(productAsset)}
                    previewUrl={productAsset?.url}
                    uploading={uploadingKind === 'product'}
                    error={uploadErrors.product}
                    disabled={formLocked}
                    onClick={() => productInputRef.current?.click()}
                    onRemove={() => handleRemoveAsset('product')}
                  />
                  <UploadCard
                    title="人物图 / 模特图"
                    subtitle={
                      talentAsset?.fileName ??
                      skillExperience?.inputConfig.talentImageHint ??
                      '上传自拍或模特参考'
                    }
                    helper={talentAsset ? '已上传，可继续替换' : '选填，没有也可以先开始'}
                    uploaded={Boolean(talentAsset)}
                    previewUrl={talentAsset?.url}
                    uploading={uploadingKind === 'talent'}
                    error={uploadErrors.talent}
                    disabled={formLocked}
                    onClick={() => talentInputRef.current?.click()}
                    onRemove={() => handleRemoveAsset('talent')}
                  />
                  <p className="px-1 text-xs leading-5 text-black/36">
                    支持 {ALLOWED_UPLOAD_LABEL}，单张图片不超过 10MB。
                  </p>
                </div>

                {selectionReady ? (
                  <TextAreaField
                    label="系统整理的业务描述"
                    value={businessDescription}
                    onChange={(value) => {
                      if (formLocked) return;
                      setHasUserEdited(true);
                      setBusinessDescriptionTouched(true);
                      setBusinessDescription(value);
                    }}
                    placeholder="系统会根据上面的选择自动整理，也可以在这里微调。"
                    rows={4}
                    disabled={formLocked}
                  />
                ) : (
                  <DescriptionPreviewCard
                    title="系统整理的业务描述"
                    value="先完成上面的业务选择，系统会自动把这次需求整理成可执行的业务描述。"
                  />
                )}

                <ExpandableCard
                  title={referenceUrl.trim() ? '高级选项（已填写）' : '高级选项（选填）'}
                  open={showOptionalSettings}
                  onToggle={() => {
                    if (formLocked) return;
                    setShowOptionalSettings((value) => !value);
                  }}
                  disabled={formLocked}
                >
                  <div className="space-y-4">
                    <InputField
                      label="参考链接 / 历史材料"
                      value={referenceUrl}
                      onChange={(value) => {
                        if (formLocked) return;
                        setHasUserEdited(true);
                        setReferenceUrl(value);
                      }}
                      icon={Link2}
                      placeholder={skillExperience?.inputConfig.referenceUrlHint}
                      disabled={formLocked}
                    />
                    <PresetNotice text={`固定规格：${executionPreset.formatLabel} · ${executionPreset.effectGoal} · ${executionPreset.platform}`} />
                  </div>
                </ExpandableCard>

                {error || taskError ? (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error || taskError}
                  </p>
                ) : null}

                <div className="sticky bottom-0 rounded-[20px] border border-[#F2C078] bg-white/96 p-3 backdrop-blur">
                  <div className="mb-3 rounded-2xl border border-[#F6D7A4] bg-[#FFF4DF] px-4 py-3">
                    <p className="text-[11px] font-semibold tracking-[0.08em] text-[#B45309]">预估消耗</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-base font-semibold text-[#1A1A1A]">{costEstimateLabel}</p>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#B45309]">
                        {hasCoreInput ? '已可开始' : '待补齐'}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#9A5B12]">样片确认后才进入正式生成。</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void handlePrimaryAction();
                    }}
                    disabled={isPrimaryActionDisabled({ isSubmitting, activeTask, hasCoreInput })}
                    className="h-12 w-full rounded-xl bg-black text-sm font-semibold text-white transition-colors hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {primaryActionLabel}
                  </button>
                  {taskIsTerminal ? (
                    <button
                      type="button"
                      onClick={handleResetWorkbench}
                      className="mt-2 h-10 w-full rounded-xl border border-black/10 bg-white text-sm font-medium text-black/62 transition-colors hover:bg-[#F7F7F8]"
                    >
                      开始新一轮配置
                    </button>
                  ) : null}
                </div>
              </div>
            </WorkbenchPanel>
          </aside>

          <section className="space-y-4">
            <WorkbenchPanel title="工作台">
              <div className="space-y-6">
                <PreparationTimeline
                  steps={businessBlueprint.stageHints}
                  activeIndex={resolveWorkbenchStepIndex(stage, activeTask)}
                />

                {activeTask ? (
                  <LiveTaskWorkbench
                    task={activeTask}
                    onPrimaryAction={() => {
                      void handlePrimaryAction();
                    }}
                    onCancel={() => {
                      void handleCancelLiveTask();
                    }}
                    onOpenTaskCenter={() => navigate(`/app/tasks/${activeTask.id}`)}
                  />
                ) : stage === 'prepared' ? (
                  <div className="space-y-5">
                    <ShowcaseStageCard
                      title={stageHeadline}
                      subtitle="左侧配置已经整理完成，确认后这里会进入真实样片生成与结果展示。"
                      eyebrow="开始前确认"
                      headline={summarizeHeadline(businessDescription)}
                      detail={stageDescription}
                      badge="待开始"
                      tags={orientationTags}
                    />

                    <InternalParameterCard
                      title="即将开始的任务摘要"
                      status="已整理完成"
                      fields={[
                        { label: '业务目标', value: businessDescription || businessBlueprint.objective },
                        { label: '当前场景', value: `${selectedOptions[businessBlueprint.groups[0]?.id] ?? businessBlueprint.groups[0]?.options[0]} · ${selectedOptions[businessBlueprint.groups[1]?.id] ?? businessBlueprint.groups[1]?.options[0]}` },
                        { label: '输出规格', value: `${conciseSpec} · ${businessBlueprint.draftLabel}` },
                        { label: '素材状态', value: materialStatus },
                        { label: '样片策略', value: resolveTaskStrategy(skillExperience) },
                      ]}
                    />
                  </div>
                ) : (
                  <div className="space-y-5">
                    <WorkbenchEmptyState
                      title="请先在左侧完成业务配置"
                      description="样片大纲、系统整理结果和后续视频草稿，会在这个区域统一展示。"
                    />
                    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
                      <div className="space-y-4">
                        {showcaseVideo ? (
                          <div className="overflow-hidden rounded-[24px] border border-black/[0.06] bg-white">
                            <video
                              src={showcaseVideo.videoUrl}
                              poster={showcaseVideo.coverUrl}
                              controls
                              playsInline
                              className="aspect-[9/16] w-full bg-black object-cover"
                            />
                            <div className="space-y-2 px-4 py-4">
                              <p className="text-sm font-semibold text-[#1A1A1A]">{showcaseVideo.title}</p>
                              <p className="text-sm leading-6 text-black/55">{showcaseVideo.summary}</p>
                            </div>
                          </div>
                        ) : (
                          <ShowcaseStageCard
                            title={stageHeadline}
                            subtitle="先看一个默认案例，帮助你理解这个智能体更适合做什么类型的视频。"
                            eyebrow="默认案例"
                            headline={businessBlueprint.defaultShowcaseTitle}
                            detail={stageDescription}
                            badge="示例预演"
                            tags={orientationTags}
                          />
                        )}
                      </div>

                      <div className="space-y-4">
                        <ExampleGallery title="案例参考" items={businessBlueprint.examples} />
                        <div className="rounded-2xl border border-black/[0.05] bg-[#FCFCFD] p-4">
                          <p className="text-sm font-medium text-[#1A1A1A]">补充说明</p>
                          <div className="mt-3 space-y-3">
                            <StrategyRow label="适合场景" value={promiseLine} />
                            <StrategyRow label="本次产出" value="视频样片、封面首帧、交付说明" />
                            <StrategyRow label="预算策略" value="先生成样片草案，确认后才进入正式生成。" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </WorkbenchPanel>
          </section>
        </div>
      </div>
    </div>
  );
}

function resolveUgcAgentId(pathname: string): string {
  if (pathname.endsWith('/media-seeding')) return 'media-seeding';
  if (pathname.endsWith('/media-review')) return 'media-review';
  if (pathname.endsWith('/media-conversion')) return 'media-conversion';
  if (pathname.endsWith('/media-showcase')) return 'media-showcase';
  if (pathname.endsWith('/media-demo')) return 'media-demo';
  if (pathname.endsWith('/media-proposal')) return 'media-proposal';
  return 'media-seeding';
}

function resolveExecutionPreset(agentId: string): ExecutionPreset {
  const profile = getVideoAgentProfile(agentId);
  if (profile) {
    return {
      platform: profile.platform,
      effectGoal: profile.effectGoal,
      formatLabel: profile.formatLabel,
    };
  }

  return {
    platform: '抖音',
    effectGoal: '更像真人种草',
    formatLabel: '10 秒 / 9:16',
  };
}

function resolveBusinessBlueprint(agentId: string, preset: ExecutionPreset): BusinessBlueprint {
  return (
    BUSINESS_BLUEPRINTS[agentId] ?? {
      directionSummary: [preset.effectGoal, preset.platform, `${preset.formatLabel} 样片`],
      groups: [
        { id: 'businessType', title: '业务类型', options: ['品牌宣传', '新品推广', '活动传播', '客户提案'] },
        { id: 'campaignFocus', title: '本次主打内容', options: ['产品亮点', '空间氛围', '活动信息', '品牌气质'] },
        { id: 'messageFocus', title: '更想让用户记住什么', options: ['真实感', '专业感', '吸引力', '行动理由'] },
      ],
      objective: '让用户更快理解本次视频的核心价值',
      scenarioLabel: '视频传播场景',
      draftLabel: '视频样片草案',
      defaultShowcaseTitle: '把这次业务需求做成更容易传播的视频表达',
      defaultShowcaseCopy: '更适合门店宣传、内容传播和轻量视频交付。',
      examples: ['品牌宣传', '内容传播', '轻量交付'],
      stageHints: ['先选业务方向', '系统整理任务参数', '确认后生成样片'],
    }
  );
}

function buildBusinessDescription(
  title: string,
  blueprint: BusinessBlueprint,
  selectedOptions: Record<string, string>,
): string {
  const [firstGroup, secondGroup, thirdGroup] = blueprint.groups;
  const businessType = selectedOptions[firstGroup?.id] ?? firstGroup?.options[0] ?? '品牌';
  const focus = selectedOptions[secondGroup?.id] ?? secondGroup?.options[0] ?? '主推内容';
  const emphasis = selectedOptions[thirdGroup?.id] ?? thirdGroup?.options[0] ?? '核心卖点';
  return `为${businessType}做一条${title}，这次主打${focus}，重点突出${emphasis}，让结果更贴近${blueprint.scenarioLabel}。`;
}

function validateUploadFile(file: File): string | null {
  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
    return `仅支持 ${ALLOWED_UPLOAD_LABEL}`;
  }

  if (file.size > MAX_UPLOAD_FILE_SIZE) {
    return '图片不能超过 10MB';
  }

  return null;
}

function summarizeHeadline(text: string): string {
  const compact = text.trim();
  if (!compact) return '系统已整理好本次任务方向';
  return compact.length > 28 ? `${compact.slice(0, 28)}…` : compact;
}

function resolveTaskStrategy(skillExperience: SkillExperienceConfig | null): string {
  if (skillExperience?.executionConfig.requireConfirmation) {
    return '会先生成一版样片草案，确认后再进入正式生成。';
  }

  return '会直接进入样片生成，如中断会保留当前进度。';
}

function WorkbenchPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-black/[0.05] bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-xl font-semibold text-[#1A1A1A]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SectionTitle({ title, helper }: { title: string; helper?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-[#1A1A1A]">{title}</p>
      {helper ? <p className="text-xs leading-5 text-black/42">{helper}</p> : null}
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  return <span className="rounded-full bg-[#F2F0ED] px-3 py-1.5 text-xs text-black/50">{label}</span>;
}

function ReadonlyDirectionCard({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-[#E6ECEA] bg-[#F9FBFA] p-4">
      <p className="text-sm font-medium text-[#1A1A1A]">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black/60">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function OptionGroup({
  title,
  options,
  selectedValue,
  disabled,
  onSelect,
}: {
  title: string;
  options: string[];
  selectedValue?: string;
  disabled?: boolean;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-black/62">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const active = option === selectedValue;
          return (
            <button
              key={option}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(option)}
              className={`rounded-2xl border px-3 py-3 text-left text-sm transition-colors ${
                active
                  ? 'border-[#B9D8D2] bg-[#F1F8F6] text-[#12433E]'
                  : 'border-black/[0.07] bg-[#FCFCFD] text-black/60 hover:border-black/14'
              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function UploadCard({
  title,
  subtitle,
  helper,
  uploaded,
  previewUrl,
  uploading,
  error,
  disabled,
  onClick,
  onRemove,
}: {
  title: string;
  subtitle: string;
  helper: string;
  uploaded: boolean;
  previewUrl?: string;
  uploading?: boolean;
  error?: string;
  disabled?: boolean;
  onClick: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={uploading || disabled ? -1 : 0}
      onClick={() => {
        if (disabled) return;
        onClick();
      }}
      onKeyDown={(event) => {
        if (uploading || disabled) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className={`min-h-[152px] rounded-2xl border p-4 text-left transition-colors ${
        error
          ? 'border-red-200 bg-red-50/60 hover:border-red-300'
          : 
        uploaded
          ? 'border-[#D5E7E3] bg-[#F7FBFA] hover:border-[#B9D8D2]'
          : 'border-dashed border-black/12 bg-gradient-to-br from-[#FDF7F2] to-[#FFFDF9] hover:border-black/20'
      } ${uploading ? 'cursor-wait opacity-80' : disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white text-black/65 shadow-sm">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : previewUrl ? (
            <img src={previewUrl} alt={title} className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-5 w-5" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {uploaded && !uploading ? (
            <button
              type="button"
              disabled={disabled}
              onClick={(event) => {
                event.stopPropagation();
                onRemove();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black/42 transition-colors hover:text-red-500"
              aria-label={`删除${title}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
              error
                ? 'bg-white text-red-500'
                : uploaded
                  ? 'bg-[#EAF6F4] text-[#0F766E]'
                  : 'bg-white text-black/48'
            }`}
          >
            {uploading ? '上传中…' : uploaded ? '替换素材' : '立即上传'}
          </span>
        </div>
      </div>
      <p className="mt-4 text-base font-semibold text-[#1A1A1A]">{title}</p>
      <p className="mt-1 break-all text-sm text-black/55">{subtitle}</p>
      <p className={`mt-4 text-xs leading-5 ${error ? 'text-red-500' : 'text-black/38'}`}>
        {error ?? helper}
      </p>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows: number;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-black/62">{label}</p>
      <div className="rounded-2xl border border-[#DDE3E2] bg-[#F9FBFA] p-3">
        <textarea
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full resize-none bg-transparent px-1 py-1 text-sm leading-7 text-black/78 outline-none disabled:cursor-not-allowed disabled:opacity-55"
        />
      </div>
    </div>
  );
}

function DescriptionPreviewCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-black/62">{title}</p>
      <div className="rounded-2xl border border-dashed border-black/10 bg-[#FCFCFD] px-4 py-4">
        <p className="text-sm leading-7 text-black/38">{value}</p>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  icon: Icon,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: typeof Link2;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-black/62">{label}</p>
      <div className="flex min-h-11 items-start gap-3 rounded-xl border border-black/10 bg-[#FCFCFD] px-4 py-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-black/30" />
        <input
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-black/60 outline-none disabled:cursor-not-allowed disabled:opacity-55"
        />
      </div>
    </div>
  );
}

function PresetNotice({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-[#E8ECEA] bg-[#F8FBFA] px-4 py-4">
      <p className="text-sm leading-6 text-black/58">{text}</p>
    </div>
  );
}

function ExpandableCard({
  title,
  open,
  onToggle,
  disabled,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.05] bg-[#FCFCFD]">
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-55"
      >
        <span className="text-sm font-medium text-[#1A1A1A]">{title}</span>
        <ChevronDown
          className={`h-4 w-4 text-black/35 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? <div className="border-t border-black/[0.05] p-4">{children}</div> : null}
    </div>
  );
}

function ShowcaseStageCard({
  title,
  subtitle,
  eyebrow,
  headline,
  detail,
  badge,
  tags,
}: {
  title: string;
  subtitle: string;
  eyebrow: string;
  headline: string;
  detail: string;
  badge: string;
  tags: string[];
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-[#1A1A1A]">{title}</p>
          <p className="mt-2 text-sm leading-6 text-black/48">{subtitle}</p>
        </div>
        <span className="rounded-full border border-black/8 bg-[#FCFCFD] px-3 py-1 text-[11px] font-medium text-black/50">
          {badge}
        </span>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-black/8 bg-white p-5 shadow-sm sm:p-6">
        <div className="rounded-[24px] bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.34),transparent_36%),linear-gradient(180deg,#3F241A_0%,#755341_48%,#C3B7AE_100%)] p-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.14)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-white/74">{eyebrow}</p>
              <p className="mt-2 max-w-[28rem] text-2xl font-semibold leading-9">{headline}</p>
            </div>
            <div className="rounded-full border border-white/16 bg-white/10 px-3 py-1 text-[11px] text-white/82 backdrop-blur">
              结果舞台
            </div>
          </div>

          <div className="mt-14 flex items-end justify-between gap-4">
            <div className="space-y-3">
              <p className="max-w-[28rem] text-sm leading-6 text-white/78">{detail}</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/16 bg-white/10 px-3 py-1 text-[11px] text-white/82 backdrop-blur"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="hidden h-12 w-12 rounded-full border border-white/18 bg-white/12 sm:block" />
          </div>
        </div>
      </div>
    </section>
  );
}

function PreparationTimeline({
  steps,
  activeIndex,
}: {
  steps: [string, string, string];
  activeIndex: number;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {steps.map((step, index) => {
        const state =
          index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'pending';
        return (
          <div
            key={step}
            className={`rounded-2xl border px-4 py-3 ${
              state === 'active'
                ? 'border-[#B9D8D2] bg-[#F1F8F6]'
                : state === 'done'
                  ? 'border-black/[0.06] bg-white'
                  : 'border-black/[0.05] bg-[#FCFCFD]'
            }`}
          >
            <p className="text-[11px] uppercase tracking-[0.08em] text-black/35">阶段 {index + 1}</p>
            <p className="mt-2 text-sm font-medium text-[#1A1A1A]">{step}</p>
          </div>
        );
      })}
    </div>
  );
}

function InternalParameterCard({
  title,
  status,
  fields,
}: {
  title: string;
  status: string;
  fields: Array<{ label: string; value: string }>;
}) {
  return (
    <section className="rounded-[24px] border border-black/[0.06] bg-[#FCFCFD] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-[#1A1A1A]">{title}</p>
          <p className="mt-1 text-sm text-black/45">这里只保留开始前真正需要确认的关键信息。</p>
        </div>
        <span className="rounded-full bg-[#F1F6F4] px-3 py-1 text-xs font-semibold text-[#0F766E]">
          {status}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label} className="rounded-2xl border border-black/[0.05] bg-white px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.08em] text-black/35">{field.label}</p>
            <p className="mt-2 text-sm leading-6 text-[#1A1A1A]">{field.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[#E8ECEA] bg-white px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F5F8F7] text-[#0F766E]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#1A1A1A]">如果这版业务表达还不够准，可以继续调整左侧输入。</p>
            <p className="mt-1 text-xs leading-5 text-black/42">全页只有左侧一个开始按钮，确认后才真正进入样片生成。</p>
          </div>
        </div>
        <span className="rounded-full bg-[#F5F8F7] px-3 py-1 text-xs font-semibold text-[#0F766E]">返回左侧发起</span>
      </div>
    </section>
  );
}

function WorkbenchEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-black/10 bg-[linear-gradient(180deg,#FCFCFD_0%,#F7F7F9_100%)] px-6 py-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#0F766E] shadow-sm">
        <Sparkles className="h-5 w-5" />
      </div>
      <p className="mt-4 text-lg font-semibold text-[#1A1A1A]">{title}</p>
      <p className="mx-auto mt-2 max-w-[36rem] text-sm leading-6 text-black/48">{description}</p>
    </div>
  );
}

function LiveTaskWorkbench({
  task,
  onPrimaryAction,
  onCancel,
  onOpenTaskCenter,
}: {
  task: LiveRemoteTask;
  onPrimaryAction: () => void;
  onCancel: () => void;
  onOpenTaskCenter: () => void;
}) {
  const taskEvents = task.events.slice(0, 6);
  const isWaitingConfirmation = task.status === 'waiting_confirmation';
  const canResume =
    task.recoveryState?.runState === 'interrupted' &&
    (task.recoveryState.resumeMode === 'continue' || task.recoveryState.resumeMode === 'retry_step');

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-[24px] border border-black/[0.06] bg-[#FCFCFD] p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-black/35">当前任务</p>
              <p className="mt-2 text-lg font-semibold text-[#1A1A1A]">{task.name}</p>
              <p className="mt-1 text-sm text-black/45">这个区域会持续承接执行过程、样片结果和交付物。</p>
            </div>
            <div className="flex items-center gap-2">
              <TaskStatusBadge status={task.status} />
              <span className="rounded-full bg-[#F2F0ED] px-3 py-1 text-[11px] text-black/45">{task.id}</span>
            </div>
          </div>
          <UgcDeliveryPanel task={task} onPrimaryAction={onPrimaryAction} />
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-black/[0.06] bg-[#FCFCFD] p-4">
            <p className="text-sm font-semibold text-[#1A1A1A]">执行状态</p>
            <div className="mt-4 space-y-3">
              <LiveMetaRow icon={Clock3} label="当前状态" value={describeTaskStatus(task.status)} />
              <LiveMetaRow icon={ListTodo} label="产物数量" value={`${task.artifacts?.length ?? 0} 个`} />
              <LiveMetaRow
                icon={RefreshCw}
                label="恢复策略"
                value={task.recoveryState?.pauseReasonMessage ?? '任务推进中，系统会持续刷新'}
              />
            </div>
            <button
              type="button"
              onClick={onOpenTaskCenter}
              className="mt-4 h-10 w-full rounded-xl border border-black/10 bg-white text-sm font-medium text-black/62 transition-colors hover:bg-[#F7F7F8]"
            >
              前往任务详情页
            </button>
          </div>

          {isWaitingConfirmation ? (
            <ConfirmationNode
              title={task.pendingConfirmation?.title ?? '样片已生成，等待确认'}
              message={task.pendingConfirmation?.message ?? '确认后继续进入正式生成。'}
              onConfirm={onPrimaryAction}
              onCancel={onCancel}
            />
          ) : null}

          {canResume ? (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">执行已中断</p>
              <p className="mt-2 text-sm leading-6 text-amber-800">
                {task.recoveryState?.pauseReasonMessage ?? '可以从保留的进度继续。'}
              </p>
            </div>
          ) : null}

          <HermesLogPanel logs={task.logs} />

          <EventFeed events={taskEvents} />
        </div>
      </div>
    </div>
  );
}

function LiveMetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.05] bg-white px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-2xl bg-[#F5F8F7] text-[#0F766E]">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-black/35">{label}</p>
          <p className="mt-1 text-sm leading-6 text-[#1A1A1A]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function EventFeed({ events }: { events: UgcTaskEvent[] }) {
  return (
    <div className="rounded-[24px] border border-black/[0.06] bg-[#FCFCFD] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#1A1A1A]">状态记录</p>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] text-black/42">{events.length} 条</span>
      </div>
      <div className="mt-4 space-y-3">
        {events.length > 0 ? (
          events.map((event) => (
            <div key={event.id} className="rounded-2xl border border-black/[0.05] bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[#1A1A1A]">{event.message}</p>
                <span className="text-[11px] text-black/35">{formatEventTime(event.createdAt)}</span>
              </div>
              <p className="mt-1 text-xs text-black/42">{event.type}</p>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-black/8 bg-white px-4 py-5 text-sm text-black/42">
            任务启动后，这里会补充关键状态记录。
          </p>
        )}
      </div>
    </div>
  );
}

function ExampleGallery({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-black/[0.05] bg-[#FCFCFD] p-4">
      <p className="text-sm font-medium text-[#1A1A1A]">{title}</p>
      <div className="mt-3 space-y-3">
        {items.map((item, index) => (
          <div key={item} className="rounded-2xl border border-black/[0.05] bg-white p-3">
            <div
              className={`h-[88px] rounded-2xl ${
                index % 3 === 0
                  ? 'bg-[linear-gradient(180deg,#4E3428_0%,#A88A7C_100%)]'
                  : index % 3 === 1
                    ? 'bg-[linear-gradient(180deg,#3A4A57_0%,#9AB1C2_100%)]'
                    : 'bg-[linear-gradient(180deg,#5D4130_0%,#D3BDA8_100%)]'
              }`}
            />
            <p className="mt-3 text-sm font-medium text-[#1A1A1A]">{item}</p>
            <p className="mt-1 text-xs leading-5 text-black/42">同方向案例示意</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StrategyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/[0.05] bg-white px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.08em] text-black/35">{label}</p>
      <p className="mt-1 text-sm leading-6 text-[#1A1A1A]">{value}</p>
    </div>
  );
}

function resolvePrimaryActionLabel({
  isSubmitting,
  activeTask,
  hasCoreInput,
}: {
  isSubmitting: boolean;
  activeTask: LiveRemoteTask | null;
  hasCoreInput: boolean;
}) {
  if (isSubmitting) return '创建任务中…';
  if (!activeTask) return hasCoreInput ? '开始生成样片阶段' : '补齐左侧配置后开始';
  if (activeTask.status === 'waiting_confirmation') return '确认并进入正式生成';
  if (
    activeTask.recoveryState?.runState === 'interrupted' &&
    (activeTask.recoveryState.resumeMode === 'continue' ||
      activeTask.recoveryState.resumeMode === 'retry_step')
  ) {
    return '从当前进度继续';
  }
  if (isTerminalTaskStatus(activeTask.status)) return '本轮任务已结束';
  return '样片生成中…';
}

function isPrimaryActionDisabled({
  isSubmitting,
  activeTask,
  hasCoreInput,
}: {
  isSubmitting: boolean;
  activeTask: LiveRemoteTask | null;
  hasCoreInput: boolean;
}) {
  if (isSubmitting) return true;
  if (!activeTask) return !hasCoreInput;
  if (activeTask.status === 'waiting_confirmation') return false;
  if (
    activeTask.recoveryState?.runState === 'interrupted' &&
    (activeTask.recoveryState.resumeMode === 'continue' ||
      activeTask.recoveryState.resumeMode === 'retry_step')
  ) {
    return false;
  }
  return true;
}

function resolveWorkbenchStepIndex(stage: 'default' | 'prepared' | 'live', task: LiveRemoteTask | null) {
  if (stage === 'default') return 0;
  if (stage === 'prepared') return 1;
  if (!task) return 2;
  if (task.status === 'completed') return 3;
  return 2;
}

function isTerminalTaskStatus(status: TaskStatus) {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

function describeTaskStatus(status: TaskStatus) {
  if (status === 'queued') return '已进入排队，等待执行';
  if (status === 'running') return '系统正在生成样片与交付物';
  if (status === 'waiting_confirmation') return '样片已生成，等待你确认是否继续';
  if (status === 'completed') return '已完成，可直接查看右侧结果';
  if (status === 'failed') return '执行失败，建议查看日志后重试';
  if (status === 'cancelled') return '任务已取消';
  return '处理中';
}

function formatEventTime(value: string) {
  return new Date(value).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
