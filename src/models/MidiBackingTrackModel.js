/**
 * ==========================================================================
 * MODEL LAYER: MidiBackingTrackModel
 * Encapsulates backing track presets modeled on authentic studio sample loops
 * (Looperman metal guitar loops, bossa nova, neo-soul, soul rhodes, boom bap,
 * deep house, indie acoustic, pop piano), real-time root & mode toning, and
 * a Web Audio lookahead sequencer engine + MIDI file exporter.
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
                // Fast 16th-note palm-muted chugs (steps 0..11) + accent stabs on 12, 14
                { step: 0, durationSteps: 0.9, velocity: 1.0 },
                { step: 1, durationSteps: 0.9, velocity: 0.85 },
                { step: 2, durationSteps: 0.9, velocity: 0.85 },
                { step: 3, durationSteps: 0.9, velocity: 0.85 },
                { step: 4, durationSteps: 0.9, velocity: 0.95 },
                { step: 5, durationSteps: 0.9, velocity: 0.85 },
                { step: 6, durationSteps: 0.9, velocity: 0.85 },
                { step: 7, degree: 'root', durationSteps: 0.9, velocity: 0.85 },
                { step: 8, durationSteps: 0.9, velocity: 0.95 },
                { step: 9, durationSteps: 0.9, velocity: 0.85 },
                { step: 10, durationSteps: 0.9, velocity: 0.85 },
                { step: 11, durationSteps: 0.9, velocity: 0.85 },
                { step: 12, durationSteps: 1.8, velocity: 1.0 },
                { step: 14, durationSteps: 1.8, velocity: 1.0 }
            ]
        },
        {
            id: 'alt_rock',
            name: 'Alternative Rock (Grunge)',
            category: 'Rock & Metal',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 116,
            instrumentType: 'distorted_guitar',
            bassType: 'distorted_bass',
            instrumentLabel: '🎸 Distorted Guitar',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 7, 12], suffix: '5', degreeRoman: 'i5' },
                { rootOffset: 8, chordIntervals: [0, 7, 12], suffix: '5', degreeRoman: 'bVI5' },
                { rootOffset: 3, chordIntervals: [0, 7, 12], suffix: '5', degreeRoman: 'bIII5' },
                { rootOffset: 10, chordIntervals: [0, 7, 12], suffix: '5', degreeRoman: 'bVII5' }
            ],
            drums: {
                crash: [0],
                kick: [0, 6, 8, 10],
                snare: [4, 12],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12],
                hihatOpen: [14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 2, velocity: 0.95 },
                { step: 2, degree: 'root', durationSteps: 2, velocity: 0.85 },
                { step: 4, degree: 'root', durationSteps: 2, velocity: 0.9 },
                { step: 6, degree: 'fifth', durationSteps: 2, velocity: 0.85 },
                { step: 8, degree: 'root', durationSteps: 2, velocity: 0.95 },
                { step: 10, degree: 'root', durationSteps: 2, velocity: 0.85 },
                { step: 12, degree: 'root', durationSteps: 2, velocity: 0.9 },
                { step: 14, degree: 'octave', durationSteps: 2, velocity: 0.85 }
            ],
            chords: [
                { step: 0, durationSteps: 2.8, velocity: 0.95 },
                { step: 3, durationSteps: 2.8, velocity: 0.85 },
                { step: 6, durationSteps: 1.8, velocity: 0.85 },
                { step: 8, durationSteps: 2.8, velocity: 0.95 },
                { step: 11, durationSteps: 2.8, velocity: 0.85 },
                { step: 14, durationSteps: 1.8, velocity: 0.85 }
            ]
        },
        {
            id: 'classic_rock',
            name: 'Classic Hard Rock',
            category: 'Rock & Metal',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 124,
            instrumentType: 'distorted_guitar',
            bassType: 'distorted_bass',
            instrumentLabel: '🎸 Overdrive Guitar',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 7, 12], suffix: '5', degreeRoman: 'I5' },
                { rootOffset: 10, chordIntervals: [0, 7, 12], suffix: '5', degreeRoman: 'bVII5' },
                { rootOffset: 5, chordIntervals: [0, 7, 12], suffix: '5', degreeRoman: 'IV5' },
                { rootOffset: 0, chordIntervals: [0, 7, 12], suffix: '5', degreeRoman: 'I5' }
            ],
            drums: {
                crash: [0],
                kick: [0, 8, 10],
                snare: [4, 12],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 3, velocity: 0.95 },
                { step: 4, degree: 'fifth', durationSteps: 3, velocity: 0.85 },
                { step: 8, degree: 'root', durationSteps: 2, velocity: 0.9 },
                { step: 10, degree: 'third', durationSteps: 2, velocity: 0.85 },
                { step: 12, degree: 'fifth', durationSteps: 3, velocity: 0.85 }
            ],
            chords: [
                { step: 0, durationSteps: 3.8, velocity: 0.95 },
                { step: 6, durationSteps: 1.8, velocity: 0.85 },
                { step: 8, durationSteps: 3.8, velocity: 0.9 },
                { step: 14, durationSteps: 1.8, velocity: 0.85 }
            ]
        },
        {
            id: 'emo_rock_sad_guitar',
            name: 'Sad / Emo Rock (Arpeggio)',
            category: 'Rock & Metal',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 130,
            midiFile: '07_sad_guitar_emo_rock_130bpm.mid',
            instrumentType: 'clean_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🎸 Emo Clean Guitar',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 3, 7, 12], suffix: 'm', degreeRoman: 'i' },
                { rootOffset: 3, chordIntervals: [0, 4, 7, 12], suffix: '', degreeRoman: 'bIII' },
                { rootOffset: 10, chordIntervals: [0, 4, 7, 12], suffix: '', degreeRoman: 'bVII' },
                { rootOffset: 8, chordIntervals: [0, 4, 7, 12], suffix: '', degreeRoman: 'bVI' }
            ],
            drums: {
                crash: [0],
                kick: [0, 8, 10],
                snare: [4, 12],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 3, velocity: 0.95 },
                { step: 4, degree: 'root', durationSteps: 3, velocity: 0.85 },
                { step: 8, degree: 'root', durationSteps: 3, velocity: 0.9 },
                { step: 12, degree: 'root', durationSteps: 3, velocity: 0.85 }
            ],
            chords: [
                { step: 0, durationSteps: 1.8, velocity: 0.9 },
                { step: 2, durationSteps: 1.8, velocity: 0.75 },
                { step: 4, durationSteps: 1.8, velocity: 0.85 },
                { step: 6, durationSteps: 1.8, velocity: 0.75 },
                { step: 8, durationSteps: 1.8, velocity: 0.9 },
                { step: 10, durationSteps: 1.8, velocity: 0.75 },
                { step: 12, durationSteps: 1.8, velocity: 0.85 },
                { step: 14, durationSteps: 1.8, velocity: 0.75 }
            ]
        },
        {
            id: 'prog_5_4',
            name: 'Prog Rock (5/4 Odd Meter)',
            category: 'Rock & Metal',
            timeSignature: '5/4',
            beatsPerBar: 5,
            stepsPerBeat: 4,
            stepsPerBar: 20,
            defaultBpm: 112,
            instrumentType: 'distorted_guitar',
            bassType: 'distorted_bass',
            instrumentLabel: '🎸 Prog Crunch & Bass',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 7, 12], suffix: '5', degreeRoman: 'i5' },
                { rootOffset: 10, chordIntervals: [0, 7, 12], suffix: '5', degreeRoman: 'bVII5' },
                { rootOffset: 8, chordIntervals: [0, 7, 12], suffix: '5', degreeRoman: 'bVI5' },
                { rootOffset: 7, chordIntervals: [0, 7, 12], suffix: '5', degreeRoman: 'v5' }
            ],
            drums: {
                crash: [0],
                kick: [0, 6, 12],
                snare: [4, 16],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 3, velocity: 0.95 },
                { step: 4, degree: 'third', durationSteps: 2, velocity: 0.85 },
                { step: 6, degree: 'fifth', durationSteps: 3, velocity: 0.9 },
                { step: 10, degree: 'octave', durationSteps: 2, velocity: 0.85 },
                { step: 12, degree: 'root', durationSteps: 3, velocity: 0.95 },
                { step: 16, degree: 'seventh', durationSteps: 3, velocity: 0.85 }
            ],
            chords: [
                { step: 0, durationSteps: 4.8, velocity: 0.95 },
                { step: 6, durationSteps: 4.8, velocity: 0.85 },
                { step: 12, durationSteps: 6.8, velocity: 0.9 }
            ]
        },

        // ==================== POP, R&B & INDIE ====================
        {
            id: 'revoke_rnb',
            name: 'Neo-Soul / R&B Guitar (Revoke)',
            category: 'Pop & Indie',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 89,
            midiFile: '03_revoke_rnb_guitar_89bpm.mid',
            instrumentType: 'clean_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🎸 Neo-Soul Strat',
            progression: [
                { rootOffset: 9, chordIntervals: [0, 3, 7, 10, 14], suffix: 'm9', degreeRoman: 'vi9' },
                { rootOffset: 2, chordIntervals: [0, 3, 7, 10, 14], suffix: 'm9', degreeRoman: 'ii9' },
                { rootOffset: 5, chordIntervals: [0, 4, 7, 11, 14], suffix: 'maj9', degreeRoman: 'IVmaj9' },
                { rootOffset: 7, chordIntervals: [0, 4, 7, 10, 14], suffix: '9', degreeRoman: 'V9' }
            ],
            drums: {
                kick: [0, 10],
                snare: [4, 12],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 5, velocity: 0.95 },
                { step: 6, degree: 'root', durationSteps: 3, velocity: 0.8 },
                { step: 10, degree: 'fifth', durationSteps: 4, velocity: 0.85 }
            ],
            chords: [
                { step: 0, durationSteps: 3.5, velocity: 0.9 },
                { step: 4, durationSteps: 2.5, velocity: 0.8 },
                { step: 7, durationSteps: 2.5, velocity: 0.85 },
                { step: 10, durationSteps: 1.8, velocity: 0.75 },
                { step: 12, durationSteps: 1.8, velocity: 0.8 },
                { step: 14, durationSteps: 1.8, velocity: 0.85 }
            ]
        },
        {
            id: 'sun_beam_indie',
            name: 'Indie Acoustic Pop (Sun Beam)',
            category: 'Pop & Indie',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 134,
            midiFile: '05_sun_beam_indie_acoustic_134bpm.mid',
            instrumentType: 'acoustic_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🪕 Acoustic Guitar',
            progression: [
                { rootOffset: 9, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'vi7' },
                { rootOffset: 5, chordIntervals: [0, 4, 7, 11], suffix: 'maj7', degreeRoman: 'IVmaj7' },
                { rootOffset: 0, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'I' },
                { rootOffset: 7, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'V' }
            ],
            drums: {
                kick: [0, 8, 10],
                snare: [4, 12],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 5, velocity: 0.95 },
                { step: 6, degree: 'root', durationSteps: 2, velocity: 0.8 },
                { step: 8, degree: 'fifth', durationSteps: 4, velocity: 0.85 },
                { step: 12, degree: 'root', durationSteps: 3, velocity: 0.8 }
            ],
            chords: [
                { step: 0, durationSteps: 1.8, velocity: 0.9 },
                { step: 2, durationSteps: 1.8, velocity: 0.75 },
                { step: 4, durationSteps: 1.8, velocity: 0.85 },
                { step: 6, durationSteps: 1.8, velocity: 0.75 },
                { step: 8, durationSteps: 1.8, velocity: 0.9 },
                { step: 10, durationSteps: 1.8, velocity: 0.75 },
                { step: 12, durationSteps: 1.8, velocity: 0.85 },
                { step: 14, durationSteps: 1.8, velocity: 0.8 }
            ]
        },
        {
            id: 'mood_swings_piano',
            name: 'Pop / R&B Grand Piano (Mood Swings)',
            category: 'Pop & Indie',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 130,
            midiFile: '06_mood_swings_pop_piano_130bpm.mid',
            instrumentType: 'electric_piano',
            bassType: 'electric_bass',
            instrumentLabel: '🎹 Grand Piano',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 3, 7, 10, 14], suffix: 'm9', degreeRoman: 'i9' },
                { rootOffset: 10, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'bVII' },
                { rootOffset: 8, chordIntervals: [0, 4, 7, 11], suffix: 'maj7', degreeRoman: 'bVImaj7' },
                { rootOffset: 7, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'v7' }
            ],
            drums: {
                kick: [0, 6, 10],
                snare: [4, 12],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 6, velocity: 0.95 },
                { step: 8, degree: 'fifth', durationSteps: 6, velocity: 0.85 }
            ],
            chords: [
                { step: 0, durationSteps: 3.5, velocity: 0.9 },
                { step: 4, durationSteps: 2.5, velocity: 0.8 },
                { step: 7, durationSteps: 2.5, velocity: 0.85 },
                { step: 10, durationSteps: 1.8, velocity: 0.8 },
                { step: 12, durationSteps: 2.5, velocity: 0.85 },
                { step: 14, durationSteps: 1.8, velocity: 0.8 }
            ]
        },
        {
            id: 'pop_groove',
            name: 'Modern Pop Four Chords',
            category: 'Pop & Indie',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 104,
            instrumentType: 'clean_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🎸 Clean Strat',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'I' },
                { rootOffset: 7, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'V' },
                { rootOffset: 9, chordIntervals: [0, 3, 7], suffix: 'm', degreeRoman: 'vi' },
                { rootOffset: 5, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'IV' }
            ],
            drums: {
                kick: [0, 6, 10],
                snare: [4, 12],
                hihatClosed: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 3, velocity: 0.9 },
                { step: 4, degree: 'root', durationSteps: 2, velocity: 0.75 },
                { step: 6, degree: 'fifth', durationSteps: 2, velocity: 0.8 },
                { step: 8, degree: 'root', durationSteps: 2, velocity: 0.85 },
                { step: 10, degree: 'octave', durationSteps: 2, velocity: 0.8 },
                { step: 12, degree: 'fifth', durationSteps: 3, velocity: 0.75 }
            ],
            chords: [
                { step: 0, durationSteps: 2.8, velocity: 0.85 },
                { step: 3, durationSteps: 2.8, velocity: 0.75 },
                { step: 6, durationSteps: 1.8, velocity: 0.8 },
                { step: 8, durationSteps: 2.8, velocity: 0.85 },
                { step: 12, durationSteps: 2.8, velocity: 0.8 }
            ]
        },
        {
            id: 'synthwave',
            name: '80s Synthwave / Retro',
            category: 'Pop & Indie',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 108,
            instrumentType: 'synth',
            bassType: 'synth_bass',
            instrumentLabel: '🌆 Analog Synth & Bass',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 3, 7], suffix: 'm', degreeRoman: 'i' },
                { rootOffset: 8, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'bVI' },
                { rootOffset: 3, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'bIII' },
                { rootOffset: 10, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'bVII' }
            ],
            drums: {
                kick: [0, 4, 8, 12],
                snare: [4, 12],
                hihatClosed: [2, 6, 10, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 1, velocity: 0.9 },
                { step: 1, degree: 'root', durationSteps: 1, velocity: 0.75 },
                { step: 2, degree: 'root', durationSteps: 1, velocity: 0.85 },
                { step: 3, degree: 'root', durationSteps: 1, velocity: 0.75 },
                { step: 4, degree: 'root', durationSteps: 1, velocity: 0.9 },
                { step: 5, degree: 'root', durationSteps: 1, velocity: 0.75 },
                { step: 6, degree: 'fifth', durationSteps: 1, velocity: 0.85 },
                { step: 7, degree: 'fifth', durationSteps: 1, velocity: 0.75 },
                { step: 8, degree: 'root', durationSteps: 1, velocity: 0.9 },
                { step: 9, degree: 'root', durationSteps: 1, velocity: 0.75 },
                { step: 10, degree: 'root', durationSteps: 1, velocity: 0.85 },
                { step: 11, degree: 'root', durationSteps: 1, velocity: 0.75 },
                { step: 12, degree: 'octave', durationSteps: 1, velocity: 0.9 },
                { step: 13, degree: 'octave', durationSteps: 1, velocity: 0.75 },
                { step: 14, degree: 'fifth', durationSteps: 1, velocity: 0.85 },
                { step: 15, degree: 'third', durationSteps: 1, velocity: 0.75 }
            ],
            chords: [
                { step: 0, durationSteps: 5.5, velocity: 0.85 },
                { step: 6, durationSteps: 1.8, velocity: 0.75 },
                { step: 8, durationSteps: 5.5, velocity: 0.85 },
                { step: 14, durationSteps: 1.8, velocity: 0.75 }
            ]
        },

        // ==================== JAZZ & LATIN ====================
        {
            id: 'bossa_nova',
            name: 'Bossa Nova (Joao Gilberto Chords)',
            category: 'Jazz & Latin',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 134,
            midiFile: '02_bossa_nova_acoustic_134bpm.mid',
            instrumentType: 'acoustic_guitar',
            bassType: 'upright_bass',
            instrumentLabel: '🪕 Nylon Bossa Guitar',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 4, 7, 11], suffix: 'maj7', degreeRoman: 'Imaj7' },
                { rootOffset: 2, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'ii7' },
                { rootOffset: 7, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'V7' },
                { rootOffset: 0, chordIntervals: [0, 4, 7, 11], suffix: 'maj7', degreeRoman: 'Imaj7' }
            ],
            drums: {
                kick: [0, 8],
                crossStick: [0, 3, 6, 10, 12],
                hihatClosed: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 3.5, velocity: 0.95 },
                { step: 4, degree: 'root', durationSteps: 2, velocity: 0.7 },
                { step: 8, degree: 'fifth', durationSteps: 3.5, velocity: 0.9 },
                { step: 12, degree: 'fifth', durationSteps: 2, velocity: 0.7 }
            ],
            chords: [
                // Authentic João Gilberto syncopated nylon plucks: 0, 3, 6, 8, 10, 13, 14
                { step: 0, durationSteps: 1.8, velocity: 0.95 },
                { step: 3, durationSteps: 1.8, velocity: 0.8 },
                { step: 6, durationSteps: 1.8, velocity: 0.9 },
                { step: 8, durationSteps: 1.8, velocity: 0.85 },
                { step: 10, durationSteps: 1.8, velocity: 0.9 },
                { step: 13, durationSteps: 0.9, velocity: 0.8 },
                { step: 14, durationSteps: 1.8, velocity: 0.85 }
            ]
        },
        {
            id: 'golden_boy_rhodes',
            name: 'Soul Rhodes Piano (Golden Boy)',
            category: 'Jazz & Latin',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 112,
            midiFile: '04_golden_boy_soul_rhodes_112bpm.mid',
            instrumentType: 'electric_piano',
            bassType: 'upright_bass',
            instrumentLabel: '🎹 Velvet Rhodes Piano',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 3, 7, 10, 14], suffix: 'm9', degreeRoman: 'i9' },
                { rootOffset: 10, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'bVII7' },
                { rootOffset: 8, chordIntervals: [0, 4, 7, 11], suffix: 'maj7', degreeRoman: 'bVImaj7' },
                { rootOffset: 7, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'v7' }
            ],
            drums: {
                kick: [0, 6, 10],
                snare: [4, 12],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 3.5, velocity: 0.95 },
                { step: 4, degree: 'fifth', durationSteps: 3, velocity: 0.8 },
                { step: 8, degree: 'root', durationSteps: 3, velocity: 0.85 },
                { step: 12, degree: 'octave', durationSteps: 3, velocity: 0.8 }
            ],
            chords: [
                { step: 0, durationSteps: 2.8, velocity: 0.95 },
                { step: 4, durationSteps: 2, velocity: 0.8 },
                { step: 7, durationSteps: 2, velocity: 0.85 },
                { step: 10, durationSteps: 2, velocity: 0.8 },
                { step: 13, durationSteps: 2.5, velocity: 0.85 }
            ]
        },
        {
            id: 'samba_2_4',
            name: 'Brazilian Samba (2/4)',
            category: 'Jazz & Latin',
            timeSignature: '2/4',
            beatsPerBar: 2,
            stepsPerBeat: 4,
            stepsPerBar: 8,
            defaultBpm: 102,
            instrumentType: 'acoustic_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🪕 Nylon Guitar',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 4, 7, 9], suffix: '6', degreeRoman: 'I6' },
                { rootOffset: 9, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'vi7' },
                { rootOffset: 2, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'ii7' },
                { rootOffset: 7, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'V7' }
            ],
            drums: {
                kick: [0, 4],
                crossStick: [0, 3, 6],
                hihatClosed: [0, 1, 2, 3, 4, 5, 6, 7]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 3, velocity: 0.85 },
                { step: 4, degree: 'fifth', durationSteps: 3, velocity: 0.9 }
            ],
            chords: [
                { step: 1, durationSteps: 2, velocity: 0.8 },
                { step: 4, durationSteps: 1, velocity: 0.85 },
                { step: 6, durationSteps: 2, velocity: 0.8 }
            ]
        },
        {
            id: 'jazz_swing',
            name: 'Jazz Swing Walking',
            category: 'Jazz & Latin',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 3, // Triplet swing grid: 12 steps/bar
            stepsPerBar: 12,
            defaultBpm: 128,
            instrumentType: 'jazz_guitar',
            bassType: 'upright_bass',
            instrumentLabel: '🎷 Jazz Hollowbody',
            progression: [
                { rootOffset: 2, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'ii7' },
                { rootOffset: 7, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'V7' },
                { rootOffset: 4, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'iii7' },
                { rootOffset: 9, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'VI7' }
            ],
            drums: {
                kick: [0, 6],
                ride: [0, 2, 3, 5, 6, 8, 9, 11],
                hihatClosed: [3, 9] // 2 & 4 foot chic
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 2, velocity: 0.9 },
                { step: 3, degree: 'third', durationSteps: 2, velocity: 0.85 },
                { step: 6, degree: 'fifth', durationSteps: 2, velocity: 0.9 },
                { step: 9, degree: 'seventh', durationSteps: 2, velocity: 0.85 }
            ],
            chords: [
                { step: 0, durationSteps: 2, velocity: 0.8 },
                { step: 4, durationSteps: 2, velocity: 0.75 },
                { step: 8, durationSteps: 2, velocity: 0.8 }
            ]
        },
        {
            id: 'jazz_waltz',
            name: 'Jazz Waltz (3/4)',
            category: 'Jazz & Latin',
            timeSignature: '3/4',
            beatsPerBar: 3,
            stepsPerBeat: 4,
            stepsPerBar: 12,
            defaultBpm: 132,
            instrumentType: 'jazz_guitar',
            bassType: 'upright_bass',
            instrumentLabel: '🎷 Jazz Hollowbody',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 4, 7, 11], suffix: 'maj7', degreeRoman: 'Imaj7' },
                { rootOffset: 5, chordIntervals: [0, 4, 7, 11], suffix: 'maj7', degreeRoman: 'IVmaj7' },
                { rootOffset: 2, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'ii7' },
                { rootOffset: 7, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'V7' }
            ],
            drums: {
                kick: [0],
                ride: [0, 4, 6, 8, 10],
                hihatClosed: [4, 8]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 4, velocity: 0.9 },
                { step: 4, degree: 'third', durationSteps: 3, velocity: 0.8 },
                { step: 8, degree: 'fifth', durationSteps: 3, velocity: 0.8 }
            ],
            chords: [
                { step: 4, durationSteps: 3, velocity: 0.85 },
                { step: 8, durationSteps: 3, velocity: 0.8 }
            ]
        },
        {
            id: 'take_five_5_4',
            name: 'Cool Jazz (5/4 Take Five)',
            category: 'Jazz & Latin',
            timeSignature: '5/4',
            beatsPerBar: 5,
            stepsPerBeat: 4,
            stepsPerBar: 20,
            defaultBpm: 144,
            instrumentType: 'electric_piano',
            bassType: 'upright_bass',
            instrumentLabel: '🎹 Piano & Upright',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'i7' },
                { rootOffset: 7, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'v7' },
                { rootOffset: 0, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'i7' },
                { rootOffset: 7, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'v7' }
            ],
            drums: {
                kick: [0, 12],
                ride: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18],
                hihatClosed: [4, 8, 14, 18]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 5, velocity: 0.9 },
                { step: 6, degree: 'fifth', durationSteps: 4, velocity: 0.85 },
                { step: 12, degree: 'root', durationSteps: 3, velocity: 0.85 },
                { step: 16, degree: 'fifth', durationSteps: 3, velocity: 0.8 }
            ],
            chords: [
                { step: 4, durationSteps: 3, velocity: 0.8 },
                { step: 8, durationSteps: 3, velocity: 0.8 }
            ]
        },
        {
            id: 'afro_cuban_6_8',
            name: 'Afro-Cuban / Latin (6/8)',
            category: 'Jazz & Latin',
            timeSignature: '6/8',
            beatsPerBar: 2,
            stepsPerBeat: 6,
            stepsPerBar: 12,
            defaultBpm: 105,
            instrumentType: 'electric_piano',
            bassType: 'electric_bass',
            instrumentLabel: '🎹 Latin Piano',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 3, 7], suffix: 'm', degreeRoman: 'i' },
                { rootOffset: 10, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'bVII' },
                { rootOffset: 8, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'bVI' },
                { rootOffset: 7, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'V7' }
            ],
            drums: {
                kick: [0, 7],
                ride: [0, 2, 4, 5, 7, 9, 11], // 6/8 bembe bell
                snare: [6]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 4, velocity: 0.9 },
                { step: 5, degree: 'fifth', durationSteps: 3, velocity: 0.85 },
                { step: 9, degree: 'octave', durationSteps: 2, velocity: 0.8 }
            ],
            chords: [
                { step: 2, durationSteps: 2, velocity: 0.8 },
                { step: 5, durationSteps: 2, velocity: 0.85 },
                { step: 9, durationSteps: 2, velocity: 0.8 }
            ]
        },

        // ==================== HIP HOP & ELECTRONIC ====================
        {
            id: 'boom_bap_drums',
            name: '90s Boom Bap Pocket',
            category: 'Hip Hop & Electronic',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 96,
            midiFile: '10_hard_boom_bap_drums_96bpm.mid',
            instrumentType: 'jazz_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🎸 Boom Bap Jazz Guitar',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 3, 7, 10, 14], suffix: 'm9', degreeRoman: 'i9' },
                { rootOffset: 10, chordIntervals: [0, 4, 7, 10, 14], suffix: '9', degreeRoman: 'bVII9' },
                { rootOffset: 8, chordIntervals: [0, 4, 7, 11], suffix: 'maj7', degreeRoman: 'bVImaj7' },
                { rootOffset: 7, chordIntervals: [0, 4, 7, 10, 13], suffix: '7b9', degreeRoman: 'V7b9' }
            ],
            drums: {
                kick: [0, 5, 10, 14],
                snare: [4, 12],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 4, velocity: 1.0 },
                { step: 5, degree: 'root', durationSteps: 3, velocity: 0.9 },
                { step: 10, degree: 'fifth', durationSteps: 4, velocity: 0.95 }
            ],
            chords: [
                { step: 2, durationSteps: 2, velocity: 0.9 },
                { step: 6, durationSteps: 2, velocity: 0.85 },
                { step: 11, durationSteps: 2, velocity: 0.9 }
            ]
        },
        {
            id: 'lofi_crisp',
            name: 'Lo-Fi Chill Hop (Crisp Beat)',
            category: 'Hip Hop & Electronic',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 96,
            midiFile: '11_lofi_crisp_beat_96bpm.mid',
            instrumentType: 'electric_piano',
            bassType: 'electric_bass',
            instrumentLabel: '🎹 Dusty Lo-Fi Rhodes',
            progression: [
                { rootOffset: 5, chordIntervals: [0, 4, 7, 11], suffix: 'maj7', degreeRoman: 'IVmaj7' },
                { rootOffset: 4, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'iii7' },
                { rootOffset: 2, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'ii7' },
                { rootOffset: 0, chordIntervals: [0, 4, 7, 11], suffix: 'maj7', degreeRoman: 'Imaj7' }
            ],
            drums: {
                kick: [0, 6, 10],
                crossStick: [4, 12],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 5, velocity: 0.9 },
                { step: 6, degree: 'fifth', durationSteps: 3, velocity: 0.8 },
                { step: 10, degree: 'root', durationSteps: 4, velocity: 0.85 }
            ],
            chords: [
                { step: 0, durationSteps: 4, velocity: 0.8 },
                { step: 7, durationSteps: 3, velocity: 0.75 },
                { step: 12, durationSteps: 3, velocity: 0.8 }
            ]
        },
        {
            id: 'funk_breakbeat',
            name: 'Funky Breakbeat (Theme Chop)',
            category: 'Hip Hop & Electronic',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 96,
            midiFile: '12_theme_chop_funk_break_96bpm.mid',
            instrumentType: 'clean_guitar',
            bassType: 'slap_bass',
            instrumentLabel: '🎸 Funk Strat & Slap',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 4, 7, 10, 15], suffix: '7#9', degreeRoman: 'I7#9' },
                { rootOffset: 5, chordIntervals: [0, 4, 7, 10, 14], suffix: '9', degreeRoman: 'IV9' },
                { rootOffset: 0, chordIntervals: [0, 4, 7, 10, 15], suffix: '7#9', degreeRoman: 'I7#9' },
                { rootOffset: 5, chordIntervals: [0, 4, 7, 10, 14], suffix: '9', degreeRoman: 'IV9' }
            ],
            drums: {
                kick: [0, 7, 10],
                snare: [4, 12],
                ghostSnare: [2, 9, 14],
                hihatOpen: [3, 11],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 2, velocity: 1.0 },
                { step: 3, degree: 'octave', durationSteps: 1, velocity: 0.95 },
                { step: 6, degree: 'root', durationSteps: 2, velocity: 0.9 },
                { step: 10, degree: 'seventh', durationSteps: 2, velocity: 0.95 }
            ],
            chords: [
                { step: 2, durationSteps: 1, velocity: 0.95 },
                { step: 6, durationSteps: 1, velocity: 0.85 },
                { step: 8, durationSteps: 1, velocity: 0.9 },
                { step: 14, durationSteps: 1, velocity: 0.85 }
            ]
        },
        {
            id: 'deep_house',
            name: 'Deep House Chords (90s Stabs)',
            category: 'Hip Hop & Electronic',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 120,
            midiFile: '08_deep_house_chords_120bpm.mid',
            instrumentType: 'synth',
            bassType: 'synth_bass',
            instrumentLabel: '🎛 Deep House Stabs',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 3, 7, 10, 14], suffix: 'm9', degreeRoman: 'i9' },
                { rootOffset: 5, chordIntervals: [0, 4, 7, 10, 14], suffix: '9', degreeRoman: 'IV9' },
                { rootOffset: 0, chordIntervals: [0, 3, 7, 10, 14], suffix: 'm9', degreeRoman: 'i9' },
                { rootOffset: 8, chordIntervals: [0, 4, 7, 11], suffix: 'maj7', degreeRoman: 'bVImaj7' }
            ],
            drums: {
                kick: [0, 4, 8, 12],
                snare: [4, 12],
                hihatOpen: [2, 6, 10, 14],
                hihatClosed: [0, 4, 8, 12]
            },
            bass: [
                { step: 2, degree: 'root', durationSteps: 2, velocity: 1.0 },
                { step: 6, degree: 'root', durationSteps: 2, velocity: 1.0 },
                { step: 10, degree: 'root', durationSteps: 2, velocity: 1.0 },
                { step: 14, degree: 'root', durationSteps: 2, velocity: 1.0 }
            ],
            chords: [
                { step: 0, durationSteps: 1.8, velocity: 0.95 },
                { step: 3, durationSteps: 1.8, velocity: 0.85 },
                { step: 6, durationSteps: 1.8, velocity: 0.9 },
                { step: 8, durationSteps: 1.8, velocity: 0.95 },
                { step: 11, durationSteps: 1.8, velocity: 0.85 },
                { step: 14, durationSteps: 1.8, velocity: 0.9 }
            ]
        },
        {
            id: 'tropical_house',
            name: 'Tropical House (Pluck Synth)',
            category: 'Hip Hop & Electronic',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 120,
            midiFile: '09_tropical_house_pluck_120bpm.mid',
            instrumentType: 'synth',
            bassType: 'electric_bass',
            instrumentLabel: '🌴 Tropical Pluck Synth',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'I' },
                { rootOffset: 7, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'V' },
                { rootOffset: 9, chordIntervals: [0, 3, 7], suffix: 'm', degreeRoman: 'vi' },
                { rootOffset: 5, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'IV' }
            ],
            drums: {
                kick: [0, 4, 8, 12],
                snare: [4, 12],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 4, velocity: 0.95 },
                { step: 6, degree: 'root', durationSteps: 2, velocity: 0.8 },
                { step: 8, degree: 'fifth', durationSteps: 4, velocity: 0.9 },
                { step: 12, degree: 'root', durationSteps: 3, velocity: 0.85 }
            ],
            chords: [
                { step: 0, durationSteps: 1.8, velocity: 0.9 },
                { step: 3, durationSteps: 1.8, velocity: 0.85 },
                { step: 6, durationSteps: 1.8, velocity: 0.85 },
                { step: 8, durationSteps: 1.8, velocity: 0.9 },
                { step: 10, durationSteps: 1.8, velocity: 0.8 },
                { step: 12, durationSteps: 1.8, velocity: 0.85 },
                { step: 14, durationSteps: 1.8, velocity: 0.8 }
            ]
        },

        // ==================== WORLD, FOLK & COUNTRY ====================
        {
            id: 'texas_shuffle',
            name: 'Texas Blues Shuffle',
            category: 'World, Folk & Country',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 3,
            stepsPerBar: 12,
            defaultBpm: 118,
            instrumentType: 'clean_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🎸 Texas Blues Strat',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'I7' },
                { rootOffset: 5, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'IV7' },
                { rootOffset: 0, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'I7' },
                { rootOffset: 7, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'V7' }
            ],
            drums: {
                kick: [0, 6],
                snare: [3, 9],
                hihatClosed: [0, 2, 3, 5, 6, 8, 9, 11]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 1, velocity: 0.9 },
                { step: 2, degree: 'third', durationSteps: 1, velocity: 0.8 },
                { step: 3, degree: 'fifth', durationSteps: 1, velocity: 0.85 },
                { step: 5, degree: 'fifth', durationSteps: 1, velocity: 0.8 },
                { step: 6, degree: 'root', durationSteps: 1, velocity: 0.9 },
                { step: 8, degree: 'third', durationSteps: 1, velocity: 0.8 },
                { step: 9, degree: 'fifth', durationSteps: 1, velocity: 0.85 },
                { step: 11, degree: 'seventh', durationSteps: 1, velocity: 0.8 }
            ],
            chords: [
                { step: 0, durationSteps: 1.8, velocity: 0.9 },
                { step: 3, durationSteps: 1.8, velocity: 0.85 },
                { step: 6, durationSteps: 1.8, velocity: 0.9 },
                { step: 9, durationSteps: 1.8, velocity: 0.85 }
            ]
        },
        {
            id: 'slow_blues_6_8',
            name: 'Slow Blues (6/8 Feel)',
            category: 'World, Folk & Country',
            timeSignature: '6/8',
            beatsPerBar: 2,
            stepsPerBeat: 6,
            stepsPerBar: 12,
            defaultBpm: 68,
            instrumentType: 'clean_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🎸 Blues Strat',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'I7' },
                { rootOffset: 5, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'IV7' },
                { rootOffset: 0, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'I7' },
                { rootOffset: 7, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'V7' }
            ],
            drums: {
                kick: [0, 8],
                snare: [6],
                hihatClosed: [0, 2, 4, 6, 8, 10]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 3, velocity: 0.9 },
                { step: 4, degree: 'third', durationSteps: 2, velocity: 0.8 },
                { step: 6, degree: 'fifth', durationSteps: 3, velocity: 0.85 },
                { step: 10, degree: 'seventh', durationSteps: 2, velocity: 0.8 }
            ],
            chords: [
                { step: 0, durationSteps: 4.8, velocity: 0.85 },
                { step: 6, durationSteps: 4.8, velocity: 0.85 }
            ]
        },
        {
            id: 'reggae_drop',
            name: 'Reggae One-Drop',
            category: 'World, Folk & Country',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 76,
            instrumentType: 'clean_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🎸 Reggae Skank',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'I' },
                { rootOffset: 9, chordIntervals: [0, 3, 7], suffix: 'm', degreeRoman: 'vi' },
                { rootOffset: 5, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'IV' },
                { rootOffset: 7, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'V' }
            ],
            drums: {
                kick: [8], // One drop on 3
                crossStick: [8],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14],
                snare: []
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 3, velocity: 0.95 },
                { step: 4, degree: 'root', durationSteps: 2, velocity: 0.85 },
                { step: 8, degree: 'fifth', durationSteps: 3, velocity: 0.9 },
                { step: 12, degree: 'octave', durationSteps: 3, velocity: 0.85 }
            ],
            chords: [
                // Reggae skank on the offbeats (steps 2, 6, 10, 14)
                { step: 2, durationSteps: 1, velocity: 0.9 },
                { step: 6, durationSteps: 1, velocity: 0.9 },
                { step: 10, durationSteps: 1, velocity: 0.9 },
                { step: 14, durationSteps: 1, velocity: 0.9 }
            ]
        },
        {
            id: 'country_train',
            name: 'Country / Bluegrass (2/4)',
            category: 'World, Folk & Country',
            timeSignature: '2/4',
            beatsPerBar: 2,
            stepsPerBeat: 4,
            stepsPerBar: 8,
            defaultBpm: 114,
            instrumentType: 'acoustic_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🪕 Acoustic & Bass',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'I' },
                { rootOffset: 5, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'IV' },
                { rootOffset: 0, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'I' },
                { rootOffset: 7, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'V7' }
            ],
            drums: {
                kick: [0, 4],
                snare: [2, 6],
                hihatClosed: [0, 1, 2, 3, 4, 5, 6, 7]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 3, velocity: 0.9 },
                { step: 4, degree: 'fifth', durationSteps: 3, velocity: 0.85 }
            ],
            chords: [
                { step: 2, durationSteps: 1, velocity: 0.85 },
                { step: 6, durationSteps: 1, velocity: 0.85 }
            ]
        },
        {
            id: 'flamenco_rumba',
            name: 'Spanish Flamenco Rumba',
            category: 'World, Folk & Country',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 110,
            instrumentType: 'acoustic_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🪕 Flamenco Nylon',
            progression: [
                { rootOffset: 0, chordIntervals: [0, 3, 7], suffix: 'm', degreeRoman: 'i' },
                { rootOffset: 10, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'bVII' },
                { rootOffset: 8, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'bVI' },
                { rootOffset: 7, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'V' }
            ],
            drums: {
                kick: [0, 6, 10],
                crossStick: [0, 3, 6, 8, 10, 14],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 5, velocity: 0.9 },
                { step: 6, degree: 'fifth', durationSteps: 3, velocity: 0.85 },
                { step: 10, degree: 'root', durationSteps: 3, velocity: 0.85 },
                { step: 14, degree: 'third', durationSteps: 2, velocity: 0.8 }
            ],
            chords: [
                { step: 0, durationSteps: 2, velocity: 0.9 },
                { step: 3, durationSteps: 2, velocity: 0.85 },
                { step: 6, durationSteps: 2, velocity: 0.9 },
                { step: 10, durationSteps: 2, velocity: 0.85 },
                { step: 14, durationSteps: 2, velocity: 0.85 }
            ]
        }
    ];

    static getPresetById(id) {
        return MidiBackingTrackModel.PRESETS.find(p => p.id === id) || MidiBackingTrackModel.PRESETS[0];
    }

    /**
     * Start the backing track lookahead sequencer.
     * @param {AudioEngineModel} audioModel
     * @param {Function} getContextFn returns { isEnabled, rootNoteIdx, musicalModeKey, stylePresetId, bpm, accidentalMode }
     * @param {Function} onChordUpdateFn callback receiving (chordSymbol, stepIndex)
     */
    start(audioModel, getContextFn, onChordUpdateFn) {
        this.stop();
        if (!audioModel || typeof getContextFn !== 'function') return;

        this.isPlaying = true;
        this.currentStep = 0;
        this.lastReportedChord = null;

        const initialCtx = getContextFn();
        const preset = MidiBackingTrackModel.getPresetById(initialCtx.stylePresetId);
        const bpm = Math.max(40, Math.min(220, initialCtx.bpm || preset.defaultBpm));

        this.nextStepTime = audioModel.getCurrentTime() + 0.05;

        this.timerId = setInterval(() => {
            if (!this.isPlaying) return;
            this._scheduleLookahead(audioModel, getContextFn, onChordUpdateFn);
        }, 25);
    }

    stop() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        this.isPlaying = false;
        this.currentStep = 0;
        this.lastReportedChord = null;
    }

    _scheduleLookahead(audioModel, getContextFn, onChordUpdateFn) {
        const currentTime = audioModel.getCurrentTime();

        while (this.nextStepTime < currentTime + 0.10) {
            const context = getContextFn();
            if (!context || !context.isEnabled) {
                this.stop();
                return;
            }

            const preset = MidiBackingTrackModel.getPresetById(context.stylePresetId);
            const bpm = Math.max(40, Math.min(220, context.bpm || preset.defaultBpm));
            const stepDurationSec = 60 / (bpm * preset.stepsPerBeat);

            const stepsPerBar = preset.stepsPerBar;
            const barIndex = Math.floor(this.currentStep / stepsPerBar);
            const slotIndex = barIndex % 4;
            const barStep = this.currentStep % stepsPerBar;

            const Theory = window.GuitarApp.Models.MusicTheoryModel;
            const modeData = (Theory && Theory.MUSICAL_MODES[context.musicalModeKey]) || (Theory && Theory.MUSICAL_MODES.ionian);
            const chordSlot = (preset.progression && preset.progression[slotIndex])
                ? preset.progression[slotIndex]
                : (modeData && modeData.vampChords ? modeData.vampChords[slotIndex] : null);

            // Notify chord update on chord boundary
            if (barStep === 0 && chordSlot && typeof onChordUpdateFn === 'function') {
                const chordSymbol = Theory.formatChordSymbol(context.rootNoteIdx, chordSlot, context.accidentalMode);
                if (chordSymbol !== this.lastReportedChord) {
                    this.lastReportedChord = chordSymbol;
                    onChordUpdateFn(chordSymbol, this.currentStep);
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
                        while (bassBaseMidi > 43) bassBaseMidi -= 12; // Keep in low punchy E1..G2 register
                        while (bassBaseMidi < 28) bassBaseMidi += 12;

                        let degreeOffset = 0;
                        if (bassEvt.degree === 'third') {
                            degreeOffset = (chordSlot.chordIntervals && chordSlot.chordIntervals[1]) !== undefined
                                ? chordSlot.chordIntervals[1]
                                : (chordSlot.thirdOffset !== undefined ? chordSlot.thirdOffset : 4);
                        } else if (bassEvt.degree === 'fifth') {
                            degreeOffset = (chordSlot.chordIntervals && chordSlot.chordIntervals[2]) !== undefined
                                ? chordSlot.chordIntervals[2]
                                : (chordSlot.fifthOffset !== undefined ? chordSlot.fifthOffset : 7);
                        } else if (bassEvt.degree === 'seventh') {
                            degreeOffset = (chordSlot.chordIntervals && chordSlot.chordIntervals[3]) !== undefined
                                ? chordSlot.chordIntervals[3]
                                : (chordSlot.seventhOffset !== undefined ? chordSlot.seventhOffset : 10);
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

                // 3. CHORDS
                if (preset.chords) {
                    const chordEvt = preset.chords.find(c => c.step === barStep && (c.bar === undefined || c.bar === slotIndex));
                    if (chordEvt) {
                        const isGuitar = preset.instrumentType === 'distorted_guitar' ||
                                         preset.instrumentType === 'clean_guitar' ||
                                         preset.instrumentType === 'acoustic_guitar' ||
                                         preset.instrumentType === 'jazz_guitar';

                        // Set authentic register: Electric guitars sit in 48 (C3)..62 (D4)
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
            this.currentStep = (this.currentStep + 1) % (stepsPerBar * 4); // Loop across 4 chord slots
        }
    }

    /**
     * Trigger browser download of the standard MIDI file (.mid) matching the current preset and key.
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
