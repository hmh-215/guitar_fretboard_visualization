/**
 * ==========================================================================
 * MODEL LAYER: MusicTheoryModel
 * Holds static music theory constants (notes, tunings, 7 diatonic modes,
 * fret inlays) and pure domain calculation methods.
 * ==========================================================================
 */
window.GuitarApp = window.GuitarApp || {};
window.GuitarApp.Models = window.GuitarApp.Models || {};

class MusicTheoryModel {
    static NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    static NOTES_FLAT  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

    // Standard tuning reference from 6th string (thickest, Low E) to 1st string (thinnest, High E)
    static STANDARD_STRINGS = [
        { stringNum: 6, openNoteIdx: 4, baseMidi: 40, thickness: 4.4, wound: true,  desc: '6th String (Thickest)' },
        { stringNum: 5, openNoteIdx: 9, baseMidi: 45, thickness: 3.6, wound: true,  desc: '5th String' },
        { stringNum: 4, openNoteIdx: 2, baseMidi: 50, thickness: 2.8, wound: true,  desc: '4th String' },
        { stringNum: 3, openNoteIdx: 7, baseMidi: 55, thickness: 2.1, wound: false, desc: '3rd String' },
        { stringNum: 2, openNoteIdx: 11, baseMidi: 59, thickness: 1.6, wound: false, desc: '2nd String' },
        { stringNum: 1, openNoteIdx: 4, baseMidi: 64, thickness: 1.2, wound: false, desc: '1st String (Thinnest)' }
    ];

    static TUNING_PRESETS = [
        { id: 'standard',    label: 'Standard (E A D G B E)',       modalLabel: 'Standard (E A D G B E)',       notes: [4, 9, 2, 7, 11, 4] },
        { id: 'drop_d',      label: 'Drop D',                       modalLabel: 'Drop D (D A D G B E)',         notes: [2, 9, 2, 7, 11, 4] },
        { id: 'eb_standard', label: 'Eb Standard',                  modalLabel: 'Eb Standard (Half-Step Down)', notes: [3, 8, 1, 6, 10, 3] },
        { id: 'open_g',      label: 'Open G',                       modalLabel: 'Open G (D G D G B D)',         notes: [2, 7, 2, 7, 11, 2] },
        { id: 'dadgad',      label: 'DADGAD',                       modalLabel: 'DADGAD',                       notes: [2, 9, 2, 7, 9, 2] }
    ];

    // 7 Diatonic Modes with semitone intervals from Root (1st, 2nd, 3rd, 4th, 5th, 6th, 7th degrees)
    static MUSICAL_MODES = {
        ionian: {
            name: 'Ionian (Major)',
            intervals: [0, 2, 4, 5, 7, 9, 11],
            degreeNames: ['R', '2', '3', '4', '5', '6', '7'],
            description: 'Bright, happy, and resolved major scale sound.'
        },
        dorian: {
            name: 'Dorian',
            intervals: [0, 2, 3, 5, 7, 9, 10],
            degreeNames: ['R', '2', 'b3', '4', '5', '6', 'b7'],
            description: 'Minor scale with a raised natural 6th; soulful jazz/rock vibe.'
        },
        phrygian: {
            name: 'Phrygian',
            intervals: [0, 1, 3, 5, 7, 8, 10],
            degreeNames: ['R', 'b2', 'b3', '4', '5', 'b6', 'b7'],
            description: 'Exotic, Spanish/Flamenco minor sound featuring the flat 2nd.'
        },
        lydian: {
            name: 'Lydian',
            intervals: [0, 2, 4, 6, 7, 9, 11],
            degreeNames: ['R', '2', '3', '#4', '5', '6', '7'],
            description: 'Dreamy, floating major sound featuring the raised #4th.'
        },
        mixolydian: {
            name: 'Mixolydian',
            intervals: [0, 2, 4, 5, 7, 9, 10],
            degreeNames: ['R', '2', '3', '4', '5', '6', 'b7'],
            description: 'Bluesy, upbeat dominant 7th scale with a flat 7th.'
        },
        aeolian: {
            name: 'Aeolian (Natural Minor)',
            intervals: [0, 2, 3, 5, 7, 8, 10],
            degreeNames: ['R', '2', 'b3', '4', '5', 'b6', 'b7'],
            description: 'Classic melancholic and serious natural minor scale.'
        },
        locrian: {
            name: 'Locrian',
            intervals: [0, 1, 3, 5, 6, 8, 10],
            degreeNames: ['R', 'b2', 'b3', '4', 'b5', 'b6', 'b7'],
            description: 'Tense, unstable half-diminished mode with flat 2nd and flat 5th.'
        }
    };

    static TOTAL_FRETS = 22;
    static SINGLE_INLAY_FRETS = [3, 5, 7, 9, 15, 17, 19, 21];
    static DOUBLE_INLAY_FRETS = [12];

    /**
     * Clone the default standard guitar strings configuration.
     */
    static cloneStandardStrings() {
        return JSON.parse(JSON.stringify(MusicTheoryModel.STANDARD_STRINGS));
    }

    /**
     * Return note name (e.g. 'C#' or 'Db') for a 0..11 pitch class index.
     */
    static getNoteName(noteIdx, accidentalMode = 'sharps') {
        const normalized = ((noteIdx % 12) + 12) % 12;
        return accidentalMode === 'sharps'
            ? MusicTheoryModel.NOTES_SHARP[normalized]
            : MusicTheoryModel.NOTES_FLAT[normalized];
    }

    /**
     * Return dual sharp/flat label for tuning selectors (e.g. 'C# / Db' or 'C').
     */
    static getDualNoteLabel(noteIdx) {
        const normalized = ((noteIdx % 12) + 12) % 12;
        const sharp = MusicTheoryModel.NOTES_SHARP[normalized];
        const flat = MusicTheoryModel.NOTES_FLAT[normalized];
        return sharp !== flat ? `${sharp} / ${flat}` : sharp;
    }

    /**
     * Calculate exact MIDI pitch for a given string and fret, accounting for custom tuning offset.
     */
    static getStringMidiPitch(stringObj, fret) {
        const stdStr = MusicTheoryModel.STANDARD_STRINGS.find(s => s.stringNum === stringObj.stringNum);
        let diff = stringObj.openNoteIdx - stdStr.openNoteIdx;
        if (diff > 6) diff -= 12;
        if (diff < -6) diff += 12;
        return stdStr.baseMidi + diff + fret;
    }

    /**
     * Compute the active fret range for the Box Shape in Mode 2 (including Fret 0 open string support).
     */
    static calculateBoxFretRange(clickedRoot, boxSpanMode) {
        if (!clickedRoot) {
            return { minFret: 0, maxFret: 0 };
        }
        const rootFret = clickedRoot.fret;
        if (boxSpanMode === 'full') {
            return { minFret: 0, maxFret: MusicTheoryModel.TOTAL_FRETS };
        }

        let minOffset = -1;
        let maxOffset = 2;

        if (boxSpanMode === 'standard') {
            if (rootFret === 0) {
                return { minFret: 0, maxFret: 3 };
            }
            minOffset = -1;
            maxOffset = 2;
        } else if (boxSpanMode === 'wide') {
            if (rootFret === 0) {
                return { minFret: 0, maxFret: 4 };
            }
            minOffset = -1;
            maxOffset = 3;
        } else if (boxSpanMode === 'left') {
            minOffset = -2;
            maxOffset = 1;
        } else if (boxSpanMode === 'forward') {
            minOffset = 0;
            maxOffset = 3;
        }

        const minFret = Math.max(0, rootFret + minOffset);
        const maxFret = Math.min(MusicTheoryModel.TOTAL_FRETS, rootFret + maxOffset);

        return { minFret, maxFret };
    }

    /**
     * Determines whether a scale degree (0..6) in the given mode is part of the diatonic tritone pair
     * (the two notes in the mode that are 6 semitones / a tritone apart).
     */
    static isTritoneDegree(modeData, degreeIndex) {
        const semitone = modeData.intervals[degreeIndex];
        const partnerSemitone = (semitone + 6) % 12;
        return modeData.intervals.includes(partnerSemitone);
    }

    /**
     * Calculate proportional flex width weight for a fret column (logarithmic taper down the neck).
     */
    static getFretWidthWeight(fret) {
        return fret === 0 ? 0.72 : Math.max(0.72, 1.35 - (fret * 0.026));
    }
}

window.GuitarApp.Models.MusicTheoryModel = MusicTheoryModel;
