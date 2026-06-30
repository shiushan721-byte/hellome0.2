import { useState, useEffect } from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import { getChatAgentConfig } from '../../config/testAgentConfig';
import type { ChatMessage as IChatMessage, StepAnswer, WorkflowPhase } from '../../types/agentChatConfig';
import ChatPanel from '../../components/app/chat/ChatPanel';
import CanvasPanel from '../../components/app/canvas/CanvasPanel';
import {
  createRemoteUgcTask,
  createUgcTaskV2,
  getRemoteTask,
  pollRemoteTaskSchema,
  submitUgcTaskAnswers,
} from '../../lib/taskApi';
import type { HermesDynamicSchema, UgcStructuredAnswer, UgcTaskEvent, UgcTaskArtifact } from '../../types/ugc';
import type { Task } from '../../types/workbench';
import { consumePendingAgentContext, getActiveProjectId } from '../../lib/projectStore';
import { mapHermesSchemaToChatConfig } from '../../lib/hermesSchemaAdapter';

export interface TaskRun {
  taskId: string;
  events: UgcTaskEvent[];
  artifacts: UgcTaskArtifact[];
  status: string;
}

function resolveUgcAgentId(pathname: string): string {
  const match = pathname.match(/\/agents\/(media(?:-[a-z]+)?|canvas-demo-[abc])/);
  return match ? match[1] : 'media';
}

export default function AgentChatCanvasPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  
  const routeAgentId = resolveUgcAgentId(location.pathname);
  const agentId = searchParams.get('id') || routeAgentId;
  
  const baseConfig = getChatAgentConfig(agentId);

  // Dynamic config to allow modifying step questions on the fly
  const [dynamicConfig, setDynamicConfig] = useState(baseConfig);

  // State
  const [projectId, setProjectId] = useState<string | null>(null);
  const [phase, setPhase] = useState<WorkflowPhase>('idle');
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, StepAnswer>>({});
  
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // 🆕 v1.1: schema-first 流程的 spinner 文案
  const [schemaPendingHint, setSchemaPendingHint] = useState<string>('正在初始化...');

  // 🆕 v1.1: 标记是否走 schema-first 流程 (true 时后续提交走 /api/tasks/:id/answers)
  const [useSchemaFirstFlow, setUseSchemaFirstFlow] = useState(false);

  // Canvas State (Real Events & Artifacts)
  const [runs, setRuns] = useState<TaskRun[]>([]);

  // Initialize & Consume Project Context
    useEffect(() => {
      // 处理 React Strict Mode 带来的双重触发，以及页面刷新时的状态丢失
      const context = consumePendingAgentContext(agentId);
      const resolvedProjectId = context?.projectId || getActiveProjectId();

      // 🆕 v1.1: projectId 改为可选 — 没选项目也允许进入(只影响展示归属,不影响执行)
      setProjectId(resolvedProjectId || null);

      if (phase !== 'idle') return;

      // 🆕 v1.1: 检测是否走 schema-first 流程
      // 条件: skillId 是 9 个 video skill 之一 (媒体场景)
      const VIDEO_SKILL_IDS = new Set([
        'media-seeding', 'media-review', 'media-conversion', 'media-showcase',
        'media-demo', 'media-proposal', 'media-longform-cut', 'media-animation',
        'media-localization',
      ]);
      const shouldUseSchemaFirst = VIDEO_SKILL_IDS.has(agentId);

      if (shouldUseSchemaFirst) {
        // v1.1 schema-first 流程:立即发请求拿 schema,不要先 welcome
        void startSchemaFirstFlow(agentId);
        return;
      }

      // 老流程:有 dynamicConfig 就直接进入 chatting
      if (dynamicConfig) {
        setMessages([
          {
            id: 'welcome',
            role: 'agent',
            content: dynamicConfig.welcomeMessage,
            timestamp: Date.now(),
          },
        ]);
        setPhase('chatting');
      }
    }, [dynamicConfig, phase, agentId, navigate]);

    /**
     * 🆕 v1.1: schema-first 流程入口
     *
     * 步骤:
     *   1. POST /api/tasks/ugc/v2 创建 awaiting_input 任务
     *   2. 轮询 GET /api/tasks/:id/schema 直到 ready=true
     *   3. mapHermesSchemaToChatConfig 把 schema 转成 AgentChatConfig
     *   4. setDynamicConfig + setMessages welcome + setPhase('chatting')
     *   5. 任何步骤失败:fallback 到老 dynamicConfig (前端兜底,不卡死用户)
     */
    const startSchemaFirstFlow = async (skillId: string) => {
      setPhase('awaitingSchema');
      setSchemaPendingHint('正在向 Hermes 发送请求...');
      setUseSchemaFirstFlow(true);

      try {
        // 1. 创建任务
        const draftTask = await createUgcTaskV2({ skillId });
        setActiveTaskId(draftTask.id);
        setSchemaPendingHint('正在等待 Hermes skill 返回参数 schema...');

        // 2. 轮询 schema
        const schema: HermesDynamicSchema = await pollRemoteTaskSchema(draftTask.id, {
          timeoutMs: 30_000,
          intervalMs: 500,
          onTick: (hint) => setSchemaPendingHint(hint ?? '正在等待 Hermes...'),
        });

        // 3. 映射成前端 config
        const newConfig = mapHermesSchemaToChatConfig(schema, draftTask.id);
        setDynamicConfig(newConfig);

        // 4. 切到 chatting
        setMessages([
          {
            id: 'welcome',
            role: 'agent',
            content: newConfig.welcomeMessage,
            timestamp: Date.now(),
          },
        ]);
        setPhase('chatting');
      } catch (err) {
        console.error('[agentChatCanvas] schema-first flow failed, fallback to static config', err);
        // Fallback: 用前端 videoAgentChatConfigs 里的老 config,不卡死用户
        const fallbackConfig = getChatAgentConfig(skillId);
        if (fallbackConfig) {
          setDynamicConfig(fallbackConfig);
          setMessages([
            {
              id: 'welcome',
              role: 'agent',
              content: fallbackConfig.welcomeMessage + '\n\n(注:Hermes 暂时不可用,使用本地 fallback 配置)',
              timestamp: Date.now(),
            },
          ]);
          setPhase('chatting');
          setUseSchemaFirstFlow(false); // 走老 endpoint
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              role: 'agent',
              content: `Hermes 暂时不可用,且没有本地 fallback 配置:${err instanceof Error ? err.message : String(err)}`,
              timestamp: Date.now(),
            },
          ]);
          setPhase('chatting');
        }
      }
    };

    if (!dynamicConfig) {
      return <Navigate to="/app/agents" replace />;
    }

  const handleAnswer = async (answer: StepAnswer) => {
    const step = dynamicConfig.steps[currentStepIndex];
    
    // Add User Message
    const userMsg: IChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: answer.value || '(跳过)',
      stepId: answer.stepId,
      timestamp: Date.now(),
    };
    
    const newAnswers = { ...answers, [answer.stepId]: answer };
    setAnswers(newAnswers);
    setMessages(prev => [...prev, userMsg]);
    
    if (editingStepId) {
      setEditingStepId(null);
      // After non-destructive edit, check if all steps are done
      const allComplete = dynamicConfig.steps.every(s => newAnswers[s.id]);
      if (allComplete) {
        setPhase('executing');
        await startHermesExecution(newAnswers);
      } else {
        // Find first unanswered step
        const firstUnansweredIndex = dynamicConfig.steps.findIndex(s => !newAnswers[s.id]);
        if (firstUnansweredIndex !== -1) {
          setCurrentStepIndex(firstUnansweredIndex);
          setPhase('chatting');
        }
      }
      return;
    }
    
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < dynamicConfig.steps.length) {
      // Dynamic Wording: If transitioning to step 2, adjust wording based on whether an asset was provided
      if (nextIndex === 2) {
        const hasAsset = newAnswers['referenceUrl']?.value || newAnswers['productAsset']?.value;
        const clonedConfig = JSON.parse(JSON.stringify(dynamicConfig));
        const originalQuestion = clonedConfig.steps[2].question.split('\n\n').pop() || clonedConfig.steps[2].question;
        
        if (hasAsset && newAnswers['referenceUrl']?.value !== '(跳过)' && newAnswers['productAsset']?.value !== '(跳过)') {
          clonedConfig.steps[2].question = `收到对标素材！为了精准提炼风格，请快速确认以下几个方向：\n\n${originalQuestion}`;
        } else {
          clonedConfig.steps[2].question = `既然没有提供对标参考，那我们将为你从头量身定制。首先请确认：\n\n${originalQuestion}`;
        }
        setDynamicConfig(clonedConfig);
      }
      
      // Proceed to next step
      setCurrentStepIndex(nextIndex);
    } else {
      // All steps completed
      // All steps completed, auto execute (formerly mode_b)
      setPhase('executing');
      await startHermesExecution(newAnswers);
    }
  };

  const handleEditStep = (stepId: string) => {
    // 非破坏性回退（直接原地激活该卡片，保留后续答案）
    setEditingStepId(stepId);
    setPhase('chatting');
  };

  const handleConfirmExecute = async () => {
    setPhase('executing');
    await startHermesExecution(answers);
  };

  const startHermesExecution = async (finalAnswers: Record<string, StepAnswer>) => {
    // 🆕 v1.1: schema-first 流程 — 调 /api/tasks/:id/answers + 轮询真实 task
    if (useSchemaFirstFlow && dynamicConfig.hermesTaskId) {
      try {
        setPhase('executing');
        // 转换 StepAnswer[] → UgcStructuredAnswer[]
        const structuredAnswers: UgcStructuredAnswer[] = Object.values(finalAnswers).map((a) => ({
          stepId: a.stepId,
          value: a.value,
          values: a.values,
          fileUrl: a.filePreviewUrl,
          fileName: a.fileName,
        }));

        await submitUgcTaskAnswers(dynamicConfig.hermesTaskId, structuredAnswers);

        // 添加到 runs 让 CanvasPanel 渲染
        const realTaskId = dynamicConfig.hermesTaskId;
        setActiveTaskId(realTaskId);
        setRuns((prev) => [
          ...prev,
          { taskId: realTaskId, events: [], artifacts: [], status: 'running' },
        ]);

        // 切换到老轮询逻辑 (见下方 useEffect)
        return;
      } catch (err) {
        console.error('[agentChatCanvas] submit answers failed', err);
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'agent',
            content: `提交答案失败:${err instanceof Error ? err.message : String(err)}`,
            timestamp: Date.now(),
          },
        ]);
        setPhase('chatting');
        return;
      }
    }

    // 老流程:走前端 mock 演示 (保留作为 fallback / demo 模式)
    const mockTaskId = `mock-${Date.now()}`;
    setActiveTaskId(mockTaskId);
    setRuns(prev => [...prev, { taskId: mockTaskId, events: [], artifacts: [], status: 'running' }]);

    let currentEvents: UgcTaskEvent[] = [];
    let currentArtifacts: UgcTaskArtifact[] = [];

    const updateRun = (status: string = 'running') => {
      setRuns(prev => prev.map(r => r.taskId === mockTaskId ? { ...r, events: currentEvents, artifacts: currentArtifacts, status } : r));
    };

    const addEvent = (msg: string) => {
      currentEvents = [...currentEvents, {
        id: Date.now().toString() + Math.random(),
        type: 'info',
        level: 'info',
        message: msg,
        createdAt: new Date().toISOString()
      }];
      updateRun();
    };

    // Stage 1: Analyze
    addEvent('开始分析业务场景与需求参数...');
    await new Promise(r => setTimeout(r, 2000));
    addEvent('分析完成：已提炼核心种草点与视频风格定位。');

    // Stage 2: Script
    addEvent('正在生成视频脚本与口播文案...');
    await new Promise(r => setTimeout(r, 3000));
    const sellingPoints = Object.entries(finalAnswers)
      .filter(([k]) => k !== 'productAsset' && k !== 'referenceUrl')
      .map(([, v]) => v.value)
      .join(', ');
      
    currentArtifacts = [{
      id: 'script-1',
      type: 'script',
      label: '视频脚本',
      fileName: 'script.md',
      content: `# 视频拍摄脚本\n\n**分析提炼的核心卖点**: ${sellingPoints}\n\n**画面1**：特写展示产品外观细节（0-3s）\n**口播1**：你还在为选不到合适的款发愁吗？\n\n**画面2**：真实场景使用演示（3-7s）\n**口播2**：这个真的绝绝子，真实体验感拉满，完全可以闭眼入！\n\n**画面3**：引导转化下单（7-10s）\n**口播3**：赶紧点击左下角小黄车带走吧，限时优惠不等人！`
    }];
    addEvent('脚本生成完成，已同步至画布。');
    updateRun();

    // Stage 3: Render
    addEvent('开始调用视频合成引擎渲染画面...');
    await new Promise(r => setTimeout(r, 4000));
    addEvent('素材合成进度 100%，正在压制最终成片。');
    
    // Stage 4: Finish
    await new Promise(r => setTimeout(r, 1000));
    currentArtifacts = [{
      id: 'video-1',
      type: 'video',
      label: '最终视频',
      fileName: 'final_video.mp4',
      url: 'https://vjs.zencdn.net/v/oceans.mp4' // Mock public video for demo
    }];
    updateRun('completed');
    
    setPhase('completed');
    setMessages(prev => [...prev, {
      id: `done-${Date.now()}`,
      role: 'agent',
      content: '视频制作已完成！你可以直接在右侧播放结果，或点击下方打开本地物理文件夹获取原文件。',
      timestamp: Date.now(),
    }]);
  };

  // 临时注释掉真实轮询逻辑，采用上面的本地 Mock 流转
  /*
  useEffect(() => {
    if (!activeTaskId || phase !== 'executing') return;
    // ... polling logic ...
  }, [activeTaskId, phase, dynamicConfig]);
  */

  const handleAction = (action: 'open_folder' | 'edit_request' | 'restart') => {
    if (action === 'open_folder') {
      alert('已触发指令：打开本地文件夹 (Hermes Client Integration)');
    } else if (action === 'edit_request') {
      // 本期不走“增加自定义输入文字框”的逻辑
      // 模式 B 纯卡片，直接切回 chatting 状态，并给出系统提示引导
      setPhase('chatting');
      setMessages(prev => [...prev, {
        id: `edit-prompt-${Date.now()}`,
        role: 'agent',
        content: '请点击上方需要调整的配置卡片右上角的「修改」按钮进行调整哦～',
        timestamp: Date.now(),
      }]);
    } else if (action === 'restart') {
      setPhase('idle');
      setAnswers({});
      setCurrentStepIndex(0);
      setActiveTaskId(null);
      setMessages([]);
      setRuns([]);
      setDynamicConfig(baseConfig);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-64px)] overflow-hidden bg-[#FDFCFB]">
      {/* Left Chat Panel (40% width on desktop) */}
      <div className="w-full lg:w-[40%] xl:w-[450px] h-1/2 lg:h-full border-b lg:border-b-0 lg:border-r border-black/[0.08] relative z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <ChatPanel 
          config={dynamicConfig}
          messages={messages}
          currentStepIndex={currentStepIndex}
          phase={phase}
          onAnswer={handleAnswer}
          onAction={handleAction}
          onEditStep={handleEditStep}
          onConfirmExecute={handleConfirmExecute}
          answers={answers}
          editingStepId={editingStepId}
        />
      </div>

      {/* Right Canvas Panel (60% width on desktop) */}
      <div className="flex-1 h-1/2 lg:h-full relative z-0">
        <CanvasPanel 
          config={dynamicConfig}
          phase={phase}
          runs={runs}
        />
      </div>
    </div>
  );
}
