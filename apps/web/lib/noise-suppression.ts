"use client";

/**
 * Microphone noise suppression with selectable levels (brief §Voice).
 *
 * - off      — raw microphone, no processing (music, instruments).
 * - standard — the browser's native DSP: noise suppression, echo
 *              cancellation, and auto gain.
 * - high     — standard, plus a tuned WebAudio chain: a high-pass filter
 *              (kills mains hum and desk rumble), a low-pass filter (tames
 *              hiss), and a hard-kneed compressor acting as a noise gate.
 *
 * The selected level persists and applies live — open calls re-acquire the
 * microphone when it changes.
 */

export type NoiseSuppressionLevel = "off" | "standard" | "high";

const STORE_KEY = "corvus-noise-suppression";
const CHANGE_EVENT = "corvus-noise-suppression-change";

export const NOISE_SUPPRESSION_LEVELS: {
  id: NoiseSuppressionLevel;
  label: string;
  description: string;
}[] = [
  { id: "off", label: "Off", description: "Raw microphone — best for music." },
  { id: "standard", label: "Standard", description: "Browser noise suppression + echo cancel." },
  { id: "high", label: "High", description: "Adds a tuned filter chain and noise gate." },
];

export function getNoiseSuppressionLevel(): NoiseSuppressionLevel {
  if (typeof window === "undefined") return "standard";
  const v = localStorage.getItem(STORE_KEY);
  return v === "off" || v === "high" ? v : "standard";
}

export function setNoiseSuppressionLevel(level: NoiseSuppressionLevel) {
  try {
    localStorage.setItem(STORE_KEY, level);
  } catch {
    /* private mode — keep in-memory only */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: level }));
}

export function onNoiseSuppressionChange(cb: (level: NoiseSuppressionLevel) => void) {
  const handler = (e: Event) => cb((e as CustomEvent).detail as NoiseSuppressionLevel);
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

export interface MicSession {
  /** The stream a call should use (processed when level is "high"). */
  stream: MediaStream;
  /** Mute/unmute without releasing the device. */
  setEnabled: (on: boolean) => void;
  /** Stop tracks and tear down the audio graph. */
  dispose: () => void;
}

export async function acquireMic(level: NoiseSuppressionLevel): Promise<MicSession> {
  if (!navigator.mediaDevices) throw new Error("media devices unavailable");
  const raw = await navigator.mediaDevices.getUserMedia({
    audio:
      level === "off"
        ? { noiseSuppression: false, echoCancellation: true, autoGainControl: false }
        : { noiseSuppression: true, echoCancellation: true, autoGainControl: true },
  });

  if (level !== "high") {
    return {
      stream: raw,
      setEnabled: (on) => raw.getAudioTracks().forEach((t) => (t.enabled = on)),
      dispose: () => raw.getTracks().forEach((t) => t.stop()),
    };
  }

  // High — route through a processing graph and hand back the processed stream.
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(raw);

  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 90; // mains hum, desk rumble, plosives

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 13500; // electrical hiss above speech

  const gate = ctx.createDynamicsCompressor();
  gate.threshold.value = -52;
  gate.knee.value = 18;
  gate.ratio.value = 14;
  gate.attack.value = 0.004;
  gate.release.value = 0.18;

  const dest = ctx.createMediaStreamDestination();
  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(gate);
  gate.connect(dest);

  return {
    stream: dest.stream,
    // Muting the raw tracks silences the whole graph.
    setEnabled: (on) => raw.getAudioTracks().forEach((t) => (t.enabled = on)),
    dispose: () => {
      raw.getTracks().forEach((t) => t.stop());
      void ctx.close();
    },
  };
}
