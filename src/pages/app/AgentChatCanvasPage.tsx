import { useState, useEffect } from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import { getChatAgentConfig } from '../../config/testAgentConfig';
import type { ChatMessage as IChatMessage, StepAnswer, WorkflowPhase } from '../../types/agentChatConfig';
import ChatPanel from '../../components/app/chat/ChatPanel';
import CanvasPanel from '../../components/app/canvas/CanvasPanel';
import { createRemoteUgcTask, getRemoteTask } from '../../lib/taskApi';
import type { UgcTaskInput, UgcTaskEvent, UgcTaskArtifact } from '../../types/ugc';
import { consumePendingAgentContext, getActiveProjectId } from '../../lib/projectStore';

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

  // Canvas State (Real Events & Artifacts)
  const [runs, setRuns] = useState<TaskRun[]>([]);

  // Initialize & Consume Project Context
  useEffect(() => {
    // 处理 React Strict Mode 带来的双重触发，以及页面刷新时的状态丢失
    const context = consumePendingAgentContext(agentId);
    const resolvedProjectId = context?.projectId || getActiveProjectId();
    
    if (!resolvedProjectId) {
      navigate('/app/agents', { replace: true });
      return;
    }
    setProjectId(resolvedProjectId);

    if (dynamicConfig && phase === 'idle') {
      setMessages([
        {
          id: 'welcome',
          role: 'agent',
          content: dynamicConfig.welcomeMessage,
          timestamp: Date.now(),
        }
      ]);
      setPhase('chatting');
    }
  }, [dynamicConfig, phase, agentId, navigate]);

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
        const mode = dynamicConfig.interactionMode || 'mode_a';
        if (mode === 'mode_b') {
          setPhase('executing');
          await startHermesExecution(newAnswers);
        } else {
          setPhase('confirming');
        }
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
      const mode = dynamicConfig.interactionMode || 'mode_a';
      if (mode === 'mode_b') {
        // Mode B: auto execute
        setPhase('executing');
        await startHermesExecution(newAnswers);
      } else {
        // Mode A/C: wait for confirmation
        setPhase('confirming');
      }
    }
  };

  const handleEditStep = (stepId: string) => {
    const mode = dynamicConfig.interactionMode || 'mode_a';
    
    if (mode === 'mode_a') {
      // 方案A：破坏性回退（清除后面的所有答案和气泡）
      const stepIndex = dynamicConfig.steps.findIndex(s => s.id === stepId);
      if (stepIndex === -1) return;
      
      setCurrentStepIndex(stepIndex);
      setPhase('chatting');
      
      const stepsToRemove = dynamicConfig.steps.slice(stepIndex).map(s => s.id);
      setAnswers(prev => {
        const next = { ...prev };
        stepsToRemove.forEach(id => delete next[id]);
        return next;
      });
      
      setMessages(prev => {
        const idx = prev.findIndex(m => m.stepId && stepsToRemove.includes(m.stepId));
        if (idx !== -1) {
          return prev.slice(0, idx);
        }
        return prev;
      });
    } else {
      // 方案B/C：非破坏性回退（直接原地激活该卡片，保留后续答案）
      setEditingStepId(stepId);
      setPhase('chatting');
    }
  };

  const handleConfirmExecute = async () => {
    setPhase('executing');
    await startHermesExecution(answers);
  };

  const startHermesExecution = async (finalAnswers: Record<string, StepAnswer>) => {
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
      // 根据交互模式，回退到适合修改的界面
      const mode = dynamicConfig.interactionMode || 'mode_a';
      if (mode === 'mode_b') {
        // 模式 B 纯卡片，直接切回 chatting 状态，并给出系统提示引导
        setPhase('chatting');
        setMessages(prev => [...prev, {
          id: `edit-prompt-${Date.now()}`,
          role: 'agent',
          content: '请点击上方需要调整的配置卡片右上角的「修改」按钮进行调整哦～',
          timestamp: Date.now(),
        }]);
      } else {
        // 模式 A 和 C 都有确认大卡片，回退到 confirming 状态让用户统一重新核对
        setPhase('confirming');
      }
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
