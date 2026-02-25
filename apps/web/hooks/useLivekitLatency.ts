"use client";

import { useEffect, useState, useRef } from "react";
import { useRoomContext } from "@livekit/components-react";

/**
 * Exponential weighted moving average.
 * alpha = 0 → fully smoothed (never changes)
 * alpha = 1 → no smoothing (raw value)
 *
 * We use alpha=0.3 for a balance between responsiveness and jitter smoothing.
 */
function ewma(prev: number | null, next: number, alpha: number = 0.3): number {
    if (prev === null) return next;
    return alpha * next + (1 - alpha) * prev;
}

function readRoundTripTimeMs(stats: RTCStatsReport): number | null {
    const selectedCandidatePairIds = new Set<string>();

    stats.forEach((stat) => {
        if (stat.type !== "transport") return;
        const transport = stat as RTCTransportStats;
        if (
            typeof transport.selectedCandidatePairId === "string" &&
            transport.selectedCandidatePairId.length > 0
        ) {
            selectedCandidatePairIds.add(transport.selectedCandidatePairId);
        }
    });

    // Priority 1: Selected/nominated candidate-pair (most accurate ICE-level RTT)
    let bestCandidatePairRtt: number | null = null;
    let fallbackCandidatePairRtt: number | null = null;

    stats.forEach((stat) => {
        if (stat.type !== "candidate-pair") return;
        const report = stat as RTCIceCandidatePairStats & {
            nominated?: boolean;
            selected?: boolean;
        };

        if (
            report.state === "succeeded" &&
            typeof report.currentRoundTripTime === "number" &&
            report.currentRoundTripTime > 0
        ) {
            const rttMs = report.currentRoundTripTime * 1000;
            const isSelected =
                selectedCandidatePairIds.has(report.id) ||
                report.nominated === true ||
                report.selected === true;

            if (isSelected) {
                // Take the minimum across selected pairs (closest to actual)
                if (bestCandidatePairRtt === null || rttMs < bestCandidatePairRtt) {
                    bestCandidatePairRtt = rttMs;
                }
            } else {
                if (fallbackCandidatePairRtt === null || rttMs < fallbackCandidatePairRtt) {
                    fallbackCandidatePairRtt = rttMs;
                }
            }
        }
    });

    if (bestCandidatePairRtt !== null) return bestCandidatePairRtt;

    // Priority 2: remote-inbound-rtp roundTripTime (RTCP-based, slightly delayed)
    let remoteInboundRtt: number | null = null;
    stats.forEach((stat) => {
        if (stat.type !== "remote-inbound-rtp") return;
        const report = stat as RTCStats & {
            roundTripTime?: number;
            totalRoundTripTime?: number;
            roundTripTimeMeasurements?: number;
        };

        let rttSeconds: number | null = null;
        if (typeof report.roundTripTime === "number" && report.roundTripTime > 0) {
            rttSeconds = report.roundTripTime;
        } else if (
            typeof report.totalRoundTripTime === "number" &&
            typeof report.roundTripTimeMeasurements === "number" &&
            report.roundTripTimeMeasurements > 0
        ) {
            rttSeconds = report.totalRoundTripTime / report.roundTripTimeMeasurements;
        }

        if (typeof rttSeconds === "number" && Number.isFinite(rttSeconds) && rttSeconds > 0) {
            const rttMs = rttSeconds * 1000;
            if (remoteInboundRtt === null || rttMs < remoteInboundRtt) {
                remoteInboundRtt = rttMs;
            }
        }
    });

    if (remoteInboundRtt !== null) return remoteInboundRtt;

    return fallbackCandidatePairRtt;
}

/**
 * Measures the live one-way latency (RTT / 2) with EWMA smoothing.
 *
 * Polls every 500ms for responsiveness, uses EWMA(α=0.3) to prevent jitter.
 */
export function useLivekitLatency() {
    const room = useRoomContext();
    const [latencyMs, setLatencyMs] = useState<number | null>(null);
    const smoothedRef = useRef<number | null>(null);

    useEffect(() => {
        let cancelled = false;
        let inFlight = false;

        const measure = async () => {
            if (cancelled || inFlight) return;
            inFlight = true;

            try {
                const publications = Array.from(room.localParticipant.trackPublications.values());
                let bestRttMs: number | null = null;

                for (const publication of publications) {
                    const track = publication.track as
                        | { getRTCStatsReport?: () => Promise<RTCStatsReport | undefined> }
                        | undefined;
                    if (!track?.getRTCStatsReport) continue;

                    const report = await track.getRTCStatsReport().catch(() => undefined);
                    if (!report) continue;

                    const rttMs = readRoundTripTimeMs(report);
                    if (typeof rttMs === "number" && Number.isFinite(rttMs) && rttMs > 0) {
                        // Take the minimum across tracks for the most accurate reading
                        if (bestRttMs === null || rttMs < bestRttMs) {
                            bestRttMs = rttMs;
                        }
                    }
                }

                if (typeof bestRttMs === "number" && Number.isFinite(bestRttMs) && bestRttMs > 0) {
                    // Report one-way latency (RTT / 2) — this is the actual
                    // audio propagation delay that users perceive in a call.
                    const oneWayMs = bestRttMs / 2;
                    const smoothed = ewma(smoothedRef.current, oneWayMs);
                    smoothedRef.current = smoothed;
                    setLatencyMs(Math.round(smoothed));
                    return;
                }

                setLatencyMs(null);
            } finally {
                inFlight = false;
            }
        };

        void measure();
        // Poll every 500ms for a responsive readout
        const intervalId = window.setInterval(() => {
            void measure();
        }, 500);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
            smoothedRef.current = null;
            setLatencyMs(null);
        };
    }, [room]);

    return latencyMs;
}
