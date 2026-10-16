/**
 * ==========================================================================
 * VIEW LAYER: ConfigPanelsView
 * Renders and binds the bottom configuration panels for:
 *   1. Note visualization (#config-panel-note)
 *   2. Modes visualization (#config-panel-scale)
 *   3. Settings (#config-panel-settings)
 * ==========================================================================
 */
window.GuitarApp = window.GuitarApp || {};
window.GuitarApp.Views = window.GuitarApp.Views || {};

class ConfigPanelsView {
    constructor(viewModel) {
        this.viewModel = viewModel;

        // Containers
        this.bottomConfigSection = document.getElementById('bottom-config-section');
        this.panelNote = document.getElementById('config-panel-note');
        this.panelScale = document.getElementById('config-panel-scale');
        this.panelSettings = document.getElementById('config-panel-settings');

        // Tab 1: Note Visualization elements
        this.quickNotePills = document.getElementById('quick-note-pills');
        this.mode1StatusNote = document.getElementById('mode1-status-note');
        this.mode1Count = document.getElementById('mode1-count');

        // Tab 2: Modes Visualization elements
        this.musicalModeSelect = document.getElementById('musical-mode-select');
        this.modeRootPills = document.getElementById('mode-root-pills');
        this.boxSpanSelect = document.getElementById('box-span-select');
        this.btnToggleDegrees = document.getElementById('btn-toggle-degrees');
        this.labelTypeText = document.getElementById('label-type-text');
        this.btnToggleGhost = document.getElementById('btn-toggle-ghost');
        this.ghostStatusText = document.getElementById('ghost-status-text');
        this.modeDescriptionText = document.getElementById('mode-description-text');
        this.modeFormulaBadge = document.getElementById('mode-formula-badge');
        this.btnPlayBox = document.getElementById('btn-play-box');

        // Tab 3: Settings elements
        this.btnResetBoard = document.getElementById('btn-reset-board');
        this.btnAudioToggle = document.getElementById('btn-audio-toggle');
        this.audioIcon = document.getElementById('audio-icon');
        this.audioStatus = document.getElementById('audio-status');
        this.btnSharps = document.getElementById('btn-sharps');
        this.btnFlats = document.getElementById('btn-flats');
        this.btnOpenTuningModal = document.getElementById('btn-open-tuning-modal');
        this.inlineTuningRow = document.getElementById('inline-tuning-row');
        this.presetButtons = document.querySelectorAll('[data-settings-preset]');

        this._bindEvents();
    }

    _bindEvents() {
        if (this.musicalModeSelect) {
            this.musicalModeSelect.addEventListener('change', (e) => {
                this.viewModel.setMusicalMode(e.target.value);
            });
        }

        if (this.boxSpanSelect) {
            this.boxSpanSelect.addEventListener('change', (e) => {
                this.viewModel.setBoxSpanMode(e.target.value);
            });
        }

        if (this.btnToggleDegrees) {
            this.btnToggleDegrees.addEventListener('click', () => {
                this.viewModel.toggleDegreeLabels();
            });
        }

        if (this.btnToggleGhost) {
            this.btnToggleGhost.addEventListener('click', () => {
                this.viewModel.toggleGhostNotes();
            });
        }

        if (this.btnPlayBox) {
            this.btnPlayBox.addEventListener('click', () => {
                this.viewModel.playActiveBoxScale();
            });
        }

        if (this.btnResetBoard) {
            this.btnResetBoard.addEventListener('click', () => {
                this.viewModel.resetBoard();
            });
        }

        if (this.btnAudioToggle) {
            this.btnAudioToggle.addEventListener('click', () => {
                this.viewModel.toggleAudio();
            });
        }

        if (this.btnSharps) {
            this.btnSharps.addEventListener('click', () => {
                this.viewModel.setAccidentalMode('sharps');
            });
        }

        if (this.btnFlats) {
            this.btnFlats.addEventListener('click', () => {
                this.viewModel.setAccidentalMode('flats');
            });
        }

        if (this.btnOpenTuningModal) {
            this.btnOpenTuningModal.addEventListener('click', () => {
                this.viewModel.openTuningModal();
            });
        }

        this.presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const rawNotes = btn.getAttribute('data-settings-preset');
                if (rawNotes) {
                    const parsed = JSON.parse(rawNotes);
                    this.viewModel.applyTuningPreset(parsed);
                }
            });
        });
    }

    render() {
        const data = this.viewModel.getConfigViewData();

        // Toggle full-height Settings layout when Settings tab is active
        if (this.bottomConfigSection) {
            if (data.isSettingsTab) {
                this.bottomConfigSection.classList.add('flex-1', 'flex', 'items-center');
                this.bottomConfigSection.classList.remove('border-t-2', 'border-orange-500/80');
            } else {
                this.bottomConfigSection.classList.remove('flex-1', 'flex', 'items-center');
                this.bottomConfigSection.classList.add('border-t-2', 'border-orange-500/80');
            }
        }

        // Toggle active bottom panel
        if (this.panelNote) this.panelNote.classList.toggle('hidden', data.activeTab !== 'note');
        if (this.panelScale) this.panelScale.classList.toggle('hidden', data.activeTab !== 'scale');
        if (this.panelSettings) this.panelSettings.classList.toggle('hidden', data.activeTab !== 'settings');

        // 1. Render Quick Note Pills (Tab 1) & Mode Root Pills (Tab 2)
        if (this.quickNotePills) {
            this.quickNotePills.innerHTML = '';
            data.notePills.forEach(pill => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = pill.name;
                btn.className = `px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    pill.isSelectedSingleNote
                        ? 'bg-orange-500 text-black shadow'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`;
                btn.addEventListener('click', () => {
                    this.viewModel.selectSingleNote(pill.noteIdx);
                });
                this.quickNotePills.appendChild(btn);
            });
        }

        if (this.modeRootPills) {
            this.modeRootPills.innerHTML = '';
            data.notePills.forEach(pill => {
                const rootBtn = document.createElement('button');
                rootBtn.type = 'button';
                rootBtn.textContent = pill.name;
                rootBtn.className = `px-2 py-1 rounded-lg text-xs font-bold transition ${
                    pill.isSelectedModeRoot
                        ? 'bg-orange-500 text-black shadow'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`;
                rootBtn.addEventListener('click', () => {
                    this.viewModel.quickPickModeRoot(pill.noteIdx);
                });
                this.modeRootPills.appendChild(rootBtn);
            });
        }

        // Update Mode 1 Status Counter
        if (this.mode1StatusNote) {
            this.mode1StatusNote.textContent = data.selectedNoteStatusName;
        }
        if (this.mode1Count) {
            this.mode1Count.textContent = data.mode1MatchCount;
        }

        // Update Mode 2 Selectors & Info
        if (this.musicalModeSelect && this.musicalModeSelect.value !== data.selectedMusicalMode) {
            this.musicalModeSelect.value = data.selectedMusicalMode;
        }
        if (this.boxSpanSelect && this.boxSpanSelect.value !== data.boxSpanMode) {
            this.boxSpanSelect.value = data.boxSpanMode;
        }
        if (this.labelTypeText) {
            this.labelTypeText.textContent = data.showDegrees ? 'Note + Degree' : 'Note Names';
        }
        if (this.ghostStatusText) {
            this.ghostStatusText.textContent = data.showGhostNotes ? 'Visible' : 'Hidden';
            this.ghostStatusText.className = data.showGhostNotes ? 'text-orange-400 font-bold' : 'text-zinc-400';
        }
        if (this.modeDescriptionText && data.currentModeInfo) {
            this.modeDescriptionText.textContent = data.currentModeInfo.description;
        }
        if (this.modeFormulaBadge && data.currentModeInfo) {
            this.modeFormulaBadge.textContent = data.currentModeInfo.degreeNames.join(' - ');
        }
        if (this.btnPlayBox) {
            this.btnPlayBox.disabled = !data.hasClickedRoot || !data.audioEnabled;
            this.btnPlayBox.classList.toggle('opacity-50', !data.hasClickedRoot || !data.audioEnabled);
        }

        // Update Tab 3 Settings Controls
        if (this.btnSharps) {
            this.btnSharps.className = data.accidentalMode === 'sharps'
                ? 'px-2.5 py-1.5 rounded-lg font-bold bg-orange-500 text-black'
                : 'px-2.5 py-1.5 rounded-lg font-bold text-zinc-400 hover:text-white';
        }
        if (this.btnFlats) {
            this.btnFlats.className = data.accidentalMode === 'flats'
                ? 'px-2.5 py-1.5 rounded-lg font-bold bg-orange-500 text-black'
                : 'px-2.5 py-1.5 rounded-lg font-bold text-zinc-400 hover:text-white';
        }
        if (this.audioIcon) {
            this.audioIcon.textContent = data.audioEnabled ? '🔊' : '🔇';
        }
        if (this.audioStatus) {
            this.audioStatus.textContent = data.audioEnabled ? 'ON' : 'OFF';
            this.audioStatus.className = data.audioEnabled ? 'text-orange-400' : 'text-zinc-500';
        }

        // Render Inline Tuning Row (6th string to 1st string)
        if (this.inlineTuningRow) {
            this.inlineTuningRow.innerHTML = '';
            data.inlineTuningStrings.forEach(strObj => {
                const col = document.createElement('div');
                col.className = 'flex flex-col items-center bg-zinc-950 p-2 rounded-lg border border-zinc-800';

                const lbl = document.createElement('span');
                lbl.className = 'text-[10px] font-bold text-zinc-500 mb-1';
                lbl.textContent = `Str ${strObj.stringNum}`;

                const sel = document.createElement('select');
                sel.className = 'w-full bg-zinc-900 border border-zinc-700 text-orange-400 font-bold text-xs rounded px-1 py-1 text-center focus:outline-none focus:border-orange-500 cursor-pointer';
                strObj.options.forEach(optData => {
                    const opt = document.createElement('option');
                    opt.value = optData.noteIdx;
                    opt.textContent = optData.label;
                    if (optData.selected) opt.selected = true;
                    sel.appendChild(opt);
                });

                sel.addEventListener('change', (e) => {
                    this.viewModel.tuneSingleString(strObj.stringNum, parseInt(e.target.value, 10));
                });

                col.appendChild(lbl);
                col.appendChild(sel);
                this.inlineTuningRow.appendChild(col);
            });
        }
    }
}

window.GuitarApp.Views.ConfigPanelsView = ConfigPanelsView;
