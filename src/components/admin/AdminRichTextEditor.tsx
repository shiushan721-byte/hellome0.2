import { useEffect, useRef } from 'react';
import { Bold, Heading2, ImagePlus, Italic, List, ListOrdered } from 'lucide-react';

type AdminRichTextEditorProps = {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

const toolbarButtonClass =
  'inline-flex h-8 items-center justify-center rounded-lg border border-black/10 bg-white px-2 text-xs font-semibold text-black/60 hover:border-black/20 disabled:cursor-not-allowed disabled:opacity-45';

export default function AdminRichTextEditor({
  value,
  disabled,
  onChange,
}: AdminRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || editor.innerHTML === value) return;
    editor.innerHTML = value || '';
  }, [value]);

  const sync = () => {
    const html = editorRef.current?.innerHTML ?? '';
    onChange(cleanRichTextHtml(html));
  };

  const runCommand = (command: string, commandValue?: string) => {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    sync();
  };

  const insertImage = (file: File | null) => {
    if (!file || disabled) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || '');
      if (!src) return;
      runCommand(
        'insertHTML',
        `<img src="${src}" alt="" style="max-width:100%;border-radius:12px;margin:8px 0;" />`,
      );
      if (fileRef.current) fileRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="rounded-xl border border-black/10 bg-white overflow-hidden">
      <div className="flex flex-wrap gap-2 border-b border-black/8 bg-[#fafafa] px-3 py-2">
        <button type="button" className={toolbarButtonClass} disabled={disabled} onClick={() => runCommand('bold')}>
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={toolbarButtonClass} disabled={disabled} onClick={() => runCommand('italic')}>
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={toolbarButtonClass} disabled={disabled} onClick={() => runCommand('formatBlock', 'h2')}>
          <Heading2 className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={toolbarButtonClass} disabled={disabled} onClick={() => runCommand('insertUnorderedList')}>
          <List className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={toolbarButtonClass} disabled={disabled} onClick={() => runCommand('insertOrderedList')}>
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={toolbarButtonClass} disabled={disabled} onClick={() => fileRef.current?.click()}>
          <ImagePlus className="mr-1 h-3.5 w-3.5" />
          图片
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(event) => insertImage(event.target.files?.[0] ?? null)}
        />
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={sync}
        onBlur={sync}
        className="min-h-[220px] px-4 py-3 text-sm leading-7 text-black/72 outline-none empty:before:text-black/30 empty:before:content-['填写智能体的详细介绍、适用场景、输入要求和交付内容'] [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-black [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_img]:max-w-full"
      />
    </div>
  );
}

function cleanRichTextHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .trim();
}
