import { prisma } from '../db';

export interface UserProfile {
  empNo: string;
  name: string;
  email: string;
  position: string | null;
  team: string | null;
  cobuName: string | null;
}

// In-memory cache for profiles to avoid hitting database constantly
const profileCache = new Map<string, UserProfile>();

export async function resolveUserProfile(empNo: string): Promise<UserProfile> {
  const cached = profileCache.get(empNo.toUpperCase());
  if (cached) return cached;

  // 1. Try MasterDataGcp
  let emp = await prisma.masterDataGcp.findUnique({
    where: { empNo: empNo.toUpperCase() },
  });

  // 2. Try MasterDataUser
  if (!emp) {
    emp = await prisma.masterDataUser.findUnique({
      where: { empNo: empNo.toUpperCase() },
    });
  }

  const profile: UserProfile = {
    empNo: empNo.toUpperCase(),
    name: emp?.name || empNo,
    email: emp?.email || `${empNo.toLowerCase()}@bjc.co.th`,
    position: emp?.position || null,
    team: emp?.team || null,
    cobuName: emp?.cobuName || null,
  };

  profileCache.set(empNo.toUpperCase(), profile);
  return profile;
}

export function resolveUserProfileSync(empNo: string): UserProfile {
  const cached = profileCache.get(empNo.toUpperCase());
  if (cached) return cached;
  return {
    empNo: empNo.toUpperCase(),
    name: empNo,
    email: `${empNo.toLowerCase()}@bjc.co.th`,
    position: null,
    team: null,
    cobuName: null,
  };
}

export async function resolveUserProfiles(empNos: string[]): Promise<Map<string, UserProfile>> {
  const uniqueEmpNos = Array.from(new Set(empNos.map(e => e.toUpperCase())));
  const result = new Map<string, UserProfile>();
  const missingEmpNos: string[] = [];

  for (const empNo of uniqueEmpNos) {
    const cached = profileCache.get(empNo);
    if (cached) {
      result.set(empNo, cached);
    } else {
      missingEmpNos.push(empNo);
    }
  }

  if (missingEmpNos.length > 0) {
    // Batch query from GCP
    const gcps = await prisma.masterDataGcp.findMany({
      where: { empNo: { in: missingEmpNos } },
    });
    
    const foundEmpNos = gcps.map(g => g.empNo.toUpperCase());
    const remainingEmpNos = missingEmpNos.filter(e => !foundEmpNos.includes(e));

    const users = remainingEmpNos.length > 0
      ? await prisma.masterDataUser.findMany({
          where: { empNo: { in: remainingEmpNos } },
        })
      : [];

    const allFound = [...gcps, ...users];
    
    for (const empNo of missingEmpNos) {
      const dbEmp = allFound.find(x => x.empNo.toUpperCase() === empNo);
      const profile: UserProfile = {
        empNo,
        name: dbEmp?.name || empNo,
        email: dbEmp?.email || `${empNo.toLowerCase()}@bjc.co.th`,
        position: dbEmp?.position || null,
        team: dbEmp?.team || null,
        cobuName: dbEmp?.cobuName || null,
      };
      profileCache.set(empNo, profile);
      result.set(empNo, profile);
    }
  }

  return result;
}

export async function resolveAllTeams(): Promise<string[]> {
  const gcps = await prisma.masterDataGcp.findMany({
    select: { team: true },
    where: { NOT: { team: null } },
    distinct: ['team'],
  });
  const users = await prisma.masterDataUser.findMany({
    select: { team: true },
    where: { NOT: { team: null } },
    distinct: ['team'],
  });

  const allTeams = new Set<string>();
  gcps.forEach(g => g.team && allTeams.add(g.team));
  users.forEach(u => u.team && allTeams.add(u.team));
  return Array.from(allTeams).sort();
}
