import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/adminApi';
import { getAgentById } from '../../data/agentsCatalog';
import type { AdminAgentDetail, AdminAgentPackage } from '../../types/adminAgent';
import {
  AdminCard,
  AdminTable,
  StatusBadge,
  adminBtnPrimaryClass,
  adminInputClass,
  adminTabClass,
} from '../../components/admin/AdminUi';
import AdminRichTextEditor from './AdminRichTextEditor';

type DetailTab = 'profile' | 'packages' | 'validation' | 'audit';

function statusLabel(status: string) {
  if (status === 'online') return '上架';
  if (status === 'offline') return '下架';
  if (status === 'valid') return '校验通过';
  if (status === 'invalid') return '校验失败';
  if (status === 'pending') return '校验中';
  if (status === 'deprecated') return '已废弃';
  return status;
}

type AdminAgentDetailPanelProps = {
  skillId: string;
  onChanged?: () => void;
};

export default function AdminAgentDetailPanel({ skillId, onChanged }: AdminAgentDetailPanelProps) {
  const [tab, setTab] = useState<DetailTab>('profile');
  const [agent, setAgent] = useState<AdminAgentDetail | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [detailHtml, setDetailHtml] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [iconUploading, setIconUploading] = useState(false);

  const [pkgVersion, setPkgVersion] = useState('');
  const [pkgNote, setPkgNote] = useState('');
  const [pkgFile, setPkgFile] = useState<File | null>(null);

  const isOnline = agent?.status === 'online';
  const readonly = isOnline;

  const load = async () => {
    if (!skillId) return;
    const data = await adminApi.agent(skillId);
    setAgent(data);
    setName(data.name);
    setDescription(data.description);
    setDetailHtml(data.detailHtml ?? '');
    setIconUrl(data.iconUrl);
  };

  useEffect(() => {
    setTab('profile');
    void load().catch((error) => {
      setMessage(error instanceof Error ? error.message : '加载失败');
    });
  }, [skillId]);

  const notifyChange = () => {
    onChanged?.();
  };

  const runAction = async (label: string, action: () => Promise<void>) => {
    setBusy(true);
    setMessage('');
    try {
      await action();
      setMessage(label);
      await load();
      notifyChange();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async () => {
    if (!agent) return;
    await adminApi.updateAgent(agent.id, {
      name: name.trim(),
      description: description.trim(),
      detailHtml: detailHtml.trim() || undefined,
      iconUrl: iconUrl.trim() || undefined,
    });
  };

  const handleIconUpload = async (file: File | null) => {
    if (!file || !agent) return;
    setIconUploading(true);
    try {
      const result = await adminApi.uploadAgentIcon(agent.id, file);
      setIconUrl(result.iconUrl);
      notifyChange();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '上传图标失败');
    } finally {
      setIconUploading(false);
    }
  };

  const uploadPackage = async () => {
    if (!agent || !pkgFile) throw new Error('请选择技能包文件');
    const formData = new FormData();
    formData.append('package', pkgFile);
    formData.append('version', pkgVersion.trim());
    if (pkgNote.trim()) formData.append('releaseNote', pkgNote.trim());
    await adminApi.uploadAgentPackage(agent.id, formData);
    setPkgFile(null);
    setPkgVersion('');
    setPkgNote('');
  };

  if (!agent) {
    return <p className="text-sm text-black/45">{message || '加载中…'}</p>;
  }

  const catalogFallback = getAgentById(agent.slug);

  return (
    <div className="space-y-5">
      {isOnline ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          当前智能体已上架。请先下架后再编辑资料或上传新版本。
        </p>
      ) : null}

      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'profile' as const, label: '基础信息' },
            { id: 'packages' as const, label: '技能包版本' },
            { id: 'validation' as const, label: '校验记录' },
            { id: 'audit' as const, label: '操作日志' },
          ] as const
        ).map((item) => (
          <button key={item.id} type="button" onClick={() => setTab(item.id)} className={adminTabClass(tab === item.id)}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {isOnline ? (
          <button
            type="button"
            className={adminBtnPrimaryClass}
            disabled={busy}
            onClick={() => {
              if (!window.confirm('确认下架该智能体？')) return;
              void runAction('已下架', async () => {
                await adminApi.agentOffline(agent.id);
              });
            }}
          >
            下架
          </button>
        ) : (
          <button
            type="button"
            className={adminBtnPrimaryClass}
            disabled={busy}
            onClick={() => {
              if (!window.confirm('确认上架该智能体？')) return;
              void runAction('已上架', async () => {
                await adminApi.agentOnline(agent.id);
              });
            }}
          >
            上架
          </button>
        )}
      </div>

      {tab === 'profile' ? (
        <AdminCard className="p-5 space-y-4">
          <div className="flex items-center gap-4">
            {iconUrl ? (
              <img src={iconUrl} alt="" className="w-16 h-16 rounded-xl object-cover border border-[#eee]" />
            ) : catalogFallback?.iconSrc ? (
              <img src={catalogFallback.iconSrc} alt="" className="w-16 h-16 rounded-xl object-cover border border-[#eee]" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-[#f5f5f5] border border-[#eee] flex items-center justify-center text-lg font-bold text-black/35">
                {name.trim()[0] || '?'}
              </div>
            )}
            {!readonly ? (
              <label className="text-sm">
                <span className="text-black/50 block mb-1">{iconUploading ? '上传中…' : '更换图标'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={iconUploading}
                  onChange={(e) => void handleIconUpload(e.target.files?.[0] ?? null)}
                />
              </label>
            ) : null}
          </div>

          <label className="block space-y-1">
            <span className="text-sm text-black/50">名称</span>
            <input
              className={adminInputClass}
              value={name}
              disabled={readonly}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm text-black/50">简介</span>
            <textarea
              className={`${adminInputClass} min-h-[88px]`}
              value={description}
              disabled={readonly}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <div className="block space-y-1">
            <span className="text-sm text-black/50">详细描述</span>
            <AdminRichTextEditor value={detailHtml} disabled={readonly} onChange={setDetailHtml} />
          </div>

          {!readonly ? (
            <button
              type="button"
              className={adminBtnPrimaryClass}
              disabled={busy}
              onClick={() => void runAction('资料已保存', saveProfile)}
            >
              保存资料
            </button>
          ) : null}
        </AdminCard>
      ) : null}

      {tab === 'packages' ? (
        <div className="space-y-4">
          <AdminCard>
            <AdminTable
              rows={agent.packages as unknown as Array<Record<string, unknown>>}
              empty="暂无技能包版本"
              columns={[
                { key: 'version', label: '版本号' },
                {
                  key: 'validationStatus',
                  label: '校验',
                  render: (row) => <StatusBadge value={statusLabel(String(row.validationStatus))} />,
                },
                {
                  key: 'isCurrent',
                  label: '当前版本',
                  render: (row) => (row.isCurrent ? '是' : '—'),
                },
                { key: 'fileName', label: '文件名' },
                {
                  key: 'fileSize',
                  label: '大小',
                  render: (row) => `${Math.round(Number(row.fileSize) / 1024)} KB`,
                },
                {
                  key: 'createdAt',
                  label: '上传时间',
                  render: (row) => new Date(String(row.createdAt)).toLocaleString('zh-CN'),
                },
                {
                  key: 'id',
                  label: '操作',
                  render: (row) => {
                    const pkg = row as unknown as AdminAgentPackage;
                    if (readonly || pkg.validationStatus !== 'valid' || pkg.isCurrent) return '—';
                    return (
                      <button
                        type="button"
                        className="text-xs text-sky-700 hover:underline"
                        disabled={busy}
                        onClick={() =>
                          void runAction('已设为当前版本', async () => {
                            await adminApi.setAgentCurrentPackage(agent.id, pkg.id);
                          })
                        }
                      >
                        设为当前
                      </button>
                    );
                  },
                },
              ]}
            />
          </AdminCard>

          {!readonly ? (
            <AdminCard className="p-5 space-y-3">
              <p className="text-sm font-semibold text-[#111]">上传新版本</p>
              <input
                type="file"
                accept=".zip,application/zip"
                className="text-sm"
                onChange={(e) => setPkgFile(e.target.files?.[0] ?? null)}
              />
              <input
                className={adminInputClass}
                placeholder="版本号，如 1.1.0"
                value={pkgVersion}
                onChange={(e) => setPkgVersion(e.target.value)}
              />
              <input
                className={adminInputClass}
                placeholder="版本说明（可选）"
                value={pkgNote}
                onChange={(e) => setPkgNote(e.target.value)}
              />
              <button
                type="button"
                className={adminBtnPrimaryClass}
                disabled={busy || !pkgFile}
                onClick={() => void runAction('技能包已上传', uploadPackage)}
              >
                上传技能包
              </button>
            </AdminCard>
          ) : null}
        </div>
      ) : null}

      {tab === 'validation' ? (
        <AdminCard>
          <AdminTable
            rows={agent.packages as unknown as Array<Record<string, unknown>>}
            empty="暂无校验记录"
            columns={[
              { key: 'version', label: '版本' },
              {
                key: 'validationStatus',
                label: '状态',
                render: (row) => <StatusBadge value={statusLabel(String(row.validationStatus))} />,
              },
              {
                key: 'validationErrors',
                label: '错误信息',
                render: (row) => {
                  const errors = row.validationErrors as string[] | null;
                  if (!errors?.length) return '—';
                  return (
                    <ul className="text-xs text-rose-700 space-y-0.5 max-w-md whitespace-normal">
                      {errors.map((err) => (
                        <li key={err}>{err}</li>
                      ))}
                    </ul>
                  );
                },
              },
              { key: 'checksum', label: 'Checksum' },
            ]}
          />
        </AdminCard>
      ) : null}

      {tab === 'audit' ? (
        <AdminCard>
          <AdminTable
            rows={agent.auditLogs}
            empty="暂无操作日志"
            columns={[
              { key: 'action', label: '操作' },
              { key: 'module', label: '模块' },
              {
                key: 'createdAt',
                label: '时间',
                render: (row) =>
                  row.createdAt ? new Date(String(row.createdAt)).toLocaleString('zh-CN') : '—',
              },
              { key: 'actorName', label: '操作人' },
            ]}
          />
        </AdminCard>
      ) : null}
    </div>
  );
}

export function agentDrawerTitle(agent: AdminAgentDetail | null, skillId: string) {
  if (agent) return agent.name;
  return skillId || '智能体详情';
}

export function agentDrawerDesc(agent: AdminAgentDetail | null, skillId: string) {
  if (agent) return `Slug: ${agent.slug} · ${statusLabel(agent.status)}`;
  return skillId ? `Slug: ${skillId}` : undefined;
}
