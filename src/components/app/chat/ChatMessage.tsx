import { Bot, User, Edit2 } from 'lucide-react';
import type { ChatMessage as IChatMessage } from '../../../types/agentChatConfig';

interface Props {
  message: IChatMessage;
  agentIcon?: string;
  onEdit?: (stepId: string) => void;
  interactionMode?: 'mode_a' | 'mode_b' | 'mode_c';
}

export default function ChatMessage({ message, agentIcon, onEdit, interactionMode = 'mode_a' }: Props) {
  const isAgent = message.role === 'agent';
  const showEdit = !isAgent && message.stepId && (interactionMode === 'mode_b' || interactionMode === 'mode_c') && onEdit;

  return (
    <div className={`flex items-start gap-3 w-full ${isAgent ? 'justify-start' : 'justify-end'}`}>
      {isAgent && (
        <div className="flex shrink-0 h-8 w-8 items-center justify-center rounded-full bg-[#EAF6F4] text-[#0F766E] shadow-sm">
          {agentIcon ? <span className="text-sm">{agentIcon}</span> : <Bot className="h-4 w-4" />}
        </div>
      )}

      <div
        className={`max-w-[85%] rounded-[20px] px-4 py-3 shadow-sm ${
          isAgent
            ? 'bg-white border border-black/[0.05] text-[#1A1A1A] rounded-tl-sm'
            : 'bg-black text-white rounded-tr-sm relative group'
        }`}
      >
        <p className="whitespace-pre-wrap text-[14px] leading-relaxed pr-6">
          {message.content}
        </p>
        
        {showEdit && (
          <button 
            onClick={() => onEdit(message.stepId!)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-white/20 text-white/80 hover:text-white transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1"
            title="修改此项"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium leading-none">修改</span>
          </button>
        )}
      </div>

      {!isAgent && (
        <div className="flex shrink-0 h-8 w-8 items-center justify-center rounded-full bg-[#1A1A1A] text-white shadow-sm">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
