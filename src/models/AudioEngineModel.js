/**
 * ==========================================================================
 * MODEL LAYER: AudioEngineModel
 * Encapsulates Web Audio API guitar tone synthesis (triangle + sawtooth
 * oscillators with lowpass filter envelope) and sequence playback.
 * ==========================================================================
 */
window.GuitarApp = window.GuitarApp || {};
window.GuitarApp.Models = window.GuitarApp.Models || {};

class AudioEngineModel {
    constructor() {
        this.audioCtx = null;
        this.sequenceTimers = [];
    }

    /**
     * Lazily initialize or resume the browser AudioContext.
     */
    _ensureContext() {
        if (!this.audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                this.audioCtx = new AudioContextClass();
            }
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        return this.audioCtx;
    }

    /**
     * Play a single guitar note given its MIDI pitch number.
     */
    playGuitarNote(midiPitch, isEnabled = true) {
        if (!isEnabled) return;
        try {
            const ctx = this._ensureContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const freq = 440 * Math.pow(2, (midiPitch - 69) / 12);

            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const filter = ctx.createBiquadFilter();
            const gainNode = ctx.createGain();

            osc1.type = 'triangle';
            osc2.type = 'sawtooth';

            osc1.frequency.setValueAtTime(freq, now);
            osc2.frequency.setValueAtTime(freq, now);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(freq * 6, now);
            filter.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.35);

            gainNode.gain.setValueAtTime(0.001, now);
            gainNode.gain.linearRampToValueAtTime(0.22, now + 0.012);
            gainNode.gain.exponentialRampToValueAtTime(0.0008, now + 1.1);

            osc1.connect(filter);
            osc2.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 1.15);
            osc2.stop(now + 1.15);
        } catch (e) {
            // Ignore audio errors if blocked by browser autoplay policy
        }
    }

    /**
     * Clear any scheduled sequence playback timers.
     */
    stopSequence() {
        this.sequenceTimers.forEach(timerId => clearTimeout(timerId));
        this.sequenceTimers = [];
    }

    /**
     * Play an ordered array of MIDI pitches sequentially (e.g. auditioning a scale box).
     */
    playNoteSequence(midiPitches, isEnabled = true, stepMs = 155, onStepCallback = null) {
        this.stopSequence();
        if (!isEnabled || !Array.isArray(midiPitches) || midiPitches.length === 0) return;

        midiPitches.forEach((pitch, idx) => {
            const timerId = setTimeout(() => {
                this.playGuitarNote(pitch, isEnabled);
                if (typeof onStepCallback === 'function') {
                    onStepCallback(pitch, idx);
                }
            }, idx * stepMs);
            this.sequenceTimers.push(timerId);
        });
    }
}

window.GuitarApp.Models.AudioEngineModel = AudioEngineModel;
