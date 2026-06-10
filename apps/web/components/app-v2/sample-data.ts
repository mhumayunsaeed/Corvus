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
          { id: "c5", name: "incidents", type: "text" },
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
      { id: "m3", author: members.alex, at: t(22), text: "Nice. The square avatars read way more like a tool and less like a chat app.", reactions: [{ emoji: "👍", count: 3, reacted: true }, { emoji: "🔥", count: 1 }] },
      { id: "m4", author: members.ravi, at: t(18), text: "Monospace channel glyphs are the detail that sells it for me." },
      { id: "m5", author: members.alex, at: t(4), text: "Shipping the speaking border as a calm green next." },
    ],
    c3: [],
    c4: [
      { id: "m6", author: members.jun, at: t(90), text: "WebSocket reconnect backoff is merged." },
      { id: "m7", author: members.jun, at: t(89), text: "Capped at 30s with jitter." },
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
  },
  dmConversations: [
    { id: "d1", name: "alex", presence: "online", unreadCount: 2 },
    { id: "d2", name: "maya", presence: "idle", lastLabel: "2h" },
    { id: "d3", name: "design-crew", group: [{ id: "u3", name: "ravi" }, { id: "u4", name: "jun" }], lastLabel: "Mon" },
    { id: "d4", name: "ravi", presence: "offline", lastLabel: "3d" },
  ],
};

// DM message threads (keyed by conversation id, reusing the message map).
SAMPLE_DATA.messagesByChannel.d1 = [
  { id: "dm1", author: members.alex, at: t(12), text: "did you see the amber tokens landed?" },
  { id: "dm2", author: members.alex, at: t(11), text: "looks sharp." },
];
