// Mock data for the Job Tracking prototype — teams, users, tasks, chat, notifications.
const DAY = 86400000;
const TODAY = new Date('2026-07-24T09:00:00');
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (base, n) => new Date(base.getTime() + n * DAY);

export const TEAMS = [
  { id: 't1', name: 'Product' },
  { id: 't2', name: 'Engineering' },
  { id: 't3', name: 'Design' },
  { id: 't4', name: 'Marketing' },
];

export const USERS = [
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

// [title, priority, impact, status, late]  late: true/false/null(not yet actioned)
const TEAM_TASKS = {
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
  'Numbers don\u2019t reconcile with last week\u2019s report — recheck the source data.',
];

function teamMembers(teamId) { return USERS.filter(u => u.team === teamId); }
function memberAt(teamId, i) { const m = teamMembers(teamId); return m[i % m.length].id; }
function admins() { return USERS.filter(u => u.admin); }

function buildLog(task) {
  const log = [{ ts: task.createdDate, action: 'created', by: task.createdBy, note: 'Task created' }];
  if (task.status !== 'todo') log.push({ ts: iso(addDays(new Date(task.createdDate), 3)), action: 'started', by: task.assignees[0], note: 'Marked in progress' });
  if (['submitted', 'rejected', 'completed'].includes(task.status)) {
    log.push({ ts: task.submittedDate, action: 'submitted', by: task.assignees[0], note: 'Submitted for review' });
  }
  if (task.status === 'rejected') {
    log.push({ ts: task.reviewDate, action: 'rejected', by: task.reviewer, note: task.rejectReason });
  }
  if (task.status === 'completed') {
    log.push({ ts: task.reviewDate, action: 'approved', by: task.reviewer, note: 'Approved — nice work' });
  }
  return log;
}

let taskSeq = 1;
export function buildTasks() {
  const tasks = [];
  let dueCursor = 0;
  TEAMS.forEach((team, tIdx) => {
    const rows = TEAM_TASKS[team.id];
    const reviewer = admins().find(a => a.team === team.id) || admins()[0];
    rows.forEach((row, i) => {
      const [title, priority, impact, status, late] = row;
      const due = addDays(new Date('2026-06-18'), dueCursor);
      dueCursor += 2;
      const created = addDays(due, -(14 + (i % 6)));
      const assignees = [memberAt(team.id, i), memberAt(team.id, i + 1)].filter((v, idx, a) => a.indexOf(v) === idx && v !== reviewer.id).slice(0, i % 3 === 0 ? 2 : 1);
      if (assignees.length === 0) assignees.push(memberAt(team.id, i + 2));
      const task = {
        id: `k${taskSeq++}`,
        title, priority, impact, status,
        team: team.id,
        assignees,
        createdBy: reviewer.id,
        reviewer: reviewer.id,
        dueDate: iso(due),
        createdDate: iso(created),
        description: `${title}. Part of ${team.name}'s active workstream — see subtasks and log for detail.`,
        subtasks: [],
      };
      if (['submitted', 'rejected', 'completed'].includes(status)) {
        const offset = late === true ? 3 + (i % 4) : late === false ? -(1 + (i % 3)) : 0;
        task.submittedDate = iso(addDays(due, offset > 0 ? offset - 1 : offset));
        task.reviewDate = iso(addDays(due, offset));
        task.rejectReason = status === 'rejected' ? REJECT_REASONS[i % REJECT_REASONS.length] : null;
      }
      task.late = late;
      if (i === 0) {
        const mem = teamMembers(team.id);
        task.subtasks = [
          { id: `${task.id}-s1`, title: 'Draft outline and share for feedback', done: true, assignee: mem[0].id },
          { id: `${task.id}-s2`, title: 'Incorporate stakeholder feedback', done: status === 'completed', assignee: mem[1 % mem.length].id },
          { id: `${task.id}-s3`, title: 'Final review and sign-off', done: status === 'completed', assignee: reviewer.id },
        ];
      }
      task.log = buildLog(task);
      tasks.push(task);
    });
  });

  // Guarantee the demo User (u3) has several New (todo) and In Progress tasks to populate the grid.
  const extraForU3 = [
    ['Draft sprint 15 planning doc', 'high', 'high', 'todo'],
    ['Review analytics dashboard spec', 'medium', 'high', 'todo'],
    ['Collect stakeholder sign-off list', 'low', 'medium', 'todo'],
    ['Refine onboarding funnel metrics', 'medium', 'medium', 'in_progress'],
    ['Prepare roadmap readout slides', 'high', 'medium', 'in_progress'],
    ['Audit feature flag coverage', 'low', 'low', 'in_progress'],
  ];
  extraForU3.forEach((row, i) => {
    const [title, priority, impact, status] = row;
    const due = addDays(TODAY, 3 + i * 2);
    tasks.push({
      id: `k${taskSeq++}`, title, priority, impact, status, team: 't1',
      assignees: i % 3 === 0 ? ['u3', 'u4'] : ['u3'],
      createdBy: 'u1', reviewer: 'u1',
      dueDate: iso(due), createdDate: iso(addDays(TODAY, -(4 + i))),
      description: `${title}. Assigned to you as part of Product's active workstream.`,
      subtasks: [], late: null,
      log: [{ ts: iso(addDays(TODAY, -(4 + i))), action: 'created', by: 'u1', note: 'Task created' },
        ...(status === 'in_progress' ? [{ ts: iso(addDays(TODAY, -(1 + i))), action: 'started', by: 'u3', note: 'Marked in progress' }] : [])],
    });
  });

  // Guarantee the demo Admin (u1) also has personal upcoming tasks — an admin is a user too.
  const extraForU1 = [
    ['Finalize Q3 product strategy memo', 'high', 'high', 'in_progress'],
    ['Review team OKR submissions', 'medium', 'high', 'todo'],
    ['Prepare board update deck', 'high', 'medium', 'todo'],
    ['Sync hiring plan with recruiting', 'low', 'medium', 'in_progress'],
    ['Approve annual roadmap themes', 'medium', 'medium', 'todo'],
  ];
  extraForU1.forEach((row, i) => {
    const [title, priority, impact, status] = row;
    const due = addDays(TODAY, 2 + i * 2);
    tasks.push({
      id: `k${taskSeq++}`, title, priority, impact, status, team: 't1',
      assignees: ['u1'],
      createdBy: 'u2', reviewer: 'u2',
      dueDate: iso(due), createdDate: iso(addDays(TODAY, -(3 + i))),
      description: `${title}. On your personal plate as Head of Product.`,
      subtasks: [], late: null,
      log: [{ ts: iso(addDays(TODAY, -(3 + i))), action: 'created', by: 'u2', note: 'Task created' },
        ...(status === 'in_progress' ? [{ ts: iso(addDays(TODAY, -(1 + i))), action: 'started', by: 'u1', note: 'Marked in progress' }] : [])],
    });
  });

  // Submitted (awaiting-approval) tasks the demo User (u3) sent for review.
  const submittedForU3 = [
    ['Sprint 14 retro summary', 'medium', 'medium'],
    ['Pricing experiment writeup', 'high', 'high'],
    ['Persona refresh deck', 'low', 'medium'],
  ];
  submittedForU3.forEach((row, i) => {
    const [title, priority, impact] = row;
    const due = addDays(TODAY, -(2 + i));
    const created = addDays(due, -10);
    tasks.push({
      id: `k${taskSeq++}`, title, priority, impact, status: 'submitted', team: 't1',
      assignees: ['u3'], createdBy: 'u1', reviewer: 'u1',
      dueDate: iso(due), createdDate: iso(created),
      description: `${title}. Submitted for review and awaiting sign-off.`,
      subtasks: [], late: false,
      submittedDate: iso(addDays(TODAY, -1)), reviewDate: null, rejectReason: null,
      attachments: [{ name: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`, ts: iso(addDays(TODAY, -1)) }],
      log: [
        { ts: iso(created), action: 'created', by: 'u1', note: 'Task created' },
        { ts: iso(addDays(created, 3)), action: 'started', by: 'u3', note: 'Marked in progress' },
        { ts: iso(addDays(TODAY, -1)), action: 'submitted', by: 'u3', note: 'Submitted for review' },
      ],
    });
  });
  // Tasks the demo User (u3) assigned to teammates — shown on their Team page.
  const assignedByU3 = [
    ['Wireframe settings redesign', 'medium', 'medium', 'in_progress', 'u4'],
    ['Draft API usage guidelines', 'high', 'medium', 'in_progress', 'u5'],
    ['Compile churn analysis', 'high', 'high', 'submitted', 'u4'],
    ['Prep onboarding survey', 'low', 'medium', 'submitted', 'u5'],
  ];
  assignedByU3.forEach((row, i) => {
    const [title, priority, impact, status, who] = row;
    const due = addDays(TODAY, status === 'submitted' ? -(1 + i) : 4 + i);
    const created = addDays(due, -9);
    tasks.push({
      id: `k${taskSeq++}`, title, priority, impact, status, team: 't1',
      assignees: [who], createdBy: 'u3', reviewer: 'u3',
      dueDate: iso(due), createdDate: iso(created),
      description: `${title}. Assigned by you to a teammate.`,
      subtasks: [], late: false,
      submittedDate: status === 'submitted' ? iso(addDays(TODAY, -1)) : undefined,
      reviewDate: null, rejectReason: null,
      attachments: status === 'submitted' ? [{ name: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`, ts: iso(addDays(TODAY, -1)) }] : [],
      log: [
        { ts: iso(created), action: 'created', by: 'u3', note: 'Task created' },
        { ts: iso(addDays(created, 2)), action: 'started', by: who, note: 'Marked in progress' },
        ...(status === 'submitted' ? [{ ts: iso(addDays(TODAY, -1)), action: 'submitted', by: who, note: 'Submitted for review' }] : []),
      ],
    });
  });
  return tasks;
}

export function isOverdue(task) {
  if (task.status === 'todo' || task.status === 'in_progress') return new Date(task.dueDate) < TODAY;
  return false;
}

// Procurement / Terms-of-Reference requests. `step` is 1..6 in the TOR lifecycle
// (1 TOR, 2 Bidding, 3 PTA, 4 PR, 5 PO, 6 Completed). `status` is the high-level
// bucket shown in the status cards.
export const TOR_REQUESTS = [
  { id: 'tor1', project: 'Cloud Data Warehouse Migration', code: 'TOR-2026-018', dept: 'Engineering', requester: 'Marcus Reyes', amount: '฿4,200,000', openedDate: '2026-06-12', status: 'Pending Chief Approval', step: 1 },
  { id: 'tor2', project: 'Customer Portal Redesign', code: 'TOR-2026-014', dept: 'Product', requester: 'Sarah Chen', amount: '฿1,850,000', openedDate: '2026-05-28', status: 'TOR', step: 2 },
  { id: 'tor3', project: 'Mobile App Security Audit', code: 'TOR-2026-009', dept: 'Engineering', requester: 'Nina Volkov', amount: '฿920,000', openedDate: '2026-05-05', status: 'PTA', step: 4 },
  { id: 'tor4', project: 'Brand Refresh Campaign', code: 'TOR-2026-021', dept: 'Marketing', requester: 'Chloe Martin', amount: '฿2,600,000', openedDate: '2026-06-20', status: 'Pending Chief Approval', step: 1 },
  { id: 'tor5', project: 'Analytics Platform Upgrade', code: 'TOR-2026-003', dept: 'Product', requester: 'Priya Patel', amount: '฿3,100,000', openedDate: '2026-03-18', status: 'completed', step: 6 },
  { id: 'tor6', project: 'Office Network Overhaul', code: 'TOR-2026-011', dept: 'IT Ops', requester: 'Daniel Kim', amount: '฿1,400,000', openedDate: '2026-05-14', status: 'PTA', step: 5 },
  { id: 'tor7', project: 'UX Research Program', code: 'TOR-2026-016', dept: 'Design', requester: 'Ava Thompson', amount: '฿680,000', openedDate: '2026-06-01', status: 'TOR', step: 1 },
  { id: 'tor8', project: 'Data Lake Proof of Concept', code: 'TOR-2026-006', dept: 'Engineering', requester: 'Grace Liu', amount: '฿2,050,000', openedDate: '2026-04-22', status: 'completed', step: 6 },
  { id: 'tor9', project: 'Content Localization Toolkit', code: 'TOR-2026-019', dept: 'Marketing', requester: 'Ryan Singh', amount: '฿540,000', openedDate: '2026-06-15', status: 'TOR', step: 2 },
];

export const CONVERSATIONS = [
  { id: 'c1', kind: 'team', name: 'Product', teamId: 't1' },
  { id: 'c2', kind: 'team', name: 'Engineering', teamId: 't2' },
  { id: 'c3', kind: 'team', name: 'Design', teamId: 't3' },
  { id: 'c4', kind: 'team', name: 'Marketing', teamId: 't4' },
  { id: 'c5', kind: 'dm', name: 'Sarah Chen', userId: 'u1' },
  { id: 'c6', kind: 'dm', name: 'Marcus Reyes', userId: 'u2' },
];

export const MESSAGES = {
  c1: [
    { id: 'm1', from: 'u1', text: 'Heads up — Q3 roadmap doc is approved, moving to execution.', ts: '2026-07-22T10:02:00' },
    { id: 'm2', from: 'u3', text: 'Great, I\u2019ll update the backlog priorities today.', ts: '2026-07-22T10:05:00' },
    { id: 'm3', from: 'u4', text: 'Can we sync on the pricing analysis before Friday?', ts: '2026-07-23T09:14:00' },
  ],
  c2: [
    { id: 'm4', from: 'u2', text: 'Incident #482 is contained, doing root cause now.', ts: '2026-07-23T15:40:00' },
    { id: 'm5', from: 'u7', text: 'I can pair on the postmortem this afternoon.', ts: '2026-07-23T15:44:00' },
  ],
  c3: [
    { id: 'm6', from: 'u10', text: 'Design tokens v2 shipped to the library \ud83c\udf89', ts: '2026-07-21T11:20:00' },
    { id: 'm7', from: 'u11', text: 'Usability test notes are up in the shared doc.', ts: '2026-07-22T13:02:00' },
  ],
  c4: [
    { id: 'm8', from: 'u13', text: 'Campaign brief is locked, kicking off creative.', ts: '2026-07-20T09:30:00' },
  ],
  c5: [
    { id: 'm9', from: 'u1', text: 'Can you review the beta rollout plan today?', ts: '2026-07-23T16:00:00' },
  ],
  c6: [
    { id: 'm10', from: 'u2', text: 'Thanks for the fast turnaround on the review.', ts: '2026-07-22T17:12:00' },
  ],
};

export function buildNotifications(forUserId) {
  return [
    { id: 'n1', type: 'assigned', text: 'You were assigned "Coordinate beta rollout plan"', ts: '2026-07-23T16:05:00', read: false },
    { id: 'n2', type: 'rejected', text: '"Draft release notes v4.2" was rejected — see reviewer notes', ts: '2026-07-23T11:20:00', read: false },
    { id: 'n3', type: 'approved', text: '"Write PRD for checkout redesign" was approved', ts: '2026-07-21T09:40:00', read: false },
    { id: 'n4', type: 'comment', text: 'Sarah Chen commented on "Prioritize backlog for sprint 14"', ts: '2026-07-20T14:10:00', read: true },
    { id: 'n5', type: 'assigned', text: 'You were assigned a subtask on "Define Q3 roadmap OKRs"', ts: '2026-07-19T08:30:00', read: true },
    { id: 'n6', type: 'approved', text: '"Icon set audit and cleanup" was approved', ts: '2026-07-18T10:00:00', read: true },
  ];
}
