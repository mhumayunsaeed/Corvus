class VeyraNoiseGateProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.noiseFloor = 0.0006;
        this.gain = 1;
        this.targetGain = 1;
        this.holdFrames = 0;
    }

    process(inputs, outputs) {
        const inputChannels = inputs[0];
        const outputChannels = outputs[0];
        if (!inputChannels || inputChannels.length === 0 || !outputChannels || outputChannels.length === 0) {
            return true;
        }

        const input = inputChannels[0];
        const output = outputChannels[0];
        if (!input || !output) {
            return true;
        }

        let energy = 0;
        for (let i = 0; i < input.length; i++) {
            const sample = input[i];
            energy += sample * sample;
        }
        const rms = Math.sqrt(energy / Math.max(1, input.length));

        // Slowly adapt baseline noise floor.
        this.noiseFloor = this.noiseFloor * 0.995 + rms * 0.005;
        const openThreshold = this.noiseFloor * 2.8;
        const closeThreshold = this.noiseFloor * 1.7;

        if (rms > openThreshold) {
            this.targetGain = 1;
            this.holdFrames = 8;
        } else if (this.holdFrames > 0) {
            this.targetGain = 1;
            this.holdFrames -= 1;
        } else if (rms < closeThreshold) {
            this.targetGain = 0.16;
        }

        this.gain += (this.targetGain - this.gain) * 0.18;

        for (let i = 0; i < input.length; i++) {
            output[i] = input[i] * this.gain;
        }

        // Mirror output to any extra channels.
        for (let ch = 1; ch < outputChannels.length; ch++) {
            outputChannels[ch].set(output);
        }

        return true;
    }
}

registerProcessor("veyra-noise-gate-processor", VeyraNoiseGateProcessor);
