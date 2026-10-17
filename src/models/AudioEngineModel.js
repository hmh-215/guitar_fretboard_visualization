/**
 * ==========================================================================
 * MODEL LAYER: AudioEngineModel
 * Encapsulates Web Audio API guitar tone synthesis (triangle + sawtooth
 * oscillators with lowpass filter envelope), sequence playback, and
 * multi-track backing accompaniment voices (Chords, Bass, Drums).
 * ==========================================================================
 */
window.GuitarApp = window.GuitarApp || {};
window.GuitarApp.Models = window.GuitarApp.Models || {};

class AudioEngineModel {
    constructor() {
        this.audioCtx = null;
        this.sequenceTimers = [];
        this.noiseBuffer = null;
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

    getCurrentTime() {
        const ctx = this._ensureContext();
        return ctx ? ctx.currentTime : 0;
    }

    /**
     * White noise buffer cached for drum synthesis.
     */
    _getNoiseBuffer(ctx) {
        if (!this.noiseBuffer && ctx) {
            const bufferSize = ctx.sampleRate; // 1 second
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            this.noiseBuffer = buffer;
        }
        return this.noiseBuffer;
    }

    /**
     * Play a single interactive lead guitar note given its MIDI pitch number.
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

    // ========================================================================
    // SCHEDULED MIDI BACKING TRACK VOICES (LOOKAHEAD SYNTHESIS)
    // ========================================================================

    /**
     * Schedule a polyphonic chord voicing for the backing track.
     */
    scheduleChordVoicing(midiPitches, startTime, durationSec, velocity = 0.8, isEnabled = true) {
        if (!isEnabled || !Array.isArray(midiPitches) || midiPitches.length === 0) return;
        try {
            const ctx = this._ensureContext();
            if (!ctx) return;

            const t = Math.max(startTime, ctx.currentTime);
            const dur = Math.max(0.08, durationSec);
            const noteGainLevel = (0.055 * velocity) / Math.sqrt(midiPitches.length);

            midiPitches.forEach((pitch, idx) => {
                const freq = 440 * Math.pow(2, (pitch - 69) / 12);
                const osc = ctx.createOscillator();
                const subOsc = ctx.createOscillator();
                const filter = ctx.createBiquadFilter();
                const gain = ctx.createGain();

                osc.type = 'triangle';
                subOsc.type = 'sine';

                // Subtle detune for warm chorus pad feel
                osc.frequency.setValueAtTime(freq, t);
                subOsc.frequency.setValueAtTime(freq * 1.002, t);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(1400, t);

                gain.gain.setValueAtTime(0.0001, t);
                gain.gain.linearRampToValueAtTime(noteGainLevel, t + 0.02);
                gain.gain.setValueAtTime(noteGainLevel * 0.85, t + dur * 0.6);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

                osc.connect(filter);
                subOsc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                subOsc.start(t);
                osc.stop(t + dur + 0.05);
                subOsc.stop(t + dur + 0.05);
            });
        } catch (e) {
            // Ignore scheduling error if context suspended
        }
    }

    /**
     * Schedule a bass note for the backing track.
     */
    scheduleBassNote(midiPitch, startTime, durationSec, velocity = 0.85, isEnabled = true) {
        if (!isEnabled || !midiPitch) return;
        try {
            const ctx = this._ensureContext();
            if (!ctx) return;

            const t = Math.max(startTime, ctx.currentTime);
            const dur = Math.max(0.06, durationSec);
            const freq = 440 * Math.pow(2, (midiPitch - 69) / 12);

            const osc = ctx.createOscillator();
            const sub = ctx.createOscillator();
            const filter = ctx.createBiquadFilter();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            sub.type = 'sine';

            osc.frequency.setValueAtTime(freq, t);
            sub.frequency.setValueAtTime(freq, t);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(500, t);
            filter.frequency.exponentialRampToValueAtTime(180, t + Math.min(dur, 0.28));

            const targetGain = 0.16 * velocity;
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.linearRampToValueAtTime(targetGain, t + 0.008);
            gain.gain.setValueAtTime(targetGain * 0.8, t + dur * 0.65);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

            osc.connect(filter);
            sub.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.start(t);
            sub.start(t);
            osc.stop(t + dur + 0.05);
            sub.stop(t + dur + 0.05);
        } catch (e) {
            // Ignore
        }
    }

    /**
     * Schedule a drum hit (kick, snare, rim, hihatClosed, hihatOpen, ride).
     */
    scheduleDrumHit(type, startTime, velocity = 0.85, isEnabled = true) {
        if (!isEnabled || !type) return;
        try {
            const ctx = this._ensureContext();
            if (!ctx) return;

            const t = Math.max(startTime, ctx.currentTime);
            const noiseBuf = this._getNoiseBuffer(ctx);

            if (type === 'kick') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.frequency.setValueAtTime(135, t);
                osc.frequency.exponentialRampToValueAtTime(42, t + 0.11);

                gain.gain.setValueAtTime(0.36 * velocity, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                osc.stop(t + 0.19);
            } else if (type === 'snare') {
                // Tone body
                const osc = ctx.createOscillator();
                const oscGain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(185, t);
                osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);
                oscGain.gain.setValueAtTime(0.18 * velocity, t);
                oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
                osc.connect(oscGain);
                oscGain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.11);

                // Noise snap
                if (noiseBuf) {
                    const noise = ctx.createBufferSource();
                    noise.buffer = noiseBuf;
                    const filter = ctx.createBiquadFilter();
                    filter.type = 'highpass';
                    filter.frequency.setValueAtTime(1000, t);

                    const noiseGain = ctx.createGain();
                    noiseGain.gain.setValueAtTime(0.22 * velocity, t);
                    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

                    noise.connect(filter);
                    filter.connect(noiseGain);
                    noiseGain.connect(ctx.destination);

                    noise.start(t);
                    noise.stop(t + 0.15);
                }
            } else if (type === 'rim') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(640, t);
                gain.gain.setValueAtTime(0.2 * velocity, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.06);
            } else if (type === 'hihatClosed') {
                if (noiseBuf) {
                    const noise = ctx.createBufferSource();
                    noise.buffer = noiseBuf;
                    const filter = ctx.createBiquadFilter();
                    filter.type = 'highpass';
                    filter.frequency.setValueAtTime(7500, t);

                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(0.08 * velocity, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

                    noise.connect(filter);
                    filter.connect(gain);
                    gain.connect(ctx.destination);

                    noise.start(t);
                    noise.stop(t + 0.05);
                }
            } else if (type === 'hihatOpen') {
                if (noiseBuf) {
                    const noise = ctx.createBufferSource();
                    noise.buffer = noiseBuf;
                    const filter = ctx.createBiquadFilter();
                    filter.type = 'highpass';
                    filter.frequency.setValueAtTime(6800, t);

                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(0.09 * velocity, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

                    noise.connect(filter);
                    filter.connect(gain);
                    gain.connect(ctx.destination);

                    noise.start(t);
                    noise.stop(t + 0.19);
                }
            } else if (type === 'ride') {
                if (noiseBuf) {
                    const noise = ctx.createBufferSource();
                    noise.buffer = noiseBuf;
                    const filter = ctx.createBiquadFilter();
                    filter.type = 'bandpass';
                    filter.frequency.setValueAtTime(5800, t);
                    filter.Q.setValueAtTime(1.8, t);

                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(0.07 * velocity, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

                    noise.connect(filter);
                    filter.connect(gain);
                    gain.connect(ctx.destination);

                    noise.start(t);
                    noise.stop(t + 0.33);
                }
            }
        } catch (e) {
            // Ignore
        }
    }
}

window.GuitarApp.Models.AudioEngineModel = AudioEngineModel;
