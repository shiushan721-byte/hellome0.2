import { useState, useRef } from 'react';
import { UploadCloud, Link as LinkIcon, Send, Edit2, CheckCircle2 } from 'lucide-react';
import type { ChatStep, StepAnswer } from '../../../types/agentChatConfig';

interface Props {
  step: ChatStep;
  onSubmit: (answer: StepAnswer) => void;
  disabled?: boolean;
  completed?: boolean;
  answer?: StepAnswer;
  onEdit?: () => void;
}

export default function ChatInputCard({ step, onSubmit, disabled, completed, answer, onEdit }: Props) {
  const [textValue, setTextValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmitValue = (value: string, filePreviewUrl?: string, fileName?: string) => {
    onSubmit({
      stepId: step.id,
      value,
      filePreviewUrl,
      fileName,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && step.type === 'upload') {
      const url = URL.createObjectURL(file);
      handleSubmitValue(`[文件] ${file.name}`, url, file.name);
    }
  };

  if (completed && answer) {
    return (
      <div className="w-full rounded-[20px] bg-white border border-black/10 p-4 shadow-sm mt-4 group transition-all">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-[13px] font-medium text-black/50 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#0F766E]" />
              {step.question.split('\n')[0]}
            </h3>
            <div className="pl-5 mt-1">
              {answer.filePreviewUrl ? (
                <div className="flex items-center gap-3 p-2 rounded-xl border border-black/10 bg-[#F5F5F7]/50 w-fit">
                  <div className="h-12 w-12 rounded-lg bg-black/5 overflow-hidden shrink-0 flex items-center justify-center">
                    {answer.filePreviewUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) || answer.filePreviewUrl.startsWith('blob:') ? (
                      <img src={answer.filePreviewUrl} alt="uploaded" className="h-full w-full object-cover" />
                    ) : (
                      <UploadCloud className="w-5 h-5 text-black/40" />
                    )}
                  </div>
                  <div className="flex flex-col pr-3">
                    <span className="text-[13px] font-semibold text-black max-w-[200px] truncate">
                      {answer.fileName || '已上传文件'}
                    </span>
                    <span className="text-[11px] text-black/40">点击修改可重新上传</span>
                  </div>
                </div>
              ) : (
                <p className="text-[15px] font-semibold text-[#1A1A1A]">
                  {answer.value || '(跳过)'}
                </p>
              )}
            </div>
          </div>
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-2 rounded-lg text-black/40 hover:text-black hover:bg-black/5 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5"
              title="修改"
            >
              <Edit2 className="w-4 h-4" />
              <span className="text-[12px] font-medium">修改</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-[24px] bg-white border border-black/10 p-5 shadow-sm mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-4">
        <h3 className="text-[15px] font-semibold text-[#1A1A1A]">{step.question}</h3>
        {step.hint && <p className="mt-1 text-[13px] text-black/50">{step.hint}</p>}
      </div>

      {step.type === 'select' && (
        <div className="flex flex-wrap gap-2">
          {step.options.map((opt) => (
            <button
              key={opt}
              disabled={disabled}
              onClick={() => handleSubmitValue(opt)}
              className="px-4 py-2.5 rounded-full bg-[#F7F7F8] hover:bg-[#EAF6F4] hover:text-[#0F766E] border border-transparent hover:border-[#0F766E]/20 text-[13px] font-medium text-black/70 transition-colors disabled:opacity-50"
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {step.type === 'upload' && (
        <div>
          <input
            type="file"
            className="hidden"
            accept={step.accept}
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={disabled}
          />
          <button
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center py-8 rounded-2xl border-2 border-dashed border-black/10 hover:border-black/30 hover:bg-[#FCFCFD] transition-colors disabled:opacity-50"
          >
            <div className="h-12 w-12 rounded-full bg-[#F5F5F7] flex items-center justify-center mb-3 text-black/40">
              <UploadCloud className="h-6 w-6" />
            </div>
            <span className="text-[14px] font-medium text-[#1A1A1A]">
              {step.uploadHint || '点击上传文件'}
            </span>
            <span className="text-[12px] text-black/40 mt-1">最大支持 {step.maxSizeMb}MB</span>
          </button>
          {!step.required && (
            <button
              disabled={disabled}
              onClick={() => handleSubmitValue('[跳过上传]')}
              className="mt-3 w-full text-[13px] text-black/40 hover:text-black/70 py-2"
            >
              暂不上传，跳过此步
            </button>
          )}
        </div>
      )}

      {step.type === 'url' && (
        <div className="space-y-3">
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/30" />
            <input
              type="url"
              disabled={disabled}
              placeholder={step.placeholder || 'https://...'}
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              className="w-full pl-9 pr-4 py-3 rounded-2xl bg-[#F7F7F8] border border-black/5 focus:border-black/20 focus:ring-0 text-[14px] outline-none transition-all disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && textValue.trim()) {
                  handleSubmitValue(textValue);
                }
              }}
            />
          </div>
          <div className="flex gap-2">
            <button
              disabled={disabled || !textValue.trim()}
              onClick={() => handleSubmitValue(textValue)}
              className="flex-1 bg-black text-white rounded-xl py-2.5 text-[14px] font-medium disabled:opacity-30 transition-opacity flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" /> 提交链接
            </button>
            {!step.required && (
              <button
                disabled={disabled}
                onClick={() => handleSubmitValue('[无参考链接]')}
                className="px-4 text-[13px] text-black/50 hover:bg-[#F7F7F8] rounded-xl transition-colors"
              >
                跳过
              </button>
            )}
          </div>
        </div>
      )}

      {step.type === 'text' && (
        <div className="space-y-3">
          <textarea
            disabled={disabled}
            rows={step.rows || 3}
            placeholder={step.placeholder}
            maxLength={step.maxLength}
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-[#F7F7F8] border border-black/5 focus:border-black/20 focus:ring-0 text-[14px] outline-none transition-all disabled:opacity-50 resize-none"
          />
          <div className="flex justify-between items-center">
            <span className="text-[12px] text-black/30">
              {textValue.length} {step.maxLength ? `/ ${step.maxLength}` : ''}
            </span>
            <button
              disabled={disabled || (step.required && !textValue.trim())}
              onClick={() => handleSubmitValue(textValue || '[未填写]')}
              className="bg-black text-white px-6 py-2.5 rounded-xl text-[14px] font-medium disabled:opacity-30 transition-opacity flex items-center gap-2"
            >
              <Send className="h-4 w-4" /> 发送
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
