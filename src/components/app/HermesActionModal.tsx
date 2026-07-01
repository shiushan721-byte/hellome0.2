import { AlertTriangle, Download, ExternalLink, X } from 'lucide-react';
import { pairHermesWithCurrentAccount, type HermesConnectionStatus } from '../../lib/hermesConnection';
import { HERMES_DOWNLOAD_URL } from '../../lib/firstRunOnboarding';
import { createPortal } from 'react-dom';

export default function HermesActionModal({
  status,
  onClose,
  onOpenHermes,
  onPairedComplete,
  variant = 'default',
}: {
  status: HermesConnectionStatus;
  onClose: () => void;
  onOpenHermes: () => void;
  onGoPair?: () => void;
  onPairedComplete?: () => void;
  variant?: 'default' | 'pairing';
}) {
  const isOffline = status === 'offline';
  const isNotPaired = status === 'not_paired' || status === 'account_mismatch';
  const isNotInstalled = status === 'capability_missing';
  const pairingMode = variant === 'pairing' || isNotPaired;

  const title = pairingMode
    ? '连接你的个人智能引擎'
    : isOffline
      ? 'Hz-Hermes 当前离线'
      : isNotInstalled
        ? '请先安装 Hz-Hermes'
        : '请先完成 Hz-Hermes 配对';

  const desc = pairingMode
    ? 'HelloMe 负责发起任务，Hz-Hermes 负责在你的电脑上执行任务。使用智能体前，请先下载 Hz-Hermes，并用当前 HelloMe 账号完成一键配对。'
    : isOffline
      ? '检测到 Hz-Hermes 未在线。启动 Hz-Hermes 后即可继续使用智能体功能。'
      : isNotInstalled
        ? 'HelloMe 智能体依赖 Hz-Hermes 执行。请先安装并打开 Hz-Hermes，再回到当前页面。'
        : '未检测到配对关系。请打开 Hz-Hermes 并使用同账号完成一键配对后再继续。';

  const modal = (
    <div className="fixed inset-0 z-[70] bg-black/35 flex items-center justify-center p-4 sm:p-6">
      <div
        className="relative w-full max-w-2xl bg-white border border-black/10 rounded-2xl shadow-xl p-6 sm:p-7 space-y-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hermes-action-modal-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full inline-flex items-center justify-center text-black/40 hover:text-black hover:bg-black/[0.06] transition-colors"
          aria-label="关闭"
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </button>

        <div className="pr-10">
          <h3 id="hermes-action-modal-title" className="text-xl font-semibold tracking-tight">
            {title}
          </h3>
          <p className="text-sm text-black/55 mt-2 leading-relaxed">{desc}</p>
        </div>

        {pairingMode && (
          <ol className="rounded-xl border border-black/10 bg-[#F7F9FB] px-5 py-4 space-y-2 text-sm text-black/65 list-decimal list-inside">
            <li>下载 Hz-Hermes</li>
            <li>使用同一个账号登录</li>
            <li>一键配对</li>
          </ol>
        )}

        <div className="flex flex-nowrap items-center gap-2">
          {(pairingMode || isNotInstalled) && (
            <a
              href={HERMES_DOWNLOAD_URL}
              target="_blank"
              rel="noreferrer"
              className="flex-1 min-w-0 h-11 px-3 rounded-lg bg-black text-white text-sm font-medium hover:bg-black/90 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-4 h-4 shrink-0" />
              下载 Hz-Hermes
            </a>
          )}
          {pairingMode && (
            <button
              type="button"
              onClick={() => {
                pairHermesWithCurrentAccount();
                onPairedComplete?.();
              }}
              className="flex-1 min-w-0 h-11 px-3 rounded-lg border border-black/12 bg-white text-sm font-medium hover:bg-black/[0.02] whitespace-nowrap"
            >
              我已完成配对
            </button>
          )}
          {(isOffline || isNotInstalled || pairingMode) && (
            <button
              type="button"
              onClick={onOpenHermes}
              className="flex-1 min-w-0 h-11 px-3 rounded-lg border border-black/12 bg-white text-sm font-medium hover:bg-black/[0.02] inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              打开 Hz-Hermes
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-w-0 h-11 px-3 rounded-lg border border-black/12 bg-white text-sm font-medium text-black/60 hover:bg-black/[0.02] whitespace-nowrap"
          >
            稍后再说
          </button>
        </div>

        {(isOffline || isNotInstalled) && !pairingMode && (
          <p className="text-xs text-amber-700 inline-flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Hz-Hermes 恢复在线后即可继续使用智能体。
          </p>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
