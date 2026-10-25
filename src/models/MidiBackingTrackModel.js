/**
 * ==========================================================================
 * MODEL LAYER: MidiBackingTrackModel
 * Encapsulates backing track presets modeled precisely on authentic studio
 * sample loops from Looperman (Heavy metal chugs, Bossa Nova acoustic,
 * Neo-Soul electric guitar, Golden Boy Soul Rhodes, Sun Beam Indie Acoustic,
 * Mood Swings Pop Piano, Sad Emo Guitar, Deep House Chords, Tropical Pluck,
 * Hard Boom Bap, Lo-Fi Crisp, and Funky Breakbeats).
 * 
 * Supports real-time root & mode toning, Web Audio lookahead sequencer engine,
 * and instant standard multi-track MIDI file (.mid) export for DAWs.
 * ==========================================================================
 */
window.GuitarApp = window.GuitarApp || {};
window.GuitarApp.Models = window.GuitarApp.Models || {};

class MidiBackingTrackModel {
    constructor() {
        this.timerId = null;
        this.isPlaying = false;
        this.nextStepTime = 0;
        this.currentStep = 0;
        this.lastReportedChord = null;
    }

    /**
     * 12 Exact Studio Sample Loop Presets (All old synthetic MIDIs purged)
     */
    static PRESETS = [
        // ==================== ROCK & METAL ====================
        {
            id: 'purge_metal',
            name: 'Heavy Metal Gallop (Purge Riff)',
            category: 'Rock & Metal',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 130,
            midiFile: '01_purge_metal_guitar_130bpm.mid',
            instrumentType: 'distorted_guitar',
            bassType: 'distorted_bass',
            instrumentLabel: '⚡ Heavy Metal Crunch',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 7, 12], suffix: '5', degreeRoman: 'i5' },
                { rootOffset: 8, chordIntervals: [0, 7, 12], suffix: '5', degreeRoman: 'bVI5' },
                { rootOffset: 10, chordIntervals: [0, 7, 12], suffix: '5', degreeRoman: 'bVII5' },
                { rootOffset: 0, chordIntervals: [0, 7, 12], suffix: '5', degreeRoman: 'i5' }
            ],
            drums: {
                crash: [0],
                kick: [0, 1, 2, 4, 6, 7, 8, 9, 10, 12, 14, 15],
                snare: [4, 12],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 1, velocity: 1.0 },
                { step: 1, degree: 'root', durationSteps: 1, velocity: 0.85 },
                { step: 2, degree: 'root', durationSteps: 1, velocity: 0.85 },
                { step: 3, degree: 'root', durationSteps: 1, velocity: 0.85 },
                { step: 4, degree: 'root', durationSteps: 1, velocity: 0.95 },
                { step: 5, degree: 'root', durationSteps: 1, velocity: 0.85 },
                { step: 6, degree: 'root', durationSteps: 1, velocity: 0.85 },
                { step: 7, degree: 'root', durationSteps: 1, velocity: 0.85 },
                { step: 8, degree: 'root', durationSteps: 1, velocity: 0.95 },
                { step: 9, degree: 'root', durationSteps: 1, velocity: 0.85 },
                { step: 10, degree: 'root', durationSteps: 1, velocity: 0.85 },
                { step: 11, degree: 'root', durationSteps: 1, velocity: 0.85 },
                { step: 12, degree: 'fifth', durationSteps: 2, velocity: 1.0 },
                { step: 14, degree: 'root', durationSteps: 2, velocity: 1.0 }
            ],
            chords: [
                { step: 0, durationSteps: 0.8, velocity: 1.0 },
                { step: 1, durationSteps: 0.8, velocity: 0.85 },
                { step: 2, durationSteps: 0.8, velocity: 0.85 },
                { step: 3, durationSteps: 0.8, velocity: 0.85 },
                { step: 4, durationSteps: 0.8, velocity: 0.95 },
                { step: 5, durationSteps: 0.8, velocity: 0.85 },
                { step: 6, durationSteps: 0.8, velocity: 0.85 },
                { step: 7, durationSteps: 0.8, velocity: 0.85 },
                { step: 8, durationSteps: 0.8, velocity: 0.95 },
                { step: 9, durationSteps: 0.8, velocity: 0.85 },
                { step: 10, durationSteps: 0.8, velocity: 0.85 },
                { step: 11, durationSteps: 0.8, velocity: 0.85 },
                { step: 12, durationSteps: 1.8, velocity: 1.0 },
                { step: 14, durationSteps: 1.8, velocity: 1.0 }
            ]
        },
        {
            id: 'sad_guitar_emo',
            name: 'Sad / Emo Rock (Sad Guitar Riff)',
            category: 'Rock & Metal',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 130,
            midiFile: '07_sad_guitar_emo_rock_130bpm.mid',
            instrumentType: 'clean_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🎸 Clean Chorus Guitar',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 3, 7, 12], suffix: 'm', degreeRoman: 'i' },
                { rootOffset: 8, chordIntervals: [0, 4, 7, 12], suffix: '', degreeRoman: 'bVI' },
                { rootOffset: 3, chordIntervals: [0, 4, 7, 12], suffix: '', degreeRoman: 'bIII' },
                { rootOffset: 10, chordIntervals: [0, 4, 7, 12], suffix: '', degreeRoman: 'bVII' }
            ],
            drums: {
                crash: [0],
                kick: [0, 6, 10],
                snare: [4, 12],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 2, velocity: 0.95 },
                { step: 2, degree: 'root', durationSteps: 2, velocity: 0.85 },
                { step: 4, degree: 'root', durationSteps: 2, velocity: 0.9 },
                { step: 6, degree: 'root', durationSteps: 2, velocity: 0.85 },
                { step: 8, degree: 'root', durationSteps: 2, velocity: 0.95 },
                { step: 10, degree: 'root', durationSteps: 2, velocity: 0.85 },
                { step: 12, degree: 'fifth', durationSteps: 2, velocity: 0.9 },
                { step: 14, degree: 'octave', durationSteps: 2, velocity: 0.85 }
            ],
            chords: [
                { step: 0, durationSteps: 2.0, velocity: 0.95 },
                { step: 2, durationSteps: 2.0, velocity: 0.85 },
                { step: 4, durationSteps: 2.0, velocity: 0.9 },
                { step: 6, durationSteps: 2.0, velocity: 0.85 },
                { step: 8, durationSteps: 2.0, velocity: 0.95 },
                { step: 10, durationSteps: 2.0, velocity: 0.85 },
                { step: 12, durationSteps: 2.0, velocity: 0.9 },
                { step: 14, durationSteps: 2.0, velocity: 0.85 }
            ]
        },

        // ==================== ACOUSTIC & LATIN ====================
        {
            id: 'bossa_nova',
            name: 'Bossa Nova (João Gilberto Chords)',
            category: 'Acoustic & Latin',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 134,
            midiFile: '02_bossa_nova_acoustic_134bpm.mid',
            instrumentType: 'acoustic_guitar',
            bassType: 'acoustic_bass',
            instrumentLabel: '🎸 Nylon Acoustic Guitar',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 4, 7, 11, 14], suffix: 'maj9', degreeRoman: 'IM9' },
                { rootOffset: 9, chordIntervals: [0, 4, 7, 10, 14], suffix: '9', degreeRoman: 'VI9' },
                { rootOffset: 2, chordIntervals: [0, 3, 7, 10, 14], suffix: 'm9', degreeRoman: 'ii9' },
                { rootOffset: 7, chordIntervals: [0, 4, 7, 10, 14, 21], suffix: '13', degreeRoman: 'V13' }
            ],
            drums: {
                kick: [0, 8],
                crossStick: [0, 6, 10, 12],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 3.5, velocity: 0.9 },
                { step: 8, degree: 'fifth', durationSteps: 3.5, velocity: 0.85 }
            ],
            chords: [
                { step: 0, durationSteps: 1.8, velocity: 0.85 },
                { step: 5, durationSteps: 1.8, velocity: 0.9 },
                { step: 8, durationSteps: 1.8, velocity: 0.85 },
                { step: 11, durationSteps: 1.8, velocity: 0.9 },
                { step: 14, durationSteps: 1.8, velocity: 0.9 }
            ]
        },
        {
            id: 'sun_beam_indie',
            name: 'Indie Acoustic Pop (Sun Beam Riff)',
            category: 'Acoustic & Latin',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 134,
            midiFile: '05_sun_beam_indie_acoustic_134bpm.mid',
            instrumentType: 'acoustic_guitar',
            bassType: 'acoustic_bass',
            instrumentLabel: '🎸 Steel Acoustic Guitar',
            progression: [
                { rootOffset: 9, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'vi7' },
                { rootOffset: 5, chordIntervals: [0, 4, 7, 11], suffix: 'maj7', degreeRoman: 'IVmaj7' },
                { rootOffset: 0, chordIntervals: [0, 4, 7, 14], suffix: 'add9', degreeRoman: 'Iadd9' },
                { rootOffset: 7, chordIntervals: [0, 4, 7, 9], suffix: '6', degreeRoman: 'V6' }
            ],
            drums: {
                kick: [0, 8],
                crossStick: [4, 12],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 4, velocity: 0.9 },
                { step: 8, degree: 'root', durationSteps: 4, velocity: 0.85 }
            ],
            chords: [
                { step: 0, durationSteps: 1.8, velocity: 0.95 },
                { step: 2, durationSteps: 1.8, velocity: 0.8 },
                { step: 4, durationSteps: 1.8, velocity: 0.85 },
                { step: 6, durationSteps: 1.8, velocity: 0.8 },
                { step: 8, durationSteps: 1.8, velocity: 0.9 },
                { step: 10, durationSteps: 1.8, velocity: 0.8 },
                { step: 12, durationSteps: 1.8, velocity: 0.85 },
                { step: 14, durationSteps: 1.8, velocity: 0.8 }
            ]
        },

        // ==================== R&B, SOUL & KEYS ====================
        {
            id: 'revoke_neo_soul',
            name: 'Neo-Soul / R&B (Revoke Guitar)',
            category: 'R&B, Soul & Keys',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 89,
            midiFile: '03_revoke_rnb_guitar_89bpm.mid',
            instrumentType: 'clean_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🎸 Strat Clean Neck Pickup',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 3, 7, 10, 14], suffix: 'm9', degreeRoman: 'i9' },
                { rootOffset: 5, chordIntervals: [0, 4, 7, 10, 14], suffix: '9', degreeRoman: 'IV9' },
                { rootOffset: 8, chordIntervals: [0, 4, 7, 11, 14], suffix: 'maj9', degreeRoman: 'bVImaj9' },
                { rootOffset: 7, chordIntervals: [0, 4, 7, 10, 15], suffix: '7(#9)', degreeRoman: 'V7#9' }
            ],
            drums: {
                kick: [0, 7, 10],
                crossStick: [4, 12],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 4, velocity: 0.9 },
                { step: 8, degree: 'root', durationSteps: 3, velocity: 0.85 }
            ],
            chords: [
                { step: 2, durationSteps: 3.5, velocity: 0.9 },
                { step: 10, durationSteps: 2.0, velocity: 0.8 },
                { step: 13, durationSteps: 2.5, velocity: 0.85 }
            ]
        },
        {
            id: 'golden_boy_rhodes',
            name: 'Soul Rhodes Piano (Golden Boy)',
            category: 'R&B, Soul & Keys',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 112,
            midiFile: '04_golden_boy_soul_rhodes_112bpm.mid',
            instrumentType: 'rhodes',
            bassType: 'electric_bass',
            instrumentLabel: '🎹 Suitcase Rhodes Piano',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 3, 7, 10, 14], suffix: 'm9', degreeRoman: 'i9' },
                { rootOffset: 8, chordIntervals: [0, 4, 7, 11, 14], suffix: 'maj9', degreeRoman: 'bVImaj9' },
                { rootOffset: 5, chordIntervals: [0, 3, 7, 10, 14], suffix: 'm9', degreeRoman: 'iv9' },
                { rootOffset: 7, chordIntervals: [0, 4, 8, 10, 15], suffix: '7(alt)', degreeRoman: 'V7alt' }
            ],
            drums: {
                kick: [0, 6, 10],
                snare: [4, 12],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 3, velocity: 0.95 },
                { step: 6, degree: 'root', durationSteps: 3, velocity: 0.85 },
                { step: 11, degree: 'fifth', durationSteps: 4, velocity: 0.9 }
            ],
            chords: [
                { step: 0, durationSteps: 2.0, velocity: 0.95 },
                { step: 3, durationSteps: 2.0, velocity: 0.85 },
                { step: 6, durationSteps: 3.8, velocity: 0.9 },
                { step: 11, durationSteps: 3.8, velocity: 0.95 }
            ]
        },
        {
            id: 'mood_swings_piano',
            name: 'Pop / R&B Grand Piano (Mood Swings)',
            category: 'R&B, Soul & Keys',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 130,
            midiFile: '06_mood_swings_pop_piano_130bpm.mid',
            instrumentType: 'piano',
            bassType: 'electric_bass',
            instrumentLabel: '🎹 Acoustic Grand Piano',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 3, 7, 12], suffix: 'm', degreeRoman: 'i' },
                { rootOffset: 8, chordIntervals: [0, 4, 7, 11], suffix: 'maj7', degreeRoman: 'bVImaj7' },
                { rootOffset: 3, chordIntervals: [0, 4, 7, 12], suffix: '', degreeRoman: 'bIII' },
                { rootOffset: 10, chordIntervals: [0, 4, 7, 12], suffix: '', degreeRoman: 'bVII' }
            ],
            drums: {
                kick: [0, 8, 11],
                snare: [4, 12],
                hihatClosed: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 6, velocity: 0.95 },
                { step: 8, degree: 'root', durationSteps: 6, velocity: 0.9 }
            ],
            chords: [
                { step: 0, durationSteps: 2.2, velocity: 0.95 },
                { step: 3, durationSteps: 2.2, velocity: 0.85 },
                { step: 6, durationSteps: 2.2, velocity: 0.85 },
                { step: 8, durationSteps: 2.2, velocity: 0.9 },
                { step: 11, durationSteps: 2.2, velocity: 0.85 },
                { step: 14, durationSteps: 2.2, velocity: 0.85 }
            ]
        },

        // ==================== ELECTRONIC & DANCE ====================
        {
            id: 'deep_house_chords',
            name: '90s Deep House (House Chords)',
            category: 'Electronic & Dance',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 120,
            midiFile: '08_deep_house_chords_120bpm.mid',
            instrumentType: 'house_organ',
            bassType: 'synth',
            instrumentLabel: '🎹 90s House Organ',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 3, 7, 10, 14], suffix: 'm9', degreeRoman: 'i9' },
                { rootOffset: 7, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'v7' },
                { rootOffset: 8, chordIntervals: [0, 4, 7, 11], suffix: 'maj7', degreeRoman: 'bVImaj7' },
                { rootOffset: 10, chordIntervals: [0, 4, 7, 10, 14], suffix: '9', degreeRoman: 'bVII9' }
            ],
            drums: {
                kick: [0, 4, 8, 12],
                snare: [4, 12],
                hihatOpen: [2, 6, 10, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 1, velocity: 0.95 },
                { step: 2, degree: 'root', durationSteps: 1, velocity: 0.85 },
                { step: 4, degree: 'root', durationSteps: 1, velocity: 0.9 },
                { step: 6, degree: 'root', durationSteps: 1, velocity: 0.85 },
                { step: 8, degree: 'root', durationSteps: 1, velocity: 0.95 },
                { step: 10, degree: 'root', durationSteps: 1, velocity: 0.85 },
                { step: 11, degree: 'fifth', durationSteps: 1, velocity: 0.9 },
                { step: 14, degree: 'root', durationSteps: 1, velocity: 0.95 }
            ],
            chords: [
                { step: 0, durationSteps: 1.5, velocity: 1.0 },
                { step: 4, durationSteps: 1.5, velocity: 0.95 },
                { step: 8, durationSteps: 1.5, velocity: 0.95 },
                { step: 11, durationSteps: 1.5, velocity: 0.9 },
                { step: 14, durationSteps: 1.5, velocity: 1.0 }
            ]
        },
        {
            id: 'tropical_house_pluck',
            name: 'Tropical House (Pluck Melody)',
            category: 'Electronic & Dance',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 120,
            midiFile: '09_tropical_house_pluck_120bpm.mid',
            instrumentType: 'tropical_pluck',
            bassType: 'synth',
            instrumentLabel: '🔔 Kalimba / Pluck Synth',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'I' },
                { rootOffset: 7, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'V' },
                { rootOffset: 9, chordIntervals: [0, 3, 7], suffix: 'm', degreeRoman: 'vi' },
                { rootOffset: 5, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'IV' }
            ],
            drums: {
                kick: [0, 4, 8, 12],
                snare: [4, 12],
                hihatClosed: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
            },
            bass: [
                { step: 2, degree: 'root', durationSteps: 2, velocity: 0.95 },
                { step: 6, degree: 'root', durationSteps: 2, velocity: 0.9 },
                { step: 10, degree: 'root', durationSteps: 2, velocity: 0.95 },
                { step: 14, degree: 'root', durationSteps: 2, velocity: 0.9 }
            ],
            chords: [
                { step: 0, durationSteps: 1.2, velocity: 0.95 },
                { step: 3, durationSteps: 1.2, velocity: 0.95 },
                { step: 6, durationSteps: 1.2, velocity: 0.9 },
                { step: 10, durationSteps: 1.2, velocity: 0.95 },
                { step: 13, durationSteps: 1.2, velocity: 0.9 }
            ]
        },

        // ==================== HIP-HOP & BREAKBEATS ====================
        {
            id: 'hard_boom_bap',
            name: '90s Hard Boom Bap Drum Break',
            category: 'Hip-Hop & Breakbeats',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 96,
            midiFile: '10_hard_boom_bap_drums_96bpm.mid',
            instrumentType: 'clean_guitar',
            bassType: 'acoustic_bass',
            instrumentLabel: '🥁 Hard Boom Bap Drums',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'i7' },
                { rootOffset: 5, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'iv7' },
                { rootOffset: 7, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'v7' },
                { rootOffset: 0, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'i7' }
            ],
            drums: {
                kick: [0, 6, 10, 13],
                snare: [4, 12],
                ghostSnare: [14],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12],
                hihatOpen: [14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 3, velocity: 1.0 },
                { step: 6, degree: 'third', durationSteps: 2, velocity: 0.9 },
                { step: 10, degree: 'fifth', durationSteps: 3, velocity: 0.95 }
            ],
            chords: [
                { step: 4, durationSteps: 1.2, velocity: 0.85 },
                { step: 12, durationSteps: 1.2, velocity: 0.85 }
            ]
        },
        {
            id: 'lofi_crisp',
            name: 'Lo-Fi Crisp Hip Hop Beat',
            category: 'Hip-Hop & Breakbeats',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 96,
            midiFile: '11_lofi_crisp_beat_96bpm.mid',
            instrumentType: 'rhodes',
            bassType: 'acoustic_bass',
            instrumentLabel: '🥁 Lo-Fi Crisp Drums',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 4, 7, 11], suffix: 'maj7', degreeRoman: 'Imaj7' },
                { rootOffset: 9, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'vi7' },
                { rootOffset: 2, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'ii7' },
                { rootOffset: 7, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'V7' }
            ],
            drums: {
                kick: [0, 10],
                crossStick: [4, 12],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 4, velocity: 0.9 },
                { step: 8, degree: 'root', durationSteps: 4, velocity: 0.85 }
            ],
            chords: [
                { step: 0, durationSteps: 5.0, velocity: 0.85 },
                { step: 8, durationSteps: 5.0, velocity: 0.8 }
            ]
        },
        {
            id: 'funky_breakbeat',
            name: 'Funky Breakbeat (Theme Chop)',
            category: 'Hip-Hop & Breakbeats',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 96,
            midiFile: '12_theme_chop_funk_break_96bpm.mid',
            instrumentType: 'clean_guitar',
            bassType: 'synth',
            instrumentLabel: '🥁 Funky Breakbeat Drums',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'i7' },
                { rootOffset: 5, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'IV7' },
                { rootOffset: 0, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'i7' },
                { rootOffset: 5, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'IV7' }
            ],
            drums: {
                kick: [0, 2, 7, 10],
                snare: [4, 12],
                ghostSnare: [1, 3, 6, 11, 14],
                hihatClosed: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 1, velocity: 1.0 },
                { step: 2, degree: 'octave', durationSteps: 1, velocity: 0.95 },
                { step: 7, degree: 'third', durationSteps: 1, velocity: 0.95 },
                { step: 10, degree: 'fourth', durationSteps: 1, velocity: 1.0 }
            ],
            chords: [
                { step: 4, durationSteps: 0.8, velocity: 0.9 },
                { step: 12, durationSteps: 0.8, velocity: 0.9 }
            ]
        }
    ];

    /**
     * Retrieve preset configuration by ID.
     */
    static getPresetById(id) {
        return MidiBackingTrackModel.PRESETS.find(p => p.id === id) || MidiBackingTrackModel.PRESETS[0];
    }

    /**
     * Retrieve all available presets.
     */
    static getAllPresets() {
        return MidiBackingTrackModel.PRESETS;
    }

    /**
     * Start playback sequencer loop.
     */
    start(audioModel, getContextFn, onChordUpdateFn) {
        this.stop();
        if (!audioModel) return;

        const ctx = audioModel._ensureContext();
        if (!ctx) return;

        this.isPlaying = true;
        this.currentStep = 0;
        this.nextStepTime = ctx.currentTime + 0.05;
        this.lastReportedChord = null;

        const scheduleIntervalMs = 25;
        this.timerId = window.setInterval(() => {
            if (!this.isPlaying) return;
            this._scheduleLookahead(audioModel, getContextFn, onChordUpdateFn);
        }, scheduleIntervalMs);
    }

    /**
     * Stop playback sequencer loop.
     */
    stop() {
        if (this.timerId !== null) {
            window.clearInterval(this.timerId);
            this.timerId = null;
        }
        this.isPlaying = false;
        this.currentStep = 0;
        this.lastReportedChord = null;
    }

    /**
     * Lookahead scheduling engine for real-time synchronization.
     */
    _scheduleLookahead(audioModel, getContextFn, onChordUpdateFn) {
        const ctx = audioModel._ensureContext();
        if (!ctx) return;

        const lookaheadHorizonSec = 0.12;

        while (this.nextStepTime < ctx.currentTime + lookaheadHorizonSec) {
            const context = typeof getContextFn === 'function' ? getContextFn() : {};
            const preset = MidiBackingTrackModel.getPresetById(context.stylePresetId);
            const bpm = context.bpm || preset.defaultBpm || 120;
            const stepsPerBar = preset.stepsPerBar || 16;
            const stepDurationSec = (60.0 / bpm) / (preset.stepsPerBeat || 4);

            const totalSlots = (preset.progression && preset.progression.length) || 4;
            const barIndex = Math.floor(this.currentStep / stepsPerBar);
            const slotIndex = barIndex % totalSlots;
            const barStep = this.currentStep % stepsPerBar;

            const chordSlot = preset.progression ? preset.progression[slotIndex] : null;

            // Report chord on downbeat of each bar
            if (barStep === 0 && chordSlot && typeof onChordUpdateFn === 'function') {
                const rootName = context.rootNoteName || 'C';
                const chordLabel = `${rootName}${chordSlot.suffix || ''} (${chordSlot.degreeRoman || ''})`;
                if (this.lastReportedChord !== chordLabel) {
                    this.lastReportedChord = chordLabel;
                    onChordUpdateFn(chordLabel);
                }
            }

            if (chordSlot && context.rootNoteIdx !== null && context.rootNoteIdx !== undefined) {
                // 1. DRUMS
                if (preset.drums) {
                    if (preset.drums.crash && preset.drums.crash.includes(barStep) && (barIndex % 4 === 0)) {
                        audioModel.scheduleDrumHit('crash', this.nextStepTime, 0.9, context.isEnabled);
                    }
                    if (preset.drums.kick && preset.drums.kick.includes(barStep)) {
                        audioModel.scheduleDrumHit('kick', this.nextStepTime, 0.95, context.isEnabled);
                    }
                    if (preset.drums.snare && preset.drums.snare.includes(barStep)) {
                        audioModel.scheduleDrumHit('snare', this.nextStepTime, 0.9, context.isEnabled);
                    }
                    if (preset.drums.ghostSnare && preset.drums.ghostSnare.includes(barStep)) {
                        audioModel.scheduleDrumHit('ghostSnare', this.nextStepTime, 0.55, context.isEnabled);
                    }
                    if (preset.drums.crossStick && preset.drums.crossStick.includes(barStep)) {
                        audioModel.scheduleDrumHit('crossStick', this.nextStepTime, 0.85, context.isEnabled);
                    }
                    if (preset.drums.rim && preset.drums.rim.includes(barStep)) {
                        audioModel.scheduleDrumHit('rim', this.nextStepTime, 0.85, context.isEnabled);
                    }
                    if (preset.drums.hihatClosed && preset.drums.hihatClosed.includes(barStep)) {
                        audioModel.scheduleDrumHit('hihatClosed', this.nextStepTime, 0.65, context.isEnabled);
                    }
                    if (preset.drums.hihatOpen && preset.drums.hihatOpen.includes(barStep)) {
                        audioModel.scheduleDrumHit('hihatOpen', this.nextStepTime, 0.8, context.isEnabled);
                    }
                    if (preset.drums.ride && preset.drums.ride.includes(barStep)) {
                        audioModel.scheduleDrumHit('ride', this.nextStepTime, 0.75, context.isEnabled);
                    }
                }

                // 2. BASS
                if (preset.bass) {
                    const bassEvt = preset.bass.find(b => b.step === barStep && (b.bar === undefined || b.bar === slotIndex));
                    if (bassEvt) {
                        let bassBaseMidi = 28 + context.rootNoteIdx + (chordSlot.rootOffset || 0); // E1 is 28
                        while (bassBaseMidi > 43) bassBaseMidi -= 12; // E1..G2 range
                        while (bassBaseMidi < 28) bassBaseMidi += 12;

                        let degreeOffset = 0;
                        if (bassEvt.degree === 'third') {
                            degreeOffset = (chordSlot.chordIntervals && chordSlot.chordIntervals[1]) !== undefined
                                ? chordSlot.chordIntervals[1]
                                : 4;
                        } else if (bassEvt.degree === 'fourth') {
                            degreeOffset = 5;
                        } else if (bassEvt.degree === 'fifth') {
                            degreeOffset = (chordSlot.chordIntervals && chordSlot.chordIntervals[2]) !== undefined
                                ? chordSlot.chordIntervals[2]
                                : 7;
                        } else if (bassEvt.degree === 'seventh') {
                            degreeOffset = (chordSlot.chordIntervals && chordSlot.chordIntervals[3]) !== undefined
                                ? chordSlot.chordIntervals[3]
                                : 10;
                        } else if (bassEvt.degree === 'octave') {
                            degreeOffset = 12;
                        }

                        const bassPitch = bassBaseMidi + degreeOffset;
                        const durationSec = bassEvt.durationSteps * stepDurationSec * 0.92;
                        audioModel.scheduleBassNote(
                            bassPitch,
                            this.nextStepTime,
                            durationSec,
                            bassEvt.velocity || 0.85,
                            preset.bassType || 'electric_bass',
                            context.isEnabled
                        );
                    }
                }

                // 3. CHORDS & INSTRUMENT ACCOMPANIMENT
                if (preset.chords) {
                    const chordEvt = preset.chords.find(c => c.step === barStep && (c.bar === undefined || c.bar === slotIndex));
                    if (chordEvt) {
                        const isGuitar = preset.instrumentType === 'distorted_guitar' ||
                                         preset.instrumentType === 'clean_guitar' ||
                                         preset.instrumentType === 'acoustic_guitar';

                        let chordRootMidi = (isGuitar ? 48 : 55) + context.rootNoteIdx + (chordSlot.rootOffset || 0);
                        const maxCeiling = isGuitar ? 62 : 68;
                        const minFloor = isGuitar ? 44 : 50;

                        while (chordRootMidi > maxCeiling) chordRootMidi -= 12;
                        while (chordRootMidi < minFloor) chordRootMidi += 12;

                        const chordIntervals = chordSlot.chordIntervals || [0, 4, 7];
                        const midiPitches = chordIntervals.map(interval => chordRootMidi + interval);
                        const durationSec = chordEvt.durationSteps * stepDurationSec * 0.95;
                        audioModel.scheduleChordVoicing(
                            midiPitches,
                            this.nextStepTime,
                            durationSec,
                            chordEvt.velocity || 0.8,
                            preset.instrumentType || 'synth',
                            context.isEnabled
                        );
                    }
                }
            }

            this.nextStepTime += stepDurationSec;
            this.currentStep = (this.currentStep + 1) % (stepsPerBar * totalSlots);
        }
    }

    /**
     * Trigger browser download of the standard multi-track MIDI file (.mid).
     */
    static downloadPresetMidi(presetId) {
        const preset = MidiBackingTrackModel.getPresetById(presetId);
        const filename = preset.midiFile || '01_purge_metal_guitar_130bpm.mid';
        const midiUrl = `midi_tracks/${filename}`;
        
        const a = document.createElement('a');
        a.href = midiUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

window.GuitarApp.Models.MidiBackingTrackModel = MidiBackingTrackModel;
