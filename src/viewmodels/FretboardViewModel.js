/**
 * ==========================================================================
 * VIEWMODEL LAYER: FretboardViewModel
 * Connects the Models (MusicTheoryModel, AudioEngineModel, FretboardStateModel,
 * MidiBackingTrackModel) to the Views. Computes presentation data and handles
 * all user actions/commands.
 * ==========================================================================
 */
window.GuitarApp = window.GuitarApp || {};
window.GuitarApp.ViewModels = window.GuitarApp.ViewModels || {};

class FretboardViewModel {
    constructor(stateModel, theoryModel, audioModel, midiBackingModel) {
        this.stateModel = stateModel;
        this.TheoryModel = theoryModel;
        this.audioModel = audioModel;
        this.midiBackingModel = midiBackingModel;
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

    /**
     * Automatically resolves whether notation should be 'sharps' or 'flats'
     * based on the active Musical Mode and Root Note (Parent Major scale key signature).
     */
    get accidentalMode() {
        return this.TheoryModel.resolveAccidentalMode(this.state);
    }

    getNoteName(noteIdx) {
        return this.TheoryModel.getNoteName(noteIdx, this.accidentalMode);
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

        // MODE 1: Note Visualization (Single Root or 2 Notes in Relation)
        if (s.appMode === 'note') {
            if (s.selectedNoteIdx === null) {
                return { visible: false, noteIdx, noteName, midiPitch };
            }

            const relations = this.TheoryModel.NOTE_INTERVAL_RELATIONS || [];
            const relation = relations.find(r => r.id === (s.noteIntervalRelation || 'root_only')) || relations[0];

            const isRoot = noteIdx === s.selectedNoteIdx;
            const hasInterval = relation && relation.semitones > 0;
            const intervalNoteIdx = hasInterval ? ((s.selectedNoteIdx + relation.semitones) % 12 + 12) % 12 : -1;
            const isIntervalMatch = hasInterval && (noteIdx === intervalNoteIdx);

            if (!isRoot && !isIntervalMatch) {
                return { visible: false, noteIdx, noteName, midiPitch };
            }

            if (isRoot) {
                return {
                    visible: true,
                    isGhost: false,
                    isRootNote: true,
                    colorClass: 'bg-red-600 border-white text-white shadow-md shadow-red-950/60',
                    label: noteName,
                    degreeText: 'I',
                    roleTitle: 'Root (I)',
                    noteIdx,
                    noteName,
                    midiPitch
                };
            } else {
                // Second note in relation (e.g. V)
                return {
                    visible: true,
                    isGhost: false,
                    isRootNote: false,
                    colorClass: 'bg-sky-500 border-white text-white shadow-md shadow-sky-950/60',
                    label: noteName,
                    degreeText: relation.degreeRoman,
                    roleTitle: `${relation.degreeRoman} (${relation.name})`,
                    noteIdx,
                    noteName,
                    midiPitch
                };
            }
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
            diagramModeSubtitle = ''; // Non-useful description dropped for visual minimalism
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
                    showDegreeSubLabel: (s.appMode === 'scale' && s.showDegrees) || (s.appMode === 'note' && s.showDegrees && (s.noteIntervalRelation && s.noteIntervalRelation !== 'root_only'))
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
            mode1MatchCount,
            showModeLegend: s.appMode === 'scale'
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

        const backingPresets = this.getFilteredBackingPresets();
        const allBackingPresets = window.GuitarApp.Models.MidiBackingTrackModel
            ? window.GuitarApp.Models.MidiBackingTrackModel.PRESETS
            : [];

        // Dynamic 2-note interval relations for active root note
        const currentRootName = s.selectedNoteIdx !== null ? this.getNoteName(s.selectedNoteIdx) : null;
        const noteRelations = (this.TheoryModel.NOTE_INTERVAL_RELATIONS || []).map(r => {
            let label = r.name;
            if (r.semitones === 0) {
                label = 'Only root';
            } else if (currentRootName) {
                const targetSpelling = this.TheoryModel.getIntervalSpelling(currentRootName, r.semitones, r.degreeOffset);
                label = `${r.shortName} (${currentRootName} - ${targetSpelling})`;
            }
            return {
                id: r.id,
                label,
                selected: (s.noteIntervalRelation || 'root_only') === r.id
            };
        });

        return {
            noteRelations,
            selectedNoteIntervalRelation: s.noteIntervalRelation || 'root_only',
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
            accidentalMode: this.accidentalMode,
            audioEnabled: s.audioEnabled,
            backingTrack: s.backingTrack,
            backingPresets,
            allBackingPresets,
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
        if (tabKey !== 'scale') {
            this.stopBackingTrack();
        }
        this.stateModel.setState(updates);
    }

    setNoteIntervalRelation(relationId) {
        this.stateModel.setState({ noteIntervalRelation: relationId });
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

    _updateLiveChordOnRootChange(newRootIdx) {
        if (!this.state.backingTrack || !this.state.backingTrack.isPlaying || this.state.backingTrack.isCountingIn) return;
        const MidiModel = window.GuitarApp.Models.MidiBackingTrackModel;
        if (!MidiModel) return;
        const preset = MidiModel.getPresetById(this.state.backingTrack.stylePreset);
        if (!preset || !preset.progression || preset.progression.length === 0) return;

        const currentBar = (this.midiBackingModel && this.midiBackingModel.lastReportedBar >= 0)
            ? this.midiBackingModel.lastReportedBar
            : 0;
        const slotIndex = currentBar % preset.progression.length;
        const chordSlot = preset.progression[slotIndex];
        if (chordSlot) {
            const isSharps = this.accidentalMode !== 'flats';
            const NOTES = isSharps
                ? ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
                : ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
            const chordRootIdx = ((newRootIdx + (chordSlot.rootOffset || 0)) % 12 + 12) % 12;
            this.state.backingTrack.currentChordLabel = `${NOTES[chordRootIdx]}${chordSlot.suffix || ''} (${chordSlot.degreeRoman || ''})`;
        }
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
        this._updateLiveChordOnRootChange(noteIdx);
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
            this._updateLiveChordOnRootChange(cellData.noteIdx);
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

    // ========================================================================
    // BACKING TRACK CONTROLS
    // ========================================================================

    toggleBackingTrack() {
        if (!this.midiBackingModel) return;

        if (this.state.backingTrack.isPlaying) {
            this.stopBackingTrack();
        } else {
            this.startBackingTrack();
        }
    }

    startBackingTrack() {
        if (!this.midiBackingModel || !this.state.audioEnabled) return;

        // If no root is selected yet, default to backing track preset's default key
        if (!this.state.clickedRoot) {
            const MidiModel = window.GuitarApp.Models.MidiBackingTrackModel;
            const currentPreset = MidiModel ? MidiModel.getPresetById(this.state.backingTrack.stylePreset) : null;
            const defRoot = (currentPreset && currentPreset.defaultRootIdx !== undefined) ? currentPreset.defaultRootIdx : 0;
            this.quickPickModeRoot(defRoot);
        }

        const getContextFn = () => ({
            isEnabled: this.state.audioEnabled,
            rootNoteIdx: this.state.clickedRoot ? this.state.clickedRoot.noteIdx : 0,
            musicalModeKey: this.state.selectedMusicalMode,
            stylePresetId: this.state.backingTrack.stylePreset,
            bpm: this.state.backingTrack.bpm,
            accidentalMode: this.accidentalMode
        });

        const onChordUpdateFn = (chordSymbol, sectionSymbol, scaleRecommendation) => {
            this.state.backingTrack.currentChordLabel = chordSymbol;
            this.state.backingTrack.currentSectionLabel = sectionSymbol;
            this.state.backingTrack.isCountingIn = Boolean(this.midiBackingModel && this.midiBackingModel.isCountingIn);
            if (scaleRecommendation) {
                this.state.backingTrack.scaleRecommendation = scaleRecommendation;
            }
            this.notifyViews();
        };

        const MidiModel = window.GuitarApp.Models.MidiBackingTrackModel;
        const currentPreset = MidiModel ? MidiModel.getPresetById(this.state.backingTrack.stylePreset) : null;
        const countInBeats = currentPreset ? (currentPreset.countInBeats || currentPreset.beatsPerBar || 4) : 4;

        this.midiBackingModel.start(this.audioModel, getContextFn, onChordUpdateFn);
        this.state.backingTrack.isPlaying = true;
        this.state.backingTrack.isCountingIn = true;
        this.state.backingTrack.currentSectionLabel = `Count-in 1/${countInBeats}`;
        this.state.backingTrack.currentChordLabel = null;
        this.stateModel.notify();
    }

    stopBackingTrack() {
        if (this.midiBackingModel) {
            this.midiBackingModel.stop();
        }
        this.state.backingTrack.isPlaying = false;
        this.state.backingTrack.isCountingIn = false;
        this.state.backingTrack.currentChordLabel = null;
        this.state.backingTrack.currentSectionLabel = null;
        this.stateModel.notify();
    }

    setBackingStylePreset(presetId) {
        // Immediately stop any active playback or count-in and restart button state
        this.stopBackingTrack();

        const MidiModel = window.GuitarApp.Models.MidiBackingTrackModel;
        const preset = MidiModel ? MidiModel.getPresetById(presetId) : null;
        if (preset) {
            this.state.backingTrack.stylePreset = preset.id;
            this.state.backingTrack.timeSignature = preset.timeSignature;
            this.state.backingTrack.bpm = preset.defaultBpm;
            this.state.backingTrack.instrumentLabel = preset.instrumentLabel || '🎸 Electric Guitar';
            this.state.backingTrack.scaleRecommendation = preset.scaleRecommendation || '';

            // Automatically switch Musical Mode to recommended mode for backing track
            const targetMode = preset.targetModeKey || this._detectModeFromPreset(preset);
            if (targetMode && this.TheoryModel.MUSICAL_MODES[targetMode]) {
                this.state.selectedMusicalMode = targetMode;
            }

            // Synchronize root note to match the backing track preset's default key
            if (preset.defaultRootIdx !== undefined) {
                const sixthString = this.stateModel.getStringByNumber(6) || this.state.guitarStrings[0];
                const fretOn6th = ((preset.defaultRootIdx - sixthString.openNoteIdx) % 12 + 12) % 12;
                this.state.clickedRoot = {
                    stringNum: sixthString.stringNum,
                    fret: fretOn6th,
                    noteIdx: preset.defaultRootIdx
                };
            }

            this.stateModel.notify();
        }
    }

    _detectModeFromPreset(preset) {
        if (!preset) return null;
        const name = (preset.name || '').toLowerCase();
        const modes = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'];
        for (const m of modes) {
            if (name.includes(m)) return m;
        }
        return null;
    }

    setBackingBpm(bpmValue) {
        const num = parseInt(bpmValue, 10);
        const bpm = Math.max(40, Math.min(220, isNaN(num) ? 100 : num));
        this.state.backingTrack.bpm = bpm;
        this.stateModel.notify();
    }

    adjustBackingBpm(delta) {
        this.setBackingBpm((this.state.backingTrack.bpm || 100) + delta);
    }

    downloadBackingMidi() {
        const MidiModel = window.GuitarApp.Models.MidiBackingTrackModel;
        if (MidiModel && typeof MidiModel.downloadPresetMidi === 'function') {
            MidiModel.downloadPresetMidi(this.state.backingTrack.stylePreset);
        }
    }

    getFilteredBackingPresets() {
        const MidiModel = window.GuitarApp.Models.MidiBackingTrackModel;
        if (!MidiModel) return [];
        const allPresets = MidiModel.PRESETS || [];
        const filter = this.state.backingTrack.meterFilter || '4/4';
        return allPresets.filter(p => p.timeSignature === filter);
    }

    setBackingMeterFilter(meter) {
        const validMeters = ['4/4', '3/4', '5/4', '6/8', '7/8'];
        const selectedMeter = validMeters.includes(meter) ? meter : '4/4';
        this.state.backingTrack.meterFilter = selectedMeter;

        // Check if the current stylePreset matches the selected meter filter
        const MidiModel = window.GuitarApp.Models.MidiBackingTrackModel;
        const currentPreset = MidiModel ? MidiModel.getPresetById(this.state.backingTrack.stylePreset) : null;

        if (currentPreset && currentPreset.timeSignature !== selectedMeter) {
            // Automatically switch to the first preset that matches the chosen time signature
            const matchingPresets = this.getFilteredBackingPresets();
            if (matchingPresets.length > 0) {
                this.setBackingStylePreset(matchingPresets[0].id);
                return;
            }
        }

        this.stateModel.notify();
    }

    resetBoard() {
        this.stopBackingTrack();
        this.audioModel.stopSequence();
        this.stateModel.resetToStandard();
    }

    toggleAudio() {
        const nextAudio = !this.state.audioEnabled;
        if (!nextAudio) {
            this.stopBackingTrack();
            this.audioModel.stopSequence();
        }
        this.stateModel.setState({ audioEnabled: nextAudio });
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
