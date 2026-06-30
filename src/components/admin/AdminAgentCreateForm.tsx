import { useState } from 'react';
import { adminApi } from '../../lib/adminApi';
import { AdminCard, adminBtnPrimaryClass, adminInputClass } from '../../components/admin/AdminUi';
import AdminRichTextEditor from './AdminRichTextEditor';

type AdminAgentCreateFormProps = {
  onCreated: (slug: string) => void;
};

export default function AdminAgentCreateForm({ onCreated }: AdminAgentCreateFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [detailHtml, setDetailHtml] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [releaseNote, setReleaseNote] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [packageFile, setPackageFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!iconFile || !packageFile) {
      setMessage('请上传图标和技能包');
      return;
    }
    if (!name.trim() || !description.trim()) {
      setMessage('请填写名称和简介');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('icon', iconFile);
      formData.append('package', packageFile);
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      if (detailHtml.trim()) formData.append('detailHtml', detailHtml.trim());
      formData.append('version', version.trim() || '1.0.0');
      if (releaseNote.trim()) formData.append('releaseNote', releaseNote.trim());

      const created = (await adminApi.createAgentUpload(formData)) as { slug?: string; id?: string };
      const target = created?.slug ?? created?.id;
      if (target) onCreated(target);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '创建失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-black/50">上传技能包并填写展示资料。创建后默认为下架状态，校验通过后可上架。</p>
      {message ? <p className="text-xs text-rose-600">{message}</p> : null}

      <AdminCard className="p-5 space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[#111]">智能体图标 *</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="text-sm"
            onChange={(e) => setIconFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[#111]">技能包 (.zip) *</span>
          <input
            type="file"
            accept=".zip,application/zip"
            className="text-sm"
            onChange={(e) => setPackageFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[#111]">名称 *</span>
          <input className={adminInputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[#111]">简介 *</span>
          <textarea
            className={`${adminInputClass} min-h-[88px]`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={120}
          />
        </label>

        <div className="space-y-1.5">
          <span className="text-sm font-medium text-[#111]">详细描述</span>
          <AdminRichTextEditor value={detailHtml} onChange={setDetailHtml} />
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[#111]">版本号</span>
          <input className={adminInputClass} value={version} onChange={(e) => setVersion(e.target.value)} />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[#111]">版本说明</span>
          <input className={adminInputClass} value={releaseNote} onChange={(e) => setReleaseNote(e.target.value)} />
        </label>

        <button type="button" className={adminBtnPrimaryClass} disabled={busy} onClick={() => void submit()}>
          {busy ? '创建中…' : '创建智能体'}
        </button>
      </AdminCard>
    </div>
  );
}
