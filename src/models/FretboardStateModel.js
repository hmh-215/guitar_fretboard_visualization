/**
 * ==========================================================================
 * MODEL LAYER: FretboardStateModel
 * Reactive state store holding all application state and notifying
 * subscribed ViewModels when changes occur.
 * ==========================================================================
 */
window.GuitarApp = window.GuitarApp || {};
window.GuitarApp.Models = window.GuitarApp.Models || {};

class FretboardStateModel {
    constructor(TheoryModel) {
        this.TheoryModel = TheoryModel;
        this.listeners = [];

        // Initial application state matching guitar_fretboard_visualizer.html
        this.state = {
            activeTab: 'note',         // 'note' | 'scale' | 'settings'
            appMode: 'note',           // 'note' (Note visualization) | 'scale' (Modes visualization)
            selectedNoteIdx: 7,        // Default 7 = 'G' (or null when reset)
            selectedMusicalMode: 'ionian',

            // Clicked Root Note in Mode 2 (can be null after Reset, or { stringNum, fret, noteIdx })
            clickedRoot: {
                stringNum: 6,
                fret: 8,
                noteIdx: 0             // 0 = 'C'
            },

            boxSpanMode: 'standard',   // 'standard' (-1 to +2), 'wide' (-1 to +3), 'left' (-2 to +1), 'forward' (0 to +3), 'full'
            showDegrees: false,
            showGhostNotes: false,
            accidentalMode: 'sharps',  // 'sharps' | 'flats'
            audioEnabled: true,

            // UI Overlay states
            isHamburgerOpen: false,
            isTuningModalOpen: false,

            // Mutable runtime strings array (6th string to 1st string)
            guitarStrings: TheoryModel.cloneStandardStrings()
        };
    }

    /**
     * Subscribe a listener callback to state changes.
     */
    subscribe(listener) {
        if (typeof listener === 'function') {
            this.listeners.push(listener);
        }
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Notify all subscribers of the current state.
     */
    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }

    /**
     * Retrieve current state snapshot.
     */
    getState() {
        return this.state;
    }

    /**
     * Shallow-merge partial state updates and notify subscribers.
     */
    setState(partialState) {
        Object.assign(this.state, partialState);
        this.notify();
    }

    /**
     * Return strings ordered with 1st string (thinnest) at Top and 6th string (thickest) at Bottom.
     */
    getOrderedStrings() {
        return [...this.state.guitarStrings].reverse();
    }

    /**
     * Find a string configuration object by its string number (1..6).
     */
    getStringByNumber(stringNum) {
        return this.state.guitarStrings.find(s => s.stringNum === stringNum);
    }

    /**
     * Reset strings to standard tuning and clear active selections on the board.
     */
    resetToStandard() {
        this.state.guitarStrings = this.TheoryModel.cloneStandardStrings();
        this.state.selectedNoteIdx = null;
        this.state.clickedRoot = null;
        this.notify();
    }
}

window.GuitarApp.Models.FretboardStateModel = FretboardStateModel;
