/**
 * ==========================================================================
 * MODEL LAYER: MidiBackingTrackModel
 * Encapsulates 14 authentic studio backing tracks derived directly from
 * inspected .mp3 master audio tracks (Blues Shuffle A7, Neo-Soul A Dorian,
 * Dark Ambient Fusion A Locrian, Open Life A Mixolydian, Bossa Nova 2516 C Major,
 * Latin Funk D Dorian, Dark Sad Blues Rock A Minor, Dark Metal E Phrygian,
 * Melodic Rock Ballad B Minor, Alien Modern Fusion F# Locrian, Jazz 2-5-1 Swing C Major,
 * 12 Bar Minor Blues A Minor, Acoustic Rock Pop G Major 70 BPM, and Steve Vai E Lydian).
 * 
 * Supports real-time section tracking (Intro, Verse, Chorus, Solo, Outro),
 * live chord & degree reporting, Web Audio lookahead sequencer engine,
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
        this.lastReportedSection = null;
    }

    /**
     * 14 Authentic Studio Backing Track Presets
     */
    static PRESETS = [
        // ==================== BLUES & SHUFFLE ====================
        {
            id: 'blues_12bar_a7',
            name: '12 Bar Blues Shuffle (A7)',
            category: 'Blues & Shuffle',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 116,
            defaultRootIdx: 9, // A
            defaultRootName: 'A',
            midiFile: '01_blues_12bar_a7_116bpm.mid',
            instrumentType: 'overdriven_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🎸 Overdriven Blues Guitar & Organ',
            scaleRecommendation: 'A Minor / Major Blues, A Mixolydian',
            cycleBars: 12,
            sections: [
                { name: 'Count-in / Intro', bars: 4 },
                { name: 'Verse 1 (Head)', bars: 12 },
                { name: 'Verse 2', bars: 12 },
                { name: 'Guitar Solo 1', bars: 12 },
                { name: 'Guitar Solo 2', bars: 12 },
                { name: 'Turnaround Outro', bars: 4 }
            ],
            progression: [
                { bar: 1, rootOffset: 0, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'I7' },
                { bar: 2, rootOffset: 5, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'IV7' },
                { bar: 3, rootOffset: 0, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'I7' },
                { bar: 4, rootOffset: 0, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'I7' },
                { bar: 5, rootOffset: 5, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'IV7' },
                { bar: 6, rootOffset: 5, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'IV7' },
                { bar: 7, rootOffset: 0, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'I7' },
                { bar: 8, rootOffset: 0, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'I7' },
                { bar: 9, rootOffset: 7, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'V7' },
                { bar: 10, rootOffset: 5, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'IV7' },
                { bar: 11, rootOffset: 0, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'I7' },
                { bar: 12, rootOffset: 7, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'V7 (Turnaround)' }
            ],
            drums: {
                crash: [0],
                kick: [0, 8, 14],
                snare: [4, 12],
                ride: [0, 3, 4, 7, 8, 11, 12, 15]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 1.8, velocity: 0.95 },
                { step: 2, degree: 'third', durationSteps: 1.8, velocity: 0.85 },
                { step: 4, degree: 'fifth', durationSteps: 1.8, velocity: 0.9 },
                { step: 6, degree: 'sixth', durationSteps: 1.8, velocity: 0.85 },
                { step: 8, degree: 'seventh', durationSteps: 1.8, velocity: 0.95 },
                { step: 10, degree: 'sixth', durationSteps: 1.8, velocity: 0.85 },
                { step: 12, degree: 'fifth', durationSteps: 1.8, velocity: 0.9 },
                { step: 14, degree: 'third', durationSteps: 1.8, velocity: 0.85 }
            ],
            chords: [
                { step: 4, durationSteps: 1.5, velocity: 0.9 },
                { step: 7, durationSteps: 1.0, velocity: 0.75 },
                { step: 12, durationSteps: 1.5, velocity: 0.95 },
                { step: 15, durationSteps: 1.0, velocity: 0.75 }
            ]
        },
        {
            id: 'minor_blues_12bar_am',
            name: '12 Bar Minor Blues (A Minor)',
            category: 'Blues & Shuffle',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 58,
            defaultRootIdx: 9, // A
            defaultRootName: 'A',
            midiFile: '12_minor_blues_12bar_am_58bpm.mid',
            instrumentType: 'overdriven_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🎸 Slow Minor Blues Guitar & Rhodes',
            scaleRecommendation: 'A Minor Pentatonic, A Blues, A Dorian',
            cycleBars: 12,
            sections: [
                { name: 'Intro Slow Blues', bars: 4 },
                { name: 'Verse 1 (Minor Head)', bars: 12 },
                { name: 'Verse 2', bars: 12 },
                { name: 'Slow Blues Solo 1', bars: 12 },
                { name: 'Slow Blues Solo 2', bars: 12 },
                { name: 'Cadence Outro', bars: 4 }
            ],
            progression: [
                { bar: 1, rootOffset: 0, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'i7' },
                { bar: 2, rootOffset: 5, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'iv7' },
                { bar: 3, rootOffset: 0, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'i7' },
                { bar: 4, rootOffset: 0, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'i7' },
                { bar: 5, rootOffset: 5, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'iv7' },
                { bar: 6, rootOffset: 5, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'iv7' },
                { bar: 7, rootOffset: 0, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'i7' },
                { bar: 8, rootOffset: 0, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'i7' },
                { bar: 9, rootOffset: 8, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'bVI7' },
                { bar: 10, rootOffset: 7, chordIntervals: [0, 4, 7, 10, 15], suffix: '7(#9)', degreeRoman: 'V7(#9)' },
                { bar: 11, rootOffset: 0, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'i7' },
                { bar: 12, rootOffset: 7, chordIntervals: [0, 4, 8, 10, 13], suffix: '7alt', degreeRoman: 'V7alt' }
            ],
            drums: {
                crash: [0],
                kick: [0, 6, 10],
                snare: [4, 12],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 3, velocity: 0.95 },
                { step: 4, degree: 'third', durationSteps: 3, velocity: 0.85 },
                { step: 8, degree: 'fifth', durationSteps: 3, velocity: 0.9 },
                { step: 12, degree: 'seventh', durationSteps: 3, velocity: 0.85 }
            ],
            chords: [
                { step: 4, durationSteps: 2.0, velocity: 0.9 },
                { step: 12, durationSteps: 3.0, velocity: 0.95 }
            ]
        },

        // ==================== JAZZ & SWING ====================
        {
            id: 'jazz_251_c',
            name: 'Jazz 2-5-1 Swing (C Major)',
            category: 'Jazz & Swing',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 122,
            defaultRootIdx: 0, // C
            defaultRootName: 'C',
            midiFile: '11_jazz_251_c_122bpm.mid',
            instrumentType: 'jazz_guitar',
            bassType: 'upright_bass',
            instrumentLabel: '🎸 Hollowbody Jazz Guitar & Walking Bass',
            scaleRecommendation: 'C Major, D Dorian, G Mixolydian Bebop',
            cycleBars: 8,
            sections: [
                { name: 'Count-in / Intro', bars: 4 },
                { name: 'Head / A1 (2-5-1)', bars: 8 },
                { name: 'A2 (Extended Voicings)', bars: 8 },
                { name: 'Solo Flight 1', bars: 16 },
                { name: 'Solo Flight 2', bars: 16 },
                { name: 'Turnaround Outro', bars: 4 }
            ],
            progression: [
                { bar: 1, rootOffset: 2, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'ii7' },
                { bar: 2, rootOffset: 2, chordIntervals: [0, 3, 7, 10, 14], suffix: 'm9', degreeRoman: 'ii9' },
                { bar: 3, rootOffset: 7, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'V7' },
                { bar: 4, rootOffset: 7, chordIntervals: [0, 4, 7, 10, 13], suffix: '7(b9)', degreeRoman: 'V7(b9)' },
                { bar: 5, rootOffset: 0, chordIntervals: [0, 4, 7, 11], suffix: 'maj7', degreeRoman: 'Imaj7' },
                { bar: 6, rootOffset: 0, chordIntervals: [0, 4, 7, 11, 14], suffix: 'maj9', degreeRoman: 'Imaj9' },
                { bar: 7, rootOffset: 9, chordIntervals: [0, 4, 7, 10, 15], suffix: '7(#9)', degreeRoman: 'VI7(#9)' },
                { bar: 8, rootOffset: 9, chordIntervals: [0, 4, 8, 10, 13], suffix: '7alt', degreeRoman: 'VI7alt' }
            ],
            drums: {
                crash: [0],
                kick: [0, 4, 8, 12], // soft feathered kick
                hihatClosed: [4, 12], // pedal chic on 2 & 4
                ride: [0, 4, 7, 8, 12, 15] // swung ride "spank-a-lang"
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 3.5, velocity: 0.9 },
                { step: 4, degree: 'third', durationSteps: 3.5, velocity: 0.85 },
                { step: 8, degree: 'fifth', durationSteps: 3.5, velocity: 0.9 },
                { step: 12, degree: 'seventh', durationSteps: 3.5, velocity: 0.85 }
            ],
            chords: [
                { step: 0, durationSteps: 2.5, velocity: 0.85 }, // Charleston comping
                { step: 6, durationSteps: 3.5, velocity: 0.9 }
            ]
        },

        // ==================== ACOUSTIC & LATIN ====================
        {
            id: 'bossa_nova_2516_c',
            name: 'Bossa Nova 2-5-1-6 (C Major)',
            category: 'Acoustic & Latin',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 128,
            defaultRootIdx: 0, // C
            defaultRootName: 'C',
            midiFile: '05_bossa_nova_2516_c_128bpm.mid',
            instrumentType: 'acoustic_guitar',
            bassType: 'acoustic_bass',
            instrumentLabel: '🎸 Nylon Acoustic Guitar & Brazilian Clave',
            scaleRecommendation: 'C Major, D Dorian, G Mixolydian',
            cycleBars: 4,
            sections: [
                { name: 'Intro Clave', bars: 4 },
                { name: 'Part A (2-5-1-6 Theme)', bars: 8 },
                { name: 'Part B (Modulated Swing)', bars: 8 },
                { name: 'Solo Flight', bars: 16 },
                { name: 'Outro Coda', bars: 4 }
            ],
            progression: [
                { bar: 1, rootOffset: 2, chordIntervals: [0, 3, 7, 10, 14], suffix: 'm9', degreeRoman: 'ii9' },
                { bar: 2, rootOffset: 7, chordIntervals: [0, 4, 7, 10, 14, 21], suffix: '13', degreeRoman: 'V13' },
                { bar: 3, rootOffset: 0, chordIntervals: [0, 4, 7, 11, 14], suffix: 'maj9', degreeRoman: 'Imaj9' },
                { bar: 4, rootOffset: 9, chordIntervals: [0, 4, 7, 10, 14, 20], suffix: '7(b13)', degreeRoman: 'VI7(b13)' }
            ],
            drums: {
                crash: [0],
                kick: [0, 8],
                crossStick: [0, 3, 6, 10, 12], // Brazilian Clave
                hihatClosed: [4, 12]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 3.5, velocity: 0.9 },
                { step: 8, degree: 'fifth', durationSteps: 3.5, velocity: 0.85 }
            ],
            chords: [
                { step: 0, durationSteps: 1.8, velocity: 0.85 },
                { step: 3, durationSteps: 1.8, velocity: 0.9 },
                { step: 6, durationSteps: 1.8, velocity: 0.85 },
                { step: 10, durationSteps: 1.8, velocity: 0.9 },
                { step: 12, durationSteps: 1.8, velocity: 0.9 }
            ]
        },

        // ==================== R&B, SOUL & FUNK ====================
        {
            id: 'dorian_smooth_a',
            name: 'Smooth Neo-Soul (A Dorian)',
            category: 'R&B, Soul & Funk',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 95,
            defaultRootIdx: 9, // A
            defaultRootName: 'A',
            midiFile: '02_dorian_smooth_a_95bpm.mid',
            instrumentType: 'clean_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🎸 Strat Clean Neck & Suitcase Rhodes',
            scaleRecommendation: 'A Dorian, G Major Pentatonic',
            cycleBars: 4,
            sections: [
                { name: 'Intro Ambient', bars: 4 },
                { name: 'Theme A (Verse)', bars: 8 },
                { name: 'Groove Pocket (Chorus)', bars: 8 },
                { name: 'Solo Section', bars: 16 },
                { name: 'Outro Vamp', bars: 4 }
            ],
            progression: [
                { bar: 1, rootOffset: 0, chordIntervals: [0, 3, 7, 10, 14], suffix: 'm9', degreeRoman: 'i9' },
                { bar: 2, rootOffset: 5, chordIntervals: [0, 4, 7, 10, 14], suffix: '9', degreeRoman: 'IV9' },
                { bar: 3, rootOffset: 0, chordIntervals: [0, 3, 7, 10, 14], suffix: 'm9', degreeRoman: 'i9' },
                { bar: 4, rootOffset: 2, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'ii7' }
            ],
            drums: {
                crash: [0],
                kick: [0, 6, 10],
                snare: [4, 12],
                ghostSnare: [9, 14],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 3, velocity: 0.95 },
                { step: 6, degree: 'fifth', durationSteps: 2, velocity: 0.85 },
                { step: 10, degree: 'root', durationSteps: 3, velocity: 0.9 },
                { step: 14, degree: 'octave', durationSteps: 2, velocity: 0.8 }
            ],
            chords: [
                { step: 2, durationSteps: 3.0, velocity: 0.85 },
                { step: 10, durationSteps: 2.0, velocity: 0.75 },
                { step: 13, durationSteps: 3.0, velocity: 0.8 }
            ]
        },
        {
            id: 'dorian_funk_d',
            name: 'Latin Funk Groove (D Dorian)',
            category: 'R&B, Soul & Funk',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 115,
            defaultRootIdx: 2, // D
            defaultRootName: 'D',
            midiFile: '06_dorian_funk_d_115bpm.mid',
            instrumentType: 'clean_guitar',
            bassType: 'slap_bass',
            instrumentLabel: '🎸 Clean Funk Stabs & Slap Bass',
            scaleRecommendation: 'D Dorian, C Major Pentatonic, D Minor Pentatonic',
            cycleBars: 4,
            sections: [
                { name: 'Intro Percussion', bars: 4 },
                { name: 'Verse (Latin Funk)', bars: 8 },
                { name: 'Chorus (Organ Surge)', bars: 8 },
                { name: 'Solo Vamp', bars: 16 },
                { name: 'Outro Groove', bars: 4 }
            ],
            progression: [
                { bar: 1, rootOffset: 2, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'i7' },
                { bar: 2, rootOffset: 7, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'IV7' },
                { bar: 3, rootOffset: 2, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'i7' },
                { bar: 4, rootOffset: 4, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'ii7' }
            ],
            drums: {
                crash: [0],
                kick: [0, 3, 6, 10],
                snare: [4, 12],
                ghostSnare: [7, 15],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 1, velocity: 1.0 },
                { step: 3, degree: 'octave', durationSteps: 1, velocity: 0.95 },
                { step: 6, degree: 'root', durationSteps: 1, velocity: 0.95 },
                { step: 10, degree: 'seventh', durationSteps: 1, velocity: 0.9 },
                { step: 12, degree: 'octave', durationSteps: 1, velocity: 1.0 }
            ],
            chords: [
                { step: 2, durationSteps: 1.0, velocity: 0.85 },
                { step: 5, durationSteps: 1.0, velocity: 0.85 },
                { step: 8, durationSteps: 1.0, velocity: 0.85 },
                { step: 11, durationSteps: 1.0, velocity: 0.85 },
                { step: 14, durationSteps: 1.0, velocity: 0.85 }
            ]
        },

        // ==================== ROCK & METAL ====================
        {
            id: 'phrygian_metal_e',
            name: 'Dark Metal Gallop (E Phrygian)',
            category: 'Rock & Metal',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 120,
            defaultRootIdx: 4, // E
            defaultRootName: 'E',
            midiFile: '08_phrygian_metal_e_120bpm.mid',
            instrumentType: 'distorted_guitar',
            bassType: 'distorted_bass',
            instrumentLabel: '⚡ Heavy Distortion Metal Guitar',
            scaleRecommendation: 'E Phrygian, C Major, E Minor Pentatonic',
            cycleBars: 4,
            sections: [
                { name: 'Intro Riff Assault', bars: 4 },
                { name: 'Verse (Palm-Muted Gallop)', bars: 8 },
                { name: 'Chorus (Phrygian Stabs)', bars: 8 },
                { name: 'Lead Solo Shred', bars: 16 },
                { name: 'Outro Chugs', bars: 4 }
            ],
            progression: [
                { bar: 1, rootOffset: 4, chordIntervals: [0, 7, 12], suffix: '5', degreeRoman: 'i5' },
                { bar: 2, rootOffset: 5, chordIntervals: [0, 7, 12], suffix: '5', degreeRoman: 'bII5' },
                { bar: 3, rootOffset: 7, chordIntervals: [0, 7, 12], suffix: '5', degreeRoman: 'bIII5' },
                { bar: 4, rootOffset: 5, chordIntervals: [0, 7, 12], suffix: '5', degreeRoman: 'bII5' }
            ],
            drums: {
                crash: [0],
                kick: [0, 1, 2, 4, 6, 7, 8, 9, 10, 12, 14, 15],
                snare: [4, 12],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 1, velocity: 0.95 },
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
                { step: 0, durationSteps: 0.8, velocity: 0.85 },
                { step: 1, durationSteps: 0.8, velocity: 0.85 },
                { step: 2, durationSteps: 0.8, velocity: 0.85 },
                { step: 3, durationSteps: 0.8, velocity: 0.85 },
                { step: 4, durationSteps: 0.8, velocity: 0.85 },
                { step: 5, durationSteps: 0.8, velocity: 0.85 },
                { step: 6, durationSteps: 0.8, velocity: 0.85 },
                { step: 7, durationSteps: 0.8, velocity: 0.85 },
                { step: 8, durationSteps: 0.8, velocity: 0.85 },
                { step: 9, durationSteps: 0.8, velocity: 0.85 },
                { step: 10, durationSteps: 0.8, velocity: 0.85 },
                { step: 11, durationSteps: 0.8, velocity: 0.85 },
                { step: 12, durationSteps: 1.8, velocity: 1.0 },
                { step: 14, durationSteps: 1.8, velocity: 1.0 }
            ]
        },
        {
            id: 'vai_lydian_e',
            name: 'Steve Vai Virtuoso Rock (E Lydian)',
            category: 'Rock & Metal',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 130,
            defaultRootIdx: 4, // E
            defaultRootName: 'E',
            midiFile: '14_vai_lydian_e_130bpm.mid',
            instrumentType: 'clean_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🎸 Strat Clean Rhythm & E Pedal Drive',
            scaleRecommendation: 'E Lydian, B Major, E Major Pentatonic',
            cycleBars: 4,
            sections: [
                { name: 'Intro Ambient Float', bars: 4 },
                { name: 'Verse (Lydian Mystery)', bars: 8 },
                { name: 'Chorus (Modulation)', bars: 8 },
                { name: 'Virtuoso Solo Flight', bars: 16 },
                { name: 'Outro E Pedal', bars: 4 }
            ],
            progression: [
                { bar: 1, rootOffset: 4, chordIntervals: [0, 4, 7, 11, 18], suffix: 'maj7(#11)', degreeRoman: 'Imaj7(#11)' },
                { bar: 2, rootOffset: 6, chordIntervals: [0, 4, 7], suffix: '/E', degreeRoman: 'II/I' },
                { bar: 3, rootOffset: 4, chordIntervals: [0, 4, 7, 11], suffix: 'maj7', degreeRoman: 'Imaj7' },
                { bar: 4, rootOffset: 6, chordIntervals: [0, 4, 7], suffix: '/E', degreeRoman: 'II/I' }
            ],
            drums: {
                crash: [0],
                kick: [0, 3, 8, 10],
                snare: [4, 12],
                hihatClosed: [0, 2, 4, 8, 10, 12],
                hihatOpen: [6, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 1.8, velocity: 0.95 },
                { step: 2, degree: 'root', durationSteps: 1.8, velocity: 0.85 },
                { step: 4, degree: 'root', durationSteps: 1.8, velocity: 0.9 },
                { step: 6, degree: 'root', durationSteps: 1.8, velocity: 0.85 },
                { step: 8, degree: 'root', durationSteps: 1.8, velocity: 0.95 },
                { step: 10, degree: 'root', durationSteps: 1.8, velocity: 0.85 },
                { step: 12, degree: 'root', durationSteps: 1.8, velocity: 0.9 },
                { step: 14, degree: 'root', durationSteps: 1.8, velocity: 0.85 }
            ],
            chords: [
                { step: 0, durationSteps: 2.2, velocity: 0.85 },
                { step: 3, durationSteps: 2.2, velocity: 0.8 },
                { step: 6, durationSteps: 2.2, velocity: 0.85 },
                { step: 8, durationSteps: 2.2, velocity: 0.9 },
                { step: 11, durationSteps: 2.2, velocity: 0.85 },
                { step: 14, durationSteps: 2.2, velocity: 0.85 }
            ]
        },

        // ==================== ROCK & POP ====================
        {
            id: 'mixolydian_open_life_a',
            name: 'Open Life Jam (A Mixolydian)',
            category: 'Rock & Pop',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 120,
            defaultRootIdx: 9, // A
            defaultRootName: 'A',
            midiFile: '04_mixolydian_open_life_a_120bpm.mid',
            instrumentType: 'overdriven_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🎸 Crunch Electric Guitar & Grand Piano',
            scaleRecommendation: 'A Mixolydian, D Major, A Major Pentatonic',
            cycleBars: 4,
            sections: [
                { name: 'Intro Riff', bars: 4 },
                { name: 'Verse (Driving)', bars: 8 },
                { name: 'Chorus (Open Life)', bars: 8 },
                { name: 'Extended Solo', bars: 16 },
                { name: 'Outro Jam', bars: 8 }
            ],
            progression: [
                { bar: 1, rootOffset: 0, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'I' },
                { bar: 2, rootOffset: 10, chordIntervals: [0, 4, 7], suffix: '/A', degreeRoman: 'bVII' },
                { bar: 3, rootOffset: 5, chordIntervals: [0, 4, 7], suffix: '/A', degreeRoman: 'IV' },
                { bar: 4, rootOffset: 0, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'I' }
            ],
            drums: {
                crash: [0],
                kick: [0, 6, 10],
                snare: [4, 12],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 1.8, velocity: 0.95 },
                { step: 2, degree: 'root', durationSteps: 1.8, velocity: 0.85 },
                { step: 4, degree: 'root', durationSteps: 1.8, velocity: 0.9 },
                { step: 6, degree: 'root', durationSteps: 1.8, velocity: 0.85 },
                { step: 8, degree: 'root', durationSteps: 1.8, velocity: 0.95 },
                { step: 10, degree: 'root', durationSteps: 1.8, velocity: 0.85 },
                { step: 12, degree: 'root', durationSteps: 1.8, velocity: 0.9 },
                { step: 14, degree: 'root', durationSteps: 1.8, velocity: 0.85 }
            ],
            chords: [
                { step: 0, durationSteps: 2.5, velocity: 0.9 },
                { step: 3, durationSteps: 2.5, velocity: 0.85 },
                { step: 6, durationSteps: 1.8, velocity: 0.85 },
                { step: 8, durationSteps: 2.5, velocity: 0.9 },
                { step: 11, durationSteps: 2.5, velocity: 0.85 },
                { step: 14, durationSteps: 1.8, velocity: 0.85 }
            ]
        },
        {
            id: 'dark_sad_blues_rock_am',
            name: 'Dark Sad Blues Rock Ballad (A Minor)',
            category: 'Rock & Pop',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 64,
            defaultRootIdx: 9, // A
            defaultRootName: 'A',
            midiFile: '07_dark_sad_blues_rock_am_64bpm.mid',
            instrumentType: 'clean_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🎸 Clean Chorus Arpeggio & Hammond Organ',
            scaleRecommendation: 'A Natural Minor, A Blues, C Major Pentatonic',
            cycleBars: 8,
            sections: [
                { name: 'Intro Arpeggio', bars: 4 },
                { name: 'Verse (Melancholy)', bars: 8 },
                { name: 'Chorus (Epic Rise)', bars: 8 },
                { name: 'Crying Solo', bars: 16 },
                { name: 'Outro Fade', bars: 4 }
            ],
            progression: [
                { bar: 1, rootOffset: 0, chordIntervals: [0, 3, 7, 12], suffix: 'm', degreeRoman: 'i' },
                { bar: 2, rootOffset: 8, chordIntervals: [0, 4, 7, 12], suffix: '', degreeRoman: 'bVI' },
                { bar: 3, rootOffset: 3, chordIntervals: [0, 4, 7, 12], suffix: '', degreeRoman: 'bIII' },
                { bar: 4, rootOffset: 10, chordIntervals: [0, 4, 7, 12], suffix: '', degreeRoman: 'bVII' },
                { bar: 5, rootOffset: 5, chordIntervals: [0, 3, 7, 12], suffix: 'm', degreeRoman: 'iv' },
                { bar: 6, rootOffset: 0, chordIntervals: [0, 3, 7, 12], suffix: 'm', degreeRoman: 'i' },
                { bar: 7, rootOffset: 8, chordIntervals: [0, 4, 7, 12], suffix: '', degreeRoman: 'bVI' },
                { bar: 8, rootOffset: 7, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'V7' }
            ],
            drums: {
                crash: [0],
                kick: [0, 8, 10],
                snare: [4, 12],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 6, velocity: 0.95 },
                { step: 8, degree: 'root', durationSteps: 6, velocity: 0.9 }
            ],
            chords: [
                { step: 0, durationSteps: 1.8, velocity: 0.85 },
                { step: 2, durationSteps: 1.8, velocity: 0.8 },
                { step: 4, durationSteps: 1.8, velocity: 0.85 },
                { step: 6, durationSteps: 1.8, velocity: 0.8 },
                { step: 8, durationSteps: 1.8, velocity: 0.85 },
                { step: 10, durationSteps: 1.8, velocity: 0.8 },
                { step: 12, durationSteps: 1.8, velocity: 0.85 },
                { step: 14, durationSteps: 1.8, velocity: 0.8 }
            ]
        },
        {
            id: 'emotional_rock_ballad_bm',
            name: 'Emotional Melodic Rock Ballad (B Minor)',
            category: 'Rock & Pop',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 63,
            defaultRootIdx: 11, // B
            defaultRootName: 'B',
            midiFile: '09_emotional_rock_ballad_bm_63bpm.mid',
            instrumentType: 'clean_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🎸 Strat Clean Arpeggios & Grand Piano',
            scaleRecommendation: 'B Natural Minor, B Minor Pentatonic, D Major',
            cycleBars: 4,
            sections: [
                { name: 'Intro Piano & Guitar', bars: 4 },
                { name: 'Verse (Intimate)', bars: 8 },
                { name: 'Chorus (Power Anthem)', bars: 8 },
                { name: 'Heroic Solo', bars: 16 },
                { name: 'Outro Cadence', bars: 4 }
            ],
            progression: [
                { bar: 1, rootOffset: 11, chordIntervals: [0, 3, 7, 12], suffix: 'm', degreeRoman: 'i' },
                { bar: 2, rootOffset: 7, chordIntervals: [0, 4, 7, 12], suffix: '', degreeRoman: 'bVI' },
                { bar: 3, rootOffset: 2, chordIntervals: [0, 4, 7, 12], suffix: '', degreeRoman: 'bIII' },
                { bar: 4, rootOffset: 9, chordIntervals: [0, 4, 7, 12], suffix: '', degreeRoman: 'bVII' }
            ],
            drums: {
                crash: [0],
                kick: [0, 8, 10],
                snare: [4, 12],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 6, velocity: 0.95 },
                { step: 8, degree: 'root', durationSteps: 6, velocity: 0.9 }
            ],
            chords: [
                { step: 0, durationSteps: 1.8, velocity: 0.8 },
                { step: 2, durationSteps: 1.8, velocity: 0.8 },
                { step: 4, durationSteps: 1.8, velocity: 0.85 },
                { step: 6, durationSteps: 1.8, velocity: 0.8 },
                { step: 8, durationSteps: 1.8, velocity: 0.85 },
                { step: 10, durationSteps: 1.8, velocity: 0.8 },
                { step: 12, durationSteps: 1.8, velocity: 0.85 },
                { step: 14, durationSteps: 1.8, velocity: 0.8 }
            ]
        },
        {
            id: 'rock_pop_g_70bpm',
            name: 'Acoustic Rock Pop 70 BPM (G Major)',
            category: 'Rock & Pop',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 70,
            defaultRootIdx: 7, // G
            defaultRootName: 'G',
            midiFile: '13_rock_pop_g_70bpm.mid',
            instrumentType: 'acoustic_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🎸 Steel String Acoustic & Warm Bass',
            scaleRecommendation: 'G Major, G Major Pentatonic, E Minor',
            cycleBars: 4,
            sections: [
                { name: 'Intro Acoustic', bars: 4 },
                { name: 'Verse (G - D - Em - C)', bars: 8 },
                { name: 'Chorus (Em - C - G - D)', bars: 8 },
                { name: 'Guitar Solo', bars: 16 },
                { name: 'Outro Fading Strums', bars: 4 }
            ],
            progression: [
                { bar: 1, rootOffset: 7, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'I' },
                { bar: 2, rootOffset: 2, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'V' },
                { bar: 3, rootOffset: 4, chordIntervals: [0, 3, 7], suffix: 'm', degreeRoman: 'vi' },
                { bar: 4, rootOffset: 0, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'IV' }
            ],
            drums: {
                crash: [0],
                kick: [0, 8, 10],
                crossStick: [4, 12],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 5, velocity: 0.95 },
                { step: 8, degree: 'root', durationSteps: 5, velocity: 0.9 }
            ],
            chords: [
                { step: 0, durationSteps: 1.8, velocity: 0.9 },
                { step: 2, durationSteps: 1.8, velocity: 0.7 },
                { step: 4, durationSteps: 1.8, velocity: 0.9 },
                { step: 6, durationSteps: 1.8, velocity: 0.7 },
                { step: 8, durationSteps: 1.8, velocity: 0.9 },
                { step: 10, durationSteps: 1.8, velocity: 0.7 },
                { step: 12, durationSteps: 1.8, velocity: 0.9 },
                { step: 14, durationSteps: 1.8, velocity: 0.7 }
            ]
        },

        // ==================== MODAL & FUSION ====================
        {
            id: 'locrian_jam_a',
            name: 'Dark Ambient Fusion (A Locrian)',
            category: 'Modal & Fusion',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 68,
            defaultRootIdx: 9, // A
            defaultRootName: 'A',
            midiFile: '03_locrian_jam_a_68bpm.mid',
            instrumentType: 'clean_guitar',
            bassType: 'synth_bass',
            instrumentLabel: '🎸 Ambient Clean Guitar & Synth Pad',
            scaleRecommendation: 'A Locrian, Bb Major, G Minor',
            cycleBars: 4,
            sections: [
                { name: 'Intro Drone', bars: 4 },
                { name: 'Verse (Dark Vamp)', bars: 8 },
                { name: 'Chorus (Locrian Tension)', bars: 8 },
                { name: 'Solo Improvisation', bars: 16 },
                { name: 'Outro Fade', bars: 4 }
            ],
            progression: [
                { bar: 1, rootOffset: 0, chordIntervals: [0, 3, 6, 10], suffix: 'm7b5', degreeRoman: 'iø' },
                { bar: 2, rootOffset: 1, chordIntervals: [0, 4, 7, 11], suffix: 'maj7', degreeRoman: 'bIImaj7' },
                { bar: 3, rootOffset: 10, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'vii7' },
                { bar: 4, rootOffset: 0, chordIntervals: [0, 3, 6, 10], suffix: 'm7b5', degreeRoman: 'iø' }
            ],
            drums: {
                crash: [0],
                kick: [0, 8],
                snare: [4, 12],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 6, velocity: 0.95 },
                { step: 8, degree: 'fifth', durationSteps: 6, velocity: 0.9 }
            ],
            chords: [
                { step: 0, durationSteps: 3.0, velocity: 0.8 },
                { step: 3, durationSteps: 3.0, velocity: 0.8 },
                { step: 6, durationSteps: 3.0, velocity: 0.8 },
                { step: 9, durationSteps: 3.0, velocity: 0.8 },
                { step: 12, durationSteps: 3.0, velocity: 0.8 }
            ]
        },
        {
            id: 'locrian_dark_fs',
            name: 'Alien Modern Fusion (F# Locrian)',
            category: 'Modal & Fusion',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 122,
            defaultRootIdx: 6, // F#
            defaultRootName: 'F#',
            midiFile: '10_locrian_dark_fs_122bpm.mid',
            instrumentType: 'jazz_guitar',
            bassType: 'fretless_bass',
            instrumentLabel: '🎸 Clean Jazz Guitar & Fretless Bass',
            scaleRecommendation: 'F# Locrian, G Major, E Minor Pentatonic',
            cycleBars: 4,
            sections: [
                { name: 'Intro Ambient Pulse', bars: 4 },
                { name: 'Theme A (Locrian Vamp)', bars: 8 },
                { name: 'Theme B (Resolution Pushes)', bars: 8 },
                { name: 'Solo Space', bars: 16 },
                { name: 'Outro Vamp', bars: 4 }
            ],
            progression: [
                { bar: 1, rootOffset: 6, chordIntervals: [0, 3, 6, 10], suffix: 'm7b5', degreeRoman: 'iø' },
                { bar: 2, rootOffset: 7, chordIntervals: [0, 4, 7, 11], suffix: 'maj7', degreeRoman: 'bIImaj7' },
                { bar: 3, rootOffset: 4, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'vii7' },
                { bar: 4, rootOffset: 6, chordIntervals: [0, 3, 6, 10], suffix: 'm7b5', degreeRoman: 'iø' }
            ],
            drums: {
                crash: [0],
                kick: [0, 6, 10],
                snare: [4, 12],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 3, velocity: 0.95 },
                { step: 6, degree: 'fifth', durationSteps: 3, velocity: 0.85 },
                { step: 10, degree: 'root', durationSteps: 4, velocity: 0.9 }
            ],
            chords: [
                { step: 2, durationSteps: 3.0, velocity: 0.85 },
                { step: 10, durationSteps: 3.0, velocity: 0.8 }
            ]
        }
    ];

    /**
     * Look up a preset by its unique identifier.
     */
    static getPresetById(id) {
        return MidiBackingTrackModel.PRESETS.find(p => p.id === id) || MidiBackingTrackModel.PRESETS[0];
    }

    /**
     * Retrieve all available presets grouped or flat.
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
        this.lastReportedSection = null;

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
        this.lastReportedSection = null;
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

            // Calculate Section Structure
            let currentSection = 'Main Groove';
            let barInSection = 1;
            let totalSectionBars = 4;
            if (preset.sections && preset.sections.length > 0) {
                let cumulativeBars = 0;
                const totalSongBars = preset.sections.reduce((acc, s) => acc + s.bars, 0);
                const songBarIndex = barIndex % totalSongBars;
                for (const sec of preset.sections) {
                    if (songBarIndex < cumulativeBars + sec.bars) {
                        currentSection = sec.name;
                        barInSection = (songBarIndex - cumulativeBars) + 1;
                        totalSectionBars = sec.bars;
                        break;
                    }
                    cumulativeBars += sec.bars;
                }
            }

            // Report chord and section on downbeat of each bar
            if (barStep === 0 && chordSlot && typeof onChordUpdateFn === 'function') {
                const scaleRootIdx = (context.rootNoteIdx !== undefined && context.rootNoteIdx !== null)
                    ? context.rootNoteIdx
                    : (preset.defaultRootIdx !== undefined ? preset.defaultRootIdx : 0);
                
                const isSharps = context.accidentalMode !== 'flats';
                const NOTES = isSharps
                    ? ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
                    : ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

                const chordRootIdx = (scaleRootIdx + (chordSlot.rootOffset || 0)) % 12;
                const chordRootName = NOTES[chordRootIdx];
                const chordLabel = `${chordRootName}${chordSlot.suffix || ''} (${chordSlot.degreeRoman || ''})`;
                const sectionLabel = `${currentSection} [${barInSection}/${totalSectionBars}]`;

                if (this.lastReportedChord !== chordLabel || this.lastReportedSection !== sectionLabel) {
                    this.lastReportedChord = chordLabel;
                    this.lastReportedSection = sectionLabel;
                    onChordUpdateFn(chordLabel, sectionLabel, preset.scaleRecommendation);
                }
            }

            if (chordSlot) {
                const scaleRootIdx = (context.rootNoteIdx !== undefined && context.rootNoteIdx !== null)
                    ? context.rootNoteIdx
                    : (preset.defaultRootIdx !== undefined ? preset.defaultRootIdx : 0);

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
                        let bassBaseMidi = 28 + scaleRootIdx + (chordSlot.rootOffset || 0); // E1 is 28
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
                        } else if (bassEvt.degree === 'sixth') {
                            degreeOffset = 9;
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
                                         preset.instrumentType === 'overdriven_guitar' ||
                                         preset.instrumentType === 'clean_guitar' ||
                                         preset.instrumentType === 'jazz_guitar' ||
                                         preset.instrumentType === 'acoustic_guitar';

                        let chordRootMidi = (isGuitar ? 48 : 55) + scaleRootIdx + (chordSlot.rootOffset || 0);
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
        const filename = preset.midiFile || '01_blues_12bar_a7_116bpm.mid';
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
