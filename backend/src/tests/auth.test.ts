import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../db';

describe('Auth API Integration Tests', () => {
  const TEST_USER = 'TEST_U1_AUTH';

  beforeEach(async () => {
    // Seed initial master data user for authentication checks safely
    await prisma.masterDataUser.upsert({
      where: { empNo: TEST_USER },
      update: {},
      create: {
        empNo: TEST_USER,
        name: 'John Doe',
        email: 'john.doe@bjc.co.th',
        position: 'Officer',
        team: 'Purchasing',
        cobuName: 'BJC',
      },
    });

    // Seed role
    await prisma.tlRole.upsert({
      where: { empNo: TEST_USER },
      update: {},
      create: {
        empNo: TEST_USER,
        isAdmin: false,
      },
    });
  });

  afterEach(async () => {
    // Delete specifically created test accounts
    await prisma.tlRole.delete({ where: { empNo: TEST_USER } }).catch(() => {});
    await prisma.masterDataUser.delete({ where: { empNo: TEST_USER } }).catch(() => {});
  });

  it('should authenticate user and set secure http-only cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: TEST_USER,
        password: 'correct-password',
      });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.id).toBe(TEST_USER);
    expect(res.body.token).toBeUndefined(); // Verify token is NOT sent in JSON response

    // Verify Set-Cookie header is set
    const cookies = res.headers['set-cookie'] as string[];
    expect(cookies).toBeDefined();
    expect(cookies.some(c => c.includes('token='))).toBe(true);
    expect(cookies.some(c => c.includes('HttpOnly'))).toBe(true);
  });

  it('should reject invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: TEST_USER,
        password: 'wrong-password',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('ไม่ถูกต้อง');
  });

  it('should logout user and clear cookie', async () => {
    const res = await request(app)
      .post('/api/auth/logout');

    expect(res.status).toBe(204);
    const cookies = res.headers['set-cookie'] as string[];
    expect(cookies).toBeDefined();
    expect(cookies.some(c => c.includes('token=;'))).toBe(true);
  });

  it('should check session state for logged in user', async () => {
    // Perform login first to extract the cookie
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: TEST_USER,
        password: 'correct-password',
      });
    const cookie = loginRes.headers['set-cookie'][0];

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [cookie]);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.id).toBe(TEST_USER);
  });
});
