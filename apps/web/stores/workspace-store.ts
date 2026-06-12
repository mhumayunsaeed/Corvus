import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  BoardData,
  ChannelSection,
  ChannelSummary,
  DMSummary,
  DocContent,
  FriendEntry,
  IncidentMeta,
  Presence,
  PullRequest,
  SpaceSummary,
} from "@/components/app-v2/types";

/**
 * Locally-created workspace entities, layered over the prop-driven shell data
 * (the same pattern as the chat echo layers): spaces and their sections,
 * channels added to any space, group DMs, and friend-request state. Persisted
 * so creations survive reloads; merged into the shell data by useShellData.
 */
export interface WorkspaceState {
  localSpaces: SpaceSummary[];
  /** Sections of locally-created spaces, keyed by space id. */
  localSections: Record<string, ChannelSection[]>;
  /** Channels appended to existing sections (any space). */
  addedChannels: { spaceId: string; sectionId: string; channel: ChannelSummary }[];
  /** Sections appended to existing spaces. */
  addedSections: { spaceId: string; section: ChannelSection }[];
  removedChannelIds: string[];
  removedSpaceIds: string[];
  spaceRenames: Record<string, string>;
  /** Seeded boards / incidents for locally-created channels. */
  localBoards: Record<string, BoardData>;
  localIncidents: Record<string, IncidentMeta>;
  /** Locally-created DM conversations (1:1 and group). */
  localConvos: DMSummary[];
  /** Friend requests sent from this client. */
  addedFriends: FriendEntry[];
  /** Per-friend state change: accepted (pending cleared) or removed. */
  friendStates: Record<string, "accepted" | "removed">;
  /** Members removed from a space (spaceId → member ids). */
  removedMembers: Record<string, string[]>;
  /** My presence + custom status — propagated everywhere I appear. */
  myStatus: { presence: Presence; text?: string } | null;
  /** Board edits (cards, columns, renames), keyed by channel id. */
  boardOverrides: Record<string, BoardData>;
  /** Doc edits and creations, keyed by channel id. */
  docsOverrides: Record<string, DocContent[]>;
  /** Incident updates (status, severity, timeline), keyed by channel id. */
  incidentOverrides: Record<string, IncidentMeta>;
  /** PR feeds for locally-connected GitHub channels. */
  localPRs: Record<string, PullRequest[]>;

  createSpace: (
    space: SpaceSummary,
    sections: ChannelSection[],
    seeds?: { boards?: BoardData[]; incidents?: Record<string, IncidentMeta> }
  ) => void;
  renameSpace: (spaceId: string, name: string) => void;
  deleteSpace: (spaceId: string) => void;
  addSection: (spaceId: string, section: ChannelSection) => void;
  addChannel: (
    spaceId: string,
    sectionId: string,
    channel: ChannelSummary,
    seed?: { board?: BoardData; incident?: IncidentMeta }
  ) => void;
  removeChannel: (channelId: string) => void;
  createConversation: (convo: DMSummary) => void;
  sendFriendRequest: (friend: FriendEntry) => void;
  /** Accept an incoming request, or mark an outgoing one as accepted. */
  acceptFriend: (friendId: string) => void;
  /** Decline incoming / cancel outgoing / unfriend. */
  removeFriend: (friendId: string) => void;
  removeMember: (spaceId: string, memberId: string) => void;
  setMyStatus: (status: { presence: Presence; text?: string } | null) => void;
  updateBoard: (channelId: string, board: BoardData) => void;
  updateDocs: (channelId: string, docs: DocContent[]) => void;
  updateIncident: (channelId: string, incident: IncidentMeta) => void;
  connectGitHub: (channelId: string, prs: PullRequest[]) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      localSpaces: [],
      localSections: {},
      addedChannels: [],
      addedSections: [],
      removedChannelIds: [],
      removedSpaceIds: [],
      spaceRenames: {},
      localBoards: {},
      localIncidents: {},
      localConvos: [],
      addedFriends: [],
      friendStates: {},
      removedMembers: {},
      myStatus: null,
      boardOverrides: {},
      docsOverrides: {},
      incidentOverrides: {},
      localPRs: {},

      createSpace: (space, sections, seeds) =>
        set((s) => ({
          localSpaces: [...s.localSpaces, space],
          localSections: { ...s.localSections, [space.id]: sections },
          localBoards: seeds?.boards
            ? { ...s.localBoards, ...Object.fromEntries(seeds.boards.map((b) => [b.id, b])) }
            : s.localBoards,
          localIncidents: seeds?.incidents
            ? { ...s.localIncidents, ...seeds.incidents }
            : s.localIncidents,
        })),

      renameSpace: (spaceId, name) =>
        set((s) => ({ spaceRenames: { ...s.spaceRenames, [spaceId]: name } })),

      deleteSpace: (spaceId) =>
        set((s) => ({
          removedSpaceIds: [...s.removedSpaceIds, spaceId],
          localSpaces: s.localSpaces.filter((sp) => sp.id !== spaceId),
        })),

      addSection: (spaceId, section) =>
        set((s) =>
          s.localSections[spaceId]
            ? {
                localSections: {
                  ...s.localSections,
                  [spaceId]: [...s.localSections[spaceId], section],
                },
              }
            : { addedSections: [...s.addedSections, { spaceId, section }] }
        ),

      addChannel: (spaceId, sectionId, channel, seed) =>
        set((s) => ({
          addedChannels: [...s.addedChannels, { spaceId, sectionId, channel }],
          localBoards: seed?.board
            ? { ...s.localBoards, [channel.id]: seed.board }
            : s.localBoards,
          localIncidents: seed?.incident
            ? { ...s.localIncidents, [channel.id]: seed.incident }
            : s.localIncidents,
        })),

      removeChannel: (channelId) =>
        set((s) => ({ removedChannelIds: [...s.removedChannelIds, channelId] })),

      createConversation: (convo) =>
        set((s) => ({ localConvos: [convo, ...s.localConvos] })),

      sendFriendRequest: (friend) =>
        set((s) => ({ addedFriends: [...s.addedFriends, friend] })),

      acceptFriend: (friendId) =>
        set((s) => ({ friendStates: { ...s.friendStates, [friendId]: "accepted" } })),

      removeFriend: (friendId) =>
        set((s) => ({
          friendStates: { ...s.friendStates, [friendId]: "removed" },
          addedFriends: s.addedFriends.filter((f) => f.id !== friendId),
        })),

      removeMember: (spaceId, memberId) =>
        set((s) => ({
          removedMembers: {
            ...s.removedMembers,
            [spaceId]: [...(s.removedMembers[spaceId] ?? []), memberId],
          },
        })),

      setMyStatus: (status) => set({ myStatus: status }),

      updateBoard: (channelId, board) =>
        set((s) => ({ boardOverrides: { ...s.boardOverrides, [channelId]: board } })),

      updateDocs: (channelId, docs) =>
        set((s) => ({ docsOverrides: { ...s.docsOverrides, [channelId]: docs } })),

      updateIncident: (channelId, incident) =>
        set((s) => ({ incidentOverrides: { ...s.incidentOverrides, [channelId]: incident } })),

      connectGitHub: (channelId, prs) =>
        set((s) => ({ localPRs: { ...s.localPRs, [channelId]: prs } })),
    }),
    {
      name: "corvus-workspace-v1",
      // Hydrated manually after mount so SSR and first client render match.
      skipHydration: true,
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") return localStorage;
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
    }
  )
);
