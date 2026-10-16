/**
 * ==========================================================================
 * VIEWMODEL LAYER: FretboardViewModel
 * Connects the Models (MusicTheoryModel, AudioEngineModel, FretboardStateModel)
 * to the Views. Computes presentation data and handles all user actions/commands.
 * ==========================================================================
 */
window.GuitarApp = window.GuitarApp || {};
window.GuitarApp.ViewModels = window.GuitarApp.ViewModels || {};

class FretboardViewModel {
    constructor(stateModel, theoryModel, audioModel) {
        this.stateModel = stateModel;
        this.TheoryModel = theoryModel;
        this.audioModel = audioModel;
        this.viewListeners = [];

        // Forward state changes from Model to registered Views
        this.stateModel.subscribe(() => {
            this.notifyViews();
        });
    }

    /**
     * Register a View update callback.
     */
    onViewUpdate(callback) {
        if (typeof callback === 'function') {
            this.viewListeners.push(callback);
        }
    }

    /**
     * Notify all subscribed Views to render with fresh ViewModel data.
     */
    notifyViews() {
        this.viewListeners.forEach(cb => cb(this));
    }

    // ========================================================================
    // COMPUTED PROPERTIES / PRESENTATION DATA FOR VIEWS
    // ========================================================================

    get state() {
        return this.stateModel.getState();
    }

    getNoteName(noteIdx) {
        return this.TheoryModel.getNoteName(noteIdx, this.state.accidentalMode);
    }

    getOrderedStrings() {
        return this.stateModel.getOrderedStrings();
    }

    getActiveBoxFretRange() {
        return this.TheoryModel.calculateBoxFretRange(this.state.clickedRoot, this.state.boxSpanMode);
    }

    /**
     * Evaluate a single (stringObj, fret) cell on the fretboard and return its display metadata.
     */
    evaluateFretCell(stringObj, fret) {
        const s = this.state;
        const noteIdx = (stringObj.openNoteIdx + fret) % 12;
        const noteName = this.getNoteName(noteIdx);
        const midiPitch = this.TheoryModel.getStringMidiPitch(stringObj, fret);

        // MODE 1: Single Note Visualization
        if (s.appMode === 'note') {
            if (s.selectedNoteIdx === null) {
                return { visible: false, noteIdx, noteName, midiPitch };
            }
            const isMatch = noteIdx === s.selectedNoteIdx;
            return {
                visible: isMatch,
                isGhost: false,
                colorClass: 'bg-red-600 border-white text-white shadow-md shadow-red-950/60',
                label: noteName,
                subLabel: '',
                noteIdx,
                noteName,
                midiPitch
            };
        }

        // MODE 2: Musical Mode in Box Shape
        if (!s.clickedRoot) {
            return { visible: false, noteIdx, noteName, midiPitch };
        }

        const modeData = this.TheoryModel.MUSICAL_MODES[s.selectedMusicalMode];
        const rootNoteIdx = s.clickedRoot.noteIdx;
        const semitoneFromRoot = ((noteIdx - rootNoteIdx) % 12 + 12) % 12;
        const degreeIndex = modeData.intervals.indexOf(semitoneFromRoot); // 0..6 or -1 if not in scale

        if (degreeIndex === -1) {
            return {
                visible: false,
                noteIdx,
                noteName,
                midiPitch
            };
        }

        // Determine Box Window Membership
        const { minFret, maxFret } = this.getActiveBoxFretRange();
        const inBox = (fret >= minFret && fret <= maxFret);

        if (!inBox && !s.showGhostNotes) {
            return {
                visible: false,
                noteIdx,
                noteName,
                midiPitch
            };
        }

        let colorClass = '';
        let roleTitle = '';

        const isClickedExactRoot = (
            stringObj.stringNum === s.clickedRoot.stringNum &&
            fret === s.clickedRoot.fret
        );
        const isTritone = this.TheoryModel.isTritoneDegree(modeData, degreeIndex);

        if (degreeIndex === 0) {
            // ROOT NOTE (GREEN)
            colorClass = isClickedExactRoot
                ? 'bg-green-600 border-yellow-300 ring-4 ring-emerald-400/50 text-white shadow-lg'
                : 'bg-green-600 border-white text-white shadow-md';
            roleTitle = 'Root (1st)';
        } else if (isTritone) {
            // TRITONE NOTES IN THE SCALE (BLUE)
            colorClass = 'bg-sky-500 border-white text-white shadow-md';
            roleTitle = `${modeData.degreeNames[degreeIndex]} (Tritone)`;
        } else {
            // PENTATONIC CORE NOTES (RED)
            colorClass = 'bg-red-600 border-white text-white shadow-md';
            roleTitle = `${modeData.degreeNames[degreeIndex]} Degree`;
        }

        const degreeText = modeData.degreeNames[degreeIndex];
        const displayLabel = noteName;

        return {
            visible: true,
            isGhost: !inBox,
            isClickedExactRoot,
            colorClass,
            label: displayLabel,
            degreeText,
            roleTitle,
            noteIdx,
            noteName,
            midiPitch
        };
    }

    /**
     * Computed view data for the Top Navigation Header View.
     */
    getHeaderViewData() {
        const s = this.state;
        const tabLabels = {
            note: 'Note visualization',
            scale: 'Modes visualization',
            settings: 'Settings'
        };
        return {
            activeTab: s.activeTab,
            activeTabLabel: tabLabels[s.activeTab] || 'Note visualization',
            isHamburgerOpen: s.isHamburgerOpen,
            tabs: ['note', 'scale', 'settings'].map(key => ({
                key,
                label: tabLabels[key],
                isActive: key === s.activeTab
            }))
        };
    }

    /**
     * Computed view data for the Fretboard Stage View.
     */
    getFretboardViewData() {
        const s = this.state;
        const isSettingsTab = s.activeTab === 'settings';
        const orderedStrings = this.getOrderedStrings().map(str => ({
            ...str,
            openNoteName: this.getNoteName(str.openNoteIdx)
        }));
        const tuningBadgeText = s.guitarStrings.map(str => this.getNoteName(str.openNoteIdx)).join(' ');
        const { minFret, maxFret } = this.getActiveBoxFretRange();

        // Status Bar Title & Subtitle
        let diagramModeTitle = 'Note Visualization';
        let diagramModeSubtitle = '';
        let showBoxBadge = false;
        let boxBadgeText = '';

        if (s.appMode === 'note') {
            diagramModeTitle = 'Note Visualization';
            showBoxBadge = false;
            if (s.selectedNoteIdx === null) {
                diagramModeSubtitle = 'Board cleared — pick a note below or click any fret on the guitar';
            } else {
                const noteName = this.getNoteName(s.selectedNoteIdx);
                diagramModeSubtitle = `Displaying all "${noteName}" notes across the fretboard`;
            }
        } else {
            const modeObj = this.TheoryModel.MUSICAL_MODES[s.selectedMusicalMode];
            diagramModeTitle = 'Modes Visualization';
            if (!s.clickedRoot) {
                showBoxBadge = false;
                diagramModeSubtitle = `Pick a root note below or click any fret (0–22) on the guitar for ${modeObj.name}`;
            } else {
                showBoxBadge = true;
                const rootName = this.getNoteName(s.clickedRoot.noteIdx);
                const fretLabel = s.clickedRoot.fret === 0 ? 'Fret 0 (Open Nut)' : `Fret ${s.clickedRoot.fret}`;
                diagramModeSubtitle = `Root: ${rootName} (String ${s.clickedRoot.stringNum}, ${fretLabel}) • ${modeObj.name} Mode`;
                boxBadgeText = s.boxSpanMode === 'full'
                    ? 'Full Fretboard View'
                    : `Box Window: Frets ${minFret} to ${maxFret}`;
            }
        }

        // Build Fret Columns (0..22) and count Mode 1 matches
        let mode1MatchCount = 0;
        const fretColumns = [];

        for (let fret = 0; fret <= this.TheoryModel.TOTAL_FRETS; fret++) {
            const weight = this.TheoryModel.getFretWidthWeight(fret);
            const isInActiveBox = (
                s.appMode === 'scale' &&
                s.clickedRoot !== null &&
                s.boxSpanMode !== 'full' &&
                fret >= minFret &&
                fret <= maxFret
            );
            const isSingleInlay = this.TheoryModel.SINGLE_INLAY_FRETS.includes(fret);
            const isDoubleInlay = this.TheoryModel.DOUBLE_INLAY_FRETS.includes(fret);

            const cells = orderedStrings.map(strObj => {
                const cellData = this.evaluateFretCell(strObj, fret);
                if (s.appMode === 'note' && cellData.visible) {
                    mode1MatchCount++;
                }
                return {
                    stringObj: strObj,
                    fret,
                    cellData,
                    showDegreeSubLabel: s.appMode === 'scale' && s.showDegrees
                };
            });

            fretColumns.push({
                fret,
                weight,
                isInActiveBox,
                isSingleInlay,
                isDoubleInlay,
                cells
            });
        }

        this._lastMode1MatchCount = mode1MatchCount;

        return {
            isSettingsTab,
            diagramModeTitle,
            diagramModeSubtitle,
            showBoxBadge,
            boxBadgeText,
            tuningBadgeText,
            orderedStrings,
            fretColumns,
            mode1MatchCount
        };
    }

    /**
     * Computed view data for the Bottom Configuration Panels & Tuning Modal Views.
     */
    getConfigViewData() {
        const s = this.state;
        const isSettingsTab = s.activeTab === 'settings';

        // 12 chromatic notes for Quick Pick pills
        const notePills = [];
        for (let i = 0; i < 12; i++) {
            notePills.push({
                noteIdx: i,
                name: this.getNoteName(i),
                isSelectedSingleNote: i === s.selectedNoteIdx,
                isSelectedModeRoot: Boolean(s.clickedRoot && s.clickedRoot.noteIdx === i)
            });
        }

        const modeObj = this.TheoryModel.MUSICAL_MODES[s.selectedMusicalMode];

        // Strings for inline tuning (6th to 1st)
        const inlineTuningStrings = s.guitarStrings.map(strObj => ({
            ...strObj,
            options: Array.from({ length: 12 }, (_, idx) => ({
                noteIdx: idx,
                label: this.getNoteName(idx),
                selected: idx === strObj.openNoteIdx
            }))
        }));

        // Strings for modal tuning (1st to 6th top-to-bottom)
        const modalTuningStrings = this.getOrderedStrings().map(strObj => ({
            ...strObj,
            options: Array.from({ length: 12 }, (_, idx) => ({
                noteIdx: idx,
                label: this.TheoryModel.getDualNoteLabel(idx),
                selected: idx === strObj.openNoteIdx
            }))
        }));

        return {
            activeTab: s.activeTab,
            isSettingsTab,
            notePills,
            selectedNoteStatusName: s.selectedNoteIdx === null ? 'None' : this.getNoteName(s.selectedNoteIdx),
            mode1MatchCount: this._lastMode1MatchCount ?? 0,
            selectedMusicalMode: s.selectedMusicalMode,
            currentModeInfo: modeObj,
            hasClickedRoot: Boolean(s.clickedRoot),
            boxSpanMode: s.boxSpanMode,
            showDegrees: s.showDegrees,
            showGhostNotes: s.showGhostNotes,
            accidentalMode: s.accidentalMode,
            audioEnabled: s.audioEnabled,
            isTuningModalOpen: s.isTuningModalOpen,
            inlineTuningStrings,
            modalTuningStrings
        };
    }

    // ========================================================================
    // COMMANDS / USER ACTIONS
    // ========================================================================

    toggleHamburgerMenu() {
        this.stateModel.setState({
            isHamburgerOpen: !this.state.isHamburgerOpen
        });
    }

    closeHamburgerMenu() {
        if (this.state.isHamburgerOpen) {
            this.stateModel.setState({ isHamburgerOpen: false });
        }
    }

    selectTabFromMenu(tabKey) {
        const updates = {
            activeTab: tabKey,
            isHamburgerOpen: false
        };
        if (tabKey === 'note' || tabKey === 'scale') {
            updates.appMode = tabKey;
        }
        this.stateModel.setState(updates);
    }

    selectSingleNote(val) {
        const selectedNoteIdx = (val === '' || val === null || val === undefined)
            ? null
            : parseInt(val, 10);

        if (selectedNoteIdx !== null) {
            // Audition note on 6th string when picked from quick bar
            const sixthString = this.stateModel.getStringByNumber(6) || this.state.guitarStrings[0];
            const fretOn6th = ((selectedNoteIdx - sixthString.openNoteIdx) % 12 + 12) % 12;
            const pitch = this.TheoryModel.getStringMidiPitch(sixthString, fretOn6th);
            this.audioModel.playGuitarNote(pitch, this.state.audioEnabled);
        }

        this.stateModel.setState({ selectedNoteIdx });
    }

    quickPickModeRoot(noteIdx) {
        const sixthString = this.stateModel.getStringByNumber(6) || this.state.guitarStrings[0];
        const fretOn6th = ((noteIdx - sixthString.openNoteIdx) % 12 + 12) % 12;
        const clickedRoot = {
            stringNum: sixthString.stringNum,
            fret: fretOn6th,
            noteIdx: noteIdx
        };
        const pitch = this.TheoryModel.getStringMidiPitch(sixthString, fretOn6th);
        this.audioModel.playGuitarNote(pitch, this.state.audioEnabled);
        this.stateModel.setState({ clickedRoot });
    }

    setMusicalMode(modeKey) {
        if (this.TheoryModel.MUSICAL_MODES[modeKey]) {
            this.stateModel.setState({ selectedMusicalMode: modeKey });
        }
    }

    setBoxSpanMode(spanKey) {
        this.stateModel.setState({ boxSpanMode: spanKey });
    }

    toggleDegreeLabels() {
        this.stateModel.setState({ showDegrees: !this.state.showDegrees });
    }

    toggleGhostNotes() {
        this.stateModel.setState({ showGhostNotes: !this.state.showGhostNotes });
    }

    handleFretClick(stringNum, fret) {
        const strObj = this.stateModel.getStringByNumber(stringNum);
        if (!strObj) return;

        const cellData = this.evaluateFretCell(strObj, fret);
        this.audioModel.playGuitarNote(cellData.midiPitch, this.state.audioEnabled);

        if (this.state.appMode === 'note') {
            this.stateModel.setState({ selectedNoteIdx: cellData.noteIdx });
        } else {
            this.stateModel.setState({
                clickedRoot: {
                    stringNum: strObj.stringNum,
                    fret: fret,
                    noteIdx: cellData.noteIdx
                }
            });
        }
    }

    /**
     * Play all scale notes inside the active box window ascending from 6th string to 1st string.
     */
    playActiveBoxScale() {
        const s = this.state;
        if (s.appMode !== 'scale' || !s.clickedRoot) return;

        const { minFret, maxFret } = this.getActiveBoxFretRange();
        const pitches = [];

        // Traverse from 6th string (lowest) to 1st string (highest)
        s.guitarStrings.forEach(strObj => {
            for (let fret = minFret; fret <= maxFret; fret++) {
                const cell = this.evaluateFretCell(strObj, fret);
                if (cell.visible && !cell.isGhost) {
                    pitches.push(cell.midiPitch);
                }
            }
        });

        this.audioModel.playNoteSequence(pitches, s.audioEnabled, 150);
    }

    resetBoard() {
        this.audioModel.stopSequence();
        this.stateModel.resetToStandard();
    }

    toggleAudio() {
        const nextAudio = !this.state.audioEnabled;
        if (!nextAudio) {
            this.audioModel.stopSequence();
        }
        this.stateModel.setState({ audioEnabled: nextAudio });
    }

    setAccidentalMode(mode) {
        if (mode === 'sharps' || mode === 'flats') {
            this.stateModel.setState({ accidentalMode: mode });
        }
    }

    tuneSingleString(stringNum, newNoteIdx) {
        const target = this.stateModel.getStringByNumber(stringNum);
        if (!target) return;

        target.openNoteIdx = newNoteIdx;
        if (this.state.clickedRoot && this.state.clickedRoot.stringNum === stringNum) {
            this.state.clickedRoot.noteIdx = (newNoteIdx + this.state.clickedRoot.fret) % 12;
        }
        const pitch = this.TheoryModel.getStringMidiPitch(target, 0);
        this.audioModel.playGuitarNote(pitch, this.state.audioEnabled);
        this.stateModel.notify();
    }

    applyTuningPreset(noteIndices6to1) {
        if (!Array.isArray(noteIndices6to1) || noteIndices6to1.length !== 6) return;

        this.state.guitarStrings.forEach((str, idx) => {
            str.openNoteIdx = noteIndices6to1[idx];
        });

        if (this.state.clickedRoot) {
            const strObj = this.stateModel.getStringByNumber(this.state.clickedRoot.stringNum);
            if (strObj) {
                this.state.clickedRoot.noteIdx = (strObj.openNoteIdx + this.state.clickedRoot.fret) % 12;
            }
        }
        this.stateModel.notify();
    }

    openTuningModal() {
        this.stateModel.setState({ isTuningModalOpen: true });
    }

    closeTuningModal() {
        this.stateModel.setState({ isTuningModalOpen: false });
    }
}

window.GuitarApp.ViewModels.FretboardViewModel = FretboardViewModel;
