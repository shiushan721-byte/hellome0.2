import type express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import type { createAuthKit } from '../../../复用组件库/auth-login-kit/server-auth-kit';
import {
  createAdminAgentWithPackage,
  getAdminAgentDetail,
  listAdminAgents,
  setAdminAgentCurrentPackage,
  setAdminAgentOffline,
  setAdminAgentOnline,
  updateAdminAgent,
  uploadAdminAgentPackage,
} from './adminAgentService';
import { auditFromRequest, writeAuditLog } from './auditLogService';
import { packagesDir } from './skillPackageValidation';

type AuthKit = ReturnType<typeof createAuthKit>;

function actorFromSession(session: NonNullable<ReturnType<AuthKit['currentSession']>>) {
  return {
    id: session.user.phone || session.user.email || session.id,
    name: session.user.name,
  };
}

const tmpDir = path.join(packagesDir(), 'tmp');
fs.mkdirSync(tmpDir, { recursive: true });
const iconDir = path.join(process.cwd(), 'public', 'uploads');
fs.mkdirSync(iconDir, { recursive: true });

const agentUpload = multer({
  dest: tmpDir,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'icon') {
      if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
      else cb(new Error('图标仅支持 JPG / PNG / WebP'));
      return;
    }
    if (file.fieldname === 'package') {
      const isZip =
        file.mimetype === 'application/zip' ||
        file.mimetype === 'application/x-zip-compressed' ||
        file.originalname.toLowerCase().endsWith('.zip');
      if (isZip) cb(null, true);
      else cb(new Error('技能包仅支持 .zip'));
      return;
    }
    cb(null, true);
  },
});

function saveIconFile(file: { path: string; originalname: string }): string {
  const ext = path.extname(file.originalname) || '.png';
  const filename = `${Date.now()}-icon${ext}`;
  const dest = path.join(iconDir, filename);
  fs.renameSync(file.path, dest);
  return `/uploads/${filename}`;
}

export function registerAdminAgentRoutes(
  app: express.Express,
  requireAdmin: express.RequestHandler,
  authKit: AuthKit,
): void {
  app.get('/api/admin/agents', requireAdmin, async (_req, res) => {
    try {
      const data = await listAdminAgents();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : '读取智能体失败' });
    }
  });

  app.get('/api/admin/agents/:agentId', requireAdmin, async (req, res) => {
    try {
      const data = await getAdminAgentDetail(req.params.agentId);
      if (!data) {
        res.status(404).json({ success: false, error: '智能体不存在' });
        return;
      }
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : '读取智能体详情失败' });
    }
  });

  app.post(
    '/api/admin/agents/upload',
    requireAdmin,
    agentUpload.fields([
      { name: 'icon', maxCount: 1 },
      { name: 'package', maxCount: 1 },
    ]),
    async (req, res) => {
      try {
        const session = (req as express.Request & { adminSession: NonNullable<ReturnType<AuthKit['currentSession']>> })
          .adminSession;
        const iconFile = req.files && 'icon' in req.files ? req.files.icon?.[0] : undefined;
        const packageFile = req.files && 'package' in req.files ? req.files.package?.[0] : undefined;
        if (!iconFile || !packageFile) {
          res.status(400).json({ success: false, error: '请同时上传图标和技能包' });
          return;
        }

        const data = await createAdminAgentWithPackage({
          actorId: actorFromSession(session).id,
          iconUrl: saveIconFile(iconFile),
          name: String(req.body?.name ?? ''),
          description: String(req.body?.description ?? ''),
          detailHtml: String(req.body?.detailHtml ?? '').trim() || undefined,
          version: String(req.body?.version ?? '1.0.0'),
          releaseNote: String(req.body?.releaseNote ?? '').trim() || undefined,
          packagePath: packageFile.path,
          packageFileName: packageFile.originalname,
        });

        await writeAuditLog(
          auditFromRequest(req, actorFromSession(session), {
            module: 'agent',
            action: 'create_agent',
            targetType: 'agent',
            targetId: data?.id,
            after: data,
          }),
        );

        res.json({ success: true, data });
      } catch (error) {
        res.status(400).json({ success: false, error: error instanceof Error ? error.message : '创建智能体失败' });
      }
    },
  );

  app.put('/api/admin/agents/:agentId', requireAdmin, async (req, res) => {
    try {
      const session = (req as express.Request & { adminSession: NonNullable<ReturnType<AuthKit['currentSession']>> })
        .adminSession;
      const data = await updateAdminAgent(req.params.agentId, {
        actorId: actorFromSession(session).id,
        name: req.body?.name,
        description: req.body?.description,
        detailHtml: req.body?.detailHtml,
        iconUrl: req.body?.iconUrl,
      });
      await writeAuditLog(
        auditFromRequest(req, actorFromSession(session), {
          module: 'agent',
          action: 'update_agent',
          targetType: 'agent',
          targetId: data?.id,
          after: req.body,
        }),
      );
      res.json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : '保存智能体失败' });
    }
  });

  app.post('/api/admin/agents/:agentId/packages', requireAdmin, agentUpload.single('package'), async (req, res) => {
    try {
      const session = (req as express.Request & { adminSession: NonNullable<ReturnType<AuthKit['currentSession']>> })
        .adminSession;
      if (!req.file) {
        res.status(400).json({ success: false, error: '请上传技能包文件' });
        return;
      }
      const data = await uploadAdminAgentPackage(req.params.agentId, {
        actorId: actorFromSession(session).id,
        version: String(req.body?.version ?? ''),
        releaseNote: String(req.body?.releaseNote ?? '').trim() || undefined,
        packagePath: req.file.path,
        packageFileName: req.file.originalname,
      });
      await writeAuditLog(
        auditFromRequest(req, actorFromSession(session), {
          module: 'agent',
          action: 'upload_package',
          targetType: 'agent',
          targetId: data?.id,
        }),
      );
      res.json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : '上传技能包失败' });
    }
  });

  app.post('/api/admin/agents/:agentId/packages/:packageId/set-current', requireAdmin, async (req, res) => {
    try {
      const session = (req as express.Request & { adminSession: NonNullable<ReturnType<AuthKit['currentSession']>> })
        .adminSession;
      const data = await setAdminAgentCurrentPackage(
        req.params.agentId,
        req.params.packageId,
        actorFromSession(session).id,
      );
      res.json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : '设置当前版本失败' });
    }
  });

  app.post('/api/admin/agents/:agentId/online', requireAdmin, async (req, res) => {
    try {
      const session = (req as express.Request & { adminSession: NonNullable<ReturnType<AuthKit['currentSession']>> })
        .adminSession;
      const data = await setAdminAgentOnline(req.params.agentId, actorFromSession(session).id);
      await writeAuditLog(
        auditFromRequest(req, actorFromSession(session), {
          module: 'agent',
          action: 'online',
          targetType: 'agent',
          targetId: data?.id,
        }),
      );
      res.json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : '上架失败' });
    }
  });

  app.post('/api/admin/agents/:agentId/offline', requireAdmin, async (req, res) => {
    try {
      const session = (req as express.Request & { adminSession: NonNullable<ReturnType<AuthKit['currentSession']>> })
        .adminSession;
      const data = await setAdminAgentOffline(req.params.agentId, actorFromSession(session).id);
      await writeAuditLog(
        auditFromRequest(req, actorFromSession(session), {
          module: 'agent',
          action: 'offline',
          targetType: 'agent',
          targetId: data?.id,
        }),
      );
      res.json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : '下架失败' });
    }
  });

  app.post('/api/admin/agents/:agentId/icon', requireAdmin, agentUpload.single('icon'), async (req, res) => {
    try {
      const session = (req as express.Request & { adminSession: NonNullable<ReturnType<AuthKit['currentSession']>> })
        .adminSession;
      if (!req.file) {
        res.status(400).json({ success: false, error: '请上传图标' });
        return;
      }
      const iconUrl = saveIconFile(req.file);
      const data = await updateAdminAgent(req.params.agentId, {
        actorId: actorFromSession(session).id,
        iconUrl,
      });
      res.json({ success: true, data: { iconUrl, agent: data } });
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : '上传图标失败' });
    }
  });
}
