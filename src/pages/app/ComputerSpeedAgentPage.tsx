import { useMemo, useState } from 'react';
import {
  BellOff,
  Bot,
  CheckCircle2,
  Clipboard,
  Gauge,
  MonitorCog,
  MousePointerClick,
  Play,
  ShieldAlert,
  Sparkles,
  Trash2,
  Wifi,
} from 'lucide-react';
import { getAgentById } from '../../data/agentsCatalog';

type ScenarioId = 'popup' | 'pet' | 'startup' | 'browser' | 'disk' | 'network';
type DeviceType = 'windows' | 'mac' | 'unknown';
type RunStatus = 'idle' | 'running' | 'ready';

type SpeedDraft = {
  deviceType: DeviceType;
  symptom: string;
  selectedScenarios: ScenarioId[];
  allowCloseApps: boolean;
  allowChangeStartup: boolean;
  allowBrowserCleanup: boolean;
};

type Scenario = {
  id: ScenarioId;
  title: string;
  desc: string;
  icon: typeof BellOff;
  defaultEnabled?: boolean;
};

type ActionPlan = {
  summary: string;
  quickActions: string[];
  steps: Array<{ title: string; detail: string; risk: '低' | '中' }>;
  checks: string[];
  pet: string;
};

const AGENT_ID = 'computer-speed';

const scenarios: Scenario[] = [
  {
    id: 'popup',
    title: '弹窗广告关闭',
    desc: '定位高频弹窗来源，整理通知、启动项和可疑常驻程序。',
    icon: BellOff,
    defaultEnabled: true,
  },
  {
    id: 'pet',
    title: '桌宠开启',
    desc: '打开轻量桌宠提醒，显示加速建议和清理进度。',
    icon: Bot,
    defaultEnabled: true,
  },
  {
    id: 'startup',
    title: '开机启动优化',
    desc: '梳理开机自启、后台常驻和系统托盘程序。',
    icon: Gauge,
  },
  {
    id: 'browser',
    title: '浏览器变干净',
    desc: '处理网页通知、异常扩展、主页篡改和缓存膨胀。',
    icon: MousePointerClick,
  },
  {
    id: 'disk',
    title: '磁盘空间释放',
    desc: '识别下载、临时文件、安装包和大文件占用。',
    icon: Trash2,
  },
  {
    id: 'network',
    title: '网络卡顿自检',
    desc: '排查代理、DNS、Wi-Fi 和后台下载造成的卡顿。',
    icon: Wifi,
  },
];

const initialDraft: SpeedDraft = {
  deviceType: 'windows',
  symptom: '',
  selectedScenarios: scenarios.filter((item) => item.defaultEnabled).map((item) => item.id),
  allowCloseApps: true,
  allowChangeStartup: true,
  allowBrowserCleanup: true,
};

export default function ComputerSpeedAgentPage() {
  const agent = getAgentById(AGENT_ID);
  const [draft, setDraft] = useState<SpeedDraft>(initialDraft);
  const [status, setStatus] = useState<RunStatus>('idle');
  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedScenarioLabels = useMemo(
    () => scenarios.filter((item) => draft.selectedScenarios.includes(item.id)).map((item) => item.title),
    [draft.selectedScenarios],
  );

  const toggleScenario = (id: ScenarioId) => {
    setDraft((current) => {
      const exists = current.selectedScenarios.includes(id);
      const next = exists
        ? current.selectedScenarios.filter((item) => item !== id)
        : [...current.selectedScenarios, id];
      return { ...current, selectedScenarios: next.length ? next : [id] };
    });
  };

  const runOptimize = async () => {
    setStatus('running');
    setPlan(null);
    await new Promise((resolve) => window.setTimeout(resolve, 520));
    setPlan(buildActionPlan(draft));
    setStatus('ready');
  };

  const copyPlan = async () => {
    if (!plan) return;
    await navigator.clipboard.writeText(formatPlan(plan));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="min-h-full bg-[#F5F6F3] px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
      <div className="grid min-h-[calc(100vh-112px)] gap-4 xl:grid-cols-[408px_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col rounded-2xl border border-black/8 bg-white shadow-sm">
          <header className="border-b border-black/8 px-5 py-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E8F4EE] text-[#1F6F4A]">
                <MonitorCog className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-black/85">{agent?.name ?? '计算机速度优化智能体'}</h1>
                <p className="mt-1 text-sm leading-6 text-black/50">
                  面向普通用户，把电脑变慢、弹窗广告、桌宠开启和浏览器混乱拆成可执行清单。
                </p>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold text-black/45">设备类型</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[
                    ['windows', 'Windows'],
                    ['mac', 'Mac'],
                    ['unknown', '不确定'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDraft((current) => ({ ...current, deviceType: value as DeviceType }))}
                      className={`h-10 rounded-xl border text-sm font-bold ${
                        draft.deviceType === value
                          ? 'border-[#1F6F4A] bg-[#E8F4EE] text-[#1F6F4A]'
                          : 'border-black/10 bg-white text-black/55'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="text-xs font-bold text-black/45">功能输入</span>
                <textarea
                  value={draft.symptom}
                  onChange={(event) => setDraft((current) => ({ ...current, symptom: event.target.value }))}
                  placeholder="例如：电脑开机很慢，右下角一直弹广告，浏览器首页被改了；希望开启一个桌宠提醒我清理。"
                  className="mt-2 min-h-32 w-full resize-none rounded-2xl border border-black/10 bg-[#FCFCFD] px-4 py-3 text-sm leading-6 outline-none focus:border-[#1F6F4A]/45"
                />
              </label>

              <div>
                <p className="text-xs font-bold text-black/45">要处理的功能</p>
                <div className="mt-2 grid gap-2">
                  {scenarios.map((item) => {
                    const Icon = item.icon;
                    const selected = draft.selectedScenarios.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleScenario(item.id)}
                        className={`flex items-start gap-3 rounded-2xl border px-3 py-3 text-left ${
                          selected ? 'border-[#1F6F4A]/35 bg-[#F1FAF5]' : 'border-black/8 bg-white'
                        }`}
                      >
                        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-[#1F6F4A] text-white' : 'bg-black/5 text-black/45'}`}>
                          <Icon className="h-4.5 w-4.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-black/78">{item.title}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-black/45">{item.desc}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-black/8 bg-[#FCFCFD] p-4">
                <p className="text-xs font-bold text-black/45">授权偏好</p>
                <div className="mt-3 space-y-3">
                  <ToggleLine
                    checked={draft.allowCloseApps}
                    label="允许建议关闭后台程序"
                    onChange={(value) => setDraft((current) => ({ ...current, allowCloseApps: value }))}
                  />
                  <ToggleLine
                    checked={draft.allowChangeStartup}
                    label="允许建议调整开机启动项"
                    onChange={(value) => setDraft((current) => ({ ...current, allowChangeStartup: value }))}
                  />
                  <ToggleLine
                    checked={draft.allowBrowserCleanup}
                    label="允许建议清理浏览器扩展和通知"
                    onChange={(value) => setDraft((current) => ({ ...current, allowBrowserCleanup: value }))}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => void runOptimize()}
                disabled={status === 'running'}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Play className="h-4 w-4" />
                {status === 'running' ? '正在生成优化方案...' : '生成速度优化方案'}
              </button>
            </div>
          </div>
        </section>

        <section className="min-h-0 rounded-2xl border border-black/8 bg-white shadow-sm">
          <div className="flex h-full min-h-0 flex-col">
            <header className="border-b border-black/8 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-black/85">优化执行台</p>
                  <p className="mt-1 text-sm text-black/45">
                    {selectedScenarioLabels.length ? selectedScenarioLabels.join(' / ') : '等待选择功能'}
                  </p>
                </div>
                <span className="rounded-full bg-[#E8F4EE] px-3 py-1 text-xs font-bold text-[#1F6F4A]">
                  {status === 'ready' ? '方案已生成' : status === 'running' ? '分析中' : '待输入'}
                </span>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {plan ? (
                <div className="mx-auto max-w-4xl space-y-5 pb-8">
                  <section className="rounded-2xl border border-black/8 bg-[#FCFCFD] p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E8F4EE] text-[#1F6F4A]">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-base font-bold text-black/82">智能体判断</p>
                        <p className="mt-2 text-sm leading-7 text-black/58">{plan.summary}</p>
                      </div>
                    </div>
                  </section>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
                    <section className="rounded-2xl border border-black/8 bg-white p-5">
                      <p className="text-base font-bold text-black/82">执行步骤</p>
                      <div className="mt-4 space-y-3">
                        {plan.steps.map((step, index) => (
                          <div key={step.title} className="rounded-2xl border border-black/8 bg-[#FCFCFD] p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-start gap-3">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
                                  {index + 1}
                                </span>
                                <div>
                                  <p className="text-sm font-bold text-black/78">{step.title}</p>
                                  <p className="mt-1 text-sm leading-6 text-black/52">{step.detail}</p>
                                </div>
                              </div>
                              <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${step.risk === '低' ? 'bg-[#E8F4EE] text-[#1F6F4A]' : 'bg-[#FFF2D8] text-[#8A5A00]'}`}>
                                {step.risk}风险
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <aside className="space-y-4">
                      <Panel title="快捷动作" icon={CheckCircle2} items={plan.quickActions} />
                      <Panel title="完成后检查" icon={ShieldAlert} items={plan.checks} />
                      <section className="rounded-2xl border border-black/8 bg-[#FCFCFD] p-5">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-[#1F6F4A]" />
                          <p className="text-sm font-bold text-black/78">桌宠状态</p>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-black/55">{plan.pet}</p>
                      </section>
                    </aside>
                  </div>

                  <button
                    type="button"
                    onClick={() => void copyPlan()}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-bold text-black/62 hover:border-black/20"
                  >
                    <Clipboard className="h-4 w-4" />
                    {copied ? '已复制方案' : '复制方案'}
                  </button>
                </div>
              ) : (
                <EmptyState status={status} />
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ToggleLine({ checked, label, onChange }: { checked: boolean; label: string; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-sm font-semibold text-black/58">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#1F6F4A]"
      />
    </label>
  );
}

function Panel({ title, icon: Icon, items }: { title: string; icon: typeof CheckCircle2; items: string[] }) {
  return (
    <section className="rounded-2xl border border-black/8 bg-white p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#1F6F4A]" />
        <p className="text-sm font-bold text-black/78">{title}</p>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="text-sm leading-6 text-black/55">
            - {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function EmptyState({ status }: { status: RunStatus }) {
  return (
    <div className="flex min-h-[560px] items-center justify-center">
      <div className="max-w-sm rounded-2xl border border-black/8 bg-[#FCFCFD] px-8 py-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F4EE] text-[#1F6F4A]">
          <Gauge className="h-7 w-7" />
        </div>
        <p className="mt-4 text-lg font-bold text-black/82">
          {status === 'running' ? '正在分析电脑卡顿原因' : '等待生成优化方案'}
        </p>
        <p className="mt-2 text-sm leading-6 text-black/45">
          左侧输入现象并选择功能后，智能体会输出普通用户也能照做的处理步骤。
        </p>
      </div>
    </div>
  );
}

function buildActionPlan(draft: SpeedDraft): ActionPlan {
  const selected = new Set(draft.selectedScenarios);
  const device = draft.deviceType === 'mac' ? 'Mac' : draft.deviceType === 'windows' ? 'Windows' : '当前设备';
  const symptom = draft.symptom.trim() || '用户希望减少电脑卡顿、弹窗干扰和后台占用。';
  const steps: ActionPlan['steps'] = [
    {
      title: '先做安全快照',
      detail: `${device} 优化前先记录当前问题：${symptom} 不建议直接卸载未知程序，先截图弹窗名称和出现时间。`,
      risk: '低',
    },
  ];

  if (selected.has('popup')) {
    steps.push({
      title: '定位弹窗广告来源',
      detail: draft.deviceType === 'mac'
        ? '打开系统设置里的通知列表，关闭陌生应用通知；再检查浏览器网站通知，撤销不认识站点的提醒权限。'
        : '打开任务管理器和系统通知设置，优先处理最近安装、名称陌生、常驻托盘的程序；浏览器里同步关闭可疑网站通知。',
      risk: '低',
    });
  }

  if (selected.has('startup') && draft.allowChangeStartup) {
    steps.push({
      title: '整理开机启动项',
      detail: draft.deviceType === 'mac'
        ? '在登录项里保留输入法、网盘等必要项目，暂停不常用工具的后台启动，观察下次开机速度。'
        : '在任务管理器的启动应用中禁用高影响、低频使用的软件，例如下载器、会议助手、驱动伴侣和营销弹窗组件。',
      risk: '中',
    });
  }

  if (selected.has('browser') && draft.allowBrowserCleanup) {
    steps.push({
      title: '恢复浏览器秩序',
      detail: '检查扩展程序、默认搜索引擎、启动页和网站通知。只保留明确知道用途的扩展，缓存可以清理，密码和自动填充不要勾选删除。',
      risk: '低',
    });
  }

  if (selected.has('disk')) {
    steps.push({
      title: '释放可见空间',
      detail: '优先处理下载文件夹、安装包、录屏视频和压缩包。系统目录、驱动目录、微信/企业微信数据目录先不要整夹删除。',
      risk: '中',
    });
  }

  if (selected.has('network')) {
    steps.push({
      title: '排查网络卡顿',
      detail: '暂停网盘同步和游戏下载，关闭不需要的代理/VPN，重新连接 Wi-Fi 后测试网页、视频和应用商店是否恢复。',
      risk: '低',
    });
  }

  if (draft.allowCloseApps) {
    steps.push({
      title: '关闭高占用后台',
      detail: '按 CPU、内存、网络占用排序，只关闭自己认识且当前不用的软件。杀毒、驱动、系统服务和正在保存文件的程序不要强制结束。',
      risk: '低',
    });
  }

  const quickActions = [
    selected.has('popup') ? '关闭陌生网站通知和右下角弹窗来源' : '记录卡顿出现时间和正在运行的软件',
    selected.has('startup') ? '禁用低频软件开机自启' : '保留必要启动项，先不做大改动',
    selected.has('browser') ? '删除异常扩展，恢复默认启动页' : '检查浏览器是否存在主页篡改',
    selected.has('disk') ? '清理下载和安装包大文件' : '查看磁盘剩余空间是否低于 15%',
  ];

  return {
    summary: `${device} 的优化重点是先减少干扰源，再处理后台占用。智能体不会建议一键删除系统文件，会把每一步拆成可回退的动作。`,
    quickActions,
    steps,
    checks: [
      '重启一次，观察开机到可操作桌面的时间。',
      '打开浏览器 5 分钟，确认没有新弹窗和主页跳转。',
      '任务管理器或活动监视器中 CPU 空闲时应回落到较低水平。',
      '常用软件能正常打开后，再进行下一轮深度清理。',
    ],
    pet: selected.has('pet')
      ? '建议开启轻量桌宠：默认只显示加速提醒、清理进度和休息提示，不自动关闭程序。'
      : '本次未开启桌宠。可以稍后把桌宠作为常驻提醒，用于提示后台占用和定期清理。',
  };
}

function formatPlan(plan: ActionPlan): string {
  return [
    `智能体判断：${plan.summary}`,
    '',
    '快捷动作：',
    ...plan.quickActions.map((item) => `- ${item}`),
    '',
    '执行步骤：',
    ...plan.steps.map((step, index) => `${index + 1}. ${step.title}（${step.risk}风险）：${step.detail}`),
    '',
    '完成后检查：',
    ...plan.checks.map((item) => `- ${item}`),
    '',
    `桌宠状态：${plan.pet}`,
  ].join('\n');
}
