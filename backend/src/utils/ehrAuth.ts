import axios from 'axios';
import https from 'https';
import { prisma } from '../db';

const EHR_TIMEOUT_MS = 8000;

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

export async function verifyViaEhr(empno: string, password: string): Promise<boolean> {
  const url = process.env.EHR_API_URL;
  const apiKey = process.env.EHR_API_KEY;
  if (!url || !apiKey) {
    console.warn("[ehrAuth] EHR_API_URL or EHR_API_KEY is not configured.");
    return false;
  }

  // Build login URL
  const loginUrl = `${url.replace(/\/$/, '')}/api/v1/auth/login`;

  try {
    const response = await axios.post(
      loginUrl,
      { empno, password },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        timeout: EHR_TIMEOUT_MS,
        httpsAgent,
      }
    );

    console.log(`[ehrAuth] empno="${empno}" → HTTP ${response.status}`);
    if (response.status !== 200) return false;

    const data = response.data;
    if (data && typeof data === 'object') {
      if ('success' in data && !data.success) return false;
      if ('status' in data && typeof data.status === 'string' && data.status.toLowerCase() !== 'success') return false;
    }
    return true;
  } catch (err: any) {
    console.warn(`[ehrAuth] empno="${empno}" → request failed: ${err.message}`);
    return false;
  }
}

export async function fetchEmployeeProfile(empno: string): Promise<{
  name: string;
  email: string | null;
  position: string | null;
  team: string | null;
  cobuName: string | null;
} | null> {
  const profileUrl = `https://ehr.bjc.co.th/API/PUR/api/EmployeeProfile/${empno}`;

  try {
    const response = await axios.get(profileUrl, {
      timeout: EHR_TIMEOUT_MS,
      httpsAgent,
    });
    if (response.status === 200 && response.data) {
      const data = response.data;
      if (data && data.employeeLocalName) {
        return {
          name: data.employeeLocalName,
          email: data.email || null,
          position: data.positionTitleENG || data.positionTitleTHA || null,
          team: data.departmentDescription || null,
          cobuName: data.coBuDescription || null,
        };
      }
    }
    return null;
  } catch (err: any) {
    console.warn(`[ehrAuth] Failed to fetch employee profile for ${empno}: ${err.message}`);
    return null;
  }
}
