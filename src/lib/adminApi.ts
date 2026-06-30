import type {
  SkillBusinessFrame,
  SkillBusinessFrameUpdate,
  SkillDebugInput,
  SkillDebugResult,
  SkillRecord,
  SkillVersionRecord,
} from '../types/skills';

type AgentOrchestratorView = {
  agentId: string;
  name: string;
  slug: string;
  status: SkillRecord['status'];
  currentVersion: number;
  updatedAt: string;
  businessFrame: SkillBusinessFrame;
  stageCount: number;
  confirmationCount: number;
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });

  const text = await response.text();
  let payload: { success: boolean; data?: T; error?: string };
  try {
    payload = text ? (JSON.parse(text) as { success: boolean; data?: T; error?: string }) : { success: false, error: '空响应' };
  } catch {
    const hint = text.trimStart().startsWith('<!')
      ? '接口返回了 HTML 而非 JSON，请确认开发服务已重启且 API 路由已注册'
      : '接口返回了无效 JSON';
    throw new Error(hint);
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? `请求失败 (${response.status})`);
  }

  return payload.data as T;
}

export type AdminUserDetail = {
  profile: Record<string, unknown>;
  summary: Record<string, unknown>;
  topups: Array<Record<string, unknown>>;
  ledgers: Array<Record<string, unknown>>;
  tasks: Array<Record<string, unknown>>;
  artifacts: Array<Record<string, unknown>>;
  devices: Array<Record<string, unknown>>;
  gnomicBinding: Record<string, unknown> | null;
  auditLogs: Array<Record<string, unknown>>;
};

export type AdminUsersListResult = {
  total: number;
  page: number;
  pageSize: number;
  users: Array<Record<string, unknown>>;
};

export const adminApi = {
  dashboard: () => requestJson<{
    users: number;
    tasks: number;
    completedTasks: number;
    topups: number;
    gnomicBindings: number;
    publishedConfigs: number;
    dbConnected: boolean;
  }>('/api/admin/dashboard'),

  users: (params?: {
    q?: string;
    status?: string;
    hasHermes?: boolean;
    hasGnomic?: boolean;
    hasTopup?: boolean;
    lowBalance?: boolean;
    page?: number;
    pageSize?: number;
  }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.status) search.set('status', params.status);
    if (params?.hasHermes !== undefined) search.set('hasHermes', String(params.hasHermes));
    if (params?.hasGnomic !== undefined) search.set('hasGnomic', String(params.hasGnomic));
    if (params?.hasTopup !== undefined) search.set('hasTopup', String(params.hasTopup));
    if (params?.lowBalance) search.set('lowBalance', 'true');
    if (params?.page) search.set('page', String(params.page));
    if (params?.pageSize) search.set('pageSize', String(params.pageSize));
    const qs = search.toString();
    return requestJson<AdminUsersListResult>(`/api/admin/users${qs ? `?${qs}` : ''}`);
  },
  user: (id: string) => requestJson<AdminUserDetail>(`/api/admin/users/${id}`),
  adjustTokens: (
    id: string,
    body: { type?: string; tokenAmount: number; reason?: string; note?: string },
  ) => requestJson(`/api/admin/users/${id}/token-adjustments`, { method: 'POST', body: JSON.stringify(body) }),

  orders: () => requestJson<Array<Record<string, unknown>>>('/api/admin/orders'),
  rechargePacks: () => requestJson<Array<Record<string, unknown>>>('/api/admin/recharge-packs'),
  tasks: () => requestJson<Array<Record<string, unknown>>>('/api/admin/tasks'),
  artifacts: () => requestJson<Array<Record<string, unknown>>>('/api/admin/artifacts'),

  frontendConfigs: (scope?: string) =>
    requestJson<Array<Record<string, unknown>>>(
      scope ? `/api/admin/frontend-configs?scope=${encodeURIComponent(scope)}` : '/api/admin/frontend-configs',
    ),
  saveFrontendConfig: (body: Record<string, unknown>) =>
    requestJson('/api/admin/frontend-configs', { method: 'POST', body: JSON.stringify(body) }),
  publishFrontendConfig: (id: string) =>
    requestJson(`/api/admin/frontend-configs/${id}/publish`, { method: 'POST' }),

  homeConfig: () => requestJson<import('../types/homePageConfig').AdminHomeConfigState>('/api/admin/home-config'),
  saveHomeConfig: (body: {
    configId?: string | null;
    draftId?: string | null;
    config: import('../types/homePageConfig').HomePageConfigPayload;
  }) =>
    requestJson<{
      configId: string;
      status: string;
      version: number;
      updatedAt: string;
    }>('/api/admin/home-config', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  workflowTemplates: () => requestJson<Array<Record<string, unknown>>>('/api/admin/workflow-templates'),
  updateWorkflowTemplate: (templateId: string, body: Record<string, unknown>) =>
    requestJson(`/api/admin/workflow-templates/${templateId}`, { method: 'PUT', body: JSON.stringify(body) }),

  gnomicBindings: () => requestJson<Array<Record<string, unknown>>>('/api/admin/integrations/gnomic/bindings'),
  auditLogs: () => requestJson<Array<Record<string, unknown>>>('/api/admin/audit-logs'),
  skills: (params?: { layer?: string; q?: string }) => {
    const search = new URLSearchParams();
    if (params?.layer) search.set('layer', params.layer);
    if (params?.q) search.set('q', params.q);
    const qs = search.toString();
    return requestJson<{ total: number; byLayer: Record<string, number>; skills: Array<Record<string, unknown>> }>(
      `/api/admin/skills${qs ? `?${qs}` : ''}`,
    );
  },
  debugInfo: () =>
    requestJson<{
      nodeEnv: string;
      databaseUrlConfigured: boolean;
      allowInmemoryFallback: boolean;
      dashboard: Record<string, unknown>;
      skillLayers: Record<string, number>;
    }>('/api/admin/debug/info'),

  studioSkills: () => requestJson<SkillRecord[]>('/api/admin/studio/skills'),
  studioSkill: (skillId: string) => requestJson<SkillRecord>(`/api/admin/studio/skills/${skillId}`),
  updateStudioSkill: (
    skillId: string,
    body: { name: string; description?: string; latestVersion: SkillVersionRecord },
  ) =>
    requestJson<SkillRecord>(`/api/admin/studio/skills/${skillId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  studioSkillVersions: (skillId: string) =>
    requestJson<SkillVersionRecord[]>(`/api/admin/studio/skills/${skillId}/versions`),
  publishStudioSkill: (skillId: string) =>
    requestJson<SkillRecord>(`/api/admin/studio/skills/${skillId}/publish`, { method: 'POST' }),
  debugStudioSkill: (skillId: string, input: SkillDebugInput) =>
    requestJson<SkillDebugResult>(`/api/admin/studio/skills/${skillId}/debug`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  rollbackStudioSkill: (skillId: string, versionId: string) =>
    requestJson<SkillRecord>(`/api/admin/studio/skills/${skillId}/rollback`, {
      method: 'POST',
      body: JSON.stringify({ versionId }),
    }),
  studioAgents: () => requestJson<AgentOrchestratorView[]>('/api/admin/studio/agents'),
  studioAgent: (agentId: string) => requestJson<AgentOrchestratorView>(`/api/admin/studio/agents/${agentId}`),
  updateStudioAgentBusiness: (agentId: string, patch: SkillBusinessFrameUpdate) =>
    requestJson<AgentOrchestratorView>(`/api/admin/studio/agents/${agentId}/business`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  agents: () => requestJson<import('../types/adminAgent').AdminAgentRecord[]>('/api/admin/agents'),
  agent: (agentId: string) => requestJson<import('../types/adminAgent').AdminAgentDetail>(`/api/admin/agents/${agentId}`),
  updateAgent: (
    agentId: string,
    body: { name?: string; description?: string; detailHtml?: string; iconUrl?: string; category?: string },
  ) =>
    requestJson(`/api/admin/agents/${agentId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  agentOnline: (agentId: string) => requestJson(`/api/admin/agents/${agentId}/online`, { method: 'POST' }),
  agentOffline: (agentId: string) => requestJson(`/api/admin/agents/${agentId}/offline`, { method: 'POST' }),
  setAgentCurrentPackage: (agentId: string, packageId: string) =>
    requestJson(`/api/admin/agents/${agentId}/packages/${packageId}/set-current`, { method: 'POST' }),
  async createAgentUpload(formData: FormData) {
    const response = await fetch('/api/admin/agents/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    const json = (await response.json()) as { success: boolean; data?: unknown; error?: string };
    if (!response.ok || !json.success) throw new Error(json.error ?? '创建智能体失败');
    return json.data;
  },
  async uploadAgentPackage(agentId: string, formData: FormData) {
    const response = await fetch(`/api/admin/agents/${agentId}/packages`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    const json = (await response.json()) as { success: boolean; data?: unknown; error?: string };
    if (!response.ok || !json.success) throw new Error(json.error ?? '上传技能包失败');
    return json.data;
  },
  async uploadAgentIcon(agentId: string, file: File) {
    const formData = new FormData();
    formData.append('icon', file);
    const response = await fetch(`/api/admin/agents/${agentId}/icon`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    const json = (await response.json()) as { success: boolean; data?: { iconUrl: string }; error?: string };
    if (!response.ok || !json.success) throw new Error(json.error ?? '上传图标失败');
    return json.data as { iconUrl: string };
  },
};
