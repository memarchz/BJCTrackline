import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../db';

describe('Extended Backend APIs Integration Tests', () => {
  let userCookie: string;
  let adminCookie: string;

  const testUsers = ['TEST_EXT_U1', 'TEST_EXT_U2', 'TEST_EXT_ADMIN1'];

  beforeEach(async () => {
    // Setup Master Data Users
    await prisma.masterDataUser.upsert({
      where: { empNo: 'TEST_EXT_U1' },
      update: {},
      create: { empNo: 'TEST_EXT_U1', name: 'User One', email: 'u1@bjc.co.th', team: 'Purchasing', cobuName: 'BJC' },
    });
    await prisma.masterDataUser.upsert({
      where: { empNo: 'TEST_EXT_U2' },
      update: {},
      create: { empNo: 'TEST_EXT_U2', name: 'User Two', email: 'u2@bjc.co.th', team: 'Purchasing', cobuName: 'BJC' },
    });
    await prisma.masterDataUser.upsert({
      where: { empNo: 'TEST_EXT_ADMIN1' },
      update: {},
      create: { empNo: 'TEST_EXT_ADMIN1', name: 'Admin One', email: 'admin1@bjc.co.th', team: 'Purchasing', cobuName: 'BJC' },
    });

    await prisma.tlRole.upsert({
      where: { empNo: 'TEST_EXT_U1' },
      update: {},
      create: { empNo: 'TEST_EXT_U1', isAdmin: false },
    });
    await prisma.tlRole.upsert({
      where: { empNo: 'TEST_EXT_U2' },
      update: {},
      create: { empNo: 'TEST_EXT_U2', isAdmin: false },
    });
    await prisma.tlRole.upsert({
      where: { empNo: 'TEST_EXT_ADMIN1' },
      update: {},
      create: { empNo: 'TEST_EXT_ADMIN1', isAdmin: true },
    });

    const userLogin = await request(app).post('/api/auth/login').send({ identifier: 'TEST_EXT_U1', password: 'correct-password' });
    userCookie = userLogin.headers['set-cookie'][0];

    const adminLogin = await request(app).post('/api/auth/login').send({ identifier: 'TEST_EXT_ADMIN1', password: 'correct-password' });
    adminCookie = adminLogin.headers['set-cookie'][0];
  });

  afterEach(async () => {
    // Delete specifically created tasks, subtasks, logs, attachments, chats, notifications, tor requests, and roles
    await prisma.starredTask.deleteMany({ where: { userId: { in: testUsers } } }).catch(() => {});
    await prisma.taskAssignee.deleteMany({ where: { userId: { in: testUsers } } }).catch(() => {});
    await prisma.subtask.deleteMany({ where: { assigneeId: { in: testUsers } } }).catch(() => {});
    await prisma.taskLogEntry.deleteMany({ where: { byId: { in: testUsers } } }).catch(() => {});
    await prisma.attachment.deleteMany({ where: { uploadedById: { in: testUsers } } }).catch(() => {});
    await prisma.task.deleteMany({ where: { createdById: { in: testUsers } } }).catch(() => {});
    await prisma.torRequest.deleteMany({ where: { requesterId: { in: testUsers } } }).catch(() => {});
    await prisma.message.deleteMany({ where: { fromId: { in: testUsers } } }).catch(() => {});
    await prisma.conversationRead.deleteMany({ where: { userId: { in: testUsers } } }).catch(() => {});
    await prisma.conversation.deleteMany({ where: { OR: [{ dmUserAId: { in: testUsers } }, { dmUserBId: { in: testUsers } }] } }).catch(() => {});
    await prisma.notification.deleteMany({ where: { userId: { in: testUsers } } }).catch(() => {});
    await prisma.tlRole.deleteMany({ where: { empNo: { in: testUsers } } }).catch(() => {});
    await prisma.masterDataUser.deleteMany({ where: { empNo: { in: testUsers } } }).catch(() => {});
  });

  describe('User API (/api/users)', () => {
    it('should list all users', async () => {
      const res = await request(app).get('/api/users').set('Cookie', [userCookie]);
      expect(res.status).toBe(200);
      expect(res.body.users.length).toBeGreaterThan(0);
    });

    it('should reject modification methods with 400 Bad Request', async () => {
      const pRes = await request(app).post('/api/users').set('Cookie', [adminCookie]).send({});
      expect(pRes.status).toBe(400);

      const dRes = await request(app).delete('/api/users/TEST_EXT_U1').set('Cookie', [adminCookie]);
      expect(dRes.status).toBe(400);
    });
  });

  describe('Teams API (/api/teams)', () => {
    it('should load team lists, details and performance trend metrics', async () => {
      // 1. GET /api/teams
      const listRes = await request(app).get('/api/teams').set('Cookie', [userCookie]);
      expect(listRes.status).toBe(200);

      // 2. GET /api/teams/:id
      const detailRes = await request(app).get('/api/teams/Purchasing').set('Cookie', [userCookie]);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.team.name).toBe('Purchasing');

      // 3. GET /api/teams/:id/performance
      const perfRes = await request(app).get('/api/teams/Purchasing/performance').set('Cookie', [userCookie]);
      expect(perfRes.status).toBe(200);

      // 4. GET /api/teams/:id/completion-trend
      const trendRes = await request(app).get('/api/teams/Purchasing/completion-trend').set('Cookie', [userCookie]);
      expect(trendRes.status).toBe(200);

      // 5. GET /api/teams/:id/members/:memberId/completion-trend
      const mTrendRes = await request(app).get('/api/teams/Purchasing/members/TEST_EXT_U1/completion-trend').set('Cookie', [userCookie]);
      expect(mTrendRes.status).toBe(200);
    });
  });

  describe('TOR Requests API (/api/tor)', () => {
    it('should handle creation and admin step-review workflows', async () => {
      // 1. Submit TOR Request
      const createRes = await request(app)
        .post('/api/tor')
        .set('Cookie', [userCookie])
        .send({
          project: 'Procurement Server upgrade',
          code: 'TOR-2026-001',
          dept: 'Purchasing',
          amount: 150000,
          openedDate: new Date().toISOString(),
        });
      expect(createRes.status).toBe(201);
      const torId = createRes.body.request.id;

      // 2. Load TOR Requests list
      const listRes = await request(app).get('/api/tor').set('Cookie', [userCookie]);
      expect(listRes.status).toBe(200);
      expect(listRes.body.requests.length).toBeGreaterThan(0);

      // 3. Review / Advance TOR request (Admin only)
      const reviewRes = await request(app)
        .patch(`/api/tor/${torId}/review`)
        .set('Cookie', [adminCookie])
        .send({
          action: 'advance',
          comment: 'Approved for TOR level',
        });
      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.request.status).toBe('tor'); // Step advanced from 0 to 1
    });
  });

  describe('Dashboard API (/api/dashboard)', () => {
    it('should return personal dashboard stats and trends', async () => {
      const statsRes = await request(app).get('/api/dashboard').set('Cookie', [userCookie]);
      expect(statsRes.status).toBe(200);

      const trendRes = await request(app).get('/api/dashboard/completion-trend').set('Cookie', [userCookie]);
      expect(trendRes.status).toBe(200);
    });
  });

  describe('Notification API (/api/notifications)', () => {
    it('should process user notifications', async () => {
      // Seed a notification manually
      const notif = await prisma.notification.create({
        data: {
          userId: 'TEST_EXT_U1',
          type: 'comment',
          text: 'New comment on your task',
        },
      });

      // GET /api/notifications
      const getRes = await request(app).get('/api/notifications').set('Cookie', [userCookie]);
      expect(getRes.status).toBe(200);
      expect(getRes.body.notifications.length).toBe(1);

      // PATCH /api/notifications/:id/read
      const readRes = await request(app).patch(`/api/notifications/${notif.id}/read`).set('Cookie', [userCookie]);
      expect(readRes.status).toBe(204);

      // DELETE /api/notifications
      const clearRes = await request(app).delete('/api/notifications').set('Cookie', [userCookie]);
      expect(clearRes.status).toBe(204);
    });
  });

  describe('Chat API (/api/conversations)', () => {
    it('should direct message another user and load rooms/messages', async () => {
      // 1. Start DM with User Two
      const startRes = await request(app)
        .post('/api/conversations/dm/TEST_EXT_U2')
        .set('Cookie', [userCookie]);
      expect(startRes.status).toBe(200);
      const convoId = startRes.body.conversationId;

      // 2. Send Message
      const sendRes = await request(app)
        .post(`/api/conversations/${convoId}/messages`)
        .set('Cookie', [userCookie])
        .send({ text: 'Hello User Two!' });
      expect(sendRes.status).toBe(201);

      // 3. Read Messages
      const getMsgsRes = await request(app)
        .get(`/api/conversations/${convoId}/messages`)
        .set('Cookie', [userCookie]);
      expect(getMsgsRes.status).toBe(200);
      expect(getMsgsRes.body.messages.length).toBe(1);

      // 4. Mark room as read
      const readRes = await request(app)
        .post(`/api/conversations/${convoId}/read`)
        .set('Cookie', [userCookie]);
      expect(readRes.status).toBe(204);
    });
  });

  describe('Subtask & Attachment API Workflow Updates', () => {
    it('should handle subtask completion transitions and attachment download restrictions', async () => {
      // 1. Create a task with a subtask
      const createRes = await request(app)
        .post('/api/tasks')
        .set('Cookie', [userCookie])
        .send({
          title: 'Work Task',
          teamId: 'Purchasing',
          priority: 'medium',
          impact: 'medium',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          subtasks: [
            { title: 'Subtask Checklist Item', assigneeId: 'TEST_EXT_U2' },
          ],
        });
      const task = createRes.body.task;
      const subtask = task.subtasks[0];

      // Login as U2
      const u2Login = await request(app).post('/api/auth/login').send({ identifier: 'TEST_EXT_U2', password: 'correct-password' });
      const u2Cookie = u2Login.headers['set-cookie'][0];

      // 2. Start Subtask
      const startSub = await request(app)
        .post(`/api/tasks/${task.id}/subtasks/${subtask.id}/start`)
        .set('Cookie', [u2Cookie]);
      expect(startSub.status).toBe(200);

      // 3. Submit Subtask
      const submitSub = await request(app)
        .post(`/api/tasks/${task.id}/subtasks/${subtask.id}/submit`)
        .set('Cookie', [u2Cookie]);
      expect(submitSub.status).toBe(200);

      // 4. Approve Subtask (Task Owner approves)
      const approveSub = await request(app)
        .post(`/api/tasks/${task.id}/subtasks/${subtask.id}/approve`)
        .set('Cookie', [userCookie]);
      expect(approveSub.status).toBe(200);
      // Parent task should be auto-approved/completed since all subtasks are finished
      expect(approveSub.body.task.status).toBe('completed');
    });

    it('should implement strict safe MIME-type attachment downloading disposition headers', async () => {
      // Create a task
      const createRes = await request(app)
        .post('/api/tasks')
        .set('Cookie', [userCookie])
        .send({
          title: 'Attachment Test Task',
          teamId: 'Purchasing',
          priority: 'low',
          impact: 'low',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          assigneeIds: ['TEST_EXT_U1'],
        });
      const taskId = createRes.body.task.id;

      // Seed mock safe (PNG) and unsafe (HTML) attachments directly in DB
      const safeAttachment = await prisma.attachment.create({
        data: { taskId, name: 'image.png', key: 'tasks/test/image.png', uploadedById: 'TEST_EXT_U1' },
      });
      const unsafeAttachment = await prisma.attachment.create({
        data: { taskId, name: 'exploit.html', key: 'tasks/test/exploit.html', uploadedById: 'TEST_EXT_U1' },
      });

      // Check safe attachment download headers -> inline disposition allowed
      const safeRes = await request(app)
        .get(`/api/tasks/${taskId}/attachments/${safeAttachment.id}/download`)
        .set('Cookie', [userCookie]);
      expect(safeRes.headers['content-disposition']).toContain('inline;');

      // Check unsafe attachment download headers -> attachment forced to prevent XSS sniffing
      const unsafeRes = await request(app)
        .get(`/api/tasks/${taskId}/attachments/${unsafeAttachment.id}/download`)
        .set('Cookie', [userCookie]);
      expect(unsafeRes.headers['content-disposition']).toContain('attachment;');
    });
  });
});
