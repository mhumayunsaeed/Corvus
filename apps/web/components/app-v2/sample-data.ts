import type { AppShellData } from "./AppShell";

const ROLE_MAINTAINER = "#E8A33D";
const ROLE_CORE = "#2DD4BF";

const members = {
  maya: { id: "u1", name: "maya", presence: "online" as const, roleColor: ROLE_MAINTAINER },
  alex: { id: "u2", name: "alex", presence: "online" as const, roleColor: ROLE_CORE },
  ravi: { id: "u3", name: "ravi", presence: "idle" as const },
  jun: { id: "u4", name: "jun", presence: "dnd" as const },
  sam: { id: "u5", name: "sam", presence: "offline" as const },
  lena: { id: "u6", name: "lena", presence: "offline" as const },
};

const t = (minsAgo: number) => new Date(Date.now() - minsAgo * 60_000).toISOString();

/** Representative dataset for the /spaces design preview. */
export const SAMPLE_DATA: AppShellData = {
  me: { id: "me", name: "you", presence: "online", statusText: "online" },
  spaces: [
    { id: "s1", name: "Corvus", unread: false },
    { id: "s2", name: "Protocol", unread: true },
    { id: "s3", name: "Homelab" },
  ],
  sectionsBySpace: {
    s1: [
      {
        id: "sec1",
        name: "General",
        channels: [
          { id: "c1", name: "welcome", type: "announcement" },
          { id: "c2", name: "general", type: "text", unread: true },
          { id: "c3", name: "introductions", type: "text" },
        ],
      },
      {
        id: "sec2",
        name: "Engineering",
        channels: [
          { id: "c4", name: "dev", type: "text" },
          { id: "c5", name: "api-latency", type: "incident", unread: true },
          {
            id: "c6",
            name: "pairing",
            type: "voice",
            participants: [
              { id: "u1", name: "maya" },
              { id: "u2", name: "alex" },
            ],
          },
          { id: "c7", name: "all-hands", type: "stage" },
        ],
      },
      {
        id: "sec5",
        name: "Projects",
        channels: [
          { id: "c11", name: "sprint-12", type: "board" },
          { id: "c12", name: "handbook", type: "docs" },
          { id: "c13", name: "pull-requests", type: "github" },
          { id: "c14", name: "wireframes", type: "canvas" },
        ],
      },
    ],
    s2: [
      {
        id: "sec3",
        name: "Spec",
        channels: [
          { id: "c8", name: "rfc", type: "text", unread: true },
          { id: "c9", name: "transport", type: "text" },
        ],
      },
    ],
    s3: [
      { id: "sec4", name: "Ops", channels: [{ id: "c10", name: "monitoring", type: "text" }] },
    ],
  },
  messagesByChannel: {
    c2: [
      { id: "m1", author: members.maya, at: t(48 * 60 + 30), text: "Pushed the amber token migration — every accent flips centrally now." },
      { id: "m2", author: members.maya, at: t(48 * 60 + 28), text: "No class renames, just the channel values. 217 usages, zero churn." },
      { id: "m3", author: members.alex, at: t(22), text: "Nice. The square avatars read way more like a tool and less like a chat app.", pinned: true, reactions: [{ emoji: "👍", count: 3, reacted: true }, { emoji: "🔥", count: 1 }] },
      { id: "m4", author: members.ravi, at: t(18), text: "Monospace channel glyphs are the detail that sells it for me." },
      {
        id: "m4b",
        author: members.jun,
        at: t(12),
        text: "Reference doc for the spacing scale:",
        embed: {
          url: "https://corvus.app/docs/design-tokens",
          domain: "corvus.app",
          title: "Design tokens — spacing, radius, and type scale",
          description: "The single source of truth for every surface in Corvus. 4px grid, 1px rules, two font roles.",
        },
      },
      {
        id: "m4c",
        author: members.maya,
        at: t(9),
        text: "Annotated the nav rail states here:",
        attachments: [{ kind: "image", name: "nav-rail-states.png", size: "184 KB" }],
        reactions: [{ emoji: "👀", count: 2 }],
      },
      {
        id: "m5",
        author: members.alex,
        at: t(4),
        text: "Shipping the speaking border as a calm green next.",
        replyTo: { id: "m4c", authorName: "maya", text: "Annotated the nav rail states here:" },
      },
    ],
    c3: [],
    c4: [
      { id: "m6", author: members.jun, at: t(90), text: "WebSocket reconnect backoff is merged.", pinned: true },
      { id: "m7", author: members.jun, at: t(89), text: "Capped at 30s with jitter." },
      {
        id: "m8",
        author: members.jun,
        at: t(60),
        text: "",
        githubEvent: { text: 'merged PR #42: "Add OAuth flow"', meta: "humayun · 1h ago" },
      },
      {
        id: "m9",
        author: members.maya,
        at: t(30),
        text: "Walkthrough of the new auth flow:",
        clip: { duration: "01:42", size: "6.8 MB" },
      },
    ],
    c5: [
      { id: "i1", author: members.alex, at: t(80), text: "Seeing p99 spikes on /messages — digging in." },
      { id: "i2", author: members.maya, at: t(70), text: "Connection pool exhaustion on db-2. Scaling now." },
      { id: "i3", author: members.alex, at: t(40), text: "Latency recovering. Holding at monitoring." },
    ],
  },
  membersBySpace: {
    s1: [members.maya, members.alex, members.ravi, members.jun, members.sam, members.lena],
    s2: [members.maya, members.alex],
    s3: [members.jun],
  },
  voiceByChannel: {
    c6: [
      { id: "u1", name: "maya", speaking: true },
      { id: "u2", name: "alex", muted: true },
    ],
    c7: [
      { id: "u1", name: "maya", speaking: true, role: "speaker" },
      { id: "u2", name: "alex", role: "speaker", muted: true },
      { id: "u3", name: "ravi", role: "listener" },
      { id: "u4", name: "jun", role: "listener", raisedHand: true },
      { id: "u5", name: "sam", role: "listener" },
      { id: "u6", name: "lena", role: "listener" },
    ],
  },
  boardsByChannel: {
    c11: {
      id: "b1",
      name: "Sprint 12",
      sprint: "SPRINT 12 · JUN 9 – JUN 20",
      columns: [
        {
          id: "col1",
          title: "To do",
          cards: [
            {
              id: "CARD-044",
              title: "Rate-limit the invite endpoint",
              label: "backend",
              assignee: members.jun,
              dueDate: "Jun 18",
            },
            {
              id: "CARD-045",
              title: "Empty states for the docs list",
              label: "design",
              assignee: members.ravi,
              commentCount: 2,
            },
            { id: "CARD-046", title: "Spike: presence over SSE fallback" },
          ],
        },
        {
          id: "col2",
          title: "In progress",
          cards: [
            {
              id: "CARD-042",
              title: "Review authentication flow",
              label: "auth",
              assignee: members.maya,
              dueDate: "Jun 20",
              linkedPR: 42,
              commentCount: 5,
              description:
                "Audit the OAuth callback path and session rotation. Confirm refresh tokens are single-use and the desktop deep link round-trips state.",
            },
            {
              id: "CARD-043",
              title: "Speaking ring on voice tiles",
              label: "ui",
              assignee: members.alex,
              dueDate: "Jun 12",
              overdue: true,
            },
          ],
        },
        {
          id: "col3",
          title: "Done",
          cards: [
            {
              id: "CARD-040",
              title: "Amber token migration",
              label: "ui",
              assignee: members.maya,
              linkedPR: 38,
            },
            { id: "CARD-041", title: "WebSocket reconnect backoff", assignee: members.jun, linkedPR: 40 },
          ],
        },
        { id: "col4", title: "Cancelled", cards: [] },
      ],
    },
  },
  docsByChannel: {
    c12: [
      {
        id: "doc1",
        title: "Engineering handbook",
        author: members.maya,
        editedLabel: "edited 2h ago",
        blocks: [
          { id: "b1", type: "p", text: "How we build, review, and ship Corvus. Start here." },
          { id: "b2", type: "h2", text: "Code review" },
          {
            id: "b3",
            type: "bullet",
            items: [
              "Every PR needs one approval from a maintainer.",
              "CI must be green before merge — no exceptions.",
              "Prefer small PRs; link the kanban card.",
            ],
          },
          { id: "b4", type: "callout", text: "Incidents page anyone on-call. Declare early, resolve calmly." },
          { id: "b5", type: "h2", text: "Linking work" },
          { id: "b6", type: "card", cardId: "CARD-042", text: "Review authentication flow" },
          { id: "b7", type: "p", text: "" },
        ],
      },
      {
        id: "doc2",
        title: "Self-hosting runbook",
        author: members.jun,
        editedLabel: "edited yesterday",
        blocks: [
          { id: "b1", type: "p", text: "Deploying and operating a Corvus instance." },
          { id: "b2", type: "code", text: "docker-compose up -d\ndocker-compose logs -f corvus" },
          { id: "b3", type: "quote", text: "Back up the data volume before every upgrade." },
          { id: "b4", type: "p", text: "" },
        ],
      },
    ],
  },
  prsByChannel: {
    c13: [
      {
        id: "pr1",
        number: 47,
        title: "Add kanban board drag-and-drop",
        repo: "corvus/web",
        author: "alex",
        updatedAt: "12m ago",
        status: "review",
        ciStatus: "pending",
        reviewCount: 1,
      },
      {
        id: "pr2",
        number: 46,
        title: "Docs editor slash menu",
        repo: "corvus/web",
        author: "ravi",
        updatedAt: "1h ago",
        status: "open",
        ciStatus: "passing",
        reviewCount: 2,
      },
      {
        id: "pr3",
        number: 45,
        title: "Fix reconnect storm on flaky networks",
        repo: "corvus/api",
        author: "jun",
        updatedAt: "3h ago",
        status: "open",
        ciStatus: "failing",
      },
      {
        id: "pr4",
        number: 44,
        title: "Draft: incident channel timeline",
        repo: "corvus/web",
        author: "maya",
        updatedAt: "5h ago",
        status: "draft",
      },
      {
        id: "pr5",
        number: 42,
        title: "Add OAuth flow",
        repo: "corvus/api",
        author: "humayun",
        updatedAt: "1d ago",
        status: "merged",
        ciStatus: "passing",
        reviewCount: 3,
      },
    ],
  },
  incidentsByChannel: {
    c5: {
      status: "monitoring",
      severity: "P1",
      commander: members.maya,
      services: ["api", "db-2", "gateway"],
      duration: "ongoing · 1h 23m",
      timeline: [
        { at: "14:02", text: "Incident declared · severity P1" },
        { at: "14:05", text: "maya assigned as commander" },
        { at: "14:31", text: "db-2 pool scaled 32 → 96" },
        { at: "14:58", text: "Status changed to MONITORING" },
      ],
    },
  },
  dmConversations: [
    { id: "d1", name: "alex", presence: "online", unreadCount: 2 },
    { id: "d2", name: "maya", presence: "idle", lastLabel: "2h" },
    { id: "d3", name: "design-crew", group: [{ id: "u3", name: "ravi" }, { id: "u4", name: "jun" }], lastLabel: "Mon" },
    { id: "d4", name: "ravi", presence: "offline", lastLabel: "3d" },
  ],
  friends: [
    { id: "d2", name: "maya", presence: "idle", status: "shipping tokens" },
    { id: "d1", name: "alex", presence: "online", status: "in #dev" },
    { id: "d4", name: "ravi", presence: "offline" },
    { id: "u4", name: "jun", presence: "dnd", status: "heads down" },
    { id: "u6", name: "lena", presence: "offline", pending: "incoming" },
    { id: "u5", name: "sam", presence: "offline", pending: "outgoing" },
  ],
};

// DM message threads (keyed by conversation id, reusing the message map).
SAMPLE_DATA.messagesByChannel.d1 = [
  { id: "dm1", author: members.alex, at: t(12), text: "did you see the amber tokens landed?" },
  { id: "dm2", author: members.alex, at: t(11), text: "looks sharp." },
  {
    id: "dm3",
    author: members.alex,
    at: t(8),
    text: "spec for the call controls:",
    attachments: [{ kind: "file", name: "call-controls-spec.pdf", size: "1.2 MB" }],
  },
];

// Group DM thread — same feed component as channels and 1:1.
SAMPLE_DATA.messagesByChannel.d3 = [
  { id: "g1", author: members.ravi, at: t(60 * 26), text: "moodboard for the new empty states" },
  {
    id: "g2",
    author: members.ravi,
    at: t(60 * 26 - 2),
    text: "",
    attachments: [{ kind: "image", name: "empty-states-board.png", size: "402 KB" }],
    reactions: [{ emoji: "🔥", count: 2, reacted: true }],
  },
  {
    id: "g3",
    author: members.jun,
    at: t(60 * 25),
    text: "love the second row. https://corvus.app/docs/empty-states has the writing guidelines",
    replyTo: { id: "g2", authorName: "ravi", text: "empty-states-board.png" },
  },
];
