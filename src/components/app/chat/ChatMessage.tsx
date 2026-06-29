import { Bot, User } from 'lucide-react';
import type { ChatMessage as IChatMessage } from '../../../types/agentChatConfig';

interface Props {
  message: IChatMessage;
  agentIcon?: string;
}

export default function ChatMessage({ message, agentIcon }: Props) {
  const isAgent = message.role === 'agent';

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
            : 'bg-black text-white rounded-tr-sm'
        }`}
      >
        <p className="whitespace-pre-wrap text-[14px] leading-relaxed">
          {message.content}
        </p>
      </div>

      {!isAgent && (
        <div className="flex shrink-0 h-8 w-8 items-center justify-center rounded-full bg-[#1A1A1A] text-white shadow-sm">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
