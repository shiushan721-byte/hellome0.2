import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import type { CanvasStage } from '../../../types/agentChatConfig';

interface Props {
  stage: CanvasStage;
  status: 'pending' | 'active' | 'completed';
  progress?: number;
}

export default function CanvasStageCard({ stage, status, progress = 0 }: Props) {
  const isPending = status === 'pending';
  const isActive = status === 'active';
  const isCompleted = status === 'completed';

  return (
    <div 
      className={`relative rounded-[20px] p-5 transition-all duration-500 ${
        isActive 
          ? 'bg-white shadow-sm border border-[#0F766E]/20 ring-1 ring-[#0F766E]/5 scale-[1.02]' 
          : isCompleted
            ? 'bg-white border border-black/5 opacity-80'
            : 'bg-transparent border border-dashed border-black/10 opacity-50'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0 mt-0.5">
          {isCompleted ? (
            <CheckCircle2 className="h-5 w-5 text-[#0F766E]" />
          ) : isActive ? (
            <Loader2 className="h-5 w-5 text-[#0F766E] animate-spin" />
          ) : (
            <Circle className="h-5 w-5 text-black/20" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className={`text-[15px] font-semibold ${isActive ? 'text-[#0F766E]' : 'text-[#1A1A1A]'}`}>
            {stage.label}
          </h4>
          <p className="mt-1.5 text-[13px] leading-relaxed text-black/50">
            {stage.description}
          </p>
          
          {isActive && (
            <div className="mt-4 h-1.5 w-full bg-[#EAF6F4] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#0F766E] rounded-full transition-all duration-300 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
