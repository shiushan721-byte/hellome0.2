import fs from 'node:fs';
import path from 'node:path';
import { getPrismaClient } from '../db/prisma';
import { listAuditLogs } from './auditLogService';
import {
  assertAgentProfileInput,
  computeFileChecksum,
  packagesDir,
  slugifyAgentId,
  validateSkillPackageArchive,
} from './skillPackageValidation';
import type {
  AdminAgentDetail,
  AdminAgentPackage,
  AdminAgentRecord,
  AgentMarketStatus,
  PackageValidationStatus,
  PublishedAgentMarketItem,
} from '../../types/adminAgent';

type MemoryAgent = AdminAgentRecord & { packages: AdminAgentPackage[] };
const memoryAgents = new Map<string, MemoryAgent>();

function nowIso() {
  return new Date().toISOString();
}

function toRecord(agent: MemoryAgent): AdminAgentRecord {
  const current = agent.packages.find((pkg) => pkg.id === agent.currentPackageVersionId) ?? null;
  return {
    id: agent.id,
    slug: agent.slug,
    name: agent.name,
    description: agent.description,
    detailHtml: agent.detailHtml ?? null,
    iconUrl: agent.iconUrl,
    category: agent.category,
    tags: agent.tags,
    status: agent.status,
    currentPackageVersionId: agent.currentPackageVersionId,
    currentVersion: current?.version ?? null,
    packageCount: agent.packages.length,
    skillId: agent.skillId,
    sortOrder: agent.sortOrder,
    createdBy: agent.createdBy,
    updatedBy: agent.updatedBy,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  };
}

function prismaAgentToRecord(row: any, packageCount: number, currentVersion: string | null): AdminAgentRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    detailHtml: row.detailHtml ?? null,
    iconUrl: row.iconUrl,
    category: row.category ?? null,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : null,
    status: row.status as AgentMarketStatus,
    currentPackageVersionId: row.currentPackageVersionId ?? null,
    currentVersion,
    packageCount,
    skillId: row.skillId ?? null,
    sortOrder: row.sortOrder ?? 0,
    createdBy: row.createdBy ?? null,
    updatedBy: row.updatedBy ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function prismaPackageToDto(row: any, currentPackageVersionId: string | null): AdminAgentPackage {
  return {
    id: row.id,
    agentId: row.agentId,
    version: row.version,
    fileName: row.fileName,
    fileUrl: row.fileUrl,
    fileSize: row.fileSize,
    checksum: row.checksum,
    manifest: (row.manifest as Record<string, unknown> | null) ?? null,
    validationStatus: row.validationStatus as PackageValidationStatus,
    validationErrors: Array.isArray(row.validationErrors) ? (row.validationErrors as string[]) : null,
    releaseNote: row.releaseNote ?? null,
    skillVersionId: row.skillVersionId ?? null,
    uploadedBy: row.uploadedBy ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    isCurrent: row.id === currentPackageVersionId,
  };
}

async function loadMemoryAgent(agentId: string): Promise<MemoryAgent | null> {
  const byId = memoryAgents.get(agentId);
  if (byId) return byId;
  for (const agent of memoryAgents.values()) {
    if (agent.slug === agentId) return agent;
  }
  return null;
}

function ensureOffline(agent: AdminAgentRecord, action: string) {
  if (agent.status === 'online') {
    throw new Error(`当前智能体已上架，请先下架后再${action}`);
  }
}

export async function listAdminAgents(): Promise<AdminAgentRecord[]> {
  const prisma = getPrismaClient();
  if (prisma) {
    try {
      const rows = await prisma.agent.findMany({
        include: {
          packages: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
      });
      return rows.map((row) => {
        const current = row.packages.find((pkg) => pkg.id === row.currentPackageVersionId) ?? row.packages[0];
        return prismaAgentToRecord(row, row.packages.length, current?.version ?? null);
      });
    } catch {
      // fall through
    }
  }

  return [...memoryAgents.values()].map(toRecord).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getAdminAgentDetail(agentId: string): Promise<AdminAgentDetail | null> {
  const prisma = getPrismaClient();
  if (prisma) {
    try {
      const row = await prisma.agent.findFirst({
        where: { OR: [{ id: agentId }, { slug: agentId }] },
        include: { packages: { orderBy: { createdAt: 'desc' } } },
      });
      if (!row) return null;
      const packages = row.packages.map((pkg) => prismaPackageToDto(pkg, row.currentPackageVersionId));
      const auditLogs = (await listAuditLogs()).filter(
        (log) => log.targetId === row.id || packages.some((pkg) => pkg.id === log.targetId),
      );
      return {
        ...prismaAgentToRecord(
          row,
          row.packages.length,
          packages.find((pkg) => pkg.isCurrent)?.version ?? null,
        ),
        packages,
        auditLogs: auditLogs as Array<Record<string, unknown>>,
      };
    } catch {
      // fall through
    }
  }

  const agent = await loadMemoryAgent(agentId);
  if (!agent) return null;
  const logs = (await listAuditLogs()).filter((log) => log.targetId === agent.id);
  return {
    ...toRecord(agent),
    packages: agent.packages.map((pkg) => ({
      ...pkg,
      isCurrent: pkg.id === agent.currentPackageVersionId,
    })),
    auditLogs: logs as Array<Record<string, unknown>>,
  };
}

export async function createAdminAgentWithPackage(input: {
  actorId: string;
  iconUrl: string;
  name: string;
  description: string;
  detailHtml?: string;
  category?: string;
  version: string;
  releaseNote?: string;
  packagePath: string;
  packageFileName: string;
}) {
  const profile = assertAgentProfileInput({ name: input.name, description: input.description });
  const validation = validateSkillPackageArchive(input.packagePath);
  const checksum = computeFileChecksum(input.packagePath);
  const slug = slugifyAgentId(validation.manifest?.skillId || profile.name);
  if (!slug) throw new Error('无法生成智能体 slug');

  const destName = `${Date.now()}-${path.basename(input.packageFileName)}`;
  const destPath = path.join(packagesDir(), destName);
  fs.copyFileSync(input.packagePath, destPath);
  const fileUrl = `/uploads/packages/${destName}`;

  const prisma = getPrismaClient();
  if (prisma) {
    const existing = await prisma.agent.findUnique({ where: { slug } });
    if (existing) throw new Error('智能体 slug 已存在，请修改 manifest.skillId 或名称');

    const agent = await prisma.agent.create({
      data: {
        slug,
        name: profile.name,
        description: profile.description,
        detailHtml: input.detailHtml?.trim() || null,
        iconUrl: input.iconUrl,
        category: input.category?.trim() || null,
        status: 'offline',
        skillId: validation.manifest?.skillId ?? slug,
        createdBy: input.actorId,
        updatedBy: input.actorId,
        packages: {
          create: {
            version: input.version.trim(),
            fileName: input.packageFileName,
            fileUrl,
            fileSize: fs.statSync(destPath).size,
            checksum,
            manifest: validation.manifest as object | undefined,
            validationStatus: validation.valid ? 'valid' : 'invalid',
            validationErrors: validation.errors.length ? validation.errors : undefined,
            releaseNote: input.releaseNote?.trim() || null,
            uploadedBy: input.actorId,
          },
        },
      },
      include: { packages: true },
    });

    const pkg = agent.packages[0];
    if (validation.valid && pkg) {
      await prisma.agent.update({
        where: { id: agent.id },
        data: { currentPackageVersionId: pkg.id },
      });
    }

    return getAdminAgentDetail(agent.id);
  }

  if ([...memoryAgents.values()].some((agent) => agent.slug === slug)) {
    throw new Error('智能体 slug 已存在');
  }
  const id = `agent-${Date.now().toString(36)}`;
  const pkgId = `pkg-${Date.now().toString(36)}`;
  const pkg: AdminAgentPackage = {
    id: pkgId,
    agentId: id,
    version: input.version.trim(),
    fileName: input.packageFileName,
    fileUrl,
    fileSize: fs.statSync(destPath).size,
    checksum,
    manifest: validation.manifest,
    validationStatus: validation.valid ? 'valid' : 'invalid',
    validationErrors: validation.errors.length ? validation.errors : null,
    releaseNote: input.releaseNote?.trim() || null,
    skillVersionId: null,
    uploadedBy: input.actorId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    isCurrent: validation.valid,
  };
  const agent: MemoryAgent = {
    id,
    slug,
    name: profile.name,
    description: profile.description,
    detailHtml: input.detailHtml?.trim() || null,
    iconUrl: input.iconUrl,
    category: input.category?.trim() || null,
    tags: null,
    status: 'offline',
    currentPackageVersionId: validation.valid ? pkgId : null,
    currentVersion: validation.valid ? pkg.version : null,
    packageCount: 1,
    skillId: validation.manifest?.skillId ?? slug,
    sortOrder: 0,
    createdBy: input.actorId,
    updatedBy: input.actorId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    packages: [pkg],
  };
  memoryAgents.set(id, agent);
  return getAdminAgentDetail(id);
}

export async function updateAdminAgent(
  agentId: string,
  input: {
    actorId: string;
    name?: string;
    description?: string;
    detailHtml?: string;
    iconUrl?: string;
    category?: string;
  },
) {
  const detail = await getAdminAgentDetail(agentId);
  if (!detail) throw new Error('智能体不存在');
  ensureOffline(detail, '编辑资料');

  const profile = assertAgentProfileInput({
    name: input.name ?? detail.name,
    description: input.description ?? detail.description,
  });

  const prisma = getPrismaClient();
  if (prisma) {
    await prisma.agent.update({
      where: { id: detail.id },
      data: {
        name: profile.name,
        description: profile.description,
        detailHtml: input.detailHtml?.trim() || null,
        iconUrl: input.iconUrl?.trim() || detail.iconUrl,
        category: input.category?.trim() || detail.category,
        updatedBy: input.actorId,
      },
    });
    return getAdminAgentDetail(detail.id);
  }

  const agent = await loadMemoryAgent(detail.id);
  if (!agent) throw new Error('智能体不存在');
  agent.name = profile.name;
  agent.description = profile.description;
  if (input.detailHtml !== undefined) agent.detailHtml = input.detailHtml?.trim() || null;
  if (input.iconUrl?.trim()) agent.iconUrl = input.iconUrl.trim();
  if (input.category !== undefined) agent.category = input.category?.trim() || null;
  agent.updatedBy = input.actorId;
  agent.updatedAt = nowIso();
  return getAdminAgentDetail(agent.id);
}

export async function uploadAdminAgentPackage(
  agentId: string,
  input: {
    actorId: string;
    version: string;
    releaseNote?: string;
    packagePath: string;
    packageFileName: string;
  },
) {
  const detail = await getAdminAgentDetail(agentId);
  if (!detail) throw new Error('智能体不存在');
  ensureOffline(detail, '上传新版本');

  const validation = validateSkillPackageArchive(input.packagePath);
  const checksum = computeFileChecksum(input.packagePath);
  const destName = `${Date.now()}-${path.basename(input.packageFileName)}`;
  const destPath = path.join(packagesDir(), destName);
  fs.copyFileSync(input.packagePath, destPath);
  const fileUrl = `/uploads/packages/${destName}`;

  const prisma = getPrismaClient();
  if (prisma) {
    const existing = detail.packages.find((pkg) => pkg.version === input.version.trim());
    if (existing) throw new Error('该版本号已存在');

    await prisma.agentSkillPackage.create({
      data: {
        agentId: detail.id,
        version: input.version.trim(),
        fileName: input.packageFileName,
        fileUrl,
        fileSize: fs.statSync(destPath).size,
        checksum,
        manifest: validation.manifest as object | undefined,
        validationStatus: validation.valid ? 'valid' : 'invalid',
        validationErrors: validation.errors.length ? validation.errors : undefined,
        releaseNote: input.releaseNote?.trim() || null,
        uploadedBy: input.actorId,
      },
    });
    await prisma.agent.update({
      where: { id: detail.id },
      data: { updatedBy: input.actorId },
    });
    return getAdminAgentDetail(detail.id);
  }

  const agent = await loadMemoryAgent(detail.id);
  if (!agent) throw new Error('智能体不存在');
  if (agent.packages.some((pkg) => pkg.version === input.version.trim())) {
    throw new Error('该版本号已存在');
  }
  const pkg: AdminAgentPackage = {
    id: `pkg-${Date.now().toString(36)}`,
    agentId: agent.id,
    version: input.version.trim(),
    fileName: input.packageFileName,
    fileUrl,
    fileSize: fs.statSync(destPath).size,
    checksum,
    manifest: validation.manifest,
    validationStatus: validation.valid ? 'valid' : 'invalid',
    validationErrors: validation.errors.length ? validation.errors : null,
    releaseNote: input.releaseNote?.trim() || null,
    skillVersionId: null,
    uploadedBy: input.actorId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    isCurrent: false,
  };
  agent.packages.unshift(pkg);
  agent.packageCount = agent.packages.length;
  agent.updatedBy = input.actorId;
  agent.updatedAt = nowIso();
  return getAdminAgentDetail(agent.id);
}

export async function setAdminAgentCurrentPackage(agentId: string, packageId: string, actorId: string) {
  const detail = await getAdminAgentDetail(agentId);
  if (!detail) throw new Error('智能体不存在');
  ensureOffline(detail, '切换当前版本');
  const pkg = detail.packages.find((item) => item.id === packageId);
  if (!pkg) throw new Error('技能包版本不存在');
  if (pkg.validationStatus !== 'valid') throw new Error('只能选择校验通过的版本');

  const prisma = getPrismaClient();
  if (prisma) {
    await prisma.agent.update({
      where: { id: detail.id },
      data: { currentPackageVersionId: packageId, updatedBy: actorId },
    });
    return getAdminAgentDetail(detail.id);
  }

  const agent = await loadMemoryAgent(detail.id);
  if (!agent) throw new Error('智能体不存在');
  agent.currentPackageVersionId = packageId;
  agent.currentVersion = pkg.version;
  agent.updatedBy = actorId;
  agent.updatedAt = nowIso();
  return getAdminAgentDetail(agent.id);
}

function validateBeforeOnline(detail: AdminAgentDetail) {
  const errors: string[] = [];
  if (!detail.iconUrl?.trim()) errors.push('请上传智能体图标');
  if (!detail.name?.trim()) errors.push('请填写智能体名称');
  if (!detail.description?.trim()) errors.push('请填写智能体简介');
  const current = detail.packages.find((pkg) => pkg.id === detail.currentPackageVersionId);
  if (!current) errors.push('请先设置当前技能包版本');
  else if (current.validationStatus !== 'valid') errors.push('当前技能包版本未通过校验');
  if (errors.length > 0) throw new Error(errors.join('；'));
}

export async function setAdminAgentOnline(agentId: string, actorId: string) {
  const detail = await getAdminAgentDetail(agentId);
  if (!detail) throw new Error('智能体不存在');
  validateBeforeOnline(detail);

  const prisma = getPrismaClient();
  if (prisma) {
    await prisma.agent.update({
      where: { id: detail.id },
      data: { status: 'online', updatedBy: actorId },
    });
    return getAdminAgentDetail(detail.id);
  }

  const agent = await loadMemoryAgent(detail.id);
  if (!agent) throw new Error('智能体不存在');
  agent.status = 'online';
  agent.updatedBy = actorId;
  agent.updatedAt = nowIso();
  return getAdminAgentDetail(agent.id);
}

export async function setAdminAgentOffline(agentId: string, actorId: string) {
  const detail = await getAdminAgentDetail(agentId);
  if (!detail) throw new Error('智能体不存在');

  const prisma = getPrismaClient();
  if (prisma) {
    await prisma.agent.update({
      where: { id: detail.id },
      data: { status: 'offline', updatedBy: actorId },
    });
    return getAdminAgentDetail(detail.id);
  }

  const agent = await loadMemoryAgent(detail.id);
  if (!agent) throw new Error('智能体不存在');
  agent.status = 'offline';
  agent.updatedBy = actorId;
  agent.updatedAt = nowIso();
  return getAdminAgentDetail(agent.id);
}

export async function listOnlineAgentsForMarket(): Promise<PublishedAgentMarketItem[]> {
  const prisma = getPrismaClient();
  if (prisma) {
    try {
      const rows = await prisma.agent.findMany({
        where: { status: 'online' },
        include: { packages: true },
        orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
      });
      return rows.map((row) => {
        const current = row.packages.find((pkg) => pkg.id === row.currentPackageVersionId);
        return {
          agentId: row.slug,
          slug: row.slug,
          name: row.name,
          description: row.description,
          detailHtml: row.detailHtml ?? null,
          iconUrl: row.iconUrl,
          category: row.category,
          status: 'online' as const,
          currentVersion: current?.version ?? null,
        };
      });
    } catch {
      // fall through
    }
  }

  return [...memoryAgents.values()]
    .filter((agent) => agent.status === 'online')
    .map((agent) => ({
      agentId: agent.slug,
      slug: agent.slug,
      name: agent.name,
      description: agent.description,
      detailHtml: agent.detailHtml ?? null,
      iconUrl: agent.iconUrl,
      category: agent.category,
      status: 'online' as const,
      currentVersion: agent.currentVersion,
    }));
}

export async function seedAdminAgentsFromSkills(
  items: Array<{
    slug: string;
    name: string;
    description: string;
    iconUrl: string;
    category?: string;
    status: AgentMarketStatus;
    version: string;
    skillId: string;
  }>,
) {
  const prisma = getPrismaClient();
  if (!prisma) return;

  for (const item of items) {
    const existing = await prisma.agent.findUnique({ where: { slug: item.slug } });
    if (existing) {
      await prisma.agent.update({
        where: { id: existing.id },
        data: {
          name: item.name,
          description: item.description,
          iconUrl: item.iconUrl,
          category: item.category ?? null,
          status: item.status,
          skillId: item.skillId,
          updatedBy: 'seed',
        },
      });
      continue;
    }

    const agent = await prisma.agent.create({
      data: {
        slug: item.slug,
        name: item.name,
        description: item.description,
        iconUrl: item.iconUrl,
        category: item.category ?? null,
        status: item.status,
        skillId: item.skillId,
        createdBy: 'seed',
        updatedBy: 'seed',
        packages: {
          create: {
            version: item.version,
            fileName: `${item.slug}-${item.version}.zip`,
            fileUrl: `/uploads/packages/seed-${item.slug}.zip`,
            fileSize: 0,
            checksum: 'seed',
            manifest: {
              skillId: item.skillId,
              version: item.version,
              name: item.name,
              description: item.description,
              entry: 'skill/index.js',
              runtime: { type: 'hermes', minVersion: '0.2.3' },
            },
            validationStatus: 'valid',
            releaseNote: '种子数据',
            uploadedBy: 'seed',
          },
        },
      },
      include: { packages: true },
    });

    const pkg = agent.packages[0];
    if (pkg) {
      await prisma.agent.update({
        where: { id: agent.id },
        data: { currentPackageVersionId: pkg.id },
      });
    }
  }
}
