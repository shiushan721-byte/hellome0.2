import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { Database, FileText, Info, Plus, Wallet } from 'lucide-react';
import { formatTime } from '../../components/app/tasks/TaskStatusBadge';
import { formatToken, formatTokenRange } from '../../lib/tokenBilling';
import {
  agentLabel,
  aggregateDailyBills,
  aggregateProductBills,
  filterLedgerEntries,
  fmtPercent,
  getDefaultBillingRange,
  listAgentFilterOptions,
  paginate,
  type PaginatedResult,
  type DailyTokenBillRow,
  type ProductTokenBillRow,
} from '../../lib/usageBillingViews';
import {
  getComputeStats,
  getLedger,
  getUsage,
  isLowBalance,
  subscribeUsage,
  syncUsageState,
} from '../../lib/usageStore';
import type { UsageLedgerEntry } from '../../types/workbench';
import { SIGNUP_BONUS_TOKENS } from '../../types/workbench';
import {
  formatBytes,
  getRemainingStorageBytes,
  getStorageUsage,
  purchaseStoragePackage,
  subscribeStorageUsage,
} from '../../lib/storageQuotaStore';

type TabKey = 'daily' | 'product' | 'request';

const STATUS_LABEL: Record<string, string> = {
  settled: '已完成',
  reserved: '预占中',
  refunded: '已退回',
  failed: '失败',
};

const PAGE_SIZE = 20;

export default function UsagePage() {
  useSyncExternalStore(subscribeUsage, getUsage, getUsage);
  const storageUsage = useSyncExternalStore(subscribeStorageUsage, getStorageUsage, getStorageUsage);

  const defaultRange = useMemo(() => getDefaultBillingRange(), []);
  const [activeTab, setActiveTab] = useState<TabKey>('daily');
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [dailyPage, setDailyPage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void syncUsageState().finally(() => setLoading(false));
  }, []);

  const usage = getUsage();
  const stats = getComputeStats(usage);
  const ledger = getLedger();
  const low = isLowBalance(usage);
  const storageRemaining = getRemainingStorageBytes(storageUsage);
  const storagePercent = Math.min(100, Math.round((storageUsage.usedBytes / storageUsage.quotaBytes) * 100));

  const agentOptions = useMemo(() => listAgentFilterOptions(ledger), [ledger]);

  const filteredLedger = useMemo(
    () => filterLedgerEntries(ledger, { dateFrom, dateTo, agent: selectedAgent }),
    [ledger, dateFrom, dateTo, selectedAgent],
  );

  const dailyData = useMemo(
    () => paginate(aggregateDailyBills(filteredLedger), dailyPage, PAGE_SIZE),
    [filteredLedger, dailyPage],
  );
  const productData = useMemo(
    () => paginate(aggregateProductBills(filteredLedger), productPage, PAGE_SIZE),
    [filteredLedger, productPage],
  );
  const requestData = useMemo(
    () => paginate(filteredLedger, requestPage, PAGE_SIZE),
    [filteredLedger, requestPage],
  );

  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    if (tab === 'daily') setDailyPage(1);
    else if (tab === 'product') setProductPage(1);
    else setRequestPage(1);
  }, []);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'daily', label: '日账单' },
    { key: 'product', label: '产品账单' },
    { key: 'request', label: '请求明细' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-[#111827]">计费明细</h1>
        <p className="text-sm text-black/50 mt-1">查看详细的账单流水与请求日志</p>
      </div>

      <section className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-[#f0f0f0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#F2F0ED] flex items-center justify-center text-black/70">
              <Wallet size={20} />
            </div>
            <span className="text-sm font-semibold text-[#111827]">账户总览</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/app/usage/recharge"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#d1d5db] text-xs font-medium text-[#374151] hover:bg-[#f9fafb]"
            >
              <Plus size={14} />
              充值
            </Link>
            <button
              type="button"
              disabled
              title="开票功能即将开放"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e5e7eb] text-xs font-medium text-black/35 cursor-not-allowed"
            >
              <FileText size={14} />
              去开票
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 px-5 py-5">
          <Stat label="可用余额" value={formatToken(usage.tokenBalance)} highlight={low} />
          <Stat label="赠送额度" value={formatToken(SIGNUP_BONUS_TOKENS)} />
          <Stat label="累计充值" value={formatToken(stats.lifetimePurchasedTokens)} />
          <Stat label="累计消费" value={formatToken(stats.lifetimeUsedTokens)} />
        </div>
      </section>

      {low ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
          Token 余额不足，建议及时充值算力，避免任务中断。
        </p>
      ) : null}

      <section className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-[#f0f0f0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#EEF7F1] flex items-center justify-center text-[#246B3D]">
              <Database size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#111827]">云端空间</p>
              <p className="text-xs text-black/45 mt-0.5">用于保存上传资料、过程文件和智能体生成成果</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => purchaseStoragePackage(1)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#d1d5db] text-xs font-medium text-[#374151] hover:bg-[#f9fafb]"
          >
            <Plus size={14} />
            购买 1GB 空间
          </button>
        </div>
        <div className="px-5 py-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <Stat label="总空间" value={formatBytes(storageUsage.quotaBytes)} />
            <Stat label="已使用" value={formatBytes(storageUsage.usedBytes)} highlight={storagePercent >= 90} />
            <Stat label="剩余空间" value={formatBytes(storageRemaining)} />
            <Stat label="已购买空间" value={formatBytes(storageUsage.purchasedBytes)} />
          </div>
          <div className="mt-5 h-2 rounded-full bg-[#f3f4f6] overflow-hidden">
            <div
              className={`h-full rounded-full ${storagePercent >= 90 ? 'bg-amber-500' : 'bg-[#246B3D]'}`}
              style={{ width: `${storagePercent}%` }}
            />
          </div>
          {storagePercent >= 90 ? (
            <p className="mt-3 text-xs text-amber-700">云端空间即将用完，建议购买空间后再生成较大的文档、图片或视频成果。</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm overflow-hidden flex flex-col min-h-[420px]">
        <div className="flex border-b border-[#e5e7eb] px-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.key
                  ? 'border-[#111827] text-[#111827]'
                  : 'border-transparent text-black/45 hover:text-black/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5 flex flex-col flex-1 min-h-0 gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <DateInput value={dateFrom} onChange={setDateFrom} />
            <span className="text-xs text-black/40">至</span>
            <DateInput value={dateTo} onChange={setDateTo} />
            <select
              className="h-9 rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#374151] min-w-[160px]"
              value={selectedAgent}
              onChange={(e) => {
                setSelectedAgent(e.target.value);
                setDailyPage(1);
                setProductPage(1);
                setRequestPage(1);
              }}
            >
              {agentOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-[#f9fafb] border border-[#e5e7eb] px-3 py-2 text-[#6b7280]">
            <Info size={14} className="shrink-0 mt-0.5" />
            <span className="text-xs leading-relaxed">
              {activeTab === 'daily' &&
                '该表展示按日期统计的预计 Token 上限与实扣 Token。结算比例为当日多任务按预计上限加权后的结果。'}
              {activeTab === 'product' &&
                '该表按智能体统计 Token 消耗，便于查看各场景算力占用。'}
              {activeTab === 'request' &&
                '请求明细为最终结算底账；日账单与产品账单均由此聚合。充值记录也会出现在此列表。'}
            </span>
          </div>

          <div
            className={`flex-1 min-h-0 rounded-lg border border-[#e5e7eb] overflow-hidden transition-opacity ${
              loading ? 'opacity-60' : 'opacity-100'
            }`}
          >
            {activeTab === 'daily' ? (
              <DailyTable data={dailyData} page={dailyPage} onPageChange={setDailyPage} loading={loading} />
            ) : null}
            {activeTab === 'product' ? (
              <ProductTable data={productData} page={productPage} onPageChange={setProductPage} loading={loading} />
            ) : null}
            {activeTab === 'request' ? (
              <RequestTable data={requestData} page={requestPage} onPageChange={setRequestPage} loading={loading} />
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-black/45">{label}</p>
      <p className={`text-xl font-bold font-display mt-1 ${highlight ? 'text-amber-700' : 'text-[#111827]'}`}>
        {value}
      </p>
    </div>
  );
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#374151]"
    />
  );
}

function TablePagination({
  total,
  page,
  pageSize,
  onPageChange,
}: {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-end items-center gap-2 px-4 py-3 border-t border-[#e5e7eb] bg-white">
      <span className="text-xs text-black/45">共 {total} 条</span>
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="px-2 py-1 text-xs rounded border border-[#d1d5db] disabled:opacity-40"
      >
        上一页
      </button>
      <span className="text-xs text-black/60">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="px-2 py-1 text-xs rounded border border-[#d1d5db] disabled:opacity-40"
      >
        下一页
      </button>
    </div>
  );
}

function DailyTable({
  data,
  page,
  onPageChange,
  loading,
}: {
  data: PaginatedResult<DailyTokenBillRow>;
  page: number;
  onPageChange: (page: number) => void;
  loading: boolean;
}) {
  const { items, total, pageSize } = data;
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-[#f9fafb] border-b border-[#e5e7eb]">
            <tr className="text-left text-xs text-black/50">
              <th className="px-4 py-3 font-medium">账单日期</th>
              <th className="px-4 py-3 font-medium text-right">消费 Token</th>
              <th className="px-4 py-3 font-medium text-right">预计上限 Token</th>
              <th className="px-4 py-3 font-medium text-right">结算比例（%）</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f0f0]">
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-black/35">
                  加载中…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-black/35">
                  暂无数据
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.date} className="hover:bg-[#fafafa]">
                  <td className="px-4 py-3 font-mono text-[#374151]">{row.date}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{formatToken(row.consumptionTokens)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-black/55">
                    {formatToken(row.estimatedMaxTokens)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {fmtPercent(row.settlementPercent)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <TablePagination total={total} page={page} pageSize={pageSize} onPageChange={onPageChange} />
    </>
  );
}

function ProductTable({
  data,
  page,
  onPageChange,
  loading,
}: {
  data: PaginatedResult<ProductTokenBillRow>;
  page: number;
  onPageChange: (page: number) => void;
  loading: boolean;
}) {
  const { items, total, pageSize } = data;
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead className="bg-[#f9fafb] border-b border-[#e5e7eb]">
            <tr className="text-left text-xs text-black/50">
              <th className="px-4 py-3 font-medium">智能体名称</th>
              <th className="px-4 py-3 font-medium">产品类型</th>
              <th className="px-4 py-3 font-medium text-right">消费 Token</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f0f0]">
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-black/35">
                  加载中…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-black/35">
                  暂无数据
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.agent} className="hover:bg-[#fafafa]">
                  <td className="px-4 py-3 font-medium text-[#111827]">{row.agentLabel}</td>
                  <td className="px-4 py-3 text-black/55">{row.agent}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">
                    {formatToken(row.consumptionTokens)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <TablePagination total={total} page={page} pageSize={pageSize} onPageChange={onPageChange} />
    </>
  );
}

function RequestTable({
  data,
  page,
  onPageChange,
  loading,
}: {
  data: PaginatedResult<UsageLedgerEntry>;
  page: number;
  onPageChange: (page: number) => void;
  loading: boolean;
}) {
  const { items, total, pageSize } = data;
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[960px]">
          <thead className="bg-[#f9fafb] border-b border-[#e5e7eb]">
            <tr className="text-left text-xs text-black/50">
              <th className="px-4 py-3 font-medium">记录名称</th>
              <th className="px-4 py-3 font-medium">时间</th>
              <th className="px-4 py-3 font-medium">智能体</th>
              <th className="px-4 py-3 font-medium text-right">预计 Token</th>
              <th className="px-4 py-3 font-medium text-right">实扣 Token</th>
              <th className="px-4 py-3 font-medium">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f0f0]">
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-black/35">
                  加载中…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-black/35">
                  暂无数据
                </td>
              </tr>
            ) : (
              items.map((entry) => (
                <tr key={entry.id} className="hover:bg-[#fafafa]">
                  <td className="px-4 py-3 font-medium text-[#111827]">{entry.taskName}</td>
                  <td className="px-4 py-3 text-xs text-black/50 whitespace-nowrap">{formatTime(entry.time)}</td>
                  <td className="px-4 py-3 text-xs text-black/55">{agentLabel(entry.agent)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-black/55 tabular-nums">
                    {entry.kind === 'topup'
                      ? entry.note || '—'
                      : formatTokenRange({ min: entry.estimatedTokenMin, max: entry.estimatedTokenMax })}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs font-semibold tabular-nums">
                    {entry.kind === 'topup' ? '+' : '-'}
                    {formatToken(entry.tokenUsed)}
                  </td>
                  <td className="px-4 py-3 text-xs text-black/55">
                    {entry.kind === 'topup' ? '充值' : STATUS_LABEL[entry.status] ?? entry.status}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <TablePagination total={total} page={page} pageSize={pageSize} onPageChange={onPageChange} />
    </>
  );
}
