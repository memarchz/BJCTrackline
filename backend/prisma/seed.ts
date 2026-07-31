// Seeds the database with demo data mirroring the BJC Trackline domain
// but using real employee IDs mapped from Master_Data_GCP / Master_Data_User.
import 'dotenv/config';
import { PrismaClient, Level, TaskStatus, TaskLogAction, TorStatus } from '@prisma/client';

const prisma = new PrismaClient();

const DAY = 86400000;
const TODAY = new Date(process.env.SEED_TODAY ?? '2026-07-24T09:00:00');

const addDays = (base: Date, n: number) => new Date(base.getTime() + n * DAY);

// Team names mapped from Master Data
const TEAM_NAMES = ['Purchasing', 'HR Technology BJC Big C', 'IT Operations', 'Product Development'];

const USERS = [
  { id: 'u1', name: 'Sarah Chen', team: 'Purchasing', admin: true, title: 'Head of Product' },
  { id: 'u2', name: 'Marcus Reyes', team: 'HR Technology BJC Big C', admin: true, title: 'Engineering Lead' },
  { id: 'u3', name: 'Priya Patel', team: 'Purchasing', admin: false, title: 'Product Manager' },
  { id: 'u4', name: 'Tom Walsh', team: 'Purchasing', admin: false, title: 'Product Analyst' },
  { id: 'u5', name: 'Elena Cruz', team: 'Purchasing', admin: false, title: 'Associate PM' },
  { id: 'u6', name: 'Daniel Kim', team: 'HR Technology BJC Big C', admin: false, title: 'Backend Engineer' },
  { id: 'u7', name: 'Grace Liu', team: 'HR Technology BJC Big C', admin: false, title: 'Platform Engineer' },
  { id: 'u8', name: 'Omar Farouk', team: 'HR Technology BJC Big C', admin: false, title: 'Mobile Engineer' },
  { id: 'u9', name: 'Nina Volkov', team: 'HR Technology BJC Big C', admin: false, title: 'QA Engineer' },
  { id: 'u10', name: 'Jasper Lee', team: 'IT Operations', admin: false, title: 'Product Designer' },
  { id: 'u11', name: 'Ava Thompson', team: 'IT Operations', admin: false, title: 'UX Researcher' },
  { id: 'u12', name: 'Ben Osei', team: 'IT Operations', admin: false, title: 'Visual Designer' },
  { id: 'u13', name: 'Product Development', team: 'Product Development', admin: false, title: 'Marketing Manager' },
  { id: 'u14', name: 'Ryan Singh', team: 'Product Development', admin: false, title: 'Content Strategist' },
];

function teamMembers(teamName: string) {
  return USERS.filter((u) => u.team === teamName);
}
function memberAt(teamName: string, i: number, empNoMap: Record<string, string>) {
  const m = teamMembers(teamName);
  const fakeId = m[i % m.length].id;
  return empNoMap[fakeId];
}
function admins() {
  return USERS.filter((u) => u.admin);
}

type Row = [string, 'high' | 'medium' | 'low', 'high' | 'medium' | 'low', keyof typeof TaskStatus, boolean | null];

const TEAM_TASKS: Record<string, Row[]> = {
  'Purchasing': [
    ['Define Q3 roadmap OKRs', 'high', 'high', 'completed', false],
    ['Write PRD for checkout redesign', 'high', 'high', 'completed', false],
    ['Prioritize backlog for sprint 14', 'medium', 'medium', 'submitted', false],
    ['User research synthesis - onboarding', 'medium', 'high', 'in_progress', null],
    ['Competitive analysis - pricing', 'low', 'medium', 'in_progress', null],
    ['Spec API contract for payments', 'high', 'high', 'todo', null],
    ['Update product requirements - search v2', 'medium', 'medium', 'todo', null],
    ['Coordinate beta rollout plan', 'high', 'medium', 'submitted', true],
    ['Draft release notes v4.2', 'low', 'low', 'rejected', true],
    ['Stakeholder review deck', 'medium', 'high', 'completed', true],
    ['Feature flag rollout plan', 'medium', 'medium', 'in_progress', null],
    ['Customer feedback triage', 'low', 'low', 'todo', null],
  ],
  'HR Technology BJC Big C': [
    ['Migrate auth service to OAuth2', 'high', 'high', 'completed', true],
    ['Fix memory leak in worker queue', 'high', 'high', 'rejected', true],
    ['Implement rate limiting middleware', 'medium', 'high', 'rejected', true],
    ['Refactor payments microservice', 'high', 'high', 'submitted', true],
    ['Set up CI pipeline for mobile app', 'medium', 'medium', 'in_progress', null],
    ['Optimize database indexing', 'medium', 'medium', 'in_progress', null],
    ['Build notification delivery service', 'high', 'medium', 'todo', null],
    ['Upgrade Node runtime to v22', 'low', 'medium', 'completed', false],
    ['Add integration tests for billing', 'medium', 'high', 'submitted', true],
    ['Resolve prod incident #482', 'high', 'high', 'in_progress', null],
    ['Implement websocket chat backend', 'medium', 'medium', 'rejected', true],
    ['Harden API input validation', 'low', 'low', 'todo', null],
  ],
  'IT Operations': [
    ['Redesign onboarding flow', 'high', 'high', 'completed', false],
    ['Create design tokens v2', 'medium', 'medium', 'completed', false],
    ['Icon set audit and cleanup', 'low', 'low', 'completed', false],
    ['Prototype dashboard analytics view', 'high', 'high', 'submitted', false],
    ['Usability test - checkout flow', 'medium', 'high', 'in_progress', null],
    ['Illustration set for empty states', 'low', 'medium', 'todo', null],
    ['Component library documentation', 'medium', 'medium', 'todo', null],
    ['Dark mode visual QA', 'low', 'low', 'in_progress', null],
    ['Landing page visual refresh', 'medium', 'medium', 'submitted', false],
    ['Design review - settings page', 'medium', 'low', 'completed', true],
    ['Motion spec for transitions', 'low', 'low', 'todo', null],
    ['Accessibility contrast audit', 'high', 'medium', 'in_progress', null],
  ],
  'Product Development': [
    ['Q3 campaign creative brief', 'high', 'high', 'completed', false],
    ['Launch email sequence - onboarding', 'medium', 'medium', 'submitted', false],
    ['Social content calendar - August', 'low', 'low', 'in_progress', null],
    ['Case study - enterprise customer', 'medium', 'high', 'todo', null],
    ['SEO audit for blog', 'low', 'medium', 'rejected', true],
    ['Webinar landing page copy', 'medium', 'medium', 'completed', false],
    ['Partner co-marketing deck', 'medium', 'medium', 'in_progress', null],
    ['Product launch press release', 'high', 'high', 'todo', null],
    ['Newsletter redesign', 'low', 'low', 'submitted', false],
    ['Customer testimonial video script', 'medium', 'medium', 'in_progress', null],
    ['Rebrand style guide review', 'low', 'low', 'todo', null],
    ['Q3 paid ads creative refresh', 'medium', 'high', 'completed', false],
  ],
};

const REJECT_REASONS = [
  'Missing acceptance criteria — please add before resubmitting.',
  'Scope does not match the ticket; revisit with the team lead.',
  'Needs another round of QA before this can be approved.',
  'Numbers don’t reconcile with last week’s report — recheck the source data.',
];

interface TaskSeed {
  id: string;
  title: string;
  priority: Level;
  impact: Level;
  status: TaskStatus;
  team: string;
  assigneeIds: string[];
  createdById: string;
  dueDate: Date;
  createdDate: Date;
  description: string;
  late: boolean | null;
  submittedDate?: Date | null;
  reviewDate?: Date | null;
  rejectReason?: string | null;
  subtasks: { title: string; description: string; status: TaskStatus; assigneeId: string }[];
  log: { ts: Date; action: TaskLogAction; byId: string; note: string }[];
}

let taskSeq = 1;
function nextId() {
  return `k${taskSeq++}`;
}

function buildLog(task: TaskSeed): TaskSeed['log'] {
  const log: TaskSeed['log'] = [{ ts: task.createdDate, action: 'created', byId: task.createdById, note: 'Task created' }];
  if (task.status !== 'todo') log.push({ ts: addDays(task.createdDate, 3), action: 'started', byId: task.assigneeIds[0], note: 'Marked in progress' });
  if (['submitted', 'rejected', 'completed'].includes(task.status) && task.submittedDate) {
    log.push({ ts: task.submittedDate, action: 'submitted', byId: task.assigneeIds[0], note: 'Submitted for review' });
  }
  if (task.status === 'rejected' && task.reviewDate) {
    log.push({ ts: task.reviewDate, action: 'rejected', byId: task.createdById, note: task.rejectReason ?? '' });
  }
  if (task.status === 'completed' && task.reviewDate) {
    log.push({ ts: task.reviewDate, action: 'approved', byId: task.createdById, note: 'Approved — nice work' });
  }
  return log;
}

function buildTasks(empNoMap: Record<string, string>): TaskSeed[] {
  const tasks: TaskSeed[] = [];
  let dueCursor = 0;

  TEAM_NAMES.forEach((teamName) => {
    const rows = TEAM_TASKS[teamName];
    const reviewerFake = admins().find((a) => a.team === teamName) ?? admins()[0];
    const reviewer = empNoMap[reviewerFake.id];

    rows.forEach((row, i) => {
      const [title, priority, impact, status, late] = row;
      const due = addDays(new Date('2026-06-18'), dueCursor);
      dueCursor += 2;
      const created = addDays(due, -(14 + (i % 6)));
      
      const assignees = [memberAt(teamName, i, empNoMap), memberAt(teamName, i + 1, empNoMap)]
        .filter((v, idx, a) => a.indexOf(v) === idx && v !== reviewer)
        .slice(0, i % 3 === 0 ? 2 : 1);
      if (assignees.length === 0) assignees.push(memberAt(teamName, i + 2, empNoMap));

      const task: TaskSeed = {
        id: nextId(),
        title,
        priority,
        impact,
        status: status as TaskStatus,
        team: teamName,
        assigneeIds: assignees,
        createdById: reviewer,
        dueDate: due,
        createdDate: created,
        description: `${title}. Part of ${teamName}'s active workstream — see subtasks and log for detail.`,
        late,
        subtasks: [],
        log: [],
      };

      if (['submitted', 'rejected', 'completed'].includes(status)) {
        const offset = late === true ? 3 + (i % 4) : late === false ? -(1 + (i % 3)) : 0;
        task.submittedDate = addDays(due, offset > 0 ? offset - 1 : offset);
        task.reviewDate = addDays(due, offset);
        task.rejectReason = status === 'rejected' ? REJECT_REASONS[i % REJECT_REASONS.length] : null;
      }

      if (i === 0) {
        const mem = teamMembers(teamName);
        const doneOrLater = status === 'completed' ? 'completed' : 'in_progress';
        task.subtasks = [
          { title: 'Draft outline and share for feedback', description: 'Circulate a first-pass outline to the team for early feedback.', status: 'completed', assigneeId: empNoMap[mem[0].id] },
          { title: 'Incorporate stakeholder feedback', description: 'Fold in comments from the outline review round.', status: doneOrLater, assigneeId: empNoMap[mem[1 % mem.length].id] },
          { title: 'Final review and sign-off', description: 'Owner does a final pass before this is considered done.', status: status === 'completed' ? 'completed' : 'todo', assigneeId: reviewer },
        ];
      }

      task.log = buildLog(task);
      tasks.push(task);
    });
  });

  // Extra tasks for u3 (Priya Patel)
  const extraForU3: [string, Level, Level, TaskStatus][] = [
    ['Draft sprint 15 planning doc', 'high', 'high', 'todo'],
    ['Review analytics dashboard spec', 'medium', 'high', 'todo'],
    ['Collect stakeholder sign-off list', 'low', 'medium', 'todo'],
    ['Refine onboarding funnel metrics', 'medium', 'medium', 'in_progress'],
    ['Prepare roadmap readout slides', 'high', 'medium', 'in_progress'],
    ['Audit feature flag coverage', 'low', 'low', 'in_progress'],
  ];
  extraForU3.forEach(([title, priority, impact, status], i) => {
    const due = addDays(TODAY, 3 + i * 2);
    const created = addDays(TODAY, -(4 + i));
    const log: TaskSeed['log'] = [{ ts: created, action: 'created', byId: empNoMap['u1'], note: 'Task created' }];
    if (status === 'in_progress') log.push({ ts: addDays(TODAY, -(1 + i)), action: 'started', byId: empNoMap['u3'], note: 'Marked in progress' });
    tasks.push({
      id: nextId(),
      title,
      priority,
      impact,
      status,
      team: 'Purchasing',
      assigneeIds: i % 3 === 0 ? [empNoMap['u3'], empNoMap['u4']] : [empNoMap['u3']],
      createdById: empNoMap['u1'],
      dueDate: due,
      createdDate: created,
      description: `${title}. Assigned to you as part of Product's active workstream.`,
      late: null,
      subtasks: [],
      log,
    });
  });

  return tasks;
}

async function main() {
  console.log(`Seeding with "today" anchored at ${TODAY.toISOString()}`);

  // Fetch real employee IDs from Master Data to use
  const gcps = await prisma.masterDataGcp.findMany({ take: 14 });
  const users = await prisma.masterDataUser.findMany({ take: 2 });
  const allEmps = [...users, ...gcps];

  if (allEmps.length === 0) {
    console.error("Master_Data_GCP or Master_Data_User must be populated before seeding.");
    process.exit(1);
  }

  // Create mapping of fake IDs (u1..u14) to real empNo
  const empNoMap: Record<string, string> = {};
  USERS.forEach((u, i) => {
    empNoMap[u.id] = allEmps[i % allEmps.length].empNo;
  });

  // Clear BJC Trackline tables only
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationRead.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.torRequest.deleteMany();
  await prisma.taskLogEntry.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.taskAssignee.deleteMany();
  await prisma.starredTask.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();

  // Create Users in BJC Trackline database
  for (const u of USERS) {
    const empNo = empNoMap[u.id];
    // Avoid creating duplicates if mapped to same empNo
    const existing = await prisma.user.findUnique({ where: { empNo } });
    if (!existing) {
      await prisma.user.create({
        data: {
          empNo,
          isAdmin: u.admin,
        },
      });
    }
  }
  console.log("Created User records in BJC Trackline.");

  const tasks = buildTasks(empNoMap);
  for (const task of tasks) {
    await prisma.task.create({
      data: {
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        impact: task.impact,
        status: task.status,
        late: task.late,
        team: task.team,
        createdById: task.createdById,
        dueDate: task.dueDate,
        createdDate: task.createdDate,
        submittedDate: task.submittedDate ?? null,
        reviewDate: task.reviewDate ?? null,
        rejectReason: task.rejectReason ?? null,
        assignees: { create: task.assigneeIds.map((userId) => ({ userId })) },
        subtasks: {
          create: task.subtasks.map((s) => ({ title: s.title, description: s.description, status: s.status, assigneeId: s.assigneeId })),
        },
        log: { create: task.log.map((l) => ({ ts: l.ts, action: l.action, byId: l.byId, note: l.note })) },
      },
    });
  }
  console.log(`Created ${tasks.length} tasks`);

  // Seed TOR requests
  const torRequests = [
    { id: 'tor1', project: 'Cloud Data Warehouse Migration', code: 'TOR-2026-018', dept: 'Engineering', requesterId: empNoMap['u2'], amount: 4200000, openedDate: new Date('2026-06-12'), status: 'pending_chief_approval' as const, step: 0 },
    { id: 'tor2', project: 'Customer Portal Redesign', code: 'TOR-2026-014', dept: 'Product', requesterId: empNoMap['u1'], amount: 1850000, openedDate: new Date('2026-05-28'), status: 'tor' as const, step: 1 },
    { id: 'tor3', project: 'Mobile App Security Audit', code: 'TOR-2026-009', dept: 'Engineering', requesterId: empNoMap['u9'], amount: 920000, openedDate: new Date('2026-05-05'), status: 'pta' as const, step: 3 },
  ];

  for (const tor of torRequests) {
    await prisma.torRequest.create({
      data: {
        id: tor.id,
        project: tor.project,
        code: tor.code,
        dept: tor.dept,
        amount: tor.amount,
        openedDate: tor.openedDate,
        status: tor.status,
        step: tor.step,
        requesterId: tor.requesterId,
        reviewerId: tor.step > 0 ? empNoMap['u1'] : null,
      },
    });
  }
  console.log(`Created ${torRequests.length} TOR requests`);

  // Seed DM and channels
  // For team channels, teamId holds the team name string
  const conversations = [
    { id: 'c1', kind: 'team' as const, teamId: 'Purchasing' },
    { id: 'c2', kind: 'team' as const, teamId: 'HR Technology BJC Big C' },
    { id: 'c3', kind: 'team' as const, teamId: 'IT Operations' },
    { id: 'c4', kind: 'team' as const, teamId: 'Product Development' },
    { id: 'c5', kind: 'dm' as const, userIds: [empNoMap['u3'], empNoMap['u1']] as [string, string] },
    { id: 'c6', kind: 'dm' as const, userIds: [empNoMap['u3'], empNoMap['u2']] as [string, string] },
  ];

  for (const convo of conversations) {
    if (convo.kind === 'team') {
      await prisma.conversation.create({ data: { id: convo.id, kind: 'team', teamId: convo.teamId } });
    } else {
      const [a, b] = [...convo.userIds].sort();
      await prisma.conversation.create({ data: { id: convo.id, kind: 'dm', dmUserAId: a, dmUserBId: b } });
    }
  }
  console.log(`Created ${conversations.length} conversations`);

  console.log('\nSeeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
