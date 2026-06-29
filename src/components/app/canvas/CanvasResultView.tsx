import { Download, PlayCircle, FileText, Image as ImageIcon, ExternalLink, Video } from 'lucide-react';
import type { CanvasResultType } from '../../../types/agentChatConfig';
import type { UgcTaskArtifact } from '../../../types/ugc';

interface Props {
  type: CanvasResultType;
  title?: string;
  description?: string;
  artifacts?: UgcTaskArtifact[];
}

export default function CanvasResultView({ type, title, description, artifacts }: Props) {
  const videoArtifactUrl = (type === 'video' && artifacts && artifacts.length > 0) ? artifacts[0].url : null;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-700 relative">
      {/* Glow Ripple for wow factor */}
      <div className="absolute inset-0 bg-[#00F0FF]/10 blur-[100px] rounded-full animate-pulse pointer-events-none" />

      <div className="w-full max-w-md bg-white/5 backdrop-blur-3xl rounded-[32px] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.5)] overflow-hidden relative z-10">
        
        {/* Result Media Area - Device Mockup */}
        <div className="p-6 pb-0 flex justify-center">
          <div className="aspect-[9/16] w-[260px] max-h-[460px] bg-black rounded-[24px] border-[6px] border-[#1A1C1E] shadow-2xl relative flex items-center justify-center group overflow-hidden">
            {/* Dynamic Island / Notch */}
            <div className="absolute top-0 inset-x-0 h-[18px] flex justify-center z-20">
              <div className="w-[80px] h-[14px] bg-[#1A1C1E] rounded-b-[10px]" />
            </div>

            {videoArtifactUrl ? (
              <video 
                src={videoArtifactUrl} 
                controls 
                className="w-full h-full object-cover"
                controlsList="nodownload"
                autoPlay
                loop
                muted
              />
            ) : (
              <>
                {type === 'video' && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-[#00F0FF]/10 via-transparent to-[#7000FF]/10 mix-blend-overlay animate-[pulse_3s_ease-in-out_infinite]" />
                    <Video className="h-10 w-10 text-white/20 absolute z-0" />
                    <div className="absolute inset-x-4 top-8 flex justify-center text-[10px] font-medium tracking-wider text-white/40 uppercase">
                      <span>Preview</span>
                    </div>
                  </>
                )}
                {type === 'image' && <ImageIcon className="h-12 w-12 text-white/20" />}
                {type === 'document' && <FileText className="h-12 w-12 text-white/20" />}
              </>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00F0FF]/10 border border-[#00F0FF]/20 text-[#00F0FF] text-[11px] font-bold tracking-wider uppercase mb-4 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <CheckIcon className="h-3.5 w-3.5" />
            Generation Complete
          </div>
          <h3 className="text-[22px] font-semibold text-white/90">
            {title || '交付结果'}
          </h3>
          {description && (
            <p className="mt-2.5 text-[14px] leading-relaxed text-white/50">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
