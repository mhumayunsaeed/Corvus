/**
 * Noise suppression using RNNoise WASM.
 * Processes a MediaStreamTrack and returns a noise-suppressed track.
 */

import type { Rnnoise, DenoiseState } from "@shiguredo/rnnoise-wasm";

let rnnoiseInstance: Rnnoise | null = null;

async function getRnnoise(): Promise<Rnnoise> {
    if (!rnnoiseInstance) {
        const { Rnnoise } = await import("@shiguredo/rnnoise-wasm");
        rnnoiseInstance = await Rnnoise.load();
    }
    return rnnoiseInstance;
}

export interface NoiseSuppressor {
    /** The noise-suppressed output track */
    track: MediaStreamTrack;
    /** Call to stop suppression and clean up resources */
    destroy: () => void;
}

/**
 * Creates a noise-suppressed version of an audio track.
 * Uses RNNoise WASM for real-time voice activity detection and denoising.
 *
 * @param inputTrack - The raw microphone MediaStreamTrack
 * @returns A NoiseSuppressor with the processed track and cleanup function
 */
export async function createNoiseSuppressor(
    inputTrack: MediaStreamTrack
): Promise<NoiseSuppressor> {
    const rnnoise = await getRnnoise();
    const denoiseState: DenoiseState = rnnoise.createDenoiseState();
    const frameSize = rnnoise.frameSize; // typically 480 samples

    const audioContext = new AudioContext({ sampleRate: 48000 });
    const source = audioContext.createMediaStreamSource(
        new MediaStream([inputTrack])
    );

    // ScriptProcessorNode for compatibility (AudioWorklet would be preferred
    // but requires a separate file and is more complex to set up with WASM)
    const processor = audioContext.createScriptProcessor(
        4096, // buffer size
        1,    // input channels
        1     // output channels
    );

    // Residual buffer for samples that don't fill a complete frame
    let residual = new Float32Array(0);

    processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        const output = event.outputBuffer.getChannelData(0);

        // RNNoise expects 16-bit PCM scale values
        // Combine residual with new input
        const combined = new Float32Array(residual.length + input.length);
        combined.set(residual);
        combined.set(input, residual.length);

        let readOffset = 0;
        let writeOffset = 0;

        while (readOffset + frameSize <= combined.length && writeOffset < output.length) {
            const frame = new Float32Array(frameSize);

            // Scale to 16-bit PCM range for RNNoise
            for (let i = 0; i < frameSize; i++) {
                frame[i] = combined[readOffset + i] * 32768;
            }

            denoiseState.processFrame(frame);

            // Scale back to float range and write to output
            const remaining = Math.min(frameSize, output.length - writeOffset);
            for (let i = 0; i < remaining; i++) {
                output[writeOffset + i] = frame[i] / 32768;
            }

            readOffset += frameSize;
            writeOffset += remaining;
        }

        // Store unprocessed samples as residual
        if (readOffset < combined.length) {
            residual = combined.slice(readOffset);
        } else {
            residual = new Float32Array(0);
        }

        // Fill any remaining output with silence
        for (let i = writeOffset; i < output.length; i++) {
            output[i] = 0;
        }
    };

    // Connect the audio graph
    const destination = audioContext.createMediaStreamDestination();
    source.connect(processor);
    processor.connect(destination);

    const outputTrack = destination.stream.getAudioTracks()[0];

    return {
        track: outputTrack,
        destroy: () => {
            processor.disconnect();
            source.disconnect();
            denoiseState.destroy();
            audioContext.close().catch(console.error);
        },
    };
}
