/**
 * ==========================================================================
 * MODEL LAYER: MidiBackingTrackModel
 * Encapsulates 25 authentic studio backing tracks (including 4/4, 3/4, 5/4, 6/8, and 7/8 meters) derived directly from
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
        this.isCountingIn = false;
        this.countInTimers = [];
        this.nextStepTime = 0;
        this.currentStep = 0;
        this.lastReportedChord = null;
        this.lastReportedSection = null;
        this.lastReportedBar = -1;

        // True Standard MIDI File (SMF) Parsing Cache & Stream State
        this._parsedMidiCache = {};
        this._loadingPromises = {};
        this.songStartTime = 0;
        this.scheduledNoteIndex = 0;
        this.currentParsedSong = null;
    }

    /**
     * 25 Authentic Studio Backing Track Presets (4/4, 3/4, 5/4, 6/8, 7/8)
     */
    static PRESETS = [
        // ==================== BLUES & SHUFFLE ====================
        {
            id: 'blues_12bar_a7',
            name: 'Blues Shuffle - I IV V (12 Bar) - Mixolydian',
            targetModeKey: 'mixolydian',
            category: 'Blues & Shuffle',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 74,
            defaultRootIdx: 9, // A
            defaultRootName: 'A',
            midiFile: '01_blues_12bar_a7_74bpm.mid',
            instrumentType: 'clean_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🎸 Electric Blues Guitar & Drum Kit (Duo)',
            scaleRecommendation: 'A Minor / Major Blues, A Mixolydian',
            cycleBars: 12,
            sections: [
                { name: 'Verse (Head)', bars: 12 },
                { name: 'Chorus (Solo)', bars: 12 }
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
                crash: [{ step: 0, vel: 0.85 }],
                kick: [
                    { step: 0, vel: 0.82 },   // Solid downbeat punch
                    { step: 8, vel: 0.76 }   // Beat 3 punch
                ],
                snare: [
                    { step: 4, vel: 0.80 },   // Beat 2 crisp backbeat
                    { step: 12, vel: 0.80 }   // Beat 4 crisp backbeat
                ],
                hihatClosed: [
                    { step: 0, vel: 0.72 },  // Downbeat accent
                    { step: 2, vel: 0.32 },  // Ghost middle triplet
                    { step: 3, vel: 0.60 },  // Swung upbeat push
                    { step: 4, vel: 0.70 },  // Snare-synced accent
                    { step: 6, vel: 0.32 },  // Ghost middle triplet
                    { step: 7, vel: 0.62 },  // Swung upbeat push
                    { step: 8, vel: 0.72 },  // Beat 3 accent
                    { step: 10, vel: 0.32 }, // Ghost middle triplet
                    { step: 11, vel: 0.60 }, // Swung upbeat push
                    { step: 12, vel: 0.70 }, // Beat 4 accent
                    { step: 14, vel: 0.32 }, // Ghost middle triplet
                    { step: 15, vel: 0.64 }  // Turnaround anticipation push
                ]
            },
            bass: [], // Pure 2-instrument Duo: Electric Guitar & Drum Kit
            chords: [
                // Beat 1: Staccato downbeat chop (duration 1 step = 8th triplet)
                { step: 0, durationSteps: 1.0, velocity: 0.96 },
                // Beat 1-uh: Low root pickup (duration 1 step)
                { step: 3, durationSteps: 1.0, velocity: 0.84 },
                // Beat 2: Snare-synced chop (duration 1 step)
                { step: 4, durationSteps: 1.0, velocity: 0.96 },
                // Beat 2-uh: Upbeat Push Chord — QUARTER NOTE (sustains into beat 3, heavily emphasized!)
                { step: 7, durationSteps: 4.0, velocity: 1.05 },
                // Beat 3: Sustained downbeat weight (duration 3.5 steps = Quarter Note)
                { step: 8, durationSteps: 3.5, velocity: 0.96 },
                // Beat 4: Staccato chop (duration 1 step)
                { step: 12, durationSteps: 1.0, velocity: 0.94 },
                // Beat 4-uh: Cross-Bar Anticipation Push — DOTTED QUARTER NOTE (emphasized push!)
                { step: 15, durationSteps: 4.5, velocity: 1.05 }
            ]
        },
        {
            id: 'minor_blues_12bar_am',
            name: 'Minor Blues - i iv v (12 Bar) - Aeolian',
            targetModeKey: 'aeolian',
            category: 'Blues & Shuffle',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 58,
            defaultRootIdx: 9, // A
            defaultRootName: 'A',
            midiFile: '12_minor_blues_12bar_am_58bpm.mid',
            instrumentType: 'distorted_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🎸 Slow Minor Blues Guitar & Rhodes',
            scaleRecommendation: 'A Minor Pentatonic, A Blues, A Dorian',
            cycleBars: 12,
            sections: [
                { name: 'Verse (Minor Head)', bars: 12 },
                { name: 'Chorus (Solo)', bars: 12 }
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
            name: 'Jazz Swing - ii V I VI - Ionian',
            targetModeKey: 'ionian',
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
            bassType: 'acoustic_bass',
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
            name: 'Bossa Nova - ii V I VI - Ionian',
            targetModeKey: 'ionian',
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
            name: 'Neo-Soul - i IV i ii - Dorian',
            targetModeKey: 'dorian',
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
            name: 'Latin Funk - i IV i ii - Dorian',
            targetModeKey: 'dorian',
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
            name: 'Dark Metal - i bII bIII bII - Phrygian',
            targetModeKey: 'phrygian',
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
            bassType: 'electric_bass',
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
            name: 'Virtuoso Rock - I II I II - Lydian',
            targetModeKey: 'lydian',
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
            name: 'Open Rock - I bVII IV I - Mixolydian',
            targetModeKey: 'mixolydian',
            category: 'Rock & Pop',
            timeSignature: '4/4',
            beatsPerBar: 4,
            stepsPerBeat: 4,
            stepsPerBar: 16,
            defaultBpm: 120,
            defaultRootIdx: 9, // A
            defaultRootName: 'A',
            midiFile: '04_mixolydian_open_life_a_120bpm.mid',
            instrumentType: 'distorted_guitar',
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
            name: 'Blues Rock Ballad - i bVI bIII bVII - Aeolian',
            targetModeKey: 'aeolian',
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
            name: 'Melodic Ballad - i bVI bIII bVII - Aeolian',
            targetModeKey: 'aeolian',
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
            name: 'Acoustic Pop - I V vi IV - Ionian',
            targetModeKey: 'ionian',
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
            name: 'Ambient Fusion - i° bII vii i° - Locrian',
            targetModeKey: 'locrian',
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
            bassType: 'fretless_bass',
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
            name: 'Modern Fusion - i° bII vii i° - Locrian',
            targetModeKey: 'locrian',
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
        },

        // ==================== 15. ACID JAZZ FUSION JAM TRACK IN D MINOR (3/4) ====================
        {
            id: 'acid_jazz_34_dm',
            name: 'Acid Jazz (3/4) - i iv v i - Dorian',
            targetModeKey: 'dorian',
            category: 'Jazz & Fusion',
            timeSignature: '3/4',
            beatsPerBar: 3,
            countInBeats: 3,
            stepsPerBeat: 4,
            stepsPerBar: 12,
            defaultBpm: 154,
            defaultRootIdx: 2, // D
            defaultRootName: 'D',
            midiFile: '15_acid_jazz_34_dm_154bpm.mid',
            instrumentType: 'jazz_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🎸 Clean Jazz Guitar & Rhodes Piano (3/4 Jazz Waltz)',
            scaleRecommendation: 'D Dorian, D Minor Blues, G Mixolydian',
            cycleBars: 4,
            sections: [
                { name: 'Intro (Jazz Waltz)', bars: 4 },
                { name: 'Verse (Acid Groove)', bars: 8 },
                { name: 'Chorus (Organ Surge)', bars: 8 },
                { name: 'Solo Flight', bars: 8 },
                { name: 'Outro Vamp', bars: 4 }
            ],
            progression: [
                { bar: 1, rootOffset: 2, chordIntervals: [0, 3, 7, 10, 14], suffix: 'm9', degreeRoman: 'i9' },
                { bar: 2, rootOffset: 7, chordIntervals: [0, 3, 7, 10, 14], suffix: 'm9', degreeRoman: 'iv9' },
                { bar: 3, rootOffset: 9, chordIntervals: [0, 3, 7, 10, 14], suffix: 'm9', degreeRoman: 'v9' },
                { bar: 4, rootOffset: 2, chordIntervals: [0, 3, 7, 10, 14], suffix: 'm9', degreeRoman: 'i9' }
            ],
            drums: {
                crash: [0],
                kick: [0],
                snare: [4, 8],
                hihatClosed: [0, 2, 4, 6, 8, 10]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 3.5, velocity: 0.95 },
                { step: 4, degree: 'fifth', durationSteps: 3.5, velocity: 0.85 },
                { step: 8, degree: 'root', durationSteps: 3.5, velocity: 0.9 }
            ],
            chords: [
                { step: 0, durationSteps: 2.0, velocity: 0.85 },
                { step: 5, durationSteps: 3.5, velocity: 0.85 }
            ]
        },

        // ==================== 16. SOFT ROCK IN E MINOR (5/4) ====================
        {
            id: 'soft_rock_54_em',
            name: 'Soft Rock (5/4) - i bVI bVII i - Aeolian',
            targetModeKey: 'aeolian',
            category: 'Rock & Pop',
            timeSignature: '5/4',
            beatsPerBar: 5,
            countInBeats: 5,
            stepsPerBeat: 4,
            stepsPerBar: 20,
            defaultBpm: 110,
            defaultRootIdx: 4, // E
            defaultRootName: 'E',
            midiFile: '16_soft_rock_54_em_110bpm.mid',
            instrumentType: 'acoustic_guitar',
            bassType: 'finger_bass',
            instrumentLabel: '🎸 Acoustic Guitar & Warm Strings (5/4 Groove)',
            scaleRecommendation: 'E Aeolian (Natural Minor), E Minor Pentatonic, G Major',
            cycleBars: 4,
            sections: [
                { name: 'Intro (5/4 Pulse)', bars: 4 },
                { name: 'Verse (3+2 Groove)', bars: 8 },
                { name: 'Chorus (Anthem)', bars: 8 },
                { name: 'Solo Section', bars: 8 },
                { name: 'Outro Vamp', bars: 4 }
            ],
            progression: [
                { bar: 1, rootOffset: 4, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'i7' },
                { bar: 2, rootOffset: 0, chordIntervals: [0, 4, 7, 11], suffix: 'maj7', degreeRoman: 'bVImaj7' },
                { bar: 3, rootOffset: 2, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'bVII' },
                { bar: 4, rootOffset: 4, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'i7' }
            ],
            drums: {
                crash: [0],
                kick: [0, 8, 12],
                snare: [4, 16],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 5.5, velocity: 0.95 },
                { step: 6, degree: 'fifth', durationSteps: 5.5, velocity: 0.85 },
                { step: 12, degree: 'root', durationSteps: 3.5, velocity: 0.9 },
                { step: 16, degree: 'seventh', durationSteps: 3.5, velocity: 0.85 }
            ],
            chords: [
                { step: 0, durationSteps: 3.5, velocity: 0.85 },
                { step: 6, durationSteps: 5.0, velocity: 0.85 },
                { step: 12, durationSteps: 3.5, velocity: 0.85 },
                { step: 16, durationSteps: 3.5, velocity: 0.85 }
            ]
        },

        // ==================== 17. ROCK BALLAD IN A (6/8) ====================
        {
            id: 'rock_ballad_68_a',
            name: 'Rock Ballad (6/8) - I V vi IV - Ionian',
            targetModeKey: 'ionian',
            category: 'Rock & Pop',
            timeSignature: '6/8',
            beatsPerBar: 6,
            countInBeats: 6,
            stepsPerBeat: 2,
            stepsPerBar: 12,
            defaultBpm: 80,
            defaultRootIdx: 9, // A
            defaultRootName: 'A',
            midiFile: '17_rock_ballad_68_a_80bpm.mid',
            instrumentType: 'clean_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🎸 Strat Clean Arpeggios & Grand Piano (6/8 Ballad)',
            scaleRecommendation: 'A Major / Ionian, F# Minor Pentatonic',
            cycleBars: 4,
            sections: [
                { name: 'Intro (6/8 Arpeggio)', bars: 4 },
                { name: 'Verse (A - E - F#m - D)', bars: 8 },
                { name: 'Chorus (Soaring Lead)', bars: 8 },
                { name: 'Solo Section', bars: 8 },
                { name: 'Outro Cadence', bars: 4 }
            ],
            progression: [
                { bar: 1, rootOffset: 9, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'I' },
                { bar: 2, rootOffset: 4, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'V' },
                { bar: 3, rootOffset: 6, chordIntervals: [0, 3, 7], suffix: 'm', degreeRoman: 'vi' },
                { bar: 4, rootOffset: 2, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'IV' }
            ],
            drums: {
                crash: [0],
                kick: [0, 4, 10],
                snare: [6],
                hihatClosed: [0, 2, 4, 6, 8, 10]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 5.5, velocity: 0.95 },
                { step: 6, degree: 'fifth', durationSteps: 5.5, velocity: 0.9 }
            ],
            chords: [
                { step: 0, durationSteps: 5.5, velocity: 0.85 },
                { step: 6, durationSteps: 5.5, velocity: 0.85 }
            ]
        },

        // ==================== 18. SOUL JAM IN C MAJOR (6/8) ====================
        {
            id: 'soul_jam_68_c',
            name: 'Soul Jam (6/8) - I vi ii V - Ionian',
            targetModeKey: 'ionian',
            category: 'Funk, Soul & R&B',
            timeSignature: '6/8',
            beatsPerBar: 6,
            countInBeats: 6,
            stepsPerBeat: 2,
            stepsPerBar: 12,
            defaultBpm: 65,
            defaultRootIdx: 0, // C
            defaultRootName: 'C',
            midiFile: '18_soul_jam_68_c_65bpm.mid',
            instrumentType: 'clean_guitar',
            bassType: 'finger_bass',
            instrumentLabel: '🎸 Soul Clean Guitar & Warm Rhodes (6/8 Neo-Soul)',
            scaleRecommendation: 'C Major / Ionian, A Minor Pentatonic, D Dorian',
            cycleBars: 4,
            sections: [
                { name: 'Intro (6/8 Soul)', bars: 4 },
                { name: 'Verse (Sweet 6/8)', bars: 8 },
                { name: 'Chorus (Gospel Push)', bars: 8 },
                { name: 'Solo Section', bars: 8 },
                { name: 'Outro Fade', bars: 4 }
            ],
            progression: [
                { bar: 1, rootOffset: 0, chordIntervals: [0, 4, 7, 11], suffix: 'maj7', degreeRoman: 'Imaj7' },
                { bar: 2, rootOffset: 9, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'vi7' },
                { bar: 3, rootOffset: 2, chordIntervals: [0, 3, 7, 10], suffix: 'm7', degreeRoman: 'ii7' },
                { bar: 4, rootOffset: 7, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'V7' }
            ],
            drums: {
                crash: [0],
                kick: [0, 4],
                snare: [6],
                hihatClosed: [0, 2, 4, 6, 8, 10]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 5.5, velocity: 0.95 },
                { step: 6, degree: 'root', durationSteps: 5.5, velocity: 0.9 }
            ],
            chords: [
                { step: 0, durationSteps: 5.5, velocity: 0.8 },
                { step: 6, durationSteps: 5.5, velocity: 0.8 }
            ]
        },

        // ==================== 19. PROGRESSIVE ROCK IN A MINOR (7/8) ====================
        {
            id: 'prog_rock_78_am',
            name: 'Progressive Rock (7/8) - i bVII bVI V - Aeolian',
            targetModeKey: 'aeolian',
            category: 'Rock & Pop',
            timeSignature: '7/8',
            beatsPerBar: 7,
            countInBeats: 7,
            stepsPerBeat: 2,
            stepsPerBar: 14,
            defaultBpm: 146,
            defaultRootIdx: 9, // A
            defaultRootName: 'A',
            midiFile: '19_prog_rock_78_am_146bpm.mid',
            instrumentType: 'distorted_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🎸 Overdriven Riff Guitar & Synth Strings (7/8 Odd Meter)',
            scaleRecommendation: 'A Aeolian / Harmonic Minor, A Minor Pentatonic',
            cycleBars: 4,
            sections: [
                { name: 'Intro (7/8 Odd Meter)', bars: 4 },
                { name: 'Verse (2+2+3 Drive)', bars: 8 },
                { name: 'Chorus (Power Anthem)', bars: 8 },
                { name: 'Solo Section', bars: 8 },
                { name: 'Outro Climax', bars: 4 }
            ],
            progression: [
                { bar: 1, rootOffset: 9, chordIntervals: [0, 3, 7], suffix: 'm', degreeRoman: 'i' },
                { bar: 2, rootOffset: 7, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'bVII' },
                { bar: 3, rootOffset: 5, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'bVI' },
                { bar: 4, rootOffset: 4, chordIntervals: [0, 4, 7, 10], suffix: '7', degreeRoman: 'V7' }
            ],
            drums: {
                crash: [0],
                kick: [0, 4, 8],
                snare: [4, 10],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 3.5, velocity: 0.95 },
                { step: 4, degree: 'fifth', durationSteps: 3.5, velocity: 0.9 },
                { step: 8, degree: 'root', durationSteps: 5.5, velocity: 0.95 }
            ],
            chords: [
                { step: 0, durationSteps: 3.5, velocity: 0.85 },
                { step: 4, durationSteps: 3.5, velocity: 0.85 },
                { step: 8, durationSteps: 5.5, velocity: 0.85 }
            ]
        },

        // ==================== 20. JAZZ FUSION IN E (5/4) ====================
        {
            id: 'fusion_54_e',
            name: 'Jazz Fusion (5/4) - i IV i IV - Dorian',
            targetModeKey: 'dorian',
            category: 'Jazz & Fusion',
            timeSignature: '5/4',
            beatsPerBar: 5,
            countInBeats: 5,
            stepsPerBeat: 4,
            stepsPerBar: 20,
            defaultBpm: 108,
            defaultRootIdx: 4, // E
            defaultRootName: 'E',
            midiFile: '20_fusion_54_e_108bpm.mid',
            instrumentType: 'jazz_guitar',
            bassType: 'fretless_bass',
            instrumentLabel: '🎸 Clean Jazz Guitar & Synth Pad (5/4 Modern Fusion)',
            scaleRecommendation: 'E Dorian, A Mixolydian, D Major',
            cycleBars: 4,
            sections: [
                { name: 'Intro (5/4 Fusion Pulse)', bars: 4 },
                { name: 'Theme A (Em9 - A13)', bars: 8 },
                { name: 'Theme B (Soaring Vamp)', bars: 8 },
                { name: 'Solo Flight', bars: 8 },
                { name: 'Outro Cadence', bars: 4 }
            ],
            progression: [
                { bar: 1, rootOffset: 4, chordIntervals: [0, 3, 7, 10, 14], suffix: 'm9', degreeRoman: 'i9' },
                { bar: 2, rootOffset: 9, chordIntervals: [0, 4, 7, 10, 14, 21], suffix: '13', degreeRoman: 'IV13' },
                { bar: 3, rootOffset: 4, chordIntervals: [0, 3, 7, 10, 14], suffix: 'm9', degreeRoman: 'i9' },
                { bar: 4, rootOffset: 9, chordIntervals: [0, 4, 7, 10, 14, 21], suffix: '13', degreeRoman: 'IV13' }
            ],
            drums: {
                crash: [0],
                kick: [0, 6, 12],
                snare: [4, 16],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 5.5, velocity: 0.95 },
                { step: 6, degree: 'fifth', durationSteps: 5.5, velocity: 0.85 },
                { step: 12, degree: 'root', durationSteps: 7.5, velocity: 0.9 }
            ],
            chords: [
                { step: 0, durationSteps: 5.5, velocity: 0.85 },
                { step: 6, durationSteps: 5.5, velocity: 0.85 },
                { step: 12, durationSteps: 7.5, velocity: 0.85 }
            ]
        },

        // ==================== 21. BALKAN FOLK IN A PHRYGIAN (7/8) ====================
        {
            id: 'balkan_78_a_phrygian',
            name: 'Balkan Folk (7/8) - i bII i bVII - Phrygian',
            targetModeKey: 'phrygian',
            category: 'World & Exotic',
            timeSignature: '7/8',
            beatsPerBar: 7,
            countInBeats: 7,
            stepsPerBeat: 2,
            stepsPerBar: 14,
            defaultBpm: 155,
            defaultRootIdx: 9, // A
            defaultRootName: 'A',
            midiFile: '21_balkan_78_a_155bpm.mid',
            instrumentType: 'nylon_guitar',
            bassType: 'acoustic_bass',
            instrumentLabel: '🎸 Nylon Flamenco Guitar & Accordion (7/8 Balkan 3+2+2)',
            scaleRecommendation: 'A Phrygian, A Phrygian Dominant, D Harmonic Minor',
            cycleBars: 4,
            sections: [
                { name: 'Intro (Balkan 3+2+2)', bars: 3 },
                { name: 'Theme (Am - Bb)', bars: 7 },
                { name: 'Chorus (Phrygian Fire)', bars: 7 },
                { name: 'Solo Improvisation', bars: 7 },
                { name: 'Outro Climax', bars: 4 }
            ],
            progression: [
                { bar: 1, rootOffset: 9, chordIntervals: [0, 3, 7], suffix: 'm', degreeRoman: 'i' },
                { bar: 2, rootOffset: 10, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'bII' },
                { bar: 3, rootOffset: 9, chordIntervals: [0, 3, 7], suffix: 'm', degreeRoman: 'i' },
                { bar: 4, rootOffset: 7, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'bVII' }
            ],
            drums: {
                crash: [0],
                kick: [0, 6, 10],
                snare: [6, 10],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 5.5, velocity: 0.95 },
                { step: 6, degree: 'fifth', durationSteps: 3.5, velocity: 0.9 },
                { step: 10, degree: 'root', durationSteps: 3.5, velocity: 0.9 }
            ],
            chords: [
                { step: 0, durationSteps: 5.5, velocity: 0.9 },
                { step: 6, durationSteps: 3.5, velocity: 0.85 },
                { step: 10, durationSteps: 3.5, velocity: 0.85 }
            ]
        },

        // ==================== 22. BALLAD ROCK IN D MINOR (3/4) ====================
        {
            id: 'ballad_rock_34_dm',
            name: 'Ballad Rock (3/4) - i bVI bVII i - Aeolian',
            targetModeKey: 'aeolian',
            category: 'Rock & Pop',
            timeSignature: '3/4',
            beatsPerBar: 3,
            countInBeats: 3,
            stepsPerBeat: 4,
            stepsPerBar: 12,
            defaultBpm: 132,
            defaultRootIdx: 2, // D
            defaultRootName: 'D',
            midiFile: '22_ballad_rock_34_dm_132bpm.mid',
            instrumentType: 'clean_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🎸 Strat Clean Arpeggios & String Orchestra (3/4 Waltz Ballad)',
            scaleRecommendation: 'D Aeolian (Natural Minor), D Minor Pentatonic, F Major',
            cycleBars: 4,
            sections: [
                { name: 'Intro (Gentle 3/4)', bars: 4 },
                { name: 'Verse (Dm - Bb - C)', bars: 8 },
                { name: 'Chorus (Strings Swell)', bars: 8 },
                { name: 'Solo Space', bars: 8 },
                { name: 'Outro Resolve', bars: 4 }
            ],
            progression: [
                { bar: 1, rootOffset: 2, chordIntervals: [0, 3, 7], suffix: 'm', degreeRoman: 'i' },
                { bar: 2, rootOffset: 10, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'bVI' },
                { bar: 3, rootOffset: 0, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'bVII' },
                { bar: 4, rootOffset: 2, chordIntervals: [0, 3, 7], suffix: 'm', degreeRoman: 'i' }
            ],
            drums: {
                crash: [0],
                kick: [0],
                snare: [4, 8],
                hihatClosed: [0, 2, 4, 6, 8, 10]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 3.5, velocity: 0.95 },
                { step: 4, degree: 'fifth', durationSteps: 3.5, velocity: 0.85 },
                { step: 8, degree: 'root', durationSteps: 3.5, velocity: 0.9 }
            ],
            chords: [
                { step: 0, durationSteps: 3.5, velocity: 0.85 },
                { step: 4, durationSteps: 3.5, velocity: 0.85 },
                { step: 8, durationSteps: 3.5, velocity: 0.85 }
            ]
        },

        // ==================== 23. METALCORE IN D MINOR (3/4) ====================
        {
            id: 'metalcore_34_dm',
            name: 'Metalcore (3/4) - i bVI iv bVII - Aeolian',
            targetModeKey: 'aeolian',
            category: 'Metal & Hard Rock',
            timeSignature: '3/4',
            beatsPerBar: 3,
            countInBeats: 3,
            stepsPerBeat: 4,
            stepsPerBar: 12,
            defaultBpm: 120,
            defaultRootIdx: 2, // D
            defaultRootName: 'D',
            midiFile: '23_metalcore_34_dm_120bpm.mid',
            instrumentType: 'distorted_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🎸 High-Gain Distortion Guitar & Double Bass Drum (3/4 Heavy)',
            scaleRecommendation: 'D Aeolian, D Harmonic Minor, D Minor Blues',
            cycleBars: 4,
            sections: [
                { name: 'Intro (Distortion Chugs)', bars: 4 },
                { name: 'Verse (Gallop Beat)', bars: 8 },
                { name: 'Chorus (Melodic Power)', bars: 8 },
                { name: 'Breakdown / Solo', bars: 8 },
                { name: 'Outro Riff', bars: 4 }
            ],
            progression: [
                { bar: 1, rootOffset: 2, chordIntervals: [0, 3, 7], suffix: 'm', degreeRoman: 'i' },
                { bar: 2, rootOffset: 10, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'bVI' },
                { bar: 3, rootOffset: 7, chordIntervals: [0, 3, 7], suffix: 'm', degreeRoman: 'iv' },
                { bar: 4, rootOffset: 0, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'bVII' }
            ],
            drums: {
                crash: [0],
                kick: [0, 2, 4, 8, 10],
                snare: [4],
                hihatClosed: [0, 2, 4, 6, 8, 10]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 1.8, velocity: 1.0 },
                { step: 2, degree: 'root', durationSteps: 1.8, velocity: 0.95 },
                { step: 4, degree: 'root', durationSteps: 1.8, velocity: 1.0 },
                { step: 6, degree: 'root', durationSteps: 1.8, velocity: 0.9 },
                { step: 8, degree: 'root', durationSteps: 1.8, velocity: 1.0 },
                { step: 10, degree: 'root', durationSteps: 1.8, velocity: 0.95 }
            ],
            chords: [
                { step: 0, durationSteps: 3.5, velocity: 0.95 },
                { step: 4, durationSteps: 3.5, velocity: 0.9 },
                { step: 8, durationSteps: 3.5, velocity: 0.9 }
            ]
        },

        // ==================== 24. MODAL FUNK FUSION IN A (7/8) ====================
        {
            id: 'funk_fusion_78_a',
            name: 'Modal Funk Fusion (7/8) - I IV I IV - Mixolydian',
            targetModeKey: 'mixolydian',
            category: 'Funk, Soul & R&B',
            timeSignature: '7/8',
            beatsPerBar: 7,
            countInBeats: 7,
            stepsPerBeat: 2,
            stepsPerBar: 14,
            defaultBpm: 120,
            defaultRootIdx: 9, // A
            defaultRootName: 'A',
            midiFile: '24_funk_fusion_78_a_120bpm.mid',
            instrumentType: 'clean_guitar',
            bassType: 'finger_bass',
            instrumentLabel: '🎸 Clean Funk Strat & Rhodes Piano (7/8 Syncopated Funk)',
            scaleRecommendation: 'A Mixolydian, A Minor Blues, D Dorian',
            cycleBars: 4,
            sections: [
                { name: 'Intro (7/8 Funk Vamp)', bars: 4 },
                { name: 'Theme A (A9 - D9 Groove)', bars: 8 },
                { name: 'Theme B (Syncope Climax)', bars: 8 },
                { name: 'Solo Jam', bars: 8 },
                { name: 'Outro Vamp', bars: 4 }
            ],
            progression: [
                { bar: 1, rootOffset: 9, chordIntervals: [0, 4, 7, 10, 14], suffix: '9', degreeRoman: 'I9' },
                { bar: 2, rootOffset: 2, chordIntervals: [0, 4, 7, 10, 14], suffix: '9', degreeRoman: 'IV9' },
                { bar: 3, rootOffset: 9, chordIntervals: [0, 4, 7, 10, 14], suffix: '9', degreeRoman: 'I9' },
                { bar: 4, rootOffset: 2, chordIntervals: [0, 4, 7, 10, 14], suffix: '9', degreeRoman: 'IV9' }
            ],
            drums: {
                crash: [0],
                kick: [0, 4, 8, 12],
                snare: [4, 10],
                hihatClosed: [0, 2, 4, 6, 8, 10, 12]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 3.5, velocity: 0.95 },
                { step: 4, degree: 'fifth', durationSteps: 3.5, velocity: 0.9 },
                { step: 8, degree: 'flatSeventh', durationSteps: 2.5, velocity: 0.9 },
                { step: 11, degree: 'root', durationSteps: 2.5, velocity: 0.95 }
            ],
            chords: [
                { step: 0, durationSteps: 3.5, velocity: 0.85 },
                { step: 4, durationSteps: 3.5, velocity: 0.85 },
                { step: 8, durationSteps: 5.5, velocity: 0.85 }
            ]
        },

        // ==================== 25. TASTY POP IN D (3/4) ====================
        {
            id: 'tasty_pop_34_d',
            name: 'Tasty Pop (3/4) - I V vi IV - Ionian',
            targetModeKey: 'ionian',
            category: 'Rock & Pop',
            timeSignature: '3/4',
            beatsPerBar: 3,
            countInBeats: 3,
            stepsPerBeat: 4,
            stepsPerBar: 12,
            defaultBpm: 132,
            defaultRootIdx: 2, // D
            defaultRootName: 'D',
            midiFile: '25_tasty_pop_34_d_132bpm.mid',
            instrumentType: 'acoustic_guitar',
            bassType: 'electric_bass',
            instrumentLabel: '🎸 Acoustic Strum & Grand Piano (3/4 Pop Ballad Goodbye Sea)',
            scaleRecommendation: 'D Major / Ionian, B Minor Pentatonic',
            cycleBars: 4,
            sections: [
                { name: 'Intro (Acoustic Strum)', bars: 4 },
                { name: 'Verse (D - A - Bm - G)', bars: 8 },
                { name: 'Chorus (Full Pop Band)', bars: 8 },
                { name: 'Solo Melodic Flight', bars: 8 },
                { name: 'Outro Resolution', bars: 4 }
            ],
            progression: [
                { bar: 1, rootOffset: 2, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'I' },
                { bar: 2, rootOffset: 9, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'V' },
                { bar: 3, rootOffset: 11, chordIntervals: [0, 3, 7], suffix: 'm', degreeRoman: 'vi' },
                { bar: 4, rootOffset: 7, chordIntervals: [0, 4, 7], suffix: '', degreeRoman: 'IV' }
            ],
            drums: {
                crash: [0],
                kick: [0],
                snare: [4, 8],
                hihatClosed: [0, 2, 4, 6, 8, 10]
            },
            bass: [
                { step: 0, degree: 'root', durationSteps: 3.5, velocity: 0.95 },
                { step: 4, degree: 'fifth', durationSteps: 3.5, velocity: 0.85 },
                { step: 8, degree: 'root', durationSteps: 3.5, velocity: 0.9 }
            ],
            chords: [
                { step: 0, durationSteps: 3.5, velocity: 0.85 },
                { step: 4, durationSteps: 3.5, velocity: 0.85 },
                { step: 8, durationSteps: 3.5, velocity: 0.85 }
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
     * Parse Standard MIDI File (.mid) binary buffer into high-resolution paired notes and timeline.
     */
    async loadAndParseMidi(presetId) {
        if (this._parsedMidiCache[presetId]) {
            return this._parsedMidiCache[presetId];
        }
        if (this._loadingPromises[presetId]) {
            return this._loadingPromises[presetId];
        }

        const preset = MidiBackingTrackModel.getPresetById(presetId);
        if (!preset) return null;

        const midiFile = preset.midiFile || '01_blues_12bar_a7_74bpm.mid';
        const url = `midi_tracks/${midiFile}`;

        this._loadingPromises[presetId] = (async () => {
            try {
                const resp = await fetch(url);
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const arrayBuffer = await resp.arrayBuffer();

                if (!window.MidiPlayer || !window.MidiPlayer.Player) {
                    console.warn('MidiPlayer library not loaded yet');
                    delete this._loadingPromises[presetId];
                    return null;
                }

                const player = new window.MidiPlayer.Player();
                player.loadArrayBuffer(arrayBuffer);

                const division = player.division || 480;

                // 1. Build Tempo Map (handles both BPM values and microseconds)
                const initialBpm = preset.defaultBpm || player.tempo || 120;
                const tempoMap = [];
                for (const track of player.tracks) {
                    for (const evt of track.events) {
                        if (evt.name === 'Set Tempo' && evt.data) {
                            const bpmVal = evt.data > 500 ? (60000000.0 / evt.data) : Number(evt.data);
                            tempoMap.push({ tick: evt.tick, bpm: bpmVal });
                        }
                    }
                }
                tempoMap.sort((a, b) => a.tick - b.tick);
                if (tempoMap.length === 0) {
                    tempoMap.push({ tick: 0, bpm: initialBpm });
                }

                const tickToSeconds = (tick) => {
                    if (tick <= 0) return 0;
                    let sec = 0;
                    let prevTick = 0;
                    let curBpm = tempoMap[0].bpm;
                    for (let i = 0; i < tempoMap.length; i++) {
                        const entry = tempoMap[i];
                        if (tick <= entry.tick) break;
                        sec += ((entry.tick - prevTick) / division) * (60.0 / curBpm);
                        prevTick = entry.tick;
                        curBpm = entry.bpm;
                    }
                    sec += ((tick - prevTick) / division) * (60.0 / curBpm);
                    return sec;
                };

                // 2. Parse & Pair Notes
                const notes = [];
                player.tracks.forEach((track, tIdx) => {
                    let trackName = '';
                    for (const evt of track.events) {
                        if (evt.name === 'Sequence/Track Name' && evt.string) {
                            trackName = evt.string;
                            break;
                        }
                    }
                    const nameLower = trackName.toLowerCase();
                    const isDrumTrack = nameLower.includes('drum') || nameLower.includes('kit') || nameLower.includes('percussion') || nameLower.includes('cymbal');
                    const isBassTrack = nameLower.includes('bass');
                    const isGuitarTrack = nameLower.includes('guitar') || nameLower.includes('strat');
                    const isKeysTrack = nameLower.includes('rhodes') || nameLower.includes('piano') || nameLower.includes('keys') || nameLower.includes('flute') || nameLower.includes('pad');

                    const activeNotes = new Map();
                    for (const evt of track.events) {
                        const channel = evt.channel !== undefined ? evt.channel : 1;
                        const isChannel10 = (channel === 10 || channel === 9);
                        let role = 'guitar';
                        if (isChannel10 || isDrumTrack) role = 'drums';
                        else if (isBassTrack) role = 'bass';
                        else if (isGuitarTrack) role = 'guitar';
                        else if (isKeysTrack) role = 'keys';
                        else if (tIdx === 1 && !isBassTrack && !isKeysTrack) role = 'guitar';

                        if (evt.name === 'Note on' && evt.velocity > 0) {
                            const key = `${channel}_${evt.noteNumber}`;
                            activeNotes.set(key, {
                                tick: evt.tick,
                                vel: evt.velocity / 127.0,
                                pitch: evt.noteNumber,
                                role,
                                channel
                            });
                        } else if ((evt.name === 'Note off') || (evt.name === 'Note on' && evt.velocity === 0)) {
                            const key = `${channel}_${evt.noteNumber}`;
                            if (activeNotes.has(key)) {
                                const onEvt = activeNotes.get(key);
                                activeNotes.delete(key);
                                const durTicks = Math.max(1, evt.tick - onEvt.tick);
                                const startSec = tickToSeconds(onEvt.tick);
                                const endSec = tickToSeconds(evt.tick);
                                const durSec = Math.max(0.05, endSec - startSec);
                                notes.push({
                                    pitch: onEvt.pitch,
                                    vel: onEvt.vel,
                                    startSec,
                                    durSec,
                                    role: onEvt.role,
                                    channel: onEvt.channel
                                });
                            }
                        }
                    }

                    // Flush any unclosed notes
                    for (const [key, onEvt] of activeNotes) {
                        const startSec = tickToSeconds(onEvt.tick);
                        notes.push({
                            pitch: onEvt.pitch,
                            vel: onEvt.vel,
                            startSec,
                            durSec: 0.35,
                            role: onEvt.role,
                            channel: onEvt.channel
                        });
                    }
                });

                notes.sort((a, b) => a.startSec - b.startSec);
                const totalDurationSec = notes.length > 0
                    ? Math.max(...notes.map(n => n.startSec + n.durSec))
                    : 60.0;

                const parsed = {
                    notes,
                    totalDurationSec,
                    nativeBpm: preset.defaultBpm || Math.round(tempoMap[0].bpm),
                    division
                };

                this._parsedMidiCache[presetId] = parsed;
                delete this._loadingPromises[presetId];
                return parsed;
            } catch (err) {
                console.error(`Error loading MIDI file ${url}:`, err);
                delete this._loadingPromises[presetId];
                return null;
            }
        })();

        return this._loadingPromises[presetId];
    }

    /**
     * Start playback sequencer loop.
     */
    start(audioModel, getContextFn, onChordUpdateFn) {
        this.stop();
        if (!audioModel) return;

        const ctx = audioModel._ensureContext();
        if (!ctx) return;

        const context = typeof getContextFn === 'function' ? getContextFn() : {};
        const preset = MidiBackingTrackModel.getPresetById(context.stylePresetId);

        // Apply autonomous smart mastering (10-band studio EQ + convolution reverb)
        if (typeof audioModel.applyStyleMastering === 'function') {
            audioModel.applyStyleMastering(preset.id);
        }

        this.isPlaying = true;
        this.isCountingIn = true;
        this.currentStep = 0;
        this.lastReportedBar = -1;
        this.lastReportedChord = null;
        this.lastReportedSection = null;
        this.scheduledNoteIndex = 0;

        // Eagerly precache instruments for this preset
        if (typeof audioModel.precacheWavInstruments === 'function') {
            audioModel.precacheWavInstruments();
        }
        if (typeof audioModel.predecodeGuitarSamples === 'function') {
            const guitarInst = preset.guitarInstrument || preset.instrumentType || 'clean_guitar';
            const sfName = audioModel.mapInstrumentToSoundfont ? audioModel.mapInstrumentToSoundfont(guitarInst) : 'electric_guitar_clean';
            audioModel.predecodeGuitarSamples(sfName);
        }

        // Load & parse standard MIDI file asynchronously
        this.loadAndParseMidi(preset.id).then(parsed => {
            if (!this.isPlaying) return;
            this.currentParsedSong = parsed;
        });

        // TIME-SIGNATURE AWARE COUNT-IN TIMING SETUP (4/4 -> 4 beats, 3/4 -> 3 beats, 5/4 -> 5 beats, 6/8 -> 6 eighths, 7/8 -> 7 eighths)
        const userBpm = context.bpm || preset.defaultBpm || 120;
        const beatSec = 60.0 / userBpm;
        const isEighthBased = Boolean(preset.timeSignature && preset.timeSignature.endsWith('/8'));
        const countInBeats = preset.countInBeats || preset.beatsPerBar || 4;
        const clickIntervalSec = isEighthBased ? (beatSec / 2) : beatSec;
        const countInStartTime = ctx.currentTime + 0.05;
        const countInDurationSec = countInBeats * clickIntervalSec;
        this.songStartTime = countInStartTime + countInDurationSec;
        this.nextStepTime = this.songStartTime;

        // Schedule the audible drumstick clicks into Web Audio hardware clock
        for (let beat = 1; beat <= countInBeats; beat++) {
            const beatAudioTime = countInStartTime + (beat - 1) * clickIntervalSec;
            if (typeof audioModel.scheduleCountInClick === 'function') {
                audioModel.scheduleCountInClick(beat, beatAudioTime);
            } else {
                audioModel.scheduleDrumHit('crossStick', beatAudioTime, beat === 1 ? 1.0 : 0.8);
            }

            // Timed UI callback updates for visual count-in badge (e.g. Count-in: 1 / 3)
            const msFromNow = Math.max(0, (beatAudioTime - ctx.currentTime) * 1000);
            const timerId = window.setTimeout(() => {
                if (!this.isPlaying || !this.isCountingIn) return;
                if (typeof onChordUpdateFn === 'function') {
                    onChordUpdateFn(null, `Count-in: ${beat} / ${countInBeats}`, preset.scaleRecommendation);
                }
            }, msFromNow);
            this.countInTimers.push(timerId);
        }

        // Timed callback for when count-in ends and song loop begins
        const countInEndMs = Math.max(0, (this.songStartTime - ctx.currentTime) * 1000);
        const endCountInTimer = window.setTimeout(() => {
            if (!this.isPlaying) return;
            this.isCountingIn = false;
            this.lastReportedBar = -1;
            this._reportChordAndSection(preset, 0, context, onChordUpdateFn);
        }, countInEndMs);
        this.countInTimers.push(endCountInTimer);

        const scheduleIntervalMs = 25;
        this.timerId = window.setInterval(() => {
            if (!this.isPlaying) return;
            this._scheduleMidiStream(audioModel, getContextFn, onChordUpdateFn);
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
        if (this.countInTimers && this.countInTimers.length > 0) {
            this.countInTimers.forEach(id => window.clearTimeout(id));
            this.countInTimers = [];
        }
        this.isPlaying = false;
        this.isCountingIn = false;
        this.currentStep = 0;
        this.lastReportedBar = -1;
        this.lastReportedChord = null;
        this.lastReportedSection = null;
        this.scheduledNoteIndex = 0;
    }

    /**
     * High-Precision SMF MIDI Stream Lookahead Scheduler.
     * Schedules parsed MIDI notes directly into Web Audio context for bit-for-bit timing parity.
     */
    _scheduleMidiStream(audioModel, getContextFn, onChordUpdateFn) {
        const ctx = audioModel._ensureContext();
        if (!ctx) return;

        // If currently in 4-beat count-in window, do NOT schedule musical stream yet
        const now = ctx.currentTime;
        if (now < this.songStartTime) {
            return;
        }
        if (this.isCountingIn) {
            this.isCountingIn = false;
        }

        const context = typeof getContextFn === 'function' ? getContextFn() : {};
        const preset = MidiBackingTrackModel.getPresetById(context.stylePresetId);
        const parsed = this._parsedMidiCache[preset.id];

        // If MIDI is still loading from network, fall back to step sequencer temporarily
        if (!parsed || !parsed.notes || parsed.notes.length === 0) {
            this._scheduleLookahead(audioModel, getContextFn, onChordUpdateFn);
            return;
        }

        const userBpm = context.bpm || preset.defaultBpm || parsed.nativeBpm || 120;
        const nativeBpm = parsed.nativeBpm || preset.defaultBpm || 120;
        const timeScale = userBpm / nativeBpm;

        const elapsedRealSec = Math.max(0, now - this.songStartTime);
        let songPosSec = elapsedRealSec * timeScale;

        // Seamless Loop Handling
        if (songPosSec >= parsed.totalDurationSec) {
            this.songStartTime = now;
            songPosSec = 0;
            this.scheduledNoteIndex = 0;
            this.lastReportedBar = -1;
            this.isCountingIn = false;
        }

        // Lookahead window: schedule notes up to 0.16 seconds ahead
        const lookaheadHorizonSongSec = songPosSec + (0.16 * timeScale);

        const guitarBus = audioModel.getMixerChannelBus('guitar');
        const bassBus = audioModel.getMixerChannelBus('bass');
        const drumsBus = audioModel.getMixerChannelBus('drums');
        const keysBus = audioModel.getMixerChannelBus('keys');

        const guitarInstrument = preset.instrumentType || 'clean_guitar';
        const bassInstrument = preset.bassType || 'electric_bass';

        while (this.scheduledNoteIndex < parsed.notes.length) {
            const note = parsed.notes[this.scheduledNoteIndex];
            if (note.startSec > lookaheadHorizonSongSec) break;

            const noteAudioStartTime = this.songStartTime + (note.startSec / timeScale);
            const noteAudioDuration = Math.max(0.06, note.durSec / timeScale);

            if (noteAudioStartTime >= now - 0.04) {
                if (typeof audioModel.playAccompanimentNote === 'function') {
                    if (note.role === 'drums') {
                        const drumType = MidiBackingTrackModel.GM_DRUM_MAP[note.pitch] || 'snare';
                        audioModel.scheduleDrumHit(drumType, noteAudioStartTime, note.vel * 0.95);
                    } else if (note.role === 'guitar') {
                        audioModel.playAccompanimentNote('guitar', guitarInstrument, note.pitch, noteAudioStartTime, noteAudioDuration, note.vel, guitarBus);
                    } else if (note.role === 'bass') {
                        audioModel.playAccompanimentNote('bass', bassInstrument, note.pitch, noteAudioStartTime, noteAudioDuration, note.vel * 0.95, bassBus);
                    } else if (note.role === 'keys') {
                        audioModel.playAccompanimentNote('keys', 'electric_piano', note.pitch, noteAudioStartTime, noteAudioDuration, note.vel * 0.85, keysBus);
                    }
                } else {
                    if (note.role === 'drums') {
                        const drumType = MidiBackingTrackModel.GM_DRUM_MAP[note.pitch] || 'snare';
                        audioModel.scheduleDrumHit(drumType, noteAudioStartTime, note.vel * 0.95);
                    } else if (note.role === 'guitar') {
                        audioModel.playWavNote(guitarInstrument, note.pitch, noteAudioStartTime, noteAudioDuration, note.vel, guitarBus);
                    } else if (note.role === 'bass') {
                        audioModel.playWavNote(bassInstrument, note.pitch, noteAudioStartTime, noteAudioDuration, note.vel * 0.95, bassBus);
                    } else if (note.role === 'keys') {
                        audioModel.playWavNote('electric_piano', note.pitch, noteAudioStartTime, noteAudioDuration, note.vel * 0.85, keysBus);
                    }
                }
            }
            this.scheduledNoteIndex++;
        }

        // Live Measure, Chord & Section Tracking
        const beatsPerBar = preset.beatsPerBar || 4;
        const barDurationSec = (60.0 / userBpm) * beatsPerBar;
        const currentBar = Math.floor(songPosSec / barDurationSec);

        if (currentBar !== this.lastReportedBar && typeof onChordUpdateFn === 'function') {
            this.lastReportedBar = currentBar;
            this._reportChordAndSection(preset, currentBar, context, onChordUpdateFn);
        }
    }

    /**
     * Report current chord and section to UI badges.
     */
    _reportChordAndSection(preset, barIndex, context, onChordUpdateFn) {
        if (!preset || typeof onChordUpdateFn !== 'function') return;
        const totalSlots = (preset.progression && preset.progression.length) || 4;
        const slotIndex = barIndex % totalSlots;
        const chordSlot = preset.progression ? preset.progression[slotIndex] : null;

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

        if (chordSlot) {
            const scaleRootIdx = (context.rootNoteIdx !== undefined && context.rootNoteIdx !== null)
                ? context.rootNoteIdx
                : (preset.defaultRootIdx !== undefined ? preset.defaultRootIdx : 0);
            
            const isSharps = context.accidentalMode !== 'flats';
            const NOTES = isSharps
                ? ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
                : ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

            const chordRootIdx = ((scaleRootIdx + (chordSlot.rootOffset || 0)) % 12 + 12) % 12;
            const chordRootName = NOTES[chordRootIdx];
            const chordLabel = `${chordRootName}${chordSlot.suffix || ''} (${chordSlot.degreeRoman || ''})`;
            const sectionLabel = `${currentSection} [${barInSection}/${totalSectionBars}]`;

            if (this.lastReportedChord !== chordLabel || this.lastReportedSection !== sectionLabel) {
                this.lastReportedChord = chordLabel;
                this.lastReportedSection = sectionLabel;
                onChordUpdateFn(chordLabel, sectionLabel, preset.scaleRecommendation);
            }
        }
    }

    /**
     * Resolve a drum hit step definition (supports raw step numbers and { step, vel } objects).
     */
    _getDrumHit(hits, currentStep) {
        if (!hits || !Array.isArray(hits)) return null;
        for (const item of hits) {
            if (typeof item === 'number' && item === currentStep) {
                return { vel: 0.85 };
            } else if (typeof item === 'object' && item !== null && item.step === currentStep) {
                const vel = item.vel !== undefined ? item.vel : (item.velocity !== undefined ? item.velocity : 0.85);
                return { vel };
            }
        }
        return null;
    }

    /**
     * Lookahead scheduling engine for real-time synchronization.
     */
    _scheduleLookahead(audioModel, getContextFn, onChordUpdateFn) {
        const ctx = audioModel._ensureContext();
        if (!ctx) return;
        if (ctx.currentTime < this.songStartTime) return;

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

                // 1. DRUMS (with velocity & emphasis dynamics)
                if (preset.drums) {
                    if (preset.drums.crash && (barIndex % 4 === 0)) {
                        const hit = this._getDrumHit(preset.drums.crash, barStep);
                        if (hit) audioModel.scheduleDrumHit('crash', this.nextStepTime, hit.vel, context.isEnabled);
                    }
                    if (preset.drums.kick) {
                        const hit = this._getDrumHit(preset.drums.kick, barStep);
                        if (hit) audioModel.scheduleDrumHit('kick', this.nextStepTime, hit.vel, context.isEnabled);
                    }
                    if (preset.drums.snare) {
                        const hit = this._getDrumHit(preset.drums.snare, barStep);
                        if (hit) audioModel.scheduleDrumHit('snare', this.nextStepTime, hit.vel, context.isEnabled);
                    }
                    if (preset.drums.ghostSnare) {
                        const hit = this._getDrumHit(preset.drums.ghostSnare, barStep);
                        if (hit) audioModel.scheduleDrumHit('ghostSnare', this.nextStepTime, hit.vel, context.isEnabled);
                    }
                    if (preset.drums.crossStick) {
                        const hit = this._getDrumHit(preset.drums.crossStick, barStep);
                        if (hit) audioModel.scheduleDrumHit('crossStick', this.nextStepTime, hit.vel, context.isEnabled);
                    }
                    if (preset.drums.rim) {
                        const hit = this._getDrumHit(preset.drums.rim, barStep);
                        if (hit) audioModel.scheduleDrumHit('rim', this.nextStepTime, hit.vel, context.isEnabled);
                    }
                    if (preset.drums.hihatClosed) {
                        const hit = this._getDrumHit(preset.drums.hihatClosed, barStep);
                        if (hit) audioModel.scheduleDrumHit('hihatClosed', this.nextStepTime, hit.vel, context.isEnabled);
                    }
                    if (preset.drums.hihatOpen) {
                        const hit = this._getDrumHit(preset.drums.hihatOpen, barStep);
                        if (hit) audioModel.scheduleDrumHit('hihatOpen', this.nextStepTime, hit.vel, context.isEnabled);
                    }
                    if (preset.drums.ride) {
                        const hit = this._getDrumHit(preset.drums.ride, barStep);
                        if (hit) audioModel.scheduleDrumHit('ride', this.nextStepTime, hit.vel, context.isEnabled);
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
        const filename = preset.midiFile || '01_blues_12bar_a7_74bpm.mid';
        const midiUrl = `midi_tracks/${filename}`;
        
        const a = document.createElement('a');
        a.href = midiUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

MidiBackingTrackModel.GM_DRUM_MAP = {
    35: 'kick',        // Acoustic Bass Drum
    36: 'kick',        // Bass Drum 1
    37: 'crossStick',   // Side Stick
    38: 'snare',       // Acoustic Snare
    40: 'snare',       // Electric Snare
    41: 'tomLow',      // Low Floor Tom
    42: 'hihatClosed', // Closed Hi-Hat
    43: 'tomLow',      // High Floor Tom
    44: 'hihatClosed', // Pedal Hi-Hat
    45: 'tomMid',      // Low Tom
    46: 'hihatOpen',   // Open Hi-Hat
    47: 'tomMid',      // Low-Mid Tom
    48: 'tomHigh',     // Hi-Mid Tom
    49: 'crash',       // Crash Cymbal 1
    50: 'tomHigh',     // High Tom
    51: 'ride',        // Ride Cymbal 1
    52: 'crash',       // Chinese Cymbal
    53: 'ride',        // Ride Bell
    55: 'crash',       // Splash Cymbal
    57: 'crash',       // Crash 2
    59: 'ride'         // Ride 2
};

window.GuitarApp.Models.MidiBackingTrackModel = MidiBackingTrackModel;
