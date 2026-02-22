// ────────────────────────────────────────────
// types & mock data used across pages
// ────────────────────────────────────────────

export interface User {
  id: string;
  displayName: string;
  username: string;
  avatar: string;
  status: "online" | "idle" | "dnd" | "offline";
  bio?: string;
}

export interface Server {
  id: string;
  name: string;
  icon: string;
  unread?: boolean;
  muted?: boolean;
}

export interface Channel {
  id: string;
  name: string;
  type: "text" | "voice" | "announcement";
  category: string;
  description?: string;
  unread?: boolean;
}

export interface Reaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

export interface Message {
  id: string;
  userId: string;
  content: string;
  timestamp: Date;
  reactions?: Reaction[];
  attachmentUrl?: string;
}

export interface DiscoveryServer {
  id: string;
  name: string;
  icon: string;
  members: number;
  tags?: string[];
  description?: string;
}

// ── Users ───────────────────────────────
export const mockUsers: Record<string, User> = {
  u1: {
    id: "u1",
    displayName: "Arya Stark",
    username: "arya",
    avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Arya",
    status: "online",
  },
  u2: {
    id: "u2",
    displayName: "Jon Snow",
    username: "jon_snow",
    avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Jon",
    status: "online",
  },
  u3: {
    id: "u3",
    displayName: "Daenerys",
    username: "dany",
    avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Dany",
    status: "idle",
  },
  u4: {
    id: "u4",
    displayName: "Tyrion Lannister",
    username: "tyrion",
    avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Tyrion",
    status: "online",
  },
  currentUser: {
    id: "currentUser",
    displayName: "You",
    username: "you",
    avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=You",
    status: "online",
  },
};

// ── Servers ─────────────────────────────
export const mockServers: Server[] = [
  {
    id: "s1",
    name: "Design Hub",
    icon: "https://api.dicebear.com/9.x/identicon/svg?seed=DesignHub",
    unread: true,
  },
  {
    id: "s2",
    name: "Dev Community",
    icon: "https://api.dicebear.com/9.x/identicon/svg?seed=DevComm",
  },
  {
    id: "s3",
    name: "Gaming Lounge",
    icon: "https://api.dicebear.com/9.x/identicon/svg?seed=GamingLounge",
    unread: true,
  },
  {
    id: "s4",
    name: "Music Makers",
    icon: "https://api.dicebear.com/9.x/identicon/svg?seed=MusicMakers",
  },
  {
    id: "s5",
    name: "Crypto Alpha",
    icon: "https://api.dicebear.com/9.x/identicon/svg?seed=CryptoAlpha",
    muted: true,
  },
];

// ── Channels ────────────────────────────
export const mockChannels: Channel[] = [
  { id: "c1", name: "welcome", type: "text", category: "Information", description: "Say hello!" },
  { id: "c2", name: "announcements", type: "announcement", category: "Information" },
  { id: "c3", name: "general", type: "text", category: "General", description: "General conversation", unread: false },
  { id: "c4", name: "introductions", type: "text", category: "General" },
  { id: "c5", name: "off-topic", type: "text", category: "General", unread: true },
  { id: "c6", name: "General Voice", type: "voice", category: "Voice Channels" },
  { id: "c7", name: "Gaming", type: "voice", category: "Voice Channels" },
];

// ── Messages ────────────────────────────
const now = Date.now();
export const mockMessages: Message[] = [
  {
    id: "m1",
    userId: "u2",
    content: "Hey everyone! Just pushed the new component library update. Check it out 🎉",
    timestamp: new Date(now - 3600000 * 2),
    reactions: [
      { emoji: "🎉", count: 4, reacted: true },
      { emoji: "🔥", count: 2, reacted: false },
    ],
  },
  {
    id: "m2",
    userId: "u3",
    content: "Nice work! The button variants look really clean now.",
    timestamp: new Date(now - 3600000 * 1.8),
  },
  {
    id: "m3",
    userId: "u4",
    content:
      "Here's a quick example of the new API:\n\n```tsx\nimport { Button } from '@veyra/ui';\n\nexport function Demo() {\n  return (\n    <Button variant=\"primary\" size=\"lg\">\n      Click me\n    </Button>\n  );\n}\n```",
    timestamp: new Date(now - 3600000 * 1.5),
    reactions: [{ emoji: "👀", count: 3, reacted: false }],
  },
  {
    id: "m4",
    userId: "u2",
    content: "Thanks Tyrion! The code preview feature is going to be awesome",
    timestamp: new Date(now - 3600000 * 1.4),
  },
  {
    id: "m5",
    userId: "u1",
    content: "Can we also get a dark variant for the inputs? The current ones blend too much into the surface.",
    timestamp: new Date(now - 3600000 * 0.5),
  },
  {
    id: "m6",
    userId: "u4",
    content: "Good point Arya. I'll add a `subtle` variant with slightly different border treatment. Should we also revisit the focus ring colors?",
    timestamp: new Date(now - 3600000 * 0.3),
    reactions: [{ emoji: "👍", count: 2, reacted: true }],
  },
  {
    id: "m7",
    userId: "u1",
    content: "Yes! The teal focus ring for success states would be a nice touch.",
    timestamp: new Date(now - 60000 * 10),
  },
];

// ── Interest Tags ───────────────────────
export const interestTags = [
  "Gaming",
  "Music",
  "Art & Design",
  "Development",
  "Anime",
  "Sports",
  "Science",
  "Film",
  "Writing",
  "Finance",
  "Crypto",
  "Fitness",
  "Cooking",
  "Travel",
  "Memes",
];

// ── Discovery Servers ───────────────────
export const discoveryServers: DiscoveryServer[] = [
  {
    id: "ds1",
    name: "Pixel Artisans",
    icon: "https://api.dicebear.com/9.x/identicon/svg?seed=PixelArtisans",
    members: 12_400,
    tags: ["Art & Design", "Gaming"],
    description: "A community for pixel art lovers",
  },
  {
    id: "ds2",
    name: "Frontend Masters",
    icon: "https://api.dicebear.com/9.x/identicon/svg?seed=FrontendMasters",
    members: 34_800,
    tags: ["Development", "Design"],
    description: "Learn and share frontend tech",
  },
  {
    id: "ds3",
    name: "Lo-Fi Beats",
    icon: "https://api.dicebear.com/9.x/identicon/svg?seed=LoFiBeats",
    members: 8_200,
    tags: ["Music", "Chill"],
    description: "Relax and vibe with lo-fi music",
  },
  {
    id: "ds4",
    name: "Anime Hub",
    icon: "https://api.dicebear.com/9.x/identicon/svg?seed=AnimeHub",
    members: 56_000,
    tags: ["Anime", "Memes"],
    description: "Discuss and discover anime",
  },
  {
    id: "ds5",
    name: "Indie Game Devs",
    icon: "https://api.dicebear.com/9.x/identicon/svg?seed=IndieGameDevs",
    members: 19_300,
    tags: ["Development", "Gaming"],
    description: "Build games, share progress",
  },
];
