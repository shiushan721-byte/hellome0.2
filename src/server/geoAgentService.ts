import { getPrismaClient } from './db/prisma';
import type { Task, TaskStatus, TaskStep } from '../types/workbench';
import type { GeoTaskInput } from '../types/workbench';

const GEO_STEPS = [
  { key: 'understanding', title: '解析品牌与对标信息' },
  { key: 'searching', title: '扫描 AI 平台可见度' },
  { key: 'analyzing', title: '分析竞品占位权重' },
  { key: 'reporting', title: '生成 GEO 优化诊断报告' },
] as const;

function buildGeoSteps(status: TaskStatus = 'draft'): TaskStep[] {
  return GEO_STEPS.map((step, index) => ({
    id: `geo-step-${index}`,
    name: step.title,
    status: status === 'running' && index === 0 ? 'active' : 'pending',
    tokenUsed: 0,
  }));
}

export type CreateGeoTaskPayload = {
  input: GeoTaskInput;
  userExternalId: string;
  workspaceName?: string;
};

export async function createGeoTask(payload: CreateGeoTaskPayload): Promise<Task> {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error('Database not initialized');
  }

  let user = await prisma.user.findUnique({ where: { externalId: payload.userExternalId } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        externalId: payload.userExternalId,
        displayName: 'Guest User',
      },
    });
  }

  const workspaceSlug = payload.workspaceName ? `ws-${payload.workspaceName}` : `ws-${user.id}`;
  let workspace = await prisma.workspace.findUnique({ where: { slug: workspaceSlug } });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: payload.workspaceName || 'My Workspace',
        slug: workspaceSlug,
        ownerId: user.id,
      },
    });
  }

  const dbTask = await prisma.task.create({
    data: {
      name: `${payload.input.brandName} - GEO 检测`,
      agentType: 'geo',
      status: 'draft',
      userId: user.id,
      workspaceId: workspace.id,
      estimatedTokenMin: 8000,
      estimatedTokenMax: 30000,
      input: {
        create: {
          platform: 'N/A',
          effectGoal: 'N/A',
          sellingPoint: payload.input.keywords || 'N/A',
          payload: payload.input as any, // Option A: Brand logic saved here!
        },
      },
      steps: {
        create: GEO_STEPS.map((step, index) => ({
          key: step.key,
          title: step.title,
          orderIndex: index,
          status: 'pending',
        })),
      },
    },
    include: {
      input: true,
      steps: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  return {
    id: dbTask.id,
    name: dbTask.name,
    agentType: 'geo',
    status: dbTask.status as TaskStatus,
    createdAt: dbTask.createdAt.toISOString(),
    estimatedTokenMin: dbTask.estimatedTokenMin,
    estimatedTokenMax: dbTask.estimatedTokenMax,
    tokenUsed: dbTask.tokenUsed,
    steps: buildGeoSteps(dbTask.status as TaskStatus),
    logs: [],
    input: payload.input,
  };
}

export async function startGeoTask(taskId: string): Promise<void> {
  const prisma = getPrismaClient();
  if (!prisma) return;

  await prisma.task.update({
    where: { id: taskId },
    data: { status: 'running', startedAt: new Date() },
  });

  setTimeout(async () => {
    try {
      await updateGeoStepStatus(taskId, 'understanding', 'completed');
      await updateGeoStepStatus(taskId, 'searching', 'active');
      await new Promise(resolve => setTimeout(resolve, 3000));

      await updateGeoStepStatus(taskId, 'searching', 'completed');
      await updateGeoStepStatus(taskId, 'analyzing', 'active');
      await new Promise(resolve => setTimeout(resolve, 3000));

      await updateGeoStepStatus(taskId, 'analyzing', 'completed');
      await updateGeoStepStatus(taskId, 'reporting', 'active');
      await new Promise(resolve => setTimeout(resolve, 3000));

      await updateGeoStepStatus(taskId, 'reporting', 'completed');
      
      await prisma.taskArtifact.create({
        data: {
          taskId,
          type: 'report',
          label: 'GEO 优化诊断报告',
          fileName: 'geo-report.md',
          metadata: {
            success: true,
            score: 85,
            visibility: '78%',
            comment: '品牌整体占位表现良好',
          },
        },
      });

      await prisma.task.update({
        where: { id: taskId },
        data: { status: 'completed', completedAt: new Date() },
      });
    } catch (e) {
      console.error('GEO task simulation failed:', e);
      await prisma.task.update({
        where: { id: taskId },
        data: { status: 'failed' },
      });
    }
  }, 1000);
}

async function updateGeoStepStatus(taskId: string, stepKey: string, status: string) {
  const prisma = getPrismaClient();
  if (!prisma) return;

  const step = await prisma.taskStep.findFirst({
    where: { taskId, key: stepKey },
  });

  if (step) {
    await prisma.taskStep.update({
      where: { id: step.id },
      data: { status },
    });
  }
}
