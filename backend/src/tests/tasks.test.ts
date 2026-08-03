import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../db';

describe('Tasks API Integration Tests', () => {
  let userCookie: string;
  let adminCookie: string;

  const testUsers = ['TEST_TASKS_U1', 'TEST_TASKS_U2', 'TEST_TASKS_ADMIN1'];

  beforeEach(async () => {
    // Seed master users
    await prisma.masterDataUser.upsert({
      where: { empNo: 'TEST_TASKS_U1' },
      update: {},
      create: { empNo: 'TEST_TASKS_U1', name: 'User One', email: 'u1@bjc.co.th', team: 'Purchasing', cobuName: 'BJC' },
    });
    await prisma.masterDataUser.upsert({
      where: { empNo: 'TEST_TASKS_U2' },
      update: {},
      create: { empNo: 'TEST_TASKS_U2', name: 'User Two', email: 'u2@bjc.co.th', team: 'Purchasing', cobuName: 'BJC' },
    });
    await prisma.masterDataUser.upsert({
      where: { empNo: 'TEST_TASKS_ADMIN1' },
      update: {},
      create: { empNo: 'TEST_TASKS_ADMIN1', name: 'Admin One', email: 'admin1@bjc.co.th', team: 'Purchasing', cobuName: 'BJC' },
    });

    // Seed roles
    await prisma.tlRole.upsert({
      where: { empNo: 'TEST_TASKS_U1' },
      update: {},
      create: { empNo: 'TEST_TASKS_U1', isAdmin: false },
    });
    await prisma.tlRole.upsert({
      where: { empNo: 'TEST_TASKS_U2' },
      update: {},
      create: { empNo: 'TEST_TASKS_U2', isAdmin: false },
    });
    await prisma.tlRole.upsert({
      where: { empNo: 'TEST_TASKS_ADMIN1' },
      update: {},
      create: { empNo: 'TEST_TASKS_ADMIN1', isAdmin: true },
    });

    // Extract cookies
    const userLogin = await request(app).post('/api/auth/login').send({ identifier: 'TEST_TASKS_U1', password: 'correct-password' });
    userCookie = userLogin.headers['set-cookie'][0];

    const adminLogin = await request(app).post('/api/auth/login').send({ identifier: 'TEST_TASKS_ADMIN1', password: 'correct-password' });
    adminCookie = adminLogin.headers['set-cookie'][0];
  });

  afterEach(async () => {
    // Delete test tasks, logs, assignees, subtasks, stars created during run
    await prisma.starredTask.deleteMany({ where: { userId: { in: testUsers } } }).catch(() => {});
    await prisma.taskAssignee.deleteMany({ where: { userId: { in: testUsers } } }).catch(() => {});
    await prisma.subtask.deleteMany({ where: { assigneeId: { in: testUsers } } }).catch(() => {});
    await prisma.taskLogEntry.deleteMany({ where: { byId: { in: testUsers } } }).catch(() => {});
    await prisma.task.deleteMany({ where: { createdById: { in: testUsers } } }).catch(() => {});
    await prisma.tlRole.deleteMany({ where: { empNo: { in: testUsers } } }).catch(() => {});
    await prisma.masterDataUser.deleteMany({ where: { empNo: { in: testUsers } } }).catch(() => {});
  });

  it('should create a task and assign it to valid employees', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', [userCookie])
      .send({
        title: 'Complete Monthly Procurement Review',
        description: 'Review procurement list',
        teamId: 'Purchasing',
        priority: 'high',
        impact: 'medium',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        assigneeIds: ['TEST_TASKS_U2'],
      });

    expect(res.status).toBe(201);
    expect(res.body.task.title).toBe('Complete Monthly Procurement Review');
    expect(res.body.task.status).toBe('todo');
  });

  it('should reject task creation if assignee does not exist in master data', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', [userCookie])
      .send({
        title: 'Ghost Task',
        teamId: 'Purchasing',
        priority: 'low',
        impact: 'low',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        assigneeIds: ['GHOST_USER_123'],
      });

    expect(res.status).toBe(400);
  });

  it('should transition task statuses (Happy Path: Start -> Submit -> Approve)', async () => {
    // 1. Create a task
    const createRes = await request(app)
      .post('/api/tasks')
      .set('Cookie', [userCookie])
      .send({
        title: 'Development Work',
        teamId: 'Purchasing',
        priority: 'medium',
        impact: 'medium',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        assigneeIds: ['TEST_TASKS_U2'],
      });
    const taskId = createRes.body.task.id;

    // Login as U2 to work on the task
    const u2Login = await request(app).post('/api/auth/login').send({ identifier: 'TEST_TASKS_U2', password: 'correct-password' });
    const u2Cookie = u2Login.headers['set-cookie'][0];

    // 2. Start task (todo -> in_progress)
    const startRes = await request(app)
      .post(`/api/tasks/${taskId}/start`)
      .set('Cookie', [u2Cookie]);
    expect(startRes.status).toBe(200);
    expect(startRes.body.task.status).toBe('in_progress');

    // 3. Submit task (in_progress -> submitted)
    const submitRes = await request(app)
      .post(`/api/tasks/${taskId}/submit`)
      .set('Cookie', [u2Cookie]);
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.task.status).toBe('submitted');

    // 4. Approve task (submitted -> completed)
    const approveRes = await request(app)
      .post(`/api/tasks/${taskId}/approve`)
      .set('Cookie', [userCookie]); // Approved by U1 (task creator)
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.task.status).toBe('completed');
  });

  it('should restrict task deletion to admin or task creator', async () => {
    // Create task as U1
    const createRes = await request(app)
      .post('/api/tasks')
      .set('Cookie', [userCookie])
      .send({
        title: 'Task to Delete',
        teamId: 'Purchasing',
        priority: 'low',
        impact: 'low',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        assigneeIds: ['TEST_TASKS_U1'],
      });
    const taskId = createRes.body.task.id;

    // Try deleting as U2 (non-creator, non-admin)
    const u2Login = await request(app).post('/api/auth/login').send({ identifier: 'TEST_TASKS_U2', password: 'correct-password' });
    const u2Cookie = u2Login.headers['set-cookie'][0];

    const denyDelete = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Cookie', [u2Cookie]);
    expect(denyDelete.status).toBe(403);

    // Delete as Admin
    const allowDelete = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Cookie', [adminCookie]);
    expect(allowDelete.status).toBe(204);
  });
});
