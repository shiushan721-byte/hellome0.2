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
    <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-700">
      <div className="w-full max-w-md bg-white rounded-[28px] border border-black/5 shadow-xl overflow-hidden">
        {/* Result Media Area */}
        <div className="aspect-[9/16] max-h-[400px] w-full bg-[#111214] relative flex items-center justify-center group overflow-hidden">
          {videoArtifactUrl ? (
            <video 
              src={videoArtifactUrl} 
              controls 
              className="w-full h-full object-contain"
              controlsList="nodownload"
            />
          ) : (
            <>
              {type === 'video' && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-[#8A9AA8]/20 to-transparent mix-blend-overlay" />
                  <Video className="h-12 w-12 text-white/20 absolute z-0" />
                  <div className="absolute inset-x-4 top-4 flex justify-between text-[10px] font-medium tracking-wider text-white/50 uppercase">
                    <span>Video Preview</span>
                  </div>
                </>
              )}
              {type === 'image' && <ImageIcon className="h-12 w-12 text-white/20" />}
              {type === 'document' && <FileText className="h-12 w-12 text-white/20" />}
            </>
          )}
        </div>

        {/* Content Area */}
        <div className="p-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EAF6F4] text-[#0F766E] text-[11px] font-bold tracking-wider uppercase mb-3">
            <CheckIcon className="h-3.5 w-3.5" />
            Generation Complete
          </div>
          <h3 className="text-[20px] font-semibold text-[#1A1A1A]">
            {title || '交付结果'}
          </h3>
          {description && (
            <p className="mt-2 text-[14px] leading-relaxed text-black/50">
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
