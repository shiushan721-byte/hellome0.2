import type { Task, TaskStatus } from '../../../types/workbench';

const statusConfig: Record<
  TaskStatus,
  { label: string; className: string }
> = {
  draft: { label: '草稿', className: 'bg-black/5 text-black/45' },
  queued: { label: '排队中', className: 'bg-violet-50 text-violet-700' },
  awaiting_input: { label: '等待参数', className: 'bg-cyan-50 text-cyan-700' },
  running: { label: '执行中', className: 'bg-blue-50 text-blue-700' },
  waiting_confirmation: { label: '等待确认', className: 'bg-amber-50 text-amber-700' },
  completed: { label: '已完成', className: 'bg-emerald-50 text-emerald-700' },
  failed: { label: '失败', className: 'bg-red-50 text-red-600' },
  cancelled: { label: '已取消', className: 'bg-black/5 text-black/45' },
};

export default function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const cfg = statusConfig[status];
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

export function formatDuration(ms?: number): string {
  if (!ms) return '—';
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec} 秒`;
  return `${Math.floor(sec / 60)} 分 ${sec % 60} 秒`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function agentLabel(type: Task['agentType']): string {
  const map = { geo: 'GEO 智能体', media: 'UGC 视频广告生成', sales: '销售获客智能体' };
  return map[type];
}
