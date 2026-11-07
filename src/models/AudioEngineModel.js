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
        this._mixerInitialized = false;

        // Multi-Track Studio Mixer Channels (Internal Autonomous Balance)
        this.channelVolumes = {
            guitar: 1.25,
            drums: 0.60,
            bass: 1.15,
            keys: 1.05,
            lead: 1.20,
            master: 0.90
        };

        this.channelMutes = {
            guitar: false,
            drums: false,
            bass: false,
            keys: false,
            lead: false,
            master: false
        };

        this.channelGains = null;
        this.channelSummingNode = null;
        this.masterGain = null;
        this.masterLimiter = null;
        this.masterAnalyser = null;
        this.reverbNode = null;
        this.reverbWet = null;
        this.currentReverbLevel = 0.18;
        this.eqBands = new Map();

        // Sampled SoundFont Buffer Caches (Real Instrument Audio Samples)
        this._sampleBuffers = {
            electric_guitar_clean: {},
            acoustic_guitar_nylon: {},
            electric_guitar_jazz: {},
            distortion_guitar: {}
        };
        this._decodingPromises = {};
        this._noteNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
        this._predecodedInstruments = {};

        // Authentic Hardware WAV Instruments (midi_instruments/*.wav)
        this._wavBuffers = {};
        this._wavLoadingPromises = {};
        this._wavDisabled = false;
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
        this._ensureMixerBuses();
        if (this.audioCtx && !this._hasPrecachedWav && !this._wavDisabled) {
            this._hasPrecachedWav = true;
            this.precacheWavInstruments();
        }
        return this.audioCtx;
    }

    /**
     * Synthesize algorithmic stereo room impulse response buffer.
     * Incorporates early reflections, high-frequency air damping, pre-delay, and exponential decay.
     */
    _generateImpulseResponse(duration = 1.4, decay = 2.0) {
        if (!this.audioCtx) return null;
        const ctx = this.audioCtx;
        const sampleRate = ctx.sampleRate;
        const length = Math.floor(sampleRate * duration);
        const impulse = ctx.createBuffer(2, length, sampleRate);
        const preDelaySamples = Math.floor(0.015 * sampleRate);
        for (let channel = 0; channel < 2; channel++) {
            const data = impulse.getChannelData(channel);
            let lastValue = 0;
            const channelOffset = channel === 1 ? Math.floor(0.002 * sampleRate) : 0;
            for (let i = 0; i < length; i++) {
                if (i < preDelaySamples) {
                    data[i] = 0;
                    continue;
                }
                const t = (i - preDelaySamples) / sampleRate;
                const envelope = Math.exp(-t * (decay / duration));
                const dampingFactor = Math.max(0.01, 0.2 * Math.exp(-t * 2.5));
                const whiteNoise = (Math.random() * 2 - 1);
                lastValue = (whiteNoise * dampingFactor) + (lastValue * (1 - dampingFactor));
                let sampleValue = lastValue * envelope;
                if (t < 0.04 && ((i % 123 === 0) || (i % 234 === 0))) {
                    sampleValue += (Math.random() * 2 - 1) * 0.2 * (0.04 - t) / 0.04;
                }
                const targetIdx = i + channelOffset;
                if (targetIdx < length) data[targetIdx] = sampleValue;
            }
        }
        return impulse;
    }

    /**
     * Initialize the studio mixing console, 10-band parametric EQ, procedural convolution reverb, and master limiter.
     */
    _ensureMixerBuses() {
        if (!this.audioCtx || this._mixerInitialized) return;
        const ctx = this.audioCtx;

        // 1. Multi-Track Channel Gain Buses
        this.channelGains = {
            guitar: ctx.createGain(),
            drums: ctx.createGain(),
            bass: ctx.createGain(),
            keys: ctx.createGain(),
            lead: ctx.createGain()
        };

        // 2. Channel Summing Node
        this.channelSummingNode = ctx.createGain();
        for (const [ch, node] of Object.entries(this.channelGains)) {
            const v = this.channelMutes[ch] ? 0.0001 : (this.channelVolumes[ch] !== undefined ? this.channelVolumes[ch] : 0.85);
            node.gain.setValueAtTime(v, ctx.currentTime);
            node.connect(this.channelSummingNode);
        }

        // 3. 10-Band Parametric Studio Equalizer Cascade
        let lastNode = this.channelSummingNode;
        this.eqBands.clear();
        for (const freq of AudioEngineModel.EQ_FREQUENCIES) {
            const filter = ctx.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.setValueAtTime(freq, ctx.currentTime);
            filter.gain.setValueAtTime(0, ctx.currentTime);
            const q = AudioEngineModel.EQ_Q[freq] || 1.0;
            filter.Q.setValueAtTime(q, ctx.currentTime);
            this.eqBands.set(freq, { filter, gain: 0 });
            lastNode.connect(filter);
            lastNode = filter;
        }

        // 4. Master Output Gain
        this.masterGain = ctx.createGain();
        const initMaster = this.channelMutes.master ? 0.0001 : (this.channelVolumes.master || 0.85);
        this.masterGain.gain.setValueAtTime(initMaster, ctx.currentTime);
        lastNode.connect(this.masterGain);

        // 5. Procedural Stereo Convolution Reverb (Acoustic Depth & Dimension)
        this.reverbNode = ctx.createConvolver();
        this.reverbNode.buffer = this._generateImpulseResponse(1.4, 2.0);
        this.reverbWet = ctx.createGain();
        this.reverbWet.gain.setValueAtTime(this.currentReverbLevel, ctx.currentTime);

        // 6. Master Studio Limiter (Brickwall Dynamics Compressor preventing clipping)
        this.masterLimiter = ctx.createDynamicsCompressor();
        this.masterLimiter.threshold.setValueAtTime(-10.0, ctx.currentTime);
        this.masterLimiter.ratio.setValueAtTime(20.0, ctx.currentTime);
        this.masterLimiter.attack.setValueAtTime(0.001, ctx.currentTime);
        this.masterLimiter.release.setValueAtTime(0.100, ctx.currentTime);
        this.masterLimiter.knee.setValueAtTime(0, ctx.currentTime);

        // 7. Master Analyser Node
        this.masterAnalyser = ctx.createAnalyser();
        this.masterAnalyser.fftSize = 256;
        this.masterAnalyser.smoothingTimeConstant = 0.6;

        // Routing Topology:
        // masterGain -> masterLimiter (Dry Path) -> masterAnalyser -> destination
        // masterGain -> reverbNode -> reverbWet (Wet 3D Room Path) -> masterAnalyser -> destination
        this.masterGain.connect(this.masterLimiter);
        this.masterGain.connect(this.reverbNode);
        this.reverbNode.connect(this.reverbWet);

        this.masterLimiter.connect(this.masterAnalyser);
        this.reverbWet.connect(this.masterAnalyser);
        this.masterAnalyser.connect(ctx.destination);

        this._mixerInitialized = true;
    }

    /**
     * Retrieve the dedicated mixing bus for an instrument channel.
     */
    getMixerChannelBus(channel) {
        this._ensureMixerBuses();
        if (this.channelGains && this.channelGains[channel]) {
            return this.channelGains[channel];
        }
        return this.channelGains ? this.channelGains.guitar : (this.masterGain || (this.audioCtx ? this.audioCtx.destination : null));
    }

    /**
     * Adjust channel volume (0.0 to 1.5).
     */
    setMixerVolume(channel, volFraction) {
        this._ensureMixerBuses();
        const ctx = this.audioCtx;
        if (!ctx) return;
        const now = ctx.currentTime;
        const v = Math.max(0, Math.min(1.5, volFraction));
        this.channelVolumes[channel] = v;

        if (channel === 'master') {
            const target = this.channelMutes.master ? 0.0001 : v;
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.linearRampToValueAtTime(target, now + 0.02);
        } else if (this.channelGains && this.channelGains[channel]) {
            const target = this.channelMutes[channel] ? 0.0001 : v;
            this.channelGains[channel].gain.cancelScheduledValues(now);
            this.channelGains[channel].gain.linearRampToValueAtTime(target, now + 0.02);
        }
    }

    /**
     * Toggle channel mute state.
     */
    setMixerMute(channel, isMuted) {
        this._ensureMixerBuses();
        const ctx = this.audioCtx;
        if (!ctx) return;
        const now = ctx.currentTime;
        this.channelMutes[channel] = isMuted;
        const vol = this.channelVolumes[channel] !== undefined ? this.channelVolumes[channel] : 0.85;
        const target = isMuted ? 0.0001 : vol;

        if (channel === 'master') {
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.linearRampToValueAtTime(target, now + 0.02);
        } else if (this.channelGains && this.channelGains[channel]) {
            this.channelGains[channel].gain.cancelScheduledValues(now);
            this.channelGains[channel].gain.linearRampToValueAtTime(target, now + 0.02);
        }
    }

    /**
     * Apply 10-Band Parametric Equalizer band gains.
     * @param {Object} gainsMap - { [frequency]: gainDb }
     */
    setEQ(gainsMap, smoothTime = 0.04) {
        this._ensureMixerBuses();
        if (!this.audioCtx) return;
        const now = this.audioCtx.currentTime;
        const MAX_DB = 12;
        for (const [key, val] of Object.entries(gainsMap)) {
            const freq = Number(key);
            const band = this.eqBands.get(freq);
            if (!band) continue;
            const dbValue = Math.max(-MAX_DB, Math.min(MAX_DB, val));
            band.filter.gain.setTargetAtTime(dbValue, now, smoothTime);
            band.gain = dbValue;
        }
    }

    /**
     * Set a named EQ preset across all 10 bands.
     */
    setEQPreset(name, smoothTime = 0.04) {
        const presets = AudioEngineModel.EQ_PRESETS;
        const preset = presets[name] || presets.flat;
        this.setEQ(preset, smoothTime);
    }

    /**
     * Set Convolution Reverb wet level (0.0 to 1.0).
     */
    setReverbWet(level, smoothTime = 0.05) {
        this._ensureMixerBuses();
        if (!this.reverbWet || !this.audioCtx) return;
        const val = Math.max(0, Math.min(1.0, level));
        this.currentReverbLevel = val;
        this.reverbWet.gain.setTargetAtTime(val, this.audioCtx.currentTime, smoothTime);
    }

    /**
     * Autonomic Smart Mastering tailored for genre presets.
     */
    applyStyleMastering(stylePresetId) {
        if (!stylePresetId) return;
        const id = stylePresetId.toLowerCase();
        if (id.includes('blues')) {
            this.setEQPreset('blues');
            this.setReverbWet(0.18);
        } else if (id.includes('jazz')) {
            this.setEQPreset('jazz');
            this.setReverbWet(0.22);
        } else if (id.includes('metal') || id.includes('rock')) {
            this.setEQPreset('rock');
            this.setReverbWet(0.14);
        } else if (id.includes('bossa') || id.includes('pop') || id.includes('acoustic')) {
            this.setEQPreset('acoustic');
            this.setReverbWet(0.22);
        } else {
            this.setEQPreset('loudness');
            this.setReverbWet(0.18);
        }
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
     * Map MIDI pitch (21 to 108) to SoundFont flat notation key (e.g. 40 -> 'E2', 61 -> 'Db4').
     */
    _midiToNoteKey(midiPitch) {
        const name = this._noteNames[((midiPitch % 12) + 12) % 12];
        const octave = Math.floor(midiPitch / 12) - 1;
        return `${name}${octave}`;
    }

    /**
     * Convert Base64 data URI to ArrayBuffer for Web Audio decoding.
     */
    _base64ToArrayBuffer(base64) {
        const commaIdx = base64.indexOf(',');
        const raw = commaIdx >= 0 ? base64.slice(commaIdx + 1) : base64;
        const binaryString = window.atob(raw);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * Asynchronously decode a single note sample from the global SoundFont registry.
     */
    async _decodeNoteSample(instrumentName, midiPitch) {
        if (!this._sampleBuffers[instrumentName]) {
            this._sampleBuffers[instrumentName] = {};
        }
        if (this._sampleBuffers[instrumentName][midiPitch]) {
            return this._sampleBuffers[instrumentName][midiPitch];
        }
        const ctx = this._ensureContext();
        if (!ctx) return null;

        const pKey = `${instrumentName}_${midiPitch}`;
        if (this._decodingPromises[pKey]) {
            return this._decodingPromises[pKey];
        }

        const noteKey = this._midiToNoteKey(midiPitch);
        const sf = window.MIDI && window.MIDI.Soundfont && window.MIDI.Soundfont[instrumentName];
        if (!sf || !sf[noteKey]) {
            return null;
        }

        this._decodingPromises[pKey] = new Promise((resolve) => {
            try {
                const arrayBuf = this._base64ToArrayBuffer(sf[noteKey]);
                ctx.decodeAudioData(
                    arrayBuf,
                    (audioBuf) => {
                        this._sampleBuffers[instrumentName][midiPitch] = audioBuf;
                        delete this._decodingPromises[pKey];
                        resolve(audioBuf);
                    },
                    (err) => {
                        delete this._decodingPromises[pKey];
                        resolve(null);
                    }
                );
            } catch (e) {
                delete this._decodingPromises[pKey];
                resolve(null);
            }
        });

        return this._decodingPromises[pKey];
    }

    /**
     * Pre-decode common guitar note range (MIDI 40 E2 to MIDI 88 E6) into memory.
     */
    predecodeGuitarSamples(instrumentName = 'electric_guitar_clean') {
        if (this._predecodedInstruments[instrumentName]) return;
        this._predecodedInstruments[instrumentName] = true;

        for (let pitch = 40; pitch <= 88; pitch++) {
            this._decodeNoteSample(instrumentName, pitch);
        }
    }

    /**
     * Play an authentic recorded instrument audio sample through the mixer bus.
     */
    playSampleNote(instrumentName, midiPitch, startTime, durationSec, velocity = 0.8, outputBus = null) {
        try {
            const ctx = this._ensureContext();
            if (!ctx) return false;
            const bus = outputBus || this.getMixerChannelBus('guitar');
            const t = Math.max(startTime, ctx.currentTime);
            const dur = Math.max(0.08, durationSec);

            const buf = this._sampleBuffers[instrumentName] && this._sampleBuffers[instrumentName][midiPitch];
            if (buf) {
                const source = ctx.createBufferSource();
                source.buffer = buf;
                const gainNode = ctx.createGain();

                // Humanized dynamic velocity scaling
                const dynVel = Math.pow(Math.max(0.15, Math.min(1.0, velocity)), 1.2);
                const baseLevel = (instrumentName === 'distortion_guitar') ? 0.65 : 0.95;
                const peakGain = Math.min(1.2, baseLevel * dynVel);

                const rampDur = Math.min(0.04, dur * 0.2);
                const releaseStart = t + dur - rampDur;

                gainNode.gain.setValueAtTime(0.0001, t);
                gainNode.gain.linearRampToValueAtTime(peakGain, t + 0.004);
                gainNode.gain.setValueAtTime(peakGain, releaseStart);
                gainNode.gain.linearRampToValueAtTime(0.0001, t + dur);

                source.connect(gainNode);
                gainNode.connect(bus);

                // IMPORTANT: source.start MUST be called before source.stop
                source.start(t);
                if (dur < buf.duration) {
                    source.stop(t + dur + 0.05);
                } else {
                    source.stop(t + buf.duration);
                }

                return true;
            } else {
                this._decodeNoteSample(instrumentName, midiPitch);
                return false;
            }
        } catch (e) {
            console.error('Error in playSampleNote:', e);
            return false;
        }
    }

    /**
     * Resolve fuzzy instrument IDs or style names to calibrated WAV instrument keys.
     */
    _resolveWavInstrumentId(id) {
        if (!id) return 'clean_guitar';
        const lower = String(id).toLowerCase();
        if (AudioEngineModel.WAV_INSTRUMENTS[lower]) return lower;

        // Bass aliases
        if (lower.includes('distort') && lower.includes('bass')) return 'electric_bass';
        if (lower.includes('synth') && lower.includes('bass')) return 'fretless_bass';
        if (lower.includes('pick') && lower.includes('bass')) return 'electric_bass';
        if (lower.includes('upright') || (lower.includes('acoustic') && lower.includes('bass'))) return 'acoustic_bass';
        if (lower.includes('slap')) return 'slap_bass';
        if (lower.includes('bass')) return 'electric_bass';

        // Guitar aliases
        if (lower.includes('distort') || lower.includes('overdrive') || lower.includes('heavy') || lower.includes('crunch')) return 'distorted_guitar';
        if (lower.includes('nylon') || lower.includes('classical')) return 'acoustic_guitar';
        if (lower.includes('steel')) return 'steel_guitar';
        if (lower.includes('jazz') || lower.includes('hollow')) return 'jazz_guitar';
        if (lower.includes('mute')) return 'muted_guitar';
        if (lower.includes('clean') || lower.includes('strat') || lower.includes('guitar')) return 'clean_guitar';

        // Keys & Pad aliases
        if (lower.includes('rhodes') || lower.includes('electric_piano') || lower.includes('suitcase')) return 'electric_piano';
        if (lower.includes('flute')) return 'flute';
        if (lower.includes('synth') || lower.includes('lead') || lower.includes('pad')) return 'synth';
        if (lower.includes('piano') || lower.includes('keys')) return 'piano';

        return 'clean_guitar';
    }

    /**
     * Map fuzzy instrument ID or preset genre to bundled SoundFont bank.
     */
    mapInstrumentToSoundfont(instrumentType) {
        if (!instrumentType) return 'electric_guitar_clean';
        const lower = String(instrumentType).toLowerCase();
        if (lower.includes('distort') || lower.includes('metal') || lower.includes('rock') || lower.includes('overdrive') || lower.includes('heavy')) {
            return 'distortion_guitar';
        }
        if (lower.includes('nylon') || lower.includes('acoustic') || lower.includes('classical') || lower.includes('bossa')) {
            return 'acoustic_guitar_nylon';
        }
        if (lower.includes('jazz') || lower.includes('hollow') || lower.includes('warm')) {
            return 'electric_guitar_jazz';
        }
        return 'electric_guitar_clean';
    }

    /**
     * Asynchronously fetch and decode an authentic hardware WAV instrument sample.
     * Fails cleanly and disables further WAV fetches if samples are not present in the environment.
     */
    async loadWavInstrument(instrumentId) {
        if (this._wavDisabled) return null;
        const resolvedId = this._resolveWavInstrumentId(instrumentId);
        if (this._wavBuffers[resolvedId]) {
            return this._wavBuffers[resolvedId];
        }
        if (this._wavLoadingPromises[resolvedId]) {
            return this._wavLoadingPromises[resolvedId];
        }
        const meta = AudioEngineModel.WAV_INSTRUMENTS[resolvedId];
        if (!meta) return null;

        const ctx = this._ensureContext();
        if (!ctx) return null;

        this._wavLoadingPromises[resolvedId] = (async () => {
            try {
                if (this._wavDisabled) return null;
                const resp = await fetch(meta.path);
                if (!resp.ok) {
                    this._wavDisabled = true;
                    delete this._wavLoadingPromises[resolvedId];
                    return null;
                }
                const arrayBuf = await resp.arrayBuffer();
                const audioBuf = await ctx.decodeAudioData(arrayBuf);
                this._wavBuffers[resolvedId] = audioBuf;
                delete this._wavLoadingPromises[resolvedId];
                return audioBuf;
            } catch (e) {
                this._wavDisabled = true;
                delete this._wavLoadingPromises[resolvedId];
                return null;
            }
        })();

        return this._wavLoadingPromises[resolvedId];
    }

    /**
     * Precache core hardware WAV instruments for zero-latency playback.
     */
    precacheWavInstruments() {
        if (this._wavDisabled) return;
        const allKeys = Object.keys(AudioEngineModel.WAV_INSTRUMENTS);
        allKeys.forEach(id => this.loadWavInstrument(id));
    }

    /**
     * Play an authentic hardware WAV sample pitch-shifted to target MIDI pitch with micro-cent tuning calibration.
     */
    playWavNote(instrumentId, targetMidiPitch, startTime, durationSec, velocity = 0.8, outputBus = null) {
        try {
            const ctx = this._ensureContext();
            if (!ctx) return false;
            const resolvedId = this._resolveWavInstrumentId(instrumentId);
            const bus = outputBus || this.getMixerChannelBus(resolvedId.includes('bass') ? 'bass' : (resolvedId.includes('piano') || resolvedId.includes('synth') || resolvedId.includes('flute') ? 'keys' : 'guitar'));

            const buf = this._wavBuffers[resolvedId];
            if (!buf) {
                if (!this._wavDisabled) {
                    this.loadWavInstrument(resolvedId);
                }
                // Resilient automatic fallback: always play sound immediately if WAV is not available
                if (resolvedId.includes('bass')) {
                    this.scheduleBassNote(targetMidiPitch, startTime, durationSec, velocity, resolvedId);
                    return true;
                } else if (resolvedId.includes('piano') || resolvedId.includes('synth') || resolvedId.includes('flute')) {
                    this.scheduleChordVoicing([targetMidiPitch], startTime, durationSec, velocity, 'electric_piano');
                    return true;
                } else {
                    const sfInst = this.mapInstrumentToSoundfont(resolvedId);
                    const playedSf = this.playSampleNote(sfInst, targetMidiPitch, startTime, durationSec, velocity, bus);
                    if (playedSf) return true;
                    this.scheduleChordVoicing([targetMidiPitch], startTime, durationSec, velocity, resolvedId);
                    return true;
                }
            }

            const meta = AudioEngineModel.WAV_INSTRUMENTS[resolvedId];
            if (!meta) return false;
            const t = Math.max(startTime, ctx.currentTime);
            const dur = Math.max(0.08, durationSec);

            // Compute precise playbackRate with calibrated micro-cent correction:
            const semitones = targetMidiPitch - meta.rootMidi;
            const playbackRate = Math.pow(2, semitones / 12) * (meta.tuningCorrection || 1.0);

            const source = ctx.createBufferSource();
            source.buffer = buf;
            source.playbackRate.setValueAtTime(playbackRate, t);

            const gainNode = ctx.createGain();
            const dynVel = Math.pow(Math.max(0.15, Math.min(1.0, velocity)), 1.2);
            const baseLevel = (resolvedId === 'distorted_guitar') ? 0.70 : 0.95;
            const peakGain = Math.min(1.25, baseLevel * dynVel);

            const effectiveSampleDuration = buf.duration / playbackRate;
            const rampDur = Math.min(0.04, dur * 0.2);
            const releaseStart = t + dur - rampDur;

            gainNode.gain.setValueAtTime(0.0001, t);
            gainNode.gain.linearRampToValueAtTime(peakGain, t + 0.004);
            gainNode.gain.setValueAtTime(peakGain, releaseStart);
            gainNode.gain.linearRampToValueAtTime(0.0001, t + dur);

            source.connect(gainNode);
            gainNode.connect(bus);

            // IMPORTANT: source.start MUST be called before source.stop
            source.start(t);
            if (dur < effectiveSampleDuration) {
                source.stop(t + dur + 0.05);
            } else {
                source.stop(t + effectiveSampleDuration);
            }

            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Resilient multi-tier playback for accompaniment events (guitar, bass, keys, drums).
     * Tier 1: Hardware WAV samples (if locally available)
     * Tier 2: Authenticated Base64 SoundFont samples (zero network overhead)
     * Tier 3: Algorithmic Web Audio physical modeling synthesis (always available)
     */
    playAccompanimentNote(role, instrumentType, midiPitch, startTime, durationSec, velocity = 0.8, outputBus = null) {
        if (!midiPitch) return false;
        try {
            const ctx = this._ensureContext();
            if (!ctx) return false;

            if (role === 'drums') {
                const drumType = (window.GuitarApp && window.GuitarApp.Models && window.GuitarApp.Models.MidiBackingTrackModel && window.GuitarApp.Models.MidiBackingTrackModel.GM_DRUM_MAP && window.GuitarApp.Models.MidiBackingTrackModel.GM_DRUM_MAP[midiPitch]) || 'snare';
                this.scheduleDrumHit(drumType, startTime, velocity * 0.95);
                return true;
            }

            if (role === 'bass') {
                const bus = outputBus || this.getMixerChannelBus('bass');
                const wavId = this._resolveWavInstrumentId(instrumentType || 'electric_bass');
                if (!this._wavDisabled && this._wavBuffers[wavId]) {
                    return this.playWavNote(wavId, midiPitch, startTime, durationSec, velocity * 0.95, bus);
                }
                // Fallback to high-definition synthesized bass
                this.scheduleBassNote(midiPitch, startTime, durationSec, velocity * 0.95, instrumentType || 'electric_bass');
                return true;
            }

            if (role === 'keys') {
                const bus = outputBus || this.getMixerChannelBus('keys');
                const wavId = 'electric_piano';
                if (!this._wavDisabled && this._wavBuffers[wavId]) {
                    return this.playWavNote(wavId, midiPitch, startTime, durationSec, velocity * 0.85, bus);
                }
                // Fallback to synthesized Rhodes / keyboard chords
                this.scheduleChordVoicing([midiPitch], startTime, durationSec, velocity * 0.85, 'electric_piano');
                return true;
            }

            // Guitar / Lead role
            const bus = outputBus || this.getMixerChannelBus('guitar');
            const wavId = this._resolveWavInstrumentId(instrumentType || 'clean_guitar');
            if (!this._wavDisabled && this._wavBuffers[wavId]) {
                const ok = this.playWavNote(wavId, midiPitch, startTime, durationSec, velocity, bus);
                if (ok) return true;
            }

            // SoundFont sample playback
            const sfInst = this.mapInstrumentToSoundfont(instrumentType);
            if (sfInst) {
                const ok = this.playSampleNote(sfInst, midiPitch, startTime, durationSec, velocity, bus);
                if (ok) return true;
            }

            // Pure synthesized guitar fallback
            this.scheduleChordVoicing([midiPitch], startTime, durationSec, velocity, instrumentType || 'clean_guitar');
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Play a single interactive lead guitar note (using authentic hardware clean electric guitar sample).
     */
    playGuitarNote(midiPitch, isEnabled = true) {
        if (!isEnabled) return;
        try {
            const ctx = this._ensureContext();
            if (!ctx) return;

            // Trigger precaching if WAVs enabled
            if (!this._wavDisabled) {
                this.precacheWavInstruments();
            }
            this.predecodeGuitarSamples('electric_guitar_clean');

            const leadBus = this.getMixerChannelBus('lead');
            // 1. Primary: Authentic Alesis Fusion Clean Guitar WAV
            const playedWav = this.playWavNote('clean_guitar', midiPitch, ctx.currentTime, 1.8, 1.0, leadBus);
            if (playedWav) return;

            // 2. Secondary: SoundFont sample if WAV is still loading or absent
            const playedSf = this.playSampleNote('electric_guitar_clean', midiPitch, ctx.currentTime, 1.4, 0.95, leadBus);
            if (playedSf) return;

            // 3. Fallback: Synthesized lead tone
            this._playSynthesizedGuitarFallback(midiPitch, ctx.currentTime, 1.25, 0.95, leadBus);
        } catch (e) {
            // Ignore audio policy errors
        }
    }

    /**
     * Fallback physical modeling lead tone while sample is decoding.
     */
    _playSynthesizedGuitarFallback(midiPitch, startTime, durationSec, velocity = 0.9, bus = null) {
        const ctx = this._ensureContext();
        if (!ctx) return;
        const targetBus = bus || this.getMixerChannelBus('lead');
        const now = startTime;
        const freq = 440 * Math.pow(2, (midiPitch - 69) / 12);

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const cabPresence = ctx.createBiquadFilter();
        const gainNode = ctx.createGain();

        osc1.type = 'triangle';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, now);
        osc2.frequency.setValueAtTime(freq * 1.002, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 5.5, now);
        filter.frequency.exponentialRampToValueAtTime(freq * 1.6, now + 0.38);

        cabPresence.type = 'peaking';
        cabPresence.frequency.setValueAtTime(2600, now);
        cabPresence.Q.setValueAtTime(1.5, now);
        cabPresence.gain.setValueAtTime(3.5, now);

        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.linearRampToValueAtTime(0.24 * velocity, now + 0.008);
        gainNode.gain.exponentialRampToValueAtTime(0.0008, now + durationSec);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(cabPresence);
        cabPresence.connect(gainNode);
        gainNode.connect(targetBus);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + durationSec + 0.05);
        osc2.stop(now + durationSec + 0.05);
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
            const guitarBus = this.getMixerChannelBus('guitar');

            const t = Math.max(startTime, ctx.currentTime);
            const dur = Math.max(0.08, durationSec);
            const voiceCount = midiPitches.length;

            // ==============================================================
            // 1. AUTHENTIC HARDWARE WAV INSTRUMENT SAMPLES (PRIMARY)
            // ==============================================================
            let wavId = null;
            if (instrumentType === 'clean_guitar') wavId = 'clean_guitar';
            else if (instrumentType === 'acoustic_guitar' || instrumentType === 'nylon_guitar') wavId = 'acoustic_guitar';
            else if (instrumentType === 'steel_guitar') wavId = 'steel_guitar';
            else if (instrumentType === 'jazz_guitar') wavId = 'jazz_guitar';
            else if (instrumentType === 'distorted_guitar' || instrumentType === 'overdriven_guitar') wavId = 'distorted_guitar';
            else if (instrumentType === 'electric_piano' || instrumentType === 'rhodes') wavId = 'electric_piano';
            else if (instrumentType === 'piano') wavId = 'piano';
            else if (instrumentType === 'synth') wavId = 'synth';

            if (wavId) {
                this.loadWavInstrument(wavId);
                if (this._wavBuffers[wavId]) {
                    const isNylon = wavId === 'acoustic_guitar';
                    const strumDelay = isNylon ? 0.016 : 0.012;
                    const chordGain = Math.min(1.15, velocity * 0.98);

                    midiPitches.forEach((pitch, sIdx) => {
                        const noteTime = t + sIdx * strumDelay;
                        const noteDur = Math.max(0.06, dur - (sIdx * strumDelay));
                        this.playWavNote(wavId, pitch, noteTime, noteDur, chordGain, guitarBus);
                    });
                    return;
                }
            }

            // ==============================================================
            // 2. AUTHENTIC RECORDED SOUNDFONT SAMPLE PLAYBACK (SECONDARY)
            // ==============================================================
            let sfInstrument = null;
            if (instrumentType === 'clean_guitar') {
                sfInstrument = 'electric_guitar_clean';
            } else if (instrumentType === 'acoustic_guitar' || instrumentType === 'nylon_guitar') {
                sfInstrument = 'acoustic_guitar_nylon';
            } else if (instrumentType === 'jazz_guitar') {
                sfInstrument = 'electric_guitar_jazz';
            } else if (instrumentType === 'distorted_guitar' || instrumentType === 'overdriven_guitar') {
                sfInstrument = 'distortion_guitar';
            }

            if (sfInstrument) {
                this.predecodeGuitarSamples(sfInstrument);
                let allReady = true;
                midiPitches.forEach(p => {
                    if (!this._sampleBuffers[sfInstrument] || !this._sampleBuffers[sfInstrument][p]) {
                        allReady = false;
                        this._decodeNoteSample(sfInstrument, p);
                    }
                });

                if (allReady) {
                    const isNylon = sfInstrument.includes('nylon');
                    const strumDelay = isNylon ? 0.016 : 0.012;
                    // For authentic samples, maintain full rich acoustic energy across chord strings
                    const chordGain = Math.min(1.0, velocity * 0.98);

                    midiPitches.forEach((pitch, sIdx) => {
                        const noteTime = t + sIdx * strumDelay;
                        const noteDur = Math.max(0.06, dur - (sIdx * strumDelay));
                        this.playSampleNote(sfInstrument, pitch, noteTime, noteDur, chordGain, guitarBus);
                    });
                    return;
                }
            }

            // ==============================================================
            // 2. SYNTHESIZED FALLBACK VOICES (ACTIVE DURING SAMPLE DECODING)
            // ==============================================================
            if (instrumentType === 'distorted_guitar' || instrumentType === 'overdriven_guitar') {
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

                // 4. Master Chord Envelope (dynamic palm-mute chugs vs open power chords)
                const isChug = dur < 0.22;
                const dynVel = Math.pow(Math.max(0.2, Math.min(1.0, velocity)), 1.35);
                const guitarGain = Math.min(0.22, 0.16 * dynVel);
                masterGain.gain.setValueAtTime(0.0001, t);
                if (isChug) {
                    masterGain.gain.linearRampToValueAtTime(guitarGain * 1.15, t + 0.006);
                    masterGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
                } else {
                    masterGain.gain.linearRampToValueAtTime(guitarGain, t + 0.015);
                    masterGain.gain.setValueAtTime(guitarGain * 0.9, t + dur * 0.7);
                    masterGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
                }

                // Signal Chain Routing
                preGain.connect(preBassCut);
                preBassCut.connect(shaper);
                shaper.connect(cabLowCut);
                cabLowCut.connect(cabPresence);
                cabPresence.connect(cabHighCut);
                cabHighCut.connect(masterGain);
                masterGain.connect(guitarBus);

                // 5. Dual Detuned Sawtooth Oscillators per Note
                const noteInputLevel = (2.2 / Math.sqrt(voiceCount));
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
                const dynVel = Math.pow(Math.max(0.2, Math.min(1.0, velocity)), 1.3);
                const noteGainLevel = (0.26 * dynVel) / Math.pow(voiceCount, 0.35);

                midiPitches.forEach((pitch, idx) => {
                    const strumOffset = idx * 0.014;
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

                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(5200, noteTime);
                    filter.frequency.exponentialRampToValueAtTime(2400, noteTime + Math.min(noteDur, 0.35));

                    gain.gain.setValueAtTime(0.0001, noteTime);
                    gain.gain.linearRampToValueAtTime(noteGainLevel, noteTime + 0.005);
                    gain.gain.setValueAtTime(noteGainLevel * 0.75, noteTime + noteDur * 0.5);
                    gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + noteDur);

                    osc1.connect(filter);
                    osc2.connect(filter);
                    filter.connect(gain);
                    gain.connect(guitarBus);

                    osc1.start(noteTime);
                    osc2.start(noteTime);
                    osc1.stop(noteTime + noteDur + 0.04);
                    osc2.stop(noteTime + noteDur + 0.04);
                });
            } else if (instrumentType === 'clean_guitar' || instrumentType === 'jazz_guitar') {
                // ==============================================================
                // CLEAN ELECTRIC GUITAR / JAZZ HOLLOWBODY (FENDER DELUXE / TWIN)
                // ==============================================================
                const isJazz = instrumentType === 'jazz_guitar';
                const dynVel = Math.pow(Math.max(0.2, Math.min(1.0, velocity)), 1.35);
                const cutoff = isJazz ? (2200 + dynVel * 900) : (3800 + dynVel * 2000);
                const noteGainLevel = (0.28 * dynVel) / Math.pow(voiceCount, 0.35);

                // 1. Pick attack micro-transient click/pluck
                const noiseBuf = this._getNoiseBuffer(ctx);
                if (noiseBuf) {
                    const pickNoise = ctx.createBufferSource();
                    pickNoise.buffer = noiseBuf;
                    const pickFilter = ctx.createBiquadFilter();
                    pickFilter.type = 'bandpass';
                    pickFilter.frequency.setValueAtTime(isJazz ? 2400 : 3600, t);
                    pickFilter.Q.setValueAtTime(2.2, t);
                    const pickGain = ctx.createGain();
                    pickGain.gain.setValueAtTime(0.08 * dynVel, t);
                    pickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.016);
                    pickNoise.connect(pickFilter);
                    pickFilter.connect(pickGain);
                    pickGain.connect(guitarBus);
                    pickNoise.start(t);
                    pickNoise.stop(t + 0.02);
                }

                // 2. Multi-string pick strum with tube amp & speaker cabinet EQ
                midiPitches.forEach((pitch, sIdx) => {
                    const strumDelay = sIdx * 0.008;
                    const noteTime = t + strumDelay;
                    const noteDur = Math.max(0.05, dur - strumDelay);
                    const freq = 440 * Math.pow(2, (pitch - 69) / 12);

                    const osc = ctx.createOscillator();
                    const subOsc = ctx.createOscillator();
                    const filter = ctx.createBiquadFilter();
                    const cabShelf = ctx.createBiquadFilter();
                    const gain = ctx.createGain();

                    osc.type = 'triangle';
                    subOsc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(freq, noteTime);
                    subOsc.frequency.setValueAtTime(freq * 1.002, noteTime); // Chorus width

                    // Amplifier speaker cabinet filter (warmth + presence peak)
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(cutoff, noteTime);
                    filter.frequency.exponentialRampToValueAtTime(cutoff * 0.75, noteTime + Math.min(noteDur, 0.4));

                    cabShelf.type = 'peaking';
                    cabShelf.frequency.setValueAtTime(2400, noteTime);
                    cabShelf.Q.setValueAtTime(1.4, noteTime);
                    cabShelf.gain.setValueAtTime(isJazz ? 1.5 : 4.0, noteTime);

                    gain.gain.setValueAtTime(0.0001, noteTime);
                    gain.gain.linearRampToValueAtTime(noteGainLevel, noteTime + (isJazz ? 0.010 : 0.005));
                    gain.gain.setValueAtTime(noteGainLevel * 0.82, noteTime + noteDur * 0.6);
                    gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + noteDur);

                    osc.connect(filter);
                    subOsc.connect(filter);
                    filter.connect(cabShelf);
                    cabShelf.connect(gain);
                    gain.connect(guitarBus);

                    osc.start(noteTime);
                    subOsc.start(noteTime);
                    osc.stop(noteTime + noteDur + 0.05);
                    subOsc.stop(noteTime + noteDur + 0.05);
                });
            } else if (instrumentType === 'electric_piano' || instrumentType === 'rhodes') {
                // ==============================================================
                // RHODES ELECTRIC PIANO (TINE SINE + BELL TRIANGLE)
                // ==============================================================
                const dynVel = Math.pow(Math.max(0.2, Math.min(1.0, velocity)), 1.3);
                const noteGainLevel = (0.072 * dynVel) / Math.sqrt(voiceCount);

                midiPitches.forEach((pitch) => {
                    const freq = 440 * Math.pow(2, (pitch - 69) / 12);
                    const tineOsc = ctx.createOscillator();
                    const bellOsc = ctx.createOscillator();
                    const filter = ctx.createBiquadFilter();
                    const gain = ctx.createGain();

                    tineOsc.type = 'sine';
                    bellOsc.type = 'triangle';
                    tineOsc.frequency.setValueAtTime(freq, t);
                    bellOsc.frequency.setValueAtTime(freq * 2.002, t);

                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(1850, t);

                    gain.gain.setValueAtTime(0.0001, t);
                    gain.gain.linearRampToValueAtTime(noteGainLevel, t + 0.015);
                    gain.gain.setValueAtTime(noteGainLevel * 0.8, t + dur * 0.65);
                    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

                    tineOsc.connect(filter);
                    bellOsc.connect(filter);
                    filter.connect(gain);
                    gain.connect(guitarBus);

                    tineOsc.start(t);
                    bellOsc.start(t);
                    tineOsc.stop(t + dur + 0.04);
                    bellOsc.stop(t + dur + 0.04);
                });
            } else if (instrumentType === 'piano') {
                // ==============================================================
                // ACOUSTIC GRAND PIANO (HAMMER ATTACK & HARMONIC DECAY)
                // ==============================================================
                const dynVel = Math.pow(Math.max(0.2, Math.min(1.0, velocity)), 1.3);
                const noteGainLevel = (0.075 * dynVel) / Math.sqrt(voiceCount);
                midiPitches.forEach((pitch) => {
                    const freq = 440 * Math.pow(2, (pitch - 69) / 12);
                    const osc1 = ctx.createOscillator();
                    const osc2 = ctx.createOscillator();
                    const filter = ctx.createBiquadFilter();
                    const gain = ctx.createGain();

                    osc1.type = 'triangle';
                    osc2.type = 'sine';
                    osc1.frequency.setValueAtTime(freq, t);
                    osc2.frequency.setValueAtTime(freq * 2.0, t);

                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(3200, t);
                    filter.frequency.exponentialRampToValueAtTime(800, t + Math.min(dur, 0.4));

                    gain.gain.setValueAtTime(0.0001, t);
                    gain.gain.linearRampToValueAtTime(noteGainLevel, t + 0.005);
                    gain.gain.setValueAtTime(noteGainLevel * 0.7, t + 0.08);
                    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

                    osc1.connect(filter);
                    osc2.connect(filter);
                    filter.connect(gain);
                    gain.connect(guitarBus);

                    osc1.start(t);
                    osc2.start(t);
                    osc1.stop(t + dur + 0.04);
                    osc2.stop(t + dur + 0.04);
                });
            } else if (instrumentType === 'house_organ' || instrumentType === 'percussive_organ') {
                // ==============================================================
                // 90s M1 PERCUSSIVE HOUSE ORGAN (SQUARE + SINE PERCUSSIVE CLICK)
                // ==============================================================
                const dynVel = Math.pow(Math.max(0.2, Math.min(1.0, velocity)), 1.3);
                const noteGainLevel = (0.065 * dynVel) / Math.sqrt(voiceCount);
                midiPitches.forEach((pitch) => {
                    const freq = 440 * Math.pow(2, (pitch - 69) / 12);
                    const osc1 = ctx.createOscillator();
                    const osc2 = ctx.createOscillator();
                    const filter = ctx.createBiquadFilter();
                    const gain = ctx.createGain();

                    osc1.type = 'square';
                    osc2.type = 'sine';
                    osc1.frequency.setValueAtTime(freq, t);
                    osc2.frequency.setValueAtTime(freq * 3.0, t);

                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(2400, t);

                    gain.gain.setValueAtTime(0.0001, t);
                    gain.gain.linearRampToValueAtTime(noteGainLevel, t + 0.004);
                    gain.gain.setValueAtTime(noteGainLevel * 0.85, t + dur * 0.6);
                    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

                    osc1.connect(filter);
                    osc2.connect(filter);
                    filter.connect(gain);
                    gain.connect(guitarBus);

                    osc1.start(t);
                    osc2.start(t);
                    osc1.stop(t + dur + 0.04);
                    osc2.stop(t + dur + 0.04);
                });
            } else if (instrumentType === 'tropical_pluck' || instrumentType === 'marimba') {
                // ==============================================================
                // TROPICAL PLUCK / MARIMBA MALLET SYNTH
                // ==============================================================
                const dynVel = Math.pow(Math.max(0.2, Math.min(1.0, velocity)), 1.3);
                const noteGainLevel = (0.08 * dynVel) / Math.sqrt(voiceCount);
                midiPitches.forEach((pitch) => {
                    const freq = 440 * Math.pow(2, (pitch - 69) / 12);
                    const osc = ctx.createOscillator();
                    const filter = ctx.createBiquadFilter();
                    const gain = ctx.createGain();

                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, t);

                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(3600, t);
                    filter.frequency.exponentialRampToValueAtTime(600, t + Math.min(dur, 0.2));

                    gain.gain.setValueAtTime(0.0001, t);
                    gain.gain.linearRampToValueAtTime(noteGainLevel, t + 0.003);
                    gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(dur, 0.35));

                    osc.connect(filter);
                    filter.connect(gain);
                    gain.connect(guitarBus);

                    osc.start(t);
                    osc.stop(t + Math.min(dur, 0.35) + 0.02);
                });
            } else {
                // ==============================================================
                // SYNTH PAD (DETUNED DUAL SAWTOOTH CHORUS)
                // ==============================================================
                const dynVel = Math.pow(Math.max(0.2, Math.min(1.0, velocity)), 1.3);
                const noteGainLevel = (0.055 * dynVel) / Math.sqrt(voiceCount);

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
                    gain.connect(guitarBus);

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
            const bassBus = this.getMixerChannelBus('bass');

            const t = Math.max(startTime, ctx.currentTime);
            const dur = Math.max(0.06, durationSec);
            const freq = 440 * Math.pow(2, (midiPitch - 69) / 12);
            const dynVel = Math.pow(Math.max(0.2, Math.min(1.0, velocity)), 1.3);

            // ==============================================================
            // 1. AUTHENTIC HARDWARE WAV BASS SAMPLES (PRIMARY)
            // ==============================================================
            let wavBassId = null;
            if (bassType === 'upright_bass' || bassType === 'acoustic_bass') wavBassId = 'acoustic_bass';
            else if (bassType === 'fretless_bass') wavBassId = 'fretless_bass';
            else if (bassType === 'slap_bass') wavBassId = 'slap_bass';
            else wavBassId = 'electric_bass';

            if (wavBassId) {
                this.loadWavInstrument(wavBassId);
                if (this._wavBuffers[wavBassId]) {
                    this.playWavNote(wavBassId, midiPitch, t, dur, velocity * 0.95, bassBus);
                    return;
                }
            }

            // ==============================================================
            // 2. SYNTHESIZED BASS FALLBACK (PUNCHY, RICH HARMONICS)
            // ==============================================================
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
                filter.frequency.setValueAtTime(1400, t);
                filter.frequency.exponentialRampToValueAtTime(550, t + Math.min(dur, 0.25));

                const targetGain = 0.38 * dynVel;
                gain.gain.setValueAtTime(0.0001, t);
                gain.gain.linearRampToValueAtTime(targetGain, t + 0.008);
                gain.gain.setValueAtTime(targetGain * 0.85, t + dur * 0.65);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

                osc.connect(shaper);
                sub.connect(shaper);
                shaper.connect(filter);
                filter.connect(gain);
                gain.connect(bassBus);

                osc.start(t);
                sub.start(t);
                osc.stop(t + dur + 0.04);
                sub.stop(t + dur + 0.04);
            } else if (bassType === 'upright_bass' || bassType === 'acoustic_bass' || bassType === 'fretless_bass') {
                // Acoustic upright jazz bass with wood finger pluck
                const osc = ctx.createOscillator();
                const sub = ctx.createOscillator();
                const filter = ctx.createBiquadFilter();
                const gain = ctx.createGain();

                osc.type = 'triangle';
                sub.type = 'sine';
                // Subtle pitch pluck transient
                osc.frequency.setValueAtTime(freq * 1.08, t);
                osc.frequency.exponentialRampToValueAtTime(freq, t + 0.025);
                sub.frequency.setValueAtTime(freq, t);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(850, t);
                filter.frequency.exponentialRampToValueAtTime(320, t + Math.min(dur, 0.3));

                const targetGain = 0.40 * dynVel;
                gain.gain.setValueAtTime(0.0001, t);
                gain.gain.linearRampToValueAtTime(targetGain, t + 0.006);
                gain.gain.setValueAtTime(targetGain * 0.75, t + dur * 0.5);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

                osc.connect(filter);
                sub.connect(filter);
                filter.connect(gain);
                gain.connect(bassBus);

                osc.start(t);
                sub.start(t);
                osc.stop(t + dur + 0.04);
                sub.stop(t + dur + 0.04);
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
                filter.frequency.setValueAtTime(1800, t);
                filter.frequency.exponentialRampToValueAtTime(450, t + 0.045);

                const targetGain = 0.40 * dynVel;
                gain.gain.setValueAtTime(0.0001, t);
                gain.gain.linearRampToValueAtTime(targetGain, t + 0.005);
                gain.gain.setValueAtTime(targetGain * 0.8, t + dur * 0.6);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

                osc.connect(filter);
                sub.connect(filter);
                filter.connect(gain);
                gain.connect(bassBus);

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
                filter.frequency.setValueAtTime(2200, t);
                filter.frequency.exponentialRampToValueAtTime(380, t + Math.min(dur, 0.12));

                const targetGain = 0.38 * dynVel;
                gain.gain.setValueAtTime(0.0001, t);
                gain.gain.linearRampToValueAtTime(targetGain, t + 0.006);
                gain.gain.setValueAtTime(targetGain * 0.8, t + dur * 0.6);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(bassBus);

                osc.start(t);
                osc.stop(t + dur + 0.04);
            } else {
                // Standard electric bass (rich punchy harmonics audible on mobile phones & laptops)
                const osc = ctx.createOscillator();
                const sub = ctx.createOscillator();
                const filter = ctx.createBiquadFilter();
                const bodyShelf = ctx.createBiquadFilter();
                const gain = ctx.createGain();

                osc.type = 'sawtooth';
                sub.type = 'sine';
                // Slight fret pluck pitch transient
                osc.frequency.setValueAtTime(freq * 1.08, t);
                osc.frequency.exponentialRampToValueAtTime(freq, t + 0.02);
                sub.frequency.setValueAtTime(freq, t);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(1200, t);
                filter.frequency.exponentialRampToValueAtTime(420, t + Math.min(dur, 0.28));

                bodyShelf.type = 'peaking';
                bodyShelf.frequency.setValueAtTime(500, t);
                bodyShelf.Q.setValueAtTime(1.2, t);
                bodyShelf.gain.setValueAtTime(3.5, t);

                const targetGain = 0.42 * dynVel;
                gain.gain.setValueAtTime(0.0001, t);
                gain.gain.linearRampToValueAtTime(targetGain, t + 0.008);
                gain.gain.setValueAtTime(targetGain * 0.82, t + dur * 0.65);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

                osc.connect(filter);
                sub.connect(filter);
                filter.connect(bodyShelf);
                bodyShelf.connect(gain);
                gain.connect(bassBus);

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
     * Schedule an authentic studio wood drumstick count-in click.
     * @param {number} beatNum - 1, 2, 3, or 4 (Beat 1 is accented with higher pitch)
     * @param {number} startTime - AudioContext audio clock start time
     */
    scheduleCountInClick(beatNum, startTime) {
        try {
            const ctx = this._ensureContext();
            if (!ctx) return;
            const drumsBus = this.getMixerChannelBus('drums');
            const t = Math.max(startTime, ctx.currentTime);
            const isAccent = (beatNum === 1);

            // 1. Resonant wood stick body transient (triangle pitch drop)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            const startFreq = isAccent ? 1250 : 920;
            const endFreq = isAccent ? 580 : 420;
            osc.frequency.setValueAtTime(startFreq, t);
            osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.022);

            const clickGain = isAccent ? 0.38 : 0.28;
            gain.gain.setValueAtTime(clickGain, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.038);

            osc.connect(gain);
            gain.connect(drumsBus);
            osc.start(t);
            osc.stop(t + 0.045);

            // 2. High-frequency stick tip impact burst
            const noiseBuf = this._getNoiseBuffer(ctx);
            if (noiseBuf) {
                const noise = ctx.createBufferSource();
                noise.buffer = noiseBuf;
                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(isAccent ? 4800 : 3600, t);
                filter.Q.setValueAtTime(3.0, t);

                const noiseGain = ctx.createGain();
                noiseGain.gain.setValueAtTime(isAccent ? 0.16 : 0.11, t);
                noiseGain.gain.exponentialRampToValueAtTime(0.0005, t + 0.025);

                noise.connect(filter);
                filter.connect(noiseGain);
                noiseGain.connect(drumsBus);

                noise.start(t);
                noise.stop(t + 0.03);
            }
        } catch (e) {
            // Ignore
        }
    }

    /**
     * Schedule a drum hit with authentic multi-layer and inharmonic metallic cluster synthesis.
     */
    scheduleDrumHit(type, startTime, velocity = 0.85, isEnabled = true) {
        if (!isEnabled || !type) return;
        try {
            const ctx = this._ensureContext();
            if (!ctx) return;
            const drumsBus = this.getMixerChannelBus('drums');

            const t = Math.max(startTime, ctx.currentTime);
            const noiseBuf = this._getNoiseBuffer(ctx);
            const dynVel = Math.pow(Math.max(0.2, Math.min(1.0, velocity)), 1.35);

            if (type === 'kick') {
                // 1. Multi-layer punchy kick (sub-sine drop 155Hz -> 45Hz)
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(155, t);
                osc.frequency.exponentialRampToValueAtTime(45, t + 0.075);

                gain.gain.setValueAtTime(0.44 * dynVel, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

                // 2. Beater attack transient (click burst)
                const clickOsc = ctx.createOscillator();
                const clickGain = ctx.createGain();
                clickOsc.type = 'triangle';
                clickOsc.frequency.setValueAtTime(3200, t);
                clickOsc.frequency.exponentialRampToValueAtTime(350, t + 0.015);
                clickGain.gain.setValueAtTime(0.22 * dynVel, t);
                clickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);

                osc.connect(gain);
                gain.connect(drumsBus);
                clickOsc.connect(clickGain);
                clickGain.connect(drumsBus);

                osc.start(t);
                clickOsc.start(t);
                osc.stop(t + 0.23);
                clickOsc.stop(t + 0.02);
            } else if (type === 'snare') {
                // 1. Snare drum body membrane tone
                const osc = ctx.createOscillator();
                const oscGain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(215, t);
                osc.frequency.exponentialRampToValueAtTime(125, t + 0.065);
                oscGain.gain.setValueAtTime(0.28 * dynVel, t);
                oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
                osc.connect(oscGain);
                oscGain.connect(drumsBus);
                osc.start(t);
                osc.stop(t + 0.14);

                // 2. Snappy snare wire rattle
                if (noiseBuf) {
                    const noise = ctx.createBufferSource();
                    noise.buffer = noiseBuf;
                    const filter = ctx.createBiquadFilter();
                    filter.type = 'bandpass';
                    filter.frequency.setValueAtTime(3400, t);
                    filter.Q.setValueAtTime(1.1, t);

                    const noiseGain = ctx.createGain();
                    noiseGain.gain.setValueAtTime(0.28 * dynVel, t);
                    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

                    noise.connect(filter);
                    filter.connect(noiseGain);
                    noiseGain.connect(drumsBus);

                    noise.start(t);
                    noise.stop(t + 0.17);
                }
            } else if (type === 'rim') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(720, t);
                gain.gain.setValueAtTime(0.24 * dynVel, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
                osc.connect(gain);
                gain.connect(drumsBus);
                osc.start(t);
                osc.stop(t + 0.05);
            } else if (type === 'hihatClosed') {
                // Authentic inharmonic metallic cluster (6 detuned square waves)
                const decay = Math.min(0.065, Math.max(0.024, 0.024 + dynVel * 0.038));
                const metalFreqs = [305, 415, 620, 835, 1150, 1680];
                const clusterGain = ctx.createGain();
                const clusterHpf = ctx.createBiquadFilter();
                clusterHpf.type = 'highpass';
                clusterHpf.frequency.setValueAtTime(7200, t);

                clusterGain.gain.setValueAtTime(0.08 * dynVel, t);
                clusterGain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

                metalFreqs.forEach(mf => {
                    const mOsc = ctx.createOscillator();
                    mOsc.type = 'square';
                    mOsc.frequency.setValueAtTime(mf, t);
                    mOsc.connect(clusterHpf);
                    mOsc.start(t);
                    mOsc.stop(t + decay + 0.01);
                });

                clusterHpf.connect(clusterGain);
                clusterGain.connect(drumsBus);

                if (noiseBuf) {
                    const noise = ctx.createBufferSource();
                    noise.buffer = noiseBuf;
                    const filter = ctx.createBiquadFilter();
                    filter.type = 'highpass';
                    filter.frequency.setValueAtTime(8500, t);

                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(0.07 * dynVel, t);
                    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

                    noise.connect(filter);
                    filter.connect(gain);
                    gain.connect(drumsBus);

                    noise.start(t);
                    noise.stop(t + decay + 0.01);
                }
            } else if (type === 'hihatOpen') {
                const decay = 0.22;
                const metalFreqs = [305, 415, 620, 835, 1150, 1680];
                const clusterGain = ctx.createGain();
                const clusterHpf = ctx.createBiquadFilter();
                clusterHpf.type = 'highpass';
                clusterHpf.frequency.setValueAtTime(6500, t);

                clusterGain.gain.setValueAtTime(0.09 * dynVel, t);
                clusterGain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

                metalFreqs.forEach(mf => {
                    const mOsc = ctx.createOscillator();
                    mOsc.type = 'square';
                    mOsc.frequency.setValueAtTime(mf, t);
                    mOsc.connect(clusterHpf);
                    mOsc.start(t);
                    mOsc.stop(t + decay + 0.01);
                });

                clusterHpf.connect(clusterGain);
                clusterGain.connect(drumsBus);

                if (noiseBuf) {
                    const noise = ctx.createBufferSource();
                    noise.buffer = noiseBuf;
                    const filter = ctx.createBiquadFilter();
                    filter.type = 'highpass';
                    filter.frequency.setValueAtTime(7000, t);

                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(0.09 * dynVel, t);
                    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

                    noise.connect(filter);
                    filter.connect(gain);
                    gain.connect(drumsBus);

                    noise.start(t);
                    noise.stop(t + decay + 0.01);
                }
            } else if (type === 'ride') {
                // Ride cymbal bell + shimmer
                const decay = 0.45;
                const bellOsc = ctx.createOscillator();
                const bellGain = ctx.createGain();
                bellOsc.type = 'triangle';
                bellOsc.frequency.setValueAtTime(840, t);
                bellGain.gain.setValueAtTime(0.07 * dynVel, t);
                bellGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
                bellOsc.connect(bellGain);
                bellGain.connect(drumsBus);
                bellOsc.start(t);
                bellOsc.stop(t + 0.2);

                if (noiseBuf) {
                    const noise = ctx.createBufferSource();
                    noise.buffer = noiseBuf;
                    const filter = ctx.createBiquadFilter();
                    filter.type = 'bandpass';
                    filter.frequency.setValueAtTime(6200, t);
                    filter.Q.setValueAtTime(2.0, t);

                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(0.08 * dynVel, t);
                    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

                    noise.connect(filter);
                    filter.connect(gain);
                    gain.connect(drumsBus);

                    noise.start(t);
                    noise.stop(t + decay + 0.01);
                }
            } else if (type === 'crash') {
                const decay = 1.6;
                // Crash metallic sizzle
                const metalFreqs = [280, 395, 570, 780, 1100, 1540];
                const clusterGain = ctx.createGain();
                const clusterHpf = ctx.createBiquadFilter();
                clusterHpf.type = 'highpass';
                clusterHpf.frequency.setValueAtTime(4500, t);

                clusterGain.gain.setValueAtTime(0.12 * dynVel, t);
                clusterGain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

                metalFreqs.forEach(mf => {
                    const mOsc = ctx.createOscillator();
                    mOsc.type = 'square';
                    mOsc.frequency.setValueAtTime(mf, t);
                    mOsc.connect(clusterHpf);
                    mOsc.start(t);
                    mOsc.stop(t + decay + 0.02);
                });

                clusterHpf.connect(clusterGain);
                clusterGain.connect(drumsBus);

                if (noiseBuf) {
                    const noise = ctx.createBufferSource();
                    noise.buffer = noiseBuf;
                    const filter = ctx.createBiquadFilter();
                    filter.type = 'highpass';
                    filter.frequency.setValueAtTime(3600, t);

                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(0.24 * dynVel, t);
                    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

                    noise.connect(filter);
                    filter.connect(gain);
                    gain.connect(drumsBus);

                    noise.start(t);
                    noise.stop(t + decay + 0.02);
                }
            } else if (type === 'ghostSnare') {
                const osc = ctx.createOscillator();
                const oscGain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(170, t);
                osc.frequency.exponentialRampToValueAtTime(95, t + 0.045);
                oscGain.gain.setValueAtTime(0.08 * dynVel, t);
                oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
                osc.connect(oscGain);
                oscGain.connect(drumsBus);
                osc.start(t);
                osc.stop(t + 0.07);

                if (noiseBuf) {
                    const noise = ctx.createBufferSource();
                    noise.buffer = noiseBuf;
                    const filter = ctx.createBiquadFilter();
                    filter.type = 'highpass';
                    filter.frequency.setValueAtTime(1600, t);

                    const noiseGain = ctx.createGain();
                    noiseGain.gain.setValueAtTime(0.10 * dynVel, t);
                    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

                    noise.connect(filter);
                    filter.connect(noiseGain);
                    noiseGain.connect(drumsBus);

                    noise.start(t);
                    noise.stop(t + 0.08);
                }
            } else if (type === 'crossStick') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(700, t);
                osc.frequency.exponentialRampToValueAtTime(360, t + 0.025);
                gain.gain.setValueAtTime(0.24 * dynVel, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
                osc.connect(gain);
                gain.connect(drumsBus);
                osc.start(t);
                osc.stop(t + 0.04);
            } else if (type === 'tomLow' || type === 'tomMid' || type === 'tomHigh') {
                const baseFreq = type === 'tomLow' ? 100 : (type === 'tomMid' ? 140 : 185);
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(baseFreq * 1.35, t);
                osc.frequency.exponentialRampToValueAtTime(baseFreq, t + 0.08);
                gain.gain.setValueAtTime(0.32 * dynVel, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
                osc.connect(gain);
                gain.connect(drumsBus);
                osc.start(t);
                osc.stop(t + 0.25);
            }
        } catch (e) {
            // Ignore
        }
    }
}

// ========================================================================
// AUTHENTIC HARDWARE WAV INSTRUMENT MANIFEST (WITH DETECTED PITCH CALIBRATION)
// ========================================================================
AudioEngineModel.WAV_INSTRUMENTS = {
    clean_guitar: {
        id: 'clean_guitar',
        name: 'Alesis Clean Guitar',
        path: 'midi_instruments/Alesis-Fusion-Clean-Guitar-C3.wav',
        rootMidi: 48,
        rootFreq: 131.28,
        idealFreq: 130.81,
        tuningCorrection: 0.996404
    },
    acoustic_guitar: {
        id: 'acoustic_guitar',
        name: 'Alesis Nylon Guitar',
        path: 'midi_instruments/Alesis-Fusion-Nylon-String-Guitar-C4.wav',
        rootMidi: 60,
        rootFreq: 260.62,
        idealFreq: 261.63,
        tuningCorrection: 1.003852
    },
    steel_guitar: {
        id: 'steel_guitar',
        name: 'Alesis Steel Guitar',
        path: 'midi_instruments/Alesis-Fusion-Steel-String-Guitar-C4.wav',
        rootMidi: 60,
        rootFreq: 264.81,
        idealFreq: 261.63,
        tuningCorrection: 0.987966
    },
    jazz_guitar: {
        id: 'jazz_guitar',
        name: 'Casio Jazz Guitar',
        path: 'midi_instruments/Casio-CTK-611-Jazz-Guitar-C4.wav',
        rootMidi: 60,
        rootFreq: 260.35,
        idealFreq: 261.63,
        tuningCorrection: 1.004883
    },
    muted_guitar: {
        id: 'muted_guitar',
        name: 'Casio Muted Guitar',
        path: 'midi_instruments/Casio-CTK-611-Muted-Guitar-C3.wav',
        rootMidi: 48,
        rootFreq: 130.96,
        idealFreq: 130.81,
        tuningCorrection: 0.998874
    },
    distorted_guitar: {
        id: 'distorted_guitar',
        name: 'Roland SC-88 Distorted Guitar',
        path: 'midi_instruments/Roland-SC-88-Distorted-Guitar-C3.wav',
        rootMidi: 48,
        rootFreq: 131.06,
        idealFreq: 130.81,
        tuningCorrection: 0.998145
    },
    electric_bass: {
        id: 'electric_bass',
        name: 'Roland Pick Bass',
        path: 'midi_instruments/Roland-GR-1-Pick-Bass-2-C4.wav',
        rootMidi: 36,
        rootFreq: 65.51,
        idealFreq: 65.41,
        tuningCorrection: 0.998451
    },
    acoustic_bass: {
        id: 'acoustic_bass',
        name: 'Alesis Acoustic Bass',
        path: 'midi_instruments/Alesis-Fusion-Acoustic-Bass-C2.wav',
        rootMidi: 36,
        rootFreq: 65.57,
        idealFreq: 65.41,
        tuningCorrection: 0.99748
    },
    fretless_bass: {
        id: 'fretless_bass',
        name: 'Alesis Fretless Bass',
        path: 'midi_instruments/Alesis-Fusion-Fretless-Bass-C3.wav',
        rootMidi: 48,
        rootFreq: 129.60,
        idealFreq: 130.81,
        tuningCorrection: 1.009321
    },
    slap_bass: {
        id: 'slap_bass',
        name: 'Electric Bass Staccato Bb',
        path: 'midi_instruments/Electric-Bass-High-Bb-Staccato.wav',
        rootMidi: 46,
        rootFreq: 117.35,
        idealFreq: 116.54,
        tuningCorrection: 0.993137
    },
    electric_piano: {
        id: 'electric_piano',
        name: 'Roland SA Rhodes',
        path: 'midi_instruments/Roland-JV-2080-SA-Rhodes-1-C4.wav',
        rootMidi: 60,
        rootFreq: 262.83,
        idealFreq: 261.63,
        tuningCorrection: 0.995414
    },
    piano: {
        id: 'piano',
        name: 'Roland Hammered E-Piano',
        path: 'midi_instruments/Roland-PN-D10-03-Hammered-E-Piano-C3.wav',
        rootMidi: 48,
        rootFreq: 130.92,
        idealFreq: 130.81,
        tuningCorrection: 0.999156
    },
    synth: {
        id: 'synth',
        name: 'Ensoniq Synth Lead',
        path: 'midi_instruments/Ensoniq-VFX-SD-Synth-Lead-C5.wav',
        rootMidi: 72,
        rootFreq: 525.63,
        idealFreq: 523.25,
        tuningCorrection: 0.995481
    },
    flute: {
        id: 'flute',
        name: 'Kawai Flute',
        path: 'midi_instruments/Kawai-K11-Flute-C5.wav',
        rootMidi: 72,
        rootFreq: 523.25,
        idealFreq: 523.25,
        tuningCorrection: 1.000002
    }
};

AudioEngineModel.EQ_FREQUENCIES = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384];

AudioEngineModel.EQ_Q = {
    32: 0.7, 64: 0.8, 128: 0.9, 256: 1.0, 512: 1.1,
    1024: 1.2, 2048: 1.4, 4096: 1.6, 8192: 1.8, 16384: 2.0
};

AudioEngineModel.EQ_PRESETS = {
    flat:       { 32:0, 64:0, 128:0, 256:0, 512:0, 1024:0, 2048:0, 4096:0, 8192:0, 16384:0 },
    blues:      { 32:3, 64:3, 128:2, 256:0, 512:-1, 1024:1, 2048:2, 4096:3, 8192:2, 16384:1 },
    jazz:       { 32:4, 64:3, 128:1, 256:0, 512:-1, 1024:-1, 2048:0, 4096:1, 8192:3, 16384:4 },
    rock:       { 32:6, 64:5, 128:2, 256:-1, 512:-2, 1024:-1, 2048:2, 4096:4, 8192:5, 16384:6 },
    acoustic:   { 32:2, 64:2, 128:0, 256:0, 512:1, 1024:2, 2048:2, 4096:3, 8192:4, 16384:3 },
    loudness:   { 32:6, 64:4, 128:1, 256:0, 512:-1, 1024:-1, 2048:0, 4096:2, 8192:4, 16384:5 }
};

window.GuitarApp.Models.AudioEngineModel = AudioEngineModel;
