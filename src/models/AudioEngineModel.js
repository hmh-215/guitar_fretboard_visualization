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
     * Cached soft-clipping distortion curve generator for overdriven rock & metal guitar.
     */
    _getDistortionCurve(k = 45) {
        if (!this._distortionCurves) {
            this._distortionCurves = {};
        }
        if (this._distortionCurves[k]) {
            return this._distortionCurves[k];
        }
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1;
            // Hyperbolic tangent soft-clipping transfer function
            curve[i] = Math.tanh(k * x * 0.12);
        }
        this._distortionCurves[k] = curve;
        return curve;
    }

    /**
     * Schedule a polyphonic chord voicing for the backing track.
     * Supports multi-timbral instrument synthesis:
     *   - 'distorted_guitar': Dual sawtooth + overdrive wave-shaper + speaker cabinet filter network
     *   - 'clean_guitar': Strat-style crisp single-coil tone with pick attack
     *   - 'jazz_guitar': Warm hollowbody humbucker tone with mellow high-cut
     *   - 'acoustic_guitar': Steel/nylon resonance with staggered physical pick strumming
     *   - 'electric_piano': Rhodes-style tine fundamental with bell overtone
     *   - 'synth': Lush detuned analog pad with 24dB resonant filter sweep
     */
    scheduleChordVoicing(midiPitches, startTime, durationSec, velocity = 0.8, instrumentType = 'synth', isEnabled = true) {
        if (!isEnabled || !Array.isArray(midiPitches) || midiPitches.length === 0) return;
        try {
            const ctx = this._ensureContext();
            if (!ctx) return;

            const t = Math.max(startTime, ctx.currentTime);
            const dur = Math.max(0.08, durationSec);
            const voiceCount = midiPitches.length;

            if (instrumentType === 'distorted_guitar') {
                // ==============================================================
                // OVERDRIVEN / DISTORTED ELECTRIC GUITAR WITH CABINET EMULATION
                // ==============================================================
                const preGain = ctx.createGain();
                const preBassCut = ctx.createBiquadFilter();
                const shaper = ctx.createWaveShaper();
                const cabLowCut = ctx.createBiquadFilter();
                const cabPresence = ctx.createBiquadFilter();
                const cabHighCut = ctx.createBiquadFilter();
                const masterGain = ctx.createGain();

                // 1. Pre-amp Tube-Screamer style bass-cut (tightens palm-mutes & power chords)
                preBassCut.type = 'highpass';
                preBassCut.frequency.setValueAtTime(115, t);

                // 2. WaveShaper Overdrive Stage
                shaper.curve = this._getDistortionCurve(48);
                shaper.oversample = '4x'; // Antialiasing

                // 3. Guitar Cabinet Speaker Network (Celestion 12" V30 emulation)
                cabLowCut.type = 'highpass';
                cabLowCut.frequency.setValueAtTime(95, t);

                cabPresence.type = 'peaking';
                cabPresence.frequency.setValueAtTime(2400, t);
                cabPresence.Q.setValueAtTime(1.4, t);
                cabPresence.gain.setValueAtTime(4.5, t);

                cabHighCut.type = 'lowpass';
                cabHighCut.frequency.setValueAtTime(3600, t);

                // 4. Master Chord Envelope
                const guitarGain = Math.min(0.16, 0.13 * velocity);
                masterGain.gain.setValueAtTime(0.0001, t);
                masterGain.gain.linearRampToValueAtTime(guitarGain, t + 0.015);
                masterGain.gain.setValueAtTime(guitarGain * 0.9, t + dur * 0.7);
                masterGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

                // Signal Chain Routing
                preGain.connect(preBassCut);
                preBassCut.connect(shaper);
                shaper.connect(cabLowCut);
                cabLowCut.connect(cabPresence);
                cabPresence.connect(cabHighCut);
                cabHighCut.connect(masterGain);
                masterGain.connect(ctx.destination);

                // 5. Dual Detuned Sawtooth Oscillators per Note
                const noteInputLevel = (1.4 / Math.sqrt(voiceCount));
                midiPitches.forEach((pitch) => {
                    const freq = 440 * Math.pow(2, (pitch - 69) / 12);
                    const osc1 = ctx.createOscillator();
                    const osc2 = ctx.createOscillator();
                    const noteGain = ctx.createGain();

                    osc1.type = 'sawtooth';
                    osc2.type = 'sawtooth';
                    osc1.frequency.setValueAtTime(freq, t);
                    osc2.frequency.setValueAtTime(freq * 1.0035, t); // Chorus detune

                    noteGain.gain.setValueAtTime(noteInputLevel, t);

                    osc1.connect(noteGain);
                    osc2.connect(noteGain);
                    noteGain.connect(preGain);

                    osc1.start(t);
                    osc2.start(t);
                    osc1.stop(t + dur + 0.05);
                    osc2.stop(t + dur + 0.05);
                });
            } else if (instrumentType === 'acoustic_guitar') {
                // ==============================================================
                // ACOUSTIC GUITAR WITH STAGGERED PICK STRUMMING
                // ==============================================================
                const noteGainLevel = (0.058 * velocity) / Math.sqrt(voiceCount);

                midiPitches.forEach((pitch, idx) => {
                    // Stagger pick sweep (16ms between strings)
                    const strumOffset = idx * 0.016;
                    const noteTime = t + strumOffset;
                    const noteDur = Math.max(0.06, dur - strumOffset);
                    const freq = 440 * Math.pow(2, (pitch - 69) / 12);

                    const osc1 = ctx.createOscillator();
                    const osc2 = ctx.createOscillator();
                    const filter = ctx.createBiquadFilter();
                    const gain = ctx.createGain();

                    osc1.type = 'triangle';
                    osc2.type = 'sawtooth';
                    osc1.frequency.setValueAtTime(freq, noteTime);
                    osc2.frequency.setValueAtTime(freq, noteTime);

                    // Acoustic body resonance filter (bright snap damping down)
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(4400, noteTime);
                    filter.frequency.exponentialRampToValueAtTime(1900, noteTime + Math.min(noteDur, 0.35));

                    gain.gain.setValueAtTime(0.0001, noteTime);
                    gain.gain.linearRampToValueAtTime(noteGainLevel, noteTime + 0.005);
                    gain.gain.setValueAtTime(noteGainLevel * 0.75, noteTime + noteDur * 0.5);
                    gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + noteDur);

                    osc1.connect(filter);
                    osc2.connect(filter);
                    filter.connect(gain);
                    gain.connect(ctx.destination);

                    osc1.start(noteTime);
                    osc2.start(noteTime);
                    osc1.stop(noteTime + noteDur + 0.04);
                    osc2.stop(noteTime + noteDur + 0.04);
                });
            } else if (instrumentType === 'clean_guitar' || instrumentType === 'jazz_guitar') {
                // ==============================================================
                // CLEAN ELECTRIC GUITAR / JAZZ HOLLOWBODY
                // ==============================================================
                const isJazz = instrumentType === 'jazz_guitar';
                const cutoff = isJazz ? 1650 : 2600;
                const noteGainLevel = (0.062 * velocity) / Math.sqrt(voiceCount);

                midiPitches.forEach((pitch) => {
                    const freq = 440 * Math.pow(2, (pitch - 69) / 12);
                    const osc = ctx.createOscillator();
                    const subOsc = ctx.createOscillator();
                    const filter = ctx.createBiquadFilter();
                    const gain = ctx.createGain();

                    osc.type = 'triangle';
                    subOsc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(freq, t);
                    subOsc.frequency.setValueAtTime(freq * 1.0015, t);

                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(cutoff, t);

                    gain.gain.setValueAtTime(0.0001, t);
                    gain.gain.linearRampToValueAtTime(noteGainLevel, t + (isJazz ? 0.008 : 0.004));
                    gain.gain.setValueAtTime(noteGainLevel * 0.82, t + dur * 0.6);
                    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

                    osc.connect(filter);
                    subOsc.connect(filter);
                    filter.connect(gain);
                    gain.connect(ctx.destination);

                    osc.start(t);
                    subOsc.start(t);
                    osc.stop(t + dur + 0.04);
                    subOsc.stop(t + dur + 0.04);
                });
            } else if (instrumentType === 'electric_piano') {
                // ==============================================================
                // RHODES ELECTRIC PIANO (TINE SINE + BELL TRIANGLE)
                // ==============================================================
                const noteGainLevel = (0.066 * velocity) / Math.sqrt(voiceCount);

                midiPitches.forEach((pitch) => {
                    const freq = 440 * Math.pow(2, (pitch - 69) / 12);
                    const tineOsc = ctx.createOscillator();
                    const bellOsc = ctx.createOscillator();
                    const filter = ctx.createBiquadFilter();
                    const gain = ctx.createGain();

                    tineOsc.type = 'sine';
                    bellOsc.type = 'triangle';
                    tineOsc.frequency.setValueAtTime(freq, t);
                    bellOsc.frequency.setValueAtTime(freq * 2.002, t); // Bell harmonic overtone

                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(1850, t);

                    gain.gain.setValueAtTime(0.0001, t);
                    gain.gain.linearRampToValueAtTime(noteGainLevel, t + 0.015);
                    gain.gain.setValueAtTime(noteGainLevel * 0.8, t + dur * 0.65);
                    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

                    tineOsc.connect(filter);
                    bellOsc.connect(filter);
                    filter.connect(gain);
                    gain.connect(ctx.destination);

                    tineOsc.start(t);
                    bellOsc.start(t);
                    tineOsc.stop(t + dur + 0.04);
                    bellOsc.stop(t + dur + 0.04);
                });
            } else {
                // ==============================================================
                // SYNTH PAD (DETUNED DUAL SAWTOOTH CHORUS)
                // ==============================================================
                const noteGainLevel = (0.052 * velocity) / Math.sqrt(voiceCount);

                midiPitches.forEach((pitch) => {
                    const freq = 440 * Math.pow(2, (pitch - 69) / 12);
                    const osc = ctx.createOscillator();
                    const subOsc = ctx.createOscillator();
                    const filter = ctx.createBiquadFilter();
                    const gain = ctx.createGain();

                    osc.type = 'sawtooth';
                    subOsc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq * 0.998, t);
                    subOsc.frequency.setValueAtTime(freq * 1.002, t);

                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(1500, t);

                    gain.gain.setValueAtTime(0.0001, t);
                    gain.gain.linearRampToValueAtTime(noteGainLevel, t + 0.025);
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
            }
        } catch (e) {
            // Ignore scheduling error if context suspended
        }
    }

    /**
     * Schedule a bass note for the backing track.
     * Supports multi-timbral bass synthesis:
     *   - 'distorted_bass': Gritty overdriven rock bass with wave-shaper
     *   - 'upright_bass': Warm acoustic wood snap with pitch envelope
     *   - 'slap_bass': Resonant funk snap
     *   - 'synth_bass': 80s resonant lowpass sweep
     *   - 'electric_bass': Standard punchy electric bass
     */
    scheduleBassNote(midiPitch, startTime, durationSec, velocity = 0.85, bassType = 'electric_bass', isEnabled = true) {
        if (!isEnabled || !midiPitch) return;
        try {
            const ctx = this._ensureContext();
            if (!ctx) return;

            const t = Math.max(startTime, ctx.currentTime);
            const dur = Math.max(0.06, durationSec);
            const freq = 440 * Math.pow(2, (midiPitch - 69) / 12);

            if (bassType === 'distorted_bass') {
                // Gritty rock & metal bass
                const osc = ctx.createOscillator();
                const sub = ctx.createOscillator();
                const shaper = ctx.createWaveShaper();
                const filter = ctx.createBiquadFilter();
                const gain = ctx.createGain();

                osc.type = 'sawtooth';
                sub.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);
                sub.frequency.setValueAtTime(freq, t);

                shaper.curve = this._getDistortionCurve(22);
                shaper.oversample = '2x';

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(800, t);
                filter.frequency.exponentialRampToValueAtTime(350, t + Math.min(dur, 0.25));

                const targetGain = 0.14 * velocity;
                gain.gain.setValueAtTime(0.0001, t);
                gain.gain.linearRampToValueAtTime(targetGain, t + 0.008);
                gain.gain.setValueAtTime(targetGain * 0.85, t + dur * 0.65);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

                osc.connect(shaper);
                sub.connect(shaper);
                shaper.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                sub.start(t);
                osc.stop(t + dur + 0.04);
                sub.stop(t + dur + 0.04);
            } else if (bassType === 'upright_bass') {
                // Acoustic upright jazz bass with wood finger pluck
                const osc = ctx.createOscillator();
                const filter = ctx.createBiquadFilter();
                const gain = ctx.createGain();

                osc.type = 'triangle';
                // Subtle pitch pluck transient
                osc.frequency.setValueAtTime(freq * 1.05, t);
                osc.frequency.exponentialRampToValueAtTime(freq, t + 0.025);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(360, t);
                filter.frequency.exponentialRampToValueAtTime(140, t + Math.min(dur, 0.3));

                const targetGain = 0.16 * velocity;
                gain.gain.setValueAtTime(0.0001, t);
                gain.gain.linearRampToValueAtTime(targetGain, t + 0.006);
                gain.gain.setValueAtTime(targetGain * 0.75, t + dur * 0.5);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                osc.stop(t + dur + 0.04);
            } else if (bassType === 'slap_bass') {
                // Snappy 70s funk slap bass
                const osc = ctx.createOscillator();
                const sub = ctx.createOscillator();
                const filter = ctx.createBiquadFilter();
                const gain = ctx.createGain();

                osc.type = 'sawtooth';
                sub.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);
                sub.frequency.setValueAtTime(freq, t);

                filter.type = 'lowpass';
                filter.Q.setValueAtTime(2.2, t);
                filter.frequency.setValueAtTime(1200, t);
                filter.frequency.exponentialRampToValueAtTime(220, t + 0.045);

                const targetGain = 0.15 * velocity;
                gain.gain.setValueAtTime(0.0001, t);
                gain.gain.linearRampToValueAtTime(targetGain, t + 0.005);
                gain.gain.setValueAtTime(targetGain * 0.8, t + dur * 0.6);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

                osc.connect(filter);
                sub.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                sub.start(t);
                osc.stop(t + dur + 0.04);
                sub.stop(t + dur + 0.04);
            } else if (bassType === 'synth_bass') {
                // Punchy 80s synth bass
                const osc = ctx.createOscillator();
                const filter = ctx.createBiquadFilter();
                const gain = ctx.createGain();

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, t);

                filter.type = 'lowpass';
                filter.Q.setValueAtTime(2.8, t);
                filter.frequency.setValueAtTime(1700, t);
                filter.frequency.exponentialRampToValueAtTime(140, t + Math.min(dur, 0.12));

                const targetGain = 0.14 * velocity;
                gain.gain.setValueAtTime(0.0001, t);
                gain.gain.linearRampToValueAtTime(targetGain, t + 0.006);
                gain.gain.setValueAtTime(targetGain * 0.8, t + dur * 0.6);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                osc.stop(t + dur + 0.04);
            } else {
                // Standard electric bass
                const osc = ctx.createOscillator();
                const sub = ctx.createOscillator();
                const filter = ctx.createBiquadFilter();
                const gain = ctx.createGain();

                osc.type = 'sawtooth';
                sub.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);
                sub.frequency.setValueAtTime(freq, t);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(520, t);
                filter.frequency.exponentialRampToValueAtTime(190, t + Math.min(dur, 0.28));

                const targetGain = 0.15 * velocity;
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
            }
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
