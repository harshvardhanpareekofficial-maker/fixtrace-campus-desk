// Pure domain logic. No DOM or storage: the same rules run in the app and tests.
export const ASSETS = Object.freeze([
  {
    id: "FAN-01",
    name: "Ceiling fan",
    room: "Classroom A",
    kind: "Electrical",
    x: 25,
    y: 29,
  },
  {
    id: "FAN-02",
    name: "Reading room fan",
    room: "Library",
    kind: "Electrical",
    x: 76,
    y: 27,
  },
  {
    id: "TAP-01",
    name: "Washbasin tap",
    room: "Wash area",
    kind: "Plumbing",
    x: 77,
    y: 76,
  },
  {
    id: "DESK-01",
    name: "Lab workbench",
    room: "Science lab",
    kind: "Furniture",
    x: 26,
    y: 77,
  },
  {
    id: "LIGHT-01",
    name: "Corridor light",
    room: "Central corridor",
    kind: "Electrical",
    x: 48,
    y: 51,
  },
  {
    id: "DOOR-01",
    name: "Library door",
    room: "Library",
    kind: "General",
    x: 64,
    y: 39,
  },
]);
export const PRIORITIES = ["Urgent", "High", "Routine"];
export const STATUSES = [
  "Open",
  "Assigned",
  "In progress",
  "Completed",
  "Cancelled",
];
export const CATEGORIES = ["Electrical", "Plumbing", "Furniture", "General"];
export const TEAMS = ["Maintenance Team A", "Maintenance Team B"];
export const active = (job) => !["Completed", "Cancelled"].includes(job.status);
export const assetById = (id) => ASSETS.find((a) => a.id === id);
const requireThat = (ok, message) => {
  if (!ok) throw new Error(message);
};
const required = (value, label, max = 1000) => {
  const s = String(value ?? "").trim();
  requireThat(s.length > 0, `${label} is required.`);
  requireThat(s.length <= max, `${label} must be ${max} characters or fewer.`);
  return s;
};
export function blank(now = Date.now()) {
  return { schema: 1, revision: 0, createdAt: now, events: [] };
}
export function project(doc, count = doc.events.length) {
  const result = { reports: [], jobs: [] };
  for (const event of doc.events.slice(0, count)) {
    for (const [key, change] of Object.entries(event.changes)) {
      const collection = result[key];
      for (const record of change) {
        const index = collection.findIndex((x) => x.id === record.id);
        if (index === -1) collection.push({ ...record });
        else collection[index] = { ...record };
      }
    }
  }
  return result;
}
export const linked = (state, id) =>
  state.reports.filter((r) => r.jobId === id);
export function origin(state, job) {
  return Math.min(
    job.createdAt,
    ...linked(state, job.id).map((r) => r.createdAt),
  );
}
export function elapsed(state, job, now = Date.now()) {
  const end =
    job.status === "Completed"
      ? job.completedAt
      : job.status === "Cancelled"
        ? job.cancelledAt
        : now;
  return Math.max(0, end - origin(state, job));
}
export function sortedJobs(state, filter = "active") {
  return state.jobs
    .filter(
      (j) =>
        filter === "all" ||
        (filter === "active" ? active(j) : j.status === filter),
    )
    .sort(
      (a, b) =>
        PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority) ||
        origin(state, a) - origin(state, b) ||
        a.id.localeCompare(b.id),
    );
}
export function validateDocument(doc) {
  requireThat(
    doc &&
      doc.schema === 1 &&
      Array.isArray(doc.events) &&
      Number.isFinite(doc.createdAt),
    "Saved data has an unsupported format. Export it for recovery or reset the demo.",
  );
  requireThat(
    doc.events.length === doc.revision && doc.events.length < 20000,
    "Saved history is inconsistent or too large. Export it for recovery or reset the demo.",
  );
  const seen = new Set();
  for (const [i, e] of doc.events.entries()) {
    requireThat(
      e &&
        typeof e.id === "string" &&
        !seen.has(e.id) &&
        e.seq === i + 1 &&
        Number.isFinite(e.at) &&
        typeof e.label === "string" &&
        e.changes &&
        Object.keys(e.changes).every((k) => ["reports", "jobs"].includes(k)) &&
        Object.values(e.changes).every(Array.isArray),
      "Saved history is damaged. Export it for recovery or reset the demo.",
    );
    requireThat(
      !i || e.at >= doc.events[i - 1].at,
      "Saved history has inconsistent timestamps.",
    );
    seen.add(e.id);
  }
  const s = project(doc);
  for (const j of s.jobs)
    requireThat(
      typeof j.id === "string" &&
        assetById(j.assetId) &&
        STATUSES.includes(j.status) &&
        PRIORITIES.includes(j.priority) &&
        typeof j.title === "string" &&
        typeof j.priorityReason === "string" &&
        Number.isFinite(j.createdAt) &&
        (j.status !== "Completed" ||
          (Number.isFinite(j.completedAt) && j.work && j.verification)) &&
        (j.status !== "Cancelled" || Number.isFinite(j.cancelledAt)) &&
        (!["Assigned", "In progress"].includes(j.status) ||
          TEAMS.includes(j.assignee)),
      "Saved job data is inconsistent.",
    );
  for (const r of s.reports)
    requireThat(
      typeof r.id === "string" &&
        assetById(r.assetId) &&
        typeof r.description === "string" &&
        CATEGORIES.includes(r.category) &&
        Number.isFinite(r.createdAt) &&
        ["Unreviewed", "Linked", "Rejected"].includes(r.review) &&
        ((r.review === "Linked" &&
          s.jobs.some((j) => j.id === r.jobId && j.assetId === r.assetId)) ||
          (r.review !== "Linked" && r.jobId === null)),
      "Saved report links are inconsistent.",
    );
  return doc;
}
export function command(doc, action, role, now = Date.now()) {
  validateDocument(doc);
  requireThat(
    action && typeof action.id === "string" && action.id.length > 0,
    "Missing action identifier.",
  );
  if (doc.events.some((e) => e.id === action.id)) return doc; // retry is idempotent
  requireThat(
    ["Reporter", "Coordinator"].includes(role),
    "Choose a valid demo role.",
  );
  requireThat(
    action.type === "report" || role === "Coordinator",
    "Only a coordinator can change repair work.",
  );
  requireThat(Number.isFinite(now), "Invalid event time.");
  const at = Math.max(now, doc.events.at(-1)?.at || doc.createdAt);
  const state = project(doc),
    changes = {},
    seq = doc.events.length + 1;
  let report,
    job,
    label,
    note = "",
    entityId = "";
  const getReport = () => {
    const r = state.reports.find((r) => r.id === action.reportId);
    requireThat(r, "Report not found.");
    return { ...r };
  };
  const getJob = () => {
    const j = state.jobs.find((j) => j.id === action.jobId);
    requireThat(j, "Repair job not found.");
    return { ...j };
  };
  const priority = () => {
    requireThat(
      PRIORITIES.includes(action.priority),
      "Choose a valid priority.",
    );
    return action.priority;
  };
  if (action.type === "report") {
    requireThat(assetById(action.assetId), "Choose an existing asset.");
    requireThat(
      CATEGORIES.includes(action.category),
      "Choose a valid category.",
    );
    report = {
      id: `R-${String(state.reports.length + 1).padStart(3, "0")}`,
      assetId: action.assetId,
      category: action.category,
      description: required(action.description, "Observation"),
      createdAt: at,
      review: "Unreviewed",
      jobId: null,
    };
    changes.reports = [report];
    label = "Report received";
    entityId = report.id;
    note = report.description;
  } else if (action.type === "createJob") {
    report = getReport();
    requireThat(
      report.review === "Unreviewed",
      "Only unreviewed reports can start a repair job.",
    );
    job = {
      id: `J-${String(state.jobs.length + 1).padStart(3, "0")}`,
      assetId: report.assetId,
      title: required(action.title, "Repair title", 120),
      priority: priority(),
      priorityReason: required(action.reason, "Priority reason", 500),
      status: "Open",
      assignee: null,
      createdAt: at,
      completedAt: null,
      cancelledAt: null,
      work: "",
      verification: "",
    };
    report.review = "Linked";
    report.jobId = job.id;
    changes.reports = [report];
    changes.jobs = [job];
    label = "Repair job opened";
    entityId = job.id;
    note = job.priorityReason;
  } else if (action.type === "link") {
    report = getReport();
    job = getJob();
    requireThat(
      report.assetId === job.assetId,
      "Reports can only link to jobs for the same asset.",
    );
    requireThat(active(job), "Choose an active repair job.");
    requireThat(
      report.jobId !== job.id,
      "This report is already linked to that job.",
    );
    note = required(action.reason, "Linking reason", 500);
    report.review = "Linked";
    report.jobId = job.id;
    changes.reports = [report];
    label = "Report linked";
    entityId = report.id;
  } else if (action.type === "reject") {
    report = getReport();
    requireThat(
      report.review === "Unreviewed",
      "Only unreviewed reports can be rejected.",
    );
    note = required(action.reason, "Rejection reason", 500);
    report.review = "Rejected";
    report.jobId = null;
    report.reason = note;
    changes.reports = [report];
    label = "Report rejected";
    entityId = report.id;
  } else {
    job = getJob();
    entityId = job.id;
    if (action.type === "assign") {
      requireThat(
        ["Open", "Assigned"].includes(job.status),
        "Only open or assigned jobs can be assigned.",
      );
      requireThat(
        TEAMS.includes(action.assignee),
        "Choose a maintenance team.",
      );
      job.assignee = action.assignee;
      job.status = "Assigned";
      label = "Repair assigned";
      note = action.assignee;
    } else if (action.type === "start") {
      requireThat(
        job.status === "Assigned",
        "Assign this job before starting work.",
      );
      job.status = "In progress";
      label = "Work started";
    } else if (action.type === "complete") {
      requireThat(
        job.status === "In progress",
        "Start work before completing this job.",
      );
      job.work = required(action.work, "Work summary");
      job.verification = required(
        action.verification,
        "Verification observation",
      );
      job.status = "Completed";
      job.completedAt = at;
      label = "Repair completed";
      note = `${job.work} Verification: ${job.verification}`;
    } else if (action.type === "reopen") {
      requireThat(
        job.status === "Completed",
        "Only completed jobs can be reopened.",
      );
      note = required(action.reason, "Reopening reason", 500);
      job.status = "Open";
      job.assignee = null;
      label = "Repair reopened";
    } else if (action.type === "cancel") {
      requireThat(active(job), "Only active jobs can be cancelled.");
      note = required(action.reason, "Cancellation reason", 500);
      job.status = "Cancelled";
      job.cancelledAt = at;
      label = "Repair cancelled";
    } else if (action.type === "priority") {
      requireThat(active(job), "Only active jobs can change priority.");
      job.priority = priority();
      job.priorityReason = required(action.reason, "Priority reason", 500);
      label = "Priority updated";
      note = job.priorityReason;
    } else throw new Error("Unknown repair action.");
    changes.jobs = [job];
  }
  const next = {
    ...doc,
    revision: seq,
    events: [
      ...doc.events,
      { id: action.id, seq, at, role, label, note, entityId, changes },
    ],
  };
  return validateDocument(next);
}
export function seed(now = Date.now()) {
  const t = now - 8 * 3600000;
  let doc = blank(t);
  let n = 0;
  const run = (type, data, minutes, role = "Coordinator") => {
    doc = command(
      doc,
      { id: `seed-${++n}`, type, ...data },
      role,
      t + minutes * 60000,
    );
  };
  run(
    "report",
    {
      assetId: "FAN-01",
      category: "Electrical",
      description:
        "The ceiling fan stops after a few seconds. Classroom A is getting warm.",
    },
    0,
    "Reporter",
  );
  run(
    "report",
    {
      assetId: "FAN-01",
      category: "Electrical",
      description: "Fan is still not spinning on the higher setting.",
    },
    5,
    "Reporter",
  );
  run(
    "createJob",
    {
      reportId: "R-001",
      title: "Restore the classroom ceiling fan",
      priority: "High",
      reason: "Classroom ventilation is unavailable.",
    },
    10,
  );
  run(
    "link",
    {
      reportId: "R-002",
      jobId: "J-001",
      reason: "Same fan and same symptom; preserve both observations.",
    },
    12,
  );
  run("assign", { jobId: "J-001", assignee: TEAMS[0] }, 20);
  run("start", { jobId: "J-001" }, 30);
  run(
    "report",
    {
      assetId: "DOOR-01",
      category: "General",
      description: "Library door catches on its frame when closing.",
    },
    40,
    "Reporter",
  );
  run(
    "createJob",
    {
      reportId: "R-003",
      title: "Adjust the library door hinge",
      priority: "Routine",
      reason: "Door remains usable; schedule a routine adjustment.",
    },
    45,
  );
  run("assign", { jobId: "J-002", assignee: TEAMS[1] }, 50);
  run("start", { jobId: "J-002" }, 55);
  run(
    "complete",
    {
      jobId: "J-002",
      work: "Adjusted the hinge alignment and tightened screws.",
      verification:
        "Door opened and closed freely five times. Synthetic example.",
    },
    100,
  );
  run(
    "report",
    {
      assetId: "TAP-01",
      category: "Plumbing",
      description:
        "Water is pooling beneath the washbasin. Please ask staff to check the area.",
    },
    130,
    "Reporter",
  );
  run(
    "createJob",
    {
      reportId: "R-004",
      title: "Inspect the leaking washbasin tap",
      priority: "Urgent",
      reason:
        "Reported water on the floor may create a slip hazard; staff attention needed.",
    },
    135,
  );
  run(
    "report",
    {
      assetId: "LIGHT-01",
      category: "Electrical",
      description: "The central corridor light flickers intermittently.",
    },
    200,
    "Reporter",
  );
  return doc;
}
