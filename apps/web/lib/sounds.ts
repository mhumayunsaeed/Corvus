/**
 * Corvus sound engine.
 *
 * A single, cohesive Web-Audio synthesizer for every non-voice sound the app
 * makes: notification cues, and incoming / outgoing call ringtones. Tones are
 * generated procedurally (no audio assets to ship or cache) but voiced with
 * soft attack/release envelopes, detuned layers and a gentle low-pass so they
 * read as warm and "designed" rather than as raw beeps.
 *
 * Public surface:
 *   - playNotification(kind, name?, volume%)        → one-shot cue
 *   - startRingtone(spec)                           → looping ring, returns stop()
 *   - INCOMING_RINGTONES / OUTGOING_RINGTONES / NOTIFICATION_SOUNDS  → option lists
 */

type ToneWave = OscillatorType; // "sine" | "triangle" | "square" | "sawtooth"

interface Note {
    /** Start time relative to the pattern start, in seconds. */
    at: number;
    /** Duration of the sustained body, in seconds. */
    dur: number;
    /** Fundamental frequency in Hz. */
    freq: number;
    /** Oscillator shape. Defaults to "sine". */
    wave?: ToneWave;
    /** Relative loudness 0..1 (scaled by the master volume). Defaults to 1. */
    gain?: number;
    /** Adds a second oscillator detuned by this many cents for warmth. */
    detune?: number;
    /** Glide the pitch toward this frequency over the note (telephone warble). */
    glideTo?: number;
    /** Attack time in seconds. Defaults to 0.012. */
    attack?: number;
    /** Release time in seconds. Defaults to 0.08. */
    release?: number;
}

interface SoundPattern {
    notes: Note[];
    /** Total length of one cycle, in seconds (used for looping ringtones). */
    period: number;
    /** Soft master ceiling for the whole pattern, 0..1. Defaults to 0.9. */
    headroom?: number;
}

// ── Shared audio context ────────────────────────────────────────────────

let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;

    if (!sharedContext || sharedContext.state === "closed") {
        sharedContext = new Ctor();
    }
    if (sharedContext.state === "suspended") {
        sharedContext.resume().catch(() => {
            /* autoplay blocked until a user gesture — ignore */
        });
    }
    return sharedContext;
}

// ── Note scheduling ─────────────────────────────────────────────────────

function scheduleNote(
    ctx: AudioContext,
    destination: AudioNode,
    note: Note,
    originTime: number,
    master: number
) {
    const startAt = originTime + note.at;
    const stopAt = startAt + note.dur;
    const attack = note.attack ?? 0.012;
    const release = note.release ?? 0.08;
    const peak = Math.max(0.0001, (note.gain ?? 1) * master);

    const gain = ctx.createGain();
    gain.connect(destination);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(peak, startAt + attack);
    gain.gain.setValueAtTime(peak, Math.max(startAt + attack, stopAt - release));
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

    const makeOsc = (detuneCents: number) => {
        const osc = ctx.createOscillator();
        osc.type = note.wave ?? "sine";
        osc.frequency.setValueAtTime(note.freq, startAt);
        if (note.glideTo) {
            osc.frequency.linearRampToValueAtTime(note.glideTo, stopAt);
        }
        if (detuneCents) osc.detune.setValueAtTime(detuneCents, startAt);
        osc.connect(gain);
        osc.start(startAt);
        osc.stop(stopAt + 0.04);
    };

    makeOsc(0);
    if (note.detune) {
        // Layer a slightly detuned voice at half level for a fuller, warmer tone.
        const layer = ctx.createGain();
        layer.gain.value = 0.5;
        layer.connect(destination);
        const osc = ctx.createOscillator();
        osc.type = note.wave ?? "sine";
        osc.frequency.setValueAtTime(note.freq, startAt);
        if (note.glideTo) osc.frequency.linearRampToValueAtTime(note.glideTo, stopAt);
        osc.detune.setValueAtTime(note.detune, startAt);
        osc.connect(gain);
        osc.start(startAt);
        osc.stop(stopAt + 0.04);
    }
}

function playPattern(pattern: SoundPattern, master: number) {
    const ctx = getContext();
    if (!ctx) return;

    // A gentle low-pass rounds off the harsh top end of square/triangle voices.
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 5200;
    filter.Q.value = 0.4;

    const bus = ctx.createGain();
    bus.gain.value = pattern.headroom ?? 0.9;

    filter.connect(bus);
    bus.connect(ctx.destination);

    const origin = ctx.currentTime + 0.02;
    for (const note of pattern.notes) {
        scheduleNote(ctx, filter, note, origin, master);
    }
}

// ── Sound library ───────────────────────────────────────────────────────

// Note frequencies (equal temperament) used across the patterns.
const F = {
    A4: 440, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99,
    A5: 880, B5: 987.77, C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98,
};

export type NotificationKind = "message" | "mention" | "other";

interface SoundOption {
    id: string;
    label: string;
}

// ── Notification cues (one-shots) ───────────────────────────────────────

export const NOTIFICATION_SOUNDS: Record<NotificationKind, SoundOption[]> = {
    message: [
        { id: "chime", label: "Chime" },
        { id: "drop", label: "Drop" },
        { id: "ping", label: "Ping" },
    ],
    mention: [
        { id: "sparkle", label: "Sparkle" },
        { id: "rise", label: "Rise" },
    ],
    other: [
        { id: "soft", label: "Soft" },
        { id: "blip", label: "Blip" },
    ],
};

function notificationPattern(kind: NotificationKind, name: string): SoundPattern {
    if (kind === "mention") {
        if (name === "rise") {
            return {
                period: 0.7,
                notes: [
                    { at: 0, dur: 0.14, freq: F.E5, wave: "triangle", gain: 0.9, detune: 6 },
                    { at: 0.13, dur: 0.14, freq: F.A5, wave: "triangle", gain: 0.95, detune: 6 },
                    { at: 0.27, dur: 0.22, freq: F.C6, wave: "sine", gain: 1, detune: 6 },
                ],
            };
        }
        // sparkle — bright ascending arpeggio
        return {
            period: 0.7,
            notes: [
                { at: 0, dur: 0.12, freq: F.D6, wave: "sine", gain: 0.8 },
                { at: 0.1, dur: 0.12, freq: F.E6, wave: "sine", gain: 0.9 },
                { at: 0.2, dur: 0.2, freq: F.G6, wave: "sine", gain: 1, detune: 5 },
            ],
        };
    }

    if (kind === "other") {
        if (name === "blip") {
            return {
                period: 0.4,
                notes: [{ at: 0, dur: 0.12, freq: F.A5, wave: "triangle", gain: 0.85, detune: 4 }],
            };
        }
        // soft — gentle descending pair
        return {
            period: 0.6,
            notes: [
                { at: 0, dur: 0.18, freq: F.F5, wave: "sine", gain: 0.85, detune: 5 },
                { at: 0.16, dur: 0.22, freq: F.C5, wave: "sine", gain: 0.8, detune: 5 },
            ],
        };
    }

    // message
    if (name === "drop") {
        return {
            period: 0.4,
            notes: [
                { at: 0, dur: 0.1, freq: F.G6, wave: "sine", gain: 0.7 },
                { at: 0.07, dur: 0.18, freq: F.C6, wave: "sine", gain: 0.95, detune: 6, glideTo: F.A5 },
            ],
        };
    }
    if (name === "ping") {
        return {
            period: 0.35,
            notes: [{ at: 0, dur: 0.22, freq: F.C6, wave: "sine", gain: 0.9, detune: 6 }],
        };
    }
    // chime — warm two-note rise (default)
    return {
        period: 0.5,
        notes: [
            { at: 0, dur: 0.14, freq: F.A5, wave: "sine", gain: 0.8, detune: 5 },
            { at: 0.13, dur: 0.2, freq: F.D6, wave: "sine", gain: 0.95, detune: 5 },
        ],
    };
}

export function playNotification(
    kind: NotificationKind,
    name: string,
    volumePercent = 55
) {
    const master = 0.05 + (Math.max(0, Math.min(100, volumePercent)) / 100) * 0.22;
    playPattern(notificationPattern(kind, name), master);
}

// ── Ringtones (looping) ─────────────────────────────────────────────────

export type RingDirection = "incoming" | "outgoing";

export const INCOMING_RINGTONES: SoundOption[] = [
    { id: "aurora", label: "Aurora" },
    { id: "pulse", label: "Pulse" },
    { id: "classic", label: "Classic" },
    { id: "marimba", label: "Marimba" },
];

export const OUTGOING_RINGTONES: SoundOption[] = [
    { id: "smooth", label: "Smooth" },
    { id: "warm", label: "Warm" },
    { id: "classic", label: "Classic" },
];

function ringPattern(direction: RingDirection, name: string): SoundPattern {
    if (direction === "incoming") {
        if (name === "pulse") {
            // Modern two-buzz pattern, repeats every 2.6s.
            const buzz = (at: number): Note[] => [
                { at, dur: 0.16, freq: F.A5, wave: "triangle", gain: 1, detune: 8 },
                { at: at + 0.22, dur: 0.16, freq: F.A5, wave: "triangle", gain: 1, detune: 8 },
            ];
            return { period: 2.6, headroom: 0.8, notes: [...buzz(0), ...buzz(0.55)] };
        }
        if (name === "classic") {
            // Traditional telephone warble: two tones alternating quickly, double-ring.
            const ring = (at: number): Note[] => {
                const seq: Note[] = [];
                for (let i = 0; i < 8; i++) {
                    seq.push({
                        at: at + i * 0.05,
                        dur: 0.05,
                        freq: i % 2 === 0 ? F.C5 : F.E5,
                        wave: "triangle",
                        gain: 0.9,
                        attack: 0.005,
                        release: 0.01,
                    });
                }
                return seq;
            };
            return { period: 3.0, headroom: 0.8, notes: [...ring(0), ...ring(0.5)] };
        }
        if (name === "marimba") {
            // Apple-ish wooden arpeggio.
            return {
                period: 2.4,
                headroom: 0.85,
                notes: [
                    { at: 0, dur: 0.18, freq: F.E5, wave: "sine", gain: 0.9, release: 0.16 },
                    { at: 0.18, dur: 0.18, freq: F.A5, wave: "sine", gain: 0.95, release: 0.16 },
                    { at: 0.36, dur: 0.18, freq: F.C6, wave: "sine", gain: 1, release: 0.16 },
                    { at: 0.54, dur: 0.26, freq: F.B5, wave: "sine", gain: 0.95, release: 0.2 },
                ],
            };
        }
        // aurora — warm, melodic four-note motif with a shimmer tail (default)
        return {
            period: 2.8,
            headroom: 0.82,
            notes: [
                { at: 0, dur: 0.22, freq: F.A5, wave: "sine", gain: 0.85, detune: 7, release: 0.14 },
                { at: 0.2, dur: 0.22, freq: F.C6, wave: "sine", gain: 0.95, detune: 7, release: 0.14 },
                { at: 0.4, dur: 0.22, freq: F.E6, wave: "sine", gain: 1, detune: 7, release: 0.14 },
                { at: 0.62, dur: 0.34, freq: F.D6, wave: "sine", gain: 0.9, detune: 7, release: 0.24 },
                // soft harmonic shimmer underneath
                { at: 0, dur: 0.9, freq: F.A4, wave: "triangle", gain: 0.25, release: 0.4 },
            ],
        };
    }

    // outgoing ringback
    if (name === "warm") {
        return {
            period: 3.4,
            headroom: 0.75,
            notes: [
                { at: 0, dur: 0.5, freq: F.D5, wave: "sine", gain: 0.8, detune: 6, release: 0.18 },
                { at: 0, dur: 0.5, freq: F.A4, wave: "sine", gain: 0.5, detune: 6, release: 0.18 },
            ],
        };
    }
    if (name === "classic") {
        // Euro double ringback: 1s on, brief gap, then pause.
        const tone = (at: number): Note[] => [
            { at, dur: 0.4, freq: 425, wave: "sine", gain: 0.8, detune: 4 },
            { at, dur: 0.4, freq: 480, wave: "sine", gain: 0.5, detune: 4 },
        ];
        return { period: 4.0, headroom: 0.78, notes: [...tone(0), ...tone(0.6)] };
    }
    // smooth — single gentle dual-tone pulse, long pause (default)
    return {
        period: 3.2,
        headroom: 0.78,
        notes: [
            { at: 0, dur: 0.9, freq: 400, wave: "sine", gain: 0.75, detune: 5, attack: 0.06, release: 0.3 },
            { at: 0, dur: 0.9, freq: 450, wave: "sine", gain: 0.45, detune: 5, attack: 0.06, release: 0.3 },
        ],
    };
}

export interface RingtoneHandle {
    stop: () => void;
}

/**
 * Start a looping ringtone. Returns a handle whose `stop()` ends it. Optionally
 * auto-stops after `maxDurationMs`.
 */
export function startRingtone(opts: {
    direction: RingDirection;
    name: string;
    volumePercent?: number;
    maxDurationMs?: number;
}): RingtoneHandle {
    const pattern = ringPattern(opts.direction, opts.name);
    const master = 0.06 + (Math.max(0, Math.min(100, opts.volumePercent ?? 70)) / 100) * 0.3;

    let stopped = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const cycle = () => {
        if (stopped) return;
        playPattern(pattern, master);
    };

    cycle();
    interval = setInterval(cycle, Math.round(pattern.period * 1000));

    if (opts.maxDurationMs && opts.maxDurationMs > 0) {
        timeout = setTimeout(() => stop(), opts.maxDurationMs);
    }

    function stop() {
        if (stopped) return;
        stopped = true;
        if (interval) clearInterval(interval);
        if (timeout) clearTimeout(timeout);
    }

    return { stop };
}

/** Preview a ringtone once (no loop) — used by the settings test buttons. */
export function previewRingtone(direction: RingDirection, name: string, volumePercent = 70) {
    const master = 0.06 + (Math.max(0, Math.min(100, volumePercent)) / 100) * 0.3;
    playPattern(ringPattern(direction, name), master);
}
