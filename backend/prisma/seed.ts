// Seeds the database with demo data mirroring the Job Tracking System Design
// prototype's data.js — same teams/users/tasks/TOR requests/chat/notifications,
// so the real app can be exercised end-to-end with realistic content.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, Level, TaskStatus, TaskLogAction, TorStatus } from '@prisma/client';

const prisma = new PrismaClient();

const DAY = 86400000;
const TODAY = new Date(process.env.SEED_TODAY ?? '2026-07-24T09:00:00');
const DEMO_PASSWORD = 'Password123!';

const addDays = (base: Date, n: number) => new Date(base.getTime() + n * DAY);

const TEAMS = [
  { id: 't1', name: 'Product' },
  { id: 't2', name: 'Engineering' },
  { id: 't3', name: 'Design' },
  { id: 't4', name: 'Marketing' },
];

const USERS = [
  { id: 'u1', name: 'Sarah Chen', team: 't1', admin: true, title: 'Head of Product' },
  { id: 'u2', name: 'Marcus Reyes', team: 't2', admin: true, title: 'Engineering Lead' },
  { id: 'u3', name: 'Priya Patel', team: 't1', admin: false, title: 'Product Manager' },
  { id: 'u4', name: 'Tom Walsh', team: 't1', admin: false, title: 'Product Analyst' },
  { id: 'u5', name: 'Elena Cruz', team: 't1', admin: false, title: 'Associate PM' },
  { id: 'u6', name: 'Daniel Kim', team: 't2', admin: false, title: 'Backend Engineer' },
  { id: 'u7', name: 'Grace Liu', team: 't2', admin: false, title: 'Platform Engineer' },
  { id: 'u8', name: 'Omar Farouk', team: 't2', admin: false, title: 'Mobile Engineer' },
  { id: 'u9', name: 'Nina Volkov', team: 't2', admin: false, title: 'QA Engineer' },
  { id: 'u10', name: 'Jasper Lee', team: 't3', admin: false, title: 'Product Designer' },
  { id: 'u11', name: 'Ava Thompson', team: 't3', admin: false, title: 'UX Researcher' },
  { id: 'u12', name: 'Ben Osei', team: 't3', admin: false, title: 'Visual Designer' },
  { id: 'u13', name: 'Chloe Martin', team: 't4', admin: false, title: 'Marketing Manager' },
  { id: 'u14', name: 'Ryan Singh', team: 't4', admin: false, title: 'Content Strategist' },
];

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z]+/g, '.');
}
function emailFor(name: string) {
  return `${slug(name)}@bjctrackline.test`;
}
function usernameFor(name: string) {
  return slug(name).replace(/\./g, '');
}

function teamMembers(teamId: string) {
  return USERS.filter((u) => u.team === teamId);
}
function memberAt(teamId: string, i: number) {
  const m = teamMembers(teamId);
  return m[i % m.length].id;
}
function admins() {
  return USERS.filter((u) => u.admin);
}

type Row = [string, 'high' | 'medium' | 'low', 'high' | 'medium' | 'low', keyof typeof TaskStatus, boolean | null];

const TEAM_TASKS: Record<string, Row[]> = {
  t1: [
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
  t2: [
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
  t3: [
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
  t4: [
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
  teamId: string;
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

function buildTasks(): TaskSeed[] {
  const tasks: TaskSeed[] = [];
  let dueCursor = 0;

  TEAMS.forEach((team) => {
    const rows = TEAM_TASKS[team.id];
    const reviewer = admins().find((a) => a.team === team.id) ?? admins()[0];
    rows.forEach((row, i) => {
      const [title, priority, impact, status, late] = row;
      const due = addDays(new Date('2026-06-18'), dueCursor);
      dueCursor += 2;
      const created = addDays(due, -(14 + (i % 6)));
      const assignees = [memberAt(team.id, i), memberAt(team.id, i + 1)]
        .filter((v, idx, a) => a.indexOf(v) === idx && v !== reviewer.id)
        .slice(0, i % 3 === 0 ? 2 : 1);
      if (assignees.length === 0) assignees.push(memberAt(team.id, i + 2));

      const task: TaskSeed = {
        id: nextId(),
        title,
        priority,
        impact,
        status: status as TaskStatus,
        teamId: team.id,
        assigneeIds: assignees,
        createdById: reviewer.id,
        dueDate: due,
        createdDate: created,
        description: `${title}. Part of ${team.name}'s active workstream — see subtasks and log for detail.`,
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
        const mem = teamMembers(team.id);
        const doneOrLater = status === 'completed' ? 'completed' : 'in_progress';
        task.subtasks = [
          { title: 'Draft outline and share for feedback', description: 'Circulate a first-pass outline to the team for early feedback.', status: 'completed', assigneeId: mem[0].id },
          { title: 'Incorporate stakeholder feedback', description: 'Fold in comments from the outline review round.', status: doneOrLater, assigneeId: mem[1 % mem.length].id },
          { title: 'Final review and sign-off', description: 'Owner does a final pass before this is considered done.', status: status === 'completed' ? 'completed' : 'todo', assigneeId: reviewer.id },
        ];
      }

      task.log = buildLog(task);
      tasks.push(task);
    });
  });

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
    const log: TaskSeed['log'] = [{ ts: created, action: 'created', byId: 'u1', note: 'Task created' }];
    if (status === 'in_progress') log.push({ ts: addDays(TODAY, -(1 + i)), action: 'started', byId: 'u3', note: 'Marked in progress' });
    tasks.push({
      id: nextId(),
      title,
      priority,
      impact,
      status,
      teamId: 't1',
      assigneeIds: i % 3 === 0 ? ['u3', 'u4'] : ['u3'],
      createdById: 'u1',
      dueDate: due,
      createdDate: created,
      description: `${title}. Assigned to you as part of Product's active workstream.`,
      late: null,
      subtasks: [],
      log,
    });
  });

  const extraForU1: [string, Level, Level, TaskStatus][] = [
    ['Finalize Q3 product strategy memo', 'high', 'high', 'in_progress'],
    ['Review team OKR submissions', 'medium', 'high', 'todo'],
    ['Prepare board update deck', 'high', 'medium', 'todo'],
    ['Sync hiring plan with recruiting', 'low', 'medium', 'in_progress'],
    ['Approve annual roadmap themes', 'medium', 'medium', 'todo'],
  ];
  extraForU1.forEach(([title, priority, impact, status], i) => {
    const due = addDays(TODAY, 2 + i * 2);
    const created = addDays(TODAY, -(3 + i));
    const log: TaskSeed['log'] = [{ ts: created, action: 'created', byId: 'u2', note: 'Task created' }];
    if (status === 'in_progress') log.push({ ts: addDays(TODAY, -(1 + i)), action: 'started', byId: 'u1', note: 'Marked in progress' });
    tasks.push({
      id: nextId(),
      title,
      priority,
      impact,
      status,
      teamId: 't1',
      assigneeIds: ['u1'],
      createdById: 'u2',
      dueDate: due,
      createdDate: created,
      description: `${title}. On your personal plate as Head of Product.`,
      late: null,
      subtasks: [],
      log,
    });
  });

  const submittedForU3: [string, Level, Level][] = [
    ['Sprint 14 retro summary', 'medium', 'medium'],
    ['Pricing experiment writeup', 'high', 'high'],
    ['Persona refresh deck', 'low', 'medium'],
  ];
  submittedForU3.forEach(([title, priority, impact], i) => {
    const due = addDays(TODAY, -(2 + i));
    const created = addDays(due, -10);
    const submittedDate = addDays(TODAY, -1);
    tasks.push({
      id: nextId(),
      title,
      priority,
      impact,
      status: 'submitted',
      teamId: 't1',
      assigneeIds: ['u3'],
      createdById: 'u1',
      dueDate: due,
      createdDate: created,
      description: `${title}. Submitted for review and awaiting sign-off.`,
      late: false,
      submittedDate,
      reviewDate: null,
      rejectReason: null,
      subtasks: [],
      log: [
        { ts: created, action: 'created', byId: 'u1', note: 'Task created' },
        { ts: addDays(created, 3), action: 'started', byId: 'u3', note: 'Marked in progress' },
        { ts: submittedDate, action: 'submitted', byId: 'u3', note: 'Submitted for review' },
      ],
    });
  });

  const assignedByU3: [string, Level, Level, TaskStatus, string][] = [
    ['Wireframe settings redesign', 'medium', 'medium', 'in_progress', 'u4'],
    ['Draft API usage guidelines', 'high', 'medium', 'in_progress', 'u5'],
    ['Compile churn analysis', 'high', 'high', 'submitted', 'u4'],
    ['Prep onboarding survey', 'low', 'medium', 'submitted', 'u5'],
  ];
  assignedByU3.forEach(([title, priority, impact, status, who], i) => {
    const due = addDays(TODAY, status === 'submitted' ? -(1 + i) : 4 + i);
    const created = addDays(due, -9);
    const submittedDate = status === 'submitted' ? addDays(TODAY, -1) : undefined;
    const log: TaskSeed['log'] = [
      { ts: created, action: 'created', byId: 'u3', note: 'Task created' },
      { ts: addDays(created, 2), action: 'started', byId: who, note: 'Marked in progress' },
    ];
    if (status === 'submitted' && submittedDate) log.push({ ts: submittedDate, action: 'submitted', byId: who, note: 'Submitted for review' });
    tasks.push({
      id: nextId(),
      title,
      priority,
      impact,
      status,
      teamId: 't1',
      assigneeIds: [who],
      createdById: 'u3',
      dueDate: due,
      createdDate: created,
      description: `${title}. Assigned by you to a teammate.`,
      late: false,
      submittedDate,
      reviewDate: null,
      rejectReason: null,
      subtasks: [],
      log,
    });
  });

  return tasks;
}

const TOR_REQUESTS: {
  id: string;
  project: string;
  code: string;
  dept: string;
  requesterId: string;
  amount: number;
  openedDate: Date;
  status: TorStatus;
  step: number;
}[] = [
  { id: 'tor1', project: 'Cloud Data Warehouse Migration', code: 'TOR-2026-018', dept: 'Engineering', requesterId: 'u2', amount: 4200000, openedDate: new Date('2026-06-12'), status: 'pending_chief_approval', step: 0 },
  { id: 'tor2', project: 'Customer Portal Redesign', code: 'TOR-2026-014', dept: 'Product', requesterId: 'u1', amount: 1850000, openedDate: new Date('2026-05-28'), status: 'tor', step: 1 },
  { id: 'tor3', project: 'Mobile App Security Audit', code: 'TOR-2026-009', dept: 'Engineering', requesterId: 'u9', amount: 920000, openedDate: new Date('2026-05-05'), status: 'pta', step: 3 },
  { id: 'tor4', project: 'Brand Refresh Campaign', code: 'TOR-2026-021', dept: 'Marketing', requesterId: 'u13', amount: 2600000, openedDate: new Date('2026-06-20'), status: 'pending_chief_approval', step: 0 },
  { id: 'tor5', project: 'Analytics Platform Upgrade', code: 'TOR-2026-003', dept: 'Product', requesterId: 'u3', amount: 3100000, openedDate: new Date('2026-03-18'), status: 'completed', step: 6 },
  { id: 'tor6', project: 'Office Network Overhaul', code: 'TOR-2026-011', dept: 'IT Ops', requesterId: 'u6', amount: 1400000, openedDate: new Date('2026-05-14'), status: 'po', step: 5 },
  { id: 'tor7', project: 'UX Research Program', code: 'TOR-2026-016', dept: 'Design', requesterId: 'u11', amount: 680000, openedDate: new Date('2026-06-01'), status: 'tor', step: 1 },
  { id: 'tor8', project: 'Data Lake Proof of Concept', code: 'TOR-2026-006', dept: 'Engineering', requesterId: 'u7', amount: 2050000, openedDate: new Date('2026-04-22'), status: 'completed', step: 6 },
  { id: 'tor9', project: 'Content Localization Toolkit', code: 'TOR-2026-019', dept: 'Marketing', requesterId: 'u14', amount: 540000, openedDate: new Date('2026-06-15'), status: 'tor', step: 1 },
];

const CONVERSATIONS = [
  { id: 'c1', kind: 'team' as const, teamId: 't1' },
  { id: 'c2', kind: 'team' as const, teamId: 't2' },
  { id: 'c3', kind: 'team' as const, teamId: 't3' },
  { id: 'c4', kind: 'team' as const, teamId: 't4' },
  { id: 'c5', kind: 'dm' as const, userIds: ['u3', 'u1'] as [string, string] },
  { id: 'c6', kind: 'dm' as const, userIds: ['u3', 'u2'] as [string, string] },
];

const MESSAGES: Record<string, { fromId: string; text: string; ts: Date }[]> = {
  c1: [
    { fromId: 'u1', text: 'Heads up — Q3 roadmap doc is approved, moving to execution.', ts: new Date('2026-07-22T10:02:00') },
    { fromId: 'u3', text: 'Great, I’ll update the backlog priorities today.', ts: new Date('2026-07-22T10:05:00') },
    { fromId: 'u4', text: 'Can we sync on the pricing analysis before Friday?', ts: new Date('2026-07-23T09:14:00') },
  ],
  c2: [
    { fromId: 'u2', text: 'Incident #482 is contained, doing root cause now.', ts: new Date('2026-07-23T15:40:00') },
    { fromId: 'u7', text: 'I can pair on the postmortem this afternoon.', ts: new Date('2026-07-23T15:44:00') },
  ],
  c3: [
    { fromId: 'u10', text: 'Design tokens v2 shipped to the library 🎉', ts: new Date('2026-07-21T11:20:00') },
    { fromId: 'u11', text: 'Usability test notes are up in the shared doc.', ts: new Date('2026-07-22T13:02:00') },
  ],
  c4: [{ fromId: 'u13', text: 'Campaign brief is locked, kicking off creative.', ts: new Date('2026-07-20T09:30:00') }],
  c5: [{ fromId: 'u1', text: 'Can you review the beta rollout plan today?', ts: new Date('2026-07-23T16:00:00') }],
  c6: [{ fromId: 'u2', text: 'Thanks for the fast turnaround on the review.', ts: new Date('2026-07-22T17:12:00') }],
};

const NOTIFICATIONS_U3 = [
  { type: 'assigned' as const, text: 'You were assigned "Coordinate beta rollout plan"', ts: new Date('2026-07-23T16:05:00'), read: false },
  { type: 'rejected' as const, text: '"Draft release notes v4.2" was rejected — see reviewer notes', ts: new Date('2026-07-23T11:20:00'), read: false },
  { type: 'approved' as const, text: '"Write PRD for checkout redesign" was approved', ts: new Date('2026-07-21T09:40:00'), read: false },
  { type: 'comment' as const, text: 'Sarah Chen commented on "Prioritize backlog for sprint 14"', ts: new Date('2026-07-20T14:10:00'), read: true },
  { type: 'assigned' as const, text: 'You were assigned a subtask on "Define Q3 roadmap OKRs"', ts: new Date('2026-07-19T08:30:00'), read: true },
  { type: 'approved' as const, text: '"Icon set audit and cleanup" was approved', ts: new Date('2026-07-18T10:00:00'), read: true },
];

async function main() {
  console.log(`Seeding with "today" anchored at ${TODAY.toISOString()}`);

  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.torRequest.deleteMany();
  await prisma.taskLogEntry.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.taskAssignee.deleteMany();
  await prisma.starredTask.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();

  for (const team of TEAMS) {
    await prisma.team.create({ data: { id: team.id, name: team.name } });
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const user of USERS) {
    await prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: emailFor(user.name),
        username: usernameFor(user.name),
        passwordHash,
        title: user.title,
        isAdmin: user.admin,
        teamId: user.team,
      },
    });
  }

  const tasks = buildTasks();
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
        teamId: task.teamId,
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

  for (const tor of TOR_REQUESTS) {
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
        reviewerId: tor.step > 0 ? 'u1' : null,
      },
    });
  }
  console.log(`Created ${TOR_REQUESTS.length} TOR requests`);

  for (const convo of CONVERSATIONS) {
    if (convo.kind === 'team') {
      await prisma.conversation.create({ data: { id: convo.id, kind: 'team', teamId: convo.teamId } });
    } else {
      const [a, b] = [...convo.userIds].sort();
      await prisma.conversation.create({ data: { id: convo.id, kind: 'dm', dmUserAId: a, dmUserBId: b } });
    }
    const messages = MESSAGES[convo.id] ?? [];
    for (const m of messages) {
      await prisma.message.create({ data: { conversationId: convo.id, fromId: m.fromId, text: m.text, ts: m.ts } });
    }
  }
  console.log(`Created ${CONVERSATIONS.length} conversations`);

  for (const n of NOTIFICATIONS_U3) {
    await prisma.notification.create({ data: { userId: 'u3', type: n.type, text: n.text, ts: n.ts, read: n.read } });
  }

  console.log('\nDemo login — any seeded user, e.g.:');
  console.log(`  admin: ${emailFor('Sarah Chen')} / ${DEMO_PASSWORD}`);
  console.log(`  user:  ${emailFor('Priya Patel')} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
