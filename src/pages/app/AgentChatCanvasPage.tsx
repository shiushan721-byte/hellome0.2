import { useState, useEffect } from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import { getChatAgentConfig } from '../../config/testAgentConfig';
import type { ChatMessage as IChatMessage, StepAnswer, WorkflowPhase } from '../../types/agentChatConfig';
import ChatPanel from '../../components/app/chat/ChatPanel';
import CanvasPanel from '../../components/app/canvas/CanvasPanel';
import { createRemoteUgcTask, getRemoteTask } from '../../lib/taskApi';
import type { UgcTaskInput, UgcTaskEvent, UgcTaskArtifact } from '../../types/ugc';
import { consumePendingAgentContext } from '../../lib/projectStore';

export interface TaskRun {
  taskId: string;
  events: UgcTaskEvent[];
  artifacts: UgcTaskArtifact[];
  status: string;
}

function resolveUgcAgentId(pathname: string): string {
  const match = pathname.match(/\/agents\/(media(?:-[a-z]+)?)/);
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
  const [answers, setAnswers] = useState<Record<string, StepAnswer>>({});
  
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Canvas State (Real Events & Artifacts)
  const [runs, setRuns] = useState<TaskRun[]>([]);

  // Initialize & Consume Project Context
  useEffect(() => {
    // 强制拦截逻辑：必须有 Project Context 才能执行。如果没有说明不是从弹窗进来的，强制退回大厅。
    const context = consumePendingAgentContext(agentId);
    if (!context?.projectId) {
      navigate('/app/agents', { replace: true });
      return;
    }
    setProjectId(context.projectId);

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
      // All steps completed, start execution
      setPhase('executing');
      await startHermesExecution(newAnswers);
    }
  };

  const startHermesExecution = async (finalAnswers: Record<string, StepAnswer>) => {
    // Note: We deliberately do not clear `runs` here to retain history.
    
    // Extract parameters
    const productAsset = finalAnswers['productAsset'];
    const referenceUrl = finalAnswers['referenceUrl'];
    
    // Build selling points from the rest
    const sellingPoints = Object.entries(finalAnswers)
      .filter(([k]) => k !== 'productAsset' && k !== 'referenceUrl')
      .map(([, v]) => v.value)
      .join('；');

    const payload: UgcTaskInput & { projectId?: string } = {
      skillId: dynamicConfig.id,
      projectId: projectId || undefined,
      productImageUrl: productAsset?.filePreviewUrl || '',
      productImageName: productAsset?.fileName || '',
      referenceUrl: referenceUrl?.value || undefined,
      sellingPoint: sellingPoints,
      platform: 'douyin',
      effectGoal: 'conversion',
    };

    try {
      const task = await createRemoteUgcTask(payload);
      setActiveTaskId(task.id);
      setRuns(prev => [...prev, { taskId: task.id, events: [], artifacts: [], status: 'running' }]);
    } catch (err) {
      console.error('Failed to create task', err);
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'agent',
        content: '抱歉，唤起 Hermes 失败，请检查网络或后端服务。',
        timestamp: Date.now(),
      }]);
      setPhase('chatting');
    }
  };

  // Poll Task Status
  useEffect(() => {
    if (!activeTaskId || phase !== 'executing') return;

    let cancelled = false;
    const interval = window.setInterval(async () => {
      try {
        const task = await getRemoteTask(activeTaskId);
        if (cancelled) return;

        // Update the active run
        setRuns(prev => prev.map(r => {
          if (r.taskId === activeTaskId) {
            return {
              ...r,
              events: task.events || r.events,
              artifacts: task.artifacts || r.artifacts,
              status: task.status
            };
          }
          return r;
        }));

        if (task.status === 'completed' || task.status === 'waiting_confirmation') {
          setPhase('completed');
          setMessages(prev => [...prev, {
            id: `done-${Date.now()}`,
            role: 'agent',
            content: '视频制作已完成！成品文件已保存至你的本地项目文件夹中，你可以直接在右侧播放结果，或点击下方打开物理文件夹。',
            timestamp: Date.now(),
          }]);
          window.clearInterval(interval);
        }

        if (task.status === 'failed' || task.status === 'cancelled') {
          setPhase('chatting');
          setMessages(prev => [...prev, {
            id: `fail-${Date.now()}`,
            role: 'agent',
            content: '任务执行中止或失败，您可以点击重新发起新项目。',
            timestamp: Date.now(),
          }]);
          window.clearInterval(interval);
        }

      } catch (err) {
        console.error('Failed to poll task', err);
      }
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeTaskId, phase, dynamicConfig]);

  const handleAction = (action: 'open_folder' | 'edit_request' | 'restart') => {
    if (action === 'open_folder') {
      alert('已触发指令：打开本地文件夹 (Hermes Client Integration)');
    } else if (action === 'edit_request') {
      // Create a new dynamic step for revision
      const revisionStepId = `revision_${Date.now()}`;
      const newStep = {
        id: revisionStepId,
        type: 'text' as const,
        question: '好的，请问你希望修改哪里？我可以带着新的要求重新生成一遍。',
        placeholder: '例如：视频节奏再快一点，多强调产品价格'
      };
      
      const clonedConfig = JSON.parse(JSON.stringify(dynamicConfig));
      clonedConfig.steps.push(newStep);
      setDynamicConfig(clonedConfig);
      
      setPhase('chatting');
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
