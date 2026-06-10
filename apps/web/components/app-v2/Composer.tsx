"use client";

import { useRef, useState } from "react";
import { cn } from "@corvus/ui";
import { Plus, Smile, ArrowUp } from "lucide-react";

/** Message composer (brief §Composer). */
export function Composer({
  channelName,
  onSend,
}: {
  channelName: string;
  onSend?: (text: string) => void;
}) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const grow = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  };

  const send = () => {
    const text = value.trim();
    if (!text) return;
    onSend?.(text);
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
  };

  const showActionRow = focused || value.length > 0;

  return (
    <div className="shrink-0 border-t border-border bg-background px-4 py-3">
      <div
        className={cn(
          "flex flex-col rounded-lg border bg-surface-raised transition-colors",
          focused ? "border-border-active" : "border-border"
        )}
      >
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button type="button" aria-label="Attach" className="text-text-faint transition-colors hover:text-text-primary">
            <Plus size={18} />
          </button>
          <textarea
            ref={ref}
            rows={1}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              grow();
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={`Message ${channelName}`}
            className="max-h-[240px] min-h-5 flex-1 resize-none bg-transparent text-[14px] leading-[1.5] text-text-primary outline-none placeholder:text-text-muted"
          />
          <button type="button" aria-label="Emoji" className="text-text-faint transition-colors hover:text-text-primary">
            <Smile size={18} />
          </button>
        </div>

        {showActionRow && (
          <div className="flex items-center justify-between border-t border-border/50 px-3 py-2">
            <span className="font-mono text-[11px] text-text-faint">
              ** bold &nbsp; * italic &nbsp; ` code
            </span>
            <button
              type="button"
              aria-label="Send message"
              onClick={send}
              disabled={value.trim().length === 0}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-opacity",
                value.trim().length === 0
                  ? "cursor-not-allowed bg-surface-overlay text-text-faint"
                  : "bg-accent text-on-accent hover:opacity-85"
              )}
            >
              <ArrowUp size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
