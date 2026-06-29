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
}

export default function ChatPanel({ config, messages, currentStepIndex, phase, onAnswer, onAction }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

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
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} agentIcon={config.icon} />
        ))}

        {phase === 'executing' && (
          <div className="flex items-start gap-3 w-full justify-start animate-in fade-in duration-500">
            <div className="flex shrink-0 h-8 w-8 items-center justify-center rounded-full bg-[#EAF6F4] text-[#0F766E] shadow-sm">
              <span className="text-sm">{config.icon}</span>
            </div>
            <div className="rounded-[20px] px-4 py-3 shadow-sm bg-white border border-black/[0.05] flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#0F766E]" />
              <span className="text-[14px] text-black/60">正在调用 Hermes 桌面端处理中...</span>
            </div>
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
