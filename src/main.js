/**
 * ==========================================================================
 * APPLICATION BOOTSTRAPPER: main.js
 * Initializes the MVVM architecture (Models, ViewModel, and Views) on
 * DOMContentLoaded and coordinates reactive View updates.
 * ==========================================================================
 */
window.GuitarApp = window.GuitarApp || {};

(function bootstrapGuitarApp() {
    function init() {
        const { MusicTheoryModel, AudioEngineModel, FretboardStateModel, MidiBackingTrackModel } = window.GuitarApp.Models;
        const { FretboardViewModel } = window.GuitarApp.ViewModels;
        const { HeaderView, FretboardView, ConfigPanelsView, TuningModalView } = window.GuitarApp.Views;

        // 1. Instantiate Models
        const audioModel = new AudioEngineModel();
        const stateModel = new FretboardStateModel(MusicTheoryModel);
        const midiBackingModel = MidiBackingTrackModel ? new MidiBackingTrackModel() : null;

        // 2. Instantiate ViewModel
        const viewModel = new FretboardViewModel(stateModel, MusicTheoryModel, audioModel, midiBackingModel);

        // 3. Instantiate Views
        const headerView = new HeaderView(viewModel);
        const fretboardView = new FretboardView(viewModel);
        const configPanelsView = new ConfigPanelsView(viewModel);
        const tuningModalView = new TuningModalView(viewModel);

        // 4. Subscribe Views to ViewModel state updates
        // Note: fretboardView renders before configPanelsView so mode1MatchCount is fresh
        const renderAllViews = () => {
            headerView.render();
            fretboardView.render();
            configPanelsView.render();
            tuningModalView.render();
        };

        viewModel.onViewUpdate(renderAllViews);

        // Expose instance on window.GuitarApp for debugging / inspection
        window.GuitarApp.instance = {
            stateModel,
            audioModel,
            midiBackingModel,
            viewModel,
            views: {
                headerView,
                fretboardView,
                configPanelsView,
                tuningModalView
            }
        };

        // Global command bridges for backward compatibility and console usage
        window.toggleHamburgerMenu = (e) => {
            if (e) e.stopPropagation();
            viewModel.toggleHamburgerMenu();
        };
        window.closeHamburgerMenu = () => viewModel.closeHamburgerMenu();
        window.selectTabFromMenu = (tabKey) => viewModel.selectTabFromMenu(tabKey);
        window.onSingleNoteChange = (val) => viewModel.selectSingleNote(val);
        window.onQuickPickModeRoot = (noteIdx) => viewModel.quickPickModeRoot(noteIdx);
        window.onMusicalModeChange = (modeKey) => viewModel.setMusicalMode(modeKey);
        window.onBoxSpanChange = (spanKey) => viewModel.setBoxSpanMode(spanKey);
        window.toggleDegreeLabels = () => viewModel.toggleDegreeLabels();
        window.toggleGhostNotes = () => viewModel.toggleGhostNotes();
        window.toggleBackingTrack = () => viewModel.toggleBackingTrack();
        window.setBackingStylePreset = (id) => viewModel.setBackingStylePreset(id);
        window.setBackingBpm = (bpm) => viewModel.setBackingBpm(bpm);
        window.adjustBackingBpm = (delta) => viewModel.adjustBackingBpm(delta);
        window.resetBoard = () => viewModel.resetBoard();
        window.toggleAudio = () => viewModel.toggleAudio();
        window.openTuningModal = () => viewModel.openTuningModal();
        window.closeTuningModal = () => viewModel.closeTuningModal();
        window.applyTuningPreset = (preset) => viewModel.applyTuningPreset(preset);

        // Initial render
        renderAllViews();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
