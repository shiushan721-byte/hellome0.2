export type AgentMarketStatus = 'online' | 'offline';

export type PackageValidationStatus = 'pending' | 'valid' | 'invalid' | 'deprecated';

export type AdminAgentPackage = {
  id: string;
  agentId: string;
  version: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  checksum: string;
  manifest: Record<string, unknown> | null;
  validationStatus: PackageValidationStatus;
  validationErrors: string[] | null;
  releaseNote: string | null;
  skillVersionId: string | null;
  uploadedBy: string | null;
  createdAt: string;
  updatedAt: string;
  isCurrent: boolean;
};

export type AdminAgentRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  detailHtml: string | null;
  iconUrl: string;
  category: string | null;
  tags: string[] | null;
  status: AgentMarketStatus;
  currentPackageVersionId: string | null;
  currentVersion: string | null;
  packageCount: number;
  skillId: string | null;
  sortOrder: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminAgentDetail = AdminAgentRecord & {
  packages: AdminAgentPackage[];
  auditLogs: Array<Record<string, unknown>>;
};

export type PublishedAgentMarketItem = {
  agentId: string;
  slug: string;
  name: string;
  description: string;
  detailHtml: string | null;
  iconUrl: string;
  category: string | null;
  status: 'online';
  currentVersion: string | null;
  tokenRange?: string;
};
