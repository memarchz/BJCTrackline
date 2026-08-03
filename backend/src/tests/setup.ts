import { beforeEach, afterEach, vi } from 'vitest';
import { prisma } from '../db';

// Mock the EHR API client calls globally during testing
vi.mock('../utils/ehrAuth', () => ({
  verifyViaEhr: vi.fn(async (empNo: string, password: string) => {
    // Basic mock authentication: accept password matching 'correct-password'
    return password === 'correct-password';
  }),
  fetchEmployeeProfile: vi.fn(async (empNo: string) => {
    return {
      name: `Test Employee ${empNo}`,
      email: `${empNo.toLowerCase()}@bjc.co.th`,
      position: 'Senior PM',
      team: 'Purchasing',
      cobuName: 'BJC',
    };
  }),
}));

// Mock the mailer to prevent sending actual emails during integration test runs
vi.mock('../utils/mailer', () => ({
  sendMail: vi.fn(async () => {}),
  nudgeEmailHtml: vi.fn(() => 'Mock Nudge Email'),
}));

// Handle Database Isolation by cleaning tables
beforeEach(async () => {
  // Global table truncate removed to prevent data loss on shared DB
});

afterEach(async () => {
  vi.clearAllMocks();
});
