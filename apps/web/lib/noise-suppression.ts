/**
 * Noise suppression pipeline for voice input.
 *
 * Primary path:
 * - AudioWorklet-based suppressor (lower main-thread CPU and latency).
 *
 * Fallback path:
 * - RNNoise WASM via ScriptProcessorNode for environments where AudioWorklet
 *   fails to initialize.
 */

import type { Rnnoise, DenoiseState } from "@shiguredo/rnnoise-wasm";

let rnnoiseInstance: Rnnoise | null = null;

const WORKLET_MODULE_PATH = "/worklets/noise-gate-processor.js";
const WORKLET_PROCESSOR_NAME = "veyra-noise-gate-processor";

async function getRnnoise(): Promise<Rnnoise> {
    if (!rnnoiseInstance) {
        const { Rnnoise } = await import("@shiguredo/rnnoise-wasm");
        rnnoiseInstance = await Rnnoise.load();
    }
    return rnnoiseInstance;
}

export interface NoiseSuppressor {
    track: MediaStreamTrack;
    destroy: () => void;
}

async function createWorkletNoiseSuppressor(
    inputTrack: MediaStreamTrack
): Promise<NoiseSuppressor> {
    const audioContext = new AudioContext({
        sampleRate: 48000,
        latencyHint: "interactive",
    });

    const source = audioContext.createMediaStreamSource(new MediaStream([inputTrack]));

    await audioContext.audioWorklet.addModule(WORKLET_MODULE_PATH);

    const processor = new AudioWorkletNode(audioContext, WORKLET_PROCESSOR_NAME, {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        channelCount: 1,
        channelCountMode: "explicit",
        channelInterpretation: "speakers",
    });

    const destination = audioContext.createMediaStreamDestination();
    source.connect(processor);
    processor.connect(destination);

    const outputTrack = destination.stream.getAudioTracks()[0];

    return {
        track: outputTrack,
        destroy: () => {
            processor.disconnect();
            source.disconnect();
            audioContext.close().catch(() => {
                // ignore
            });
        },
    };
}

async function createLegacyRnnoiseSuppressor(
    inputTrack: MediaStreamTrack
): Promise<NoiseSuppressor> {
    const rnnoise = await getRnnoise();
    const denoiseState: DenoiseState = rnnoise.createDenoiseState();
    const frameSize = rnnoise.frameSize;

    const audioContext = new AudioContext({ sampleRate: 48000 });
    const source = audioContext.createMediaStreamSource(new MediaStream([inputTrack]));

    // Keep fallback buffering small to avoid noticeable end-to-end delay.
    const processor = audioContext.createScriptProcessor(1024, 1, 1);

    let residual = new Float32Array(0);
    let destroyed = false;

    processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        const output = event.outputBuffer.getChannelData(0);

        if (destroyed) {
            output.set(input);
            return;
        }

        const combined = new Float32Array(residual.length + input.length);
        combined.set(residual);
        combined.set(input, residual.length);

        let readOffset = 0;
        let writeOffset = 0;

        while (readOffset + frameSize <= combined.length && writeOffset < output.length) {
            const frame = new Float32Array(frameSize);

            for (let i = 0; i < frameSize; i++) {
                frame[i] = combined[readOffset + i] * 32768;
            }

            denoiseState.processFrame(frame);

            const remaining = Math.min(frameSize, output.length - writeOffset);
            for (let i = 0; i < remaining; i++) {
                output[writeOffset + i] = frame[i] / 32768;
            }

            readOffset += frameSize;
            writeOffset += remaining;
        }

        residual = readOffset < combined.length
            ? combined.slice(readOffset)
            : new Float32Array(0);

        for (let i = writeOffset; i < output.length; i++) {
            output[i] = 0;
        }
    };

    const destination = audioContext.createMediaStreamDestination();
    source.connect(processor);
    processor.connect(destination);

    const outputTrack = destination.stream.getAudioTracks()[0];

    return {
        track: outputTrack,
        destroy: () => {
            destroyed = true;
            processor.disconnect();
            source.disconnect();
            denoiseState.destroy();
            audioContext.close().catch(() => {
                // ignore
            });
        },
    };
}

export async function createNoiseSuppressor(
    inputTrack: MediaStreamTrack
): Promise<NoiseSuppressor> {
    try {
        return await createWorkletNoiseSuppressor(inputTrack);
    } catch (workletErr) {
        console.warn(
            "AudioWorklet suppressor unavailable, falling back to RNNoise ScriptProcessor:",
            workletErr
        );
        return createLegacyRnnoiseSuppressor(inputTrack);
    }
}
