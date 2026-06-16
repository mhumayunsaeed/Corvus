"use client";

import { ChannelGlyph } from "@/shared/components/ui";
import type { VoiceParticipant } from "./types";
import {
  CallControls,
  ConnectionPill,
  ParticipantTile,
  ScreenShareStage,
  WhiteboardLayer,
  useCallControls,
} from "./CallSurface";

/**
 * Voice channel view (brief §VoiceView) — built on the shared call system:
 * same tiles, same controls, same whiteboard layer as 1:1 and group calls.
 * When someone presents, the stage takes the room and tiles form a strip.
 */
export function VoiceView({
  channelName,
  participants,
  onLeave,
}: {
  channelName: string;
  participants: VoiceParticipant[];
  onLeave?: () => void;
}) {
  const { state, toggle, camStream, screenStream } = useCallControls();

  // The local user is always in the room — their tile carries the live camera.
  const everyone: VoiceParticipant[] = [
    ...participants,
    { id: "local-me", name: "you", muted: state.muted, deafened: state.deafened },
  ];

  const presenter = state.sharing
    ? { name: "you", self: true }
    : (() => {
        const p = participants.find((x) => x.sharing);
        return p ? { name: p.name, self: false } : null;
      })();

  return (
    <section className="relative flex h-full min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <ChannelGlyph type="voice" size={14} />
        <h1 className="text-[15px] font-semibold text-text-primary">{channelName}</h1>
        <span className="font-mono text-[11px] text-text-muted">
          {everyone.length} connected
        </span>
        <div className="ml-auto">
          <ConnectionPill />
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {presenter ? (
          /* Presenting layout — stage + participant strip */
          <div className="flex h-full flex-col gap-2 overflow-y-auto p-4">
            <ScreenShareStage
              presenterName={presenter.name}
              self={presenter.self}
              stream={presenter.self ? screenStream : undefined}
              onStop={presenter.self ? () => toggle("sharing") : undefined}
            />
            <div className="flex gap-2 overflow-x-auto pb-1">
              {everyone.map((p) => (
                <ParticipantTile
                  key={p.id}
                  participant={p}
                  size={36}
                  stream={p.id === "local-me" && state.camera ? camStream : undefined}
                  className="w-[180px] shrink-0"
                />
              ))}
            </div>
          </div>
        ) : (
          /* Grid layout */
          <div
            className="grid h-full content-start gap-2 overflow-y-auto p-4"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}
          >
            {everyone.map((p) => (
              <ParticipantTile
                key={p.id}
                participant={p}
                stream={p.id === "local-me" && state.camera ? camStream : undefined}
              />
            ))}
          </div>
        )}

        {state.whiteboard && <WhiteboardLayer onClose={() => toggle("whiteboard")} />}
      </div>

      <div className="flex h-16 shrink-0 items-center justify-center gap-2 border-t border-border bg-surface-raised px-4">
        <CallControls state={state} onToggle={toggle} onLeave={onLeave} />
      </div>
    </section>
  );
}
