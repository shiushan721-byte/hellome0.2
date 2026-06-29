import { useEffect, useRef } from 'react';
import type { AgentChatConfig, ChatMessage as IChatMessage, StepAnswer, WorkflowPhase } from '../../../types/agentChatConfig';
import ChatMessage from './ChatMessage';
import ChatInputCard from './ChatInputCard';
import { Loader2, FolderOpen, Edit3, RefreshCcw } from 'lucide-react';

interface Props {
  config: AgentChatConfig;
  messages: IChatMessage[];
  currentStepIndex: number;
  phase: WorkflowPhase;
  onAnswer: (answer: StepAnswer) => void;
  onAction: (action: 'open_folder' | 'edit_request' | 'restart') => void;
  onEditStep?: (stepId: string) => void;
  onConfirmExecute?: () => void;
  answers?: Record<string, StepAnswer>;
  editingStepId?: string | null;
}

const executionStatuses = [
  '正在极速唤起 Hermes 视频引擎...',
  '正在提取核心卖点与画风...',
  '智能运镜与音乐踩点匹配中...',
  '即将完成，正在输出样片...',
];

export default function ChatPanel({ config, messages, currentStepIndex, phase, onAnswer, onAction, onEditStep, onConfirmExecute, answers = {}, editingStepId }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    if (phase === 'executing') {
      const interval = setInterval(() => {
        setStatusIndex(prev => (prev + 1) % executionStatuses.length);
      }, 3000);
      return () => clearInterval(interval);
    } else {
      setStatusIndex(0);
    }
  }, [phase]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentStepIndex, phase]);

  const currentStep = config.steps[currentStepIndex];

  return (
    <div className="flex flex-col h-full bg-[#FDFCFB]">
      {/* Header */}
      <div className="shrink-0 px-6 py-5 border-b border-black/[0.05] bg-white z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#F5F5F7] text-lg">
            {config.icon}
          </div>
          <div>
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">{config.name}</h2>
            <div className="flex gap-2 mt-1">
              {config.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="text-[11px] font-medium text-black/40 bg-[#F2F0ED] px-2 py-0.5 rounded-md">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar space-y-6"
      >
        {messages.filter(msg => config.interactionMode === 'mode_a' || msg.role === 'agent').map((msg) => (
          <ChatMessage 
            key={msg.id} 
            message={msg} 
            agentIcon={config.icon} 
            interactionMode={config.interactionMode}
            onEdit={onEditStep}
          />
        ))}

        {(config.interactionMode === 'mode_b' || config.interactionMode === 'mode_c') && (
          config.steps.map((step, idx) => {
            // 我们只渲染已经回答过的，或者是当前正在回答的
            const answer = answers[step.id];
            const isEditing = editingStepId === step.id;
            const isActive = idx === currentStepIndex && phase === 'chatting' && !editingStepId;
            
            // 如果这个 step 既没有答案，又不是当前活跃步，也不是编辑步，就不渲染
            if (!answer && !isActive && !isEditing) return null;

            if (isEditing || isActive) {
              return (
                <ChatInputCard 
                  key={step.id} 
                  step={step} 
                  onSubmit={onAnswer} 
                />
              );
            }

            return (
              <ChatInputCard 
                key={step.id} 
                step={step} 
                onSubmit={onAnswer} 
                completed={true} 
                answer={answer} 
                onEdit={() => onEditStep && onEditStep(step.id)} 
              />
            );
          })
        )}

        {/* 对于 mode_a 保持原有逻辑：当前活跃的 step */}
        {(config.interactionMode === 'mode_a' || !config.interactionMode) && phase === 'chatting' && currentStep && (
          <ChatInputCard 
            step={currentStep} 
            onSubmit={onAnswer} 
          />
        )}

        {phase === 'confirming' && (
          <div className="flex flex-col gap-4 w-[90%] bg-white border border-[#E5E5E5] rounded-[20px] p-5 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-[15px] font-bold text-black flex items-center gap-2">
              <span className="text-xl">📋</span> 
              {(config.interactionMode === 'mode_a' || !config.interactionMode) ? '请最后核对以下参数' : '全部配置已就绪'}
            </h3>
            <div className="flex flex-col gap-3">
              {(config.interactionMode === 'mode_a' || !config.interactionMode) && config.steps.map((step, idx) => {
                const answer = answers[step.id];
                if (!answer) return null;
                return (
                  <div key={step.id} className="flex flex-col gap-1 text-[13px]">
                    <div className="flex items-center justify-between">
                      <span className="text-black/50 font-medium">Step {idx + 1}: {step.question.split('\n')[0]}</span>
                      {(config.interactionMode === 'mode_a' || config.interactionMode === 'mode_c') && onEditStep && (
                        <button 
                          onClick={() => onEditStep(step.id)}
                          className="text-[#0F766E] hover:underline text-[12px] font-medium"
                        >
                          修改
                        </button>
                      )}
                    </div>
                    <div className="bg-[#F5F5F7] px-3 py-2 rounded-lg">
                      {answer.filePreviewUrl ? (
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-md bg-black/5 overflow-hidden shrink-0 flex items-center justify-center">
                            {answer.filePreviewUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) || answer.filePreviewUrl.startsWith('blob:') ? (
                              <img src={answer.filePreviewUrl} alt="uploaded" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[10px] text-black/40">文件</span>
                            )}
                          </div>
                          <span className="text-black/80 font-medium truncate max-w-[150px]">
                            {answer.fileName || '已上传文件'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-black/80 font-medium">
                          {answer.value || '(跳过)'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <button
              onClick={onConfirmExecute}
              className="mt-2 w-full py-3 rounded-xl bg-[#0F766E] text-white text-[14px] font-bold shadow-sm hover:bg-[#0F766E]/90 transition-colors"
            >
              确认无误，开始生成视频
            </button>
          </div>
        )}

        {phase === 'executing' && (
          <div className="flex flex-col gap-3 w-full animate-in fade-in duration-500 mt-4">
            <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#0F766E] rounded-full animate-[progress_10s_ease-in-out_infinite]" style={{ width: '60%' }} />
            </div>
            <div className="flex items-center gap-2 px-1">
              <Loader2 className="h-4 w-4 animate-spin text-[#0F766E]" />
              <span className="text-[13px] font-medium text-black/60 transition-opacity duration-300">
                {executionStatuses[statusIndex]}
              </span>
            </div>
            <style>{`
              @keyframes progress {
                0% { width: 0%; opacity: 1; }
                50% { width: 80%; opacity: 0.8; }
                100% { width: 100%; opacity: 0.5; }
              }
            `}</style>
          </div>
        )}

        {phase === 'chatting' && currentStep && (
          <ChatInputCard 
            step={currentStep} 
            onSubmit={onAnswer} 
          />
        )}

        {phase === 'completed' && (
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button
              onClick={() => onAction('open_folder')}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-black text-white text-sm font-bold shadow-sm hover:bg-black/85 transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              满意，打开本地文件夹查看
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => onAction('edit_request')}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white border border-black/10 text-black text-sm font-semibold shadow-sm hover:bg-black/[0.02] transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                不满意，我要修改
              </button>
              <button
                onClick={() => onAction('restart')}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white border border-black/10 text-black text-sm font-semibold shadow-sm hover:bg-black/[0.02] transition-colors"
              >
                <RefreshCcw className="w-4 h-4" />
                重新发起新项目
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
