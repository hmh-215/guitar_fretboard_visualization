/**
 * ==========================================================================
 * VIEW LAYER: ConfigPanelsView
 * Renders and binds the bottom configuration panels for:
 *   1. Note visualization (#config-panel-note)
 *   2. Modes visualization (#config-panel-scale, with 20 MIDI Backing Tracks)
 *   3. Settings (#config-panel-settings, with auto-accidental display)
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
        this.noteRelationSelect = document.getElementById('note-relation-select');
        this.mode1StatusNote = document.getElementById('mode1-status-note');
        this.mode1Count = document.getElementById('mode1-count');

        // Tab 2: Modes Visualization elements
        this.musicalModeSelect = document.getElementById('musical-mode-select');
        this.modeRootPills = document.getElementById('mode-root-pills');
        this.boxSpanSelect = document.getElementById('box-span-select');
        this.btnPlayBox = document.getElementById('btn-play-box');

        // Tab 2: MIDI Backing Track accompaniment controls
        this.backingStyleSelect = document.getElementById('backing-style-select');
        this.backingMeterBadge = document.getElementById('backing-meter-badge');
        this.meterFilterMenu = document.getElementById('meter-filter-menu');
        this.meterFilterWrapper = document.getElementById('meter-filter-wrapper');
        this.meterBadgeText = document.getElementById('meter-badge-text');
        this._lastRenderedMeterFilter = null;
        this.backingBpmInput = document.getElementById('backing-bpm-input');
        this.btnBpmDec = document.getElementById('btn-bpm-dec');
        this.btnBpmInc = document.getElementById('btn-bpm-inc');
        this.btnToggleBacking = document.getElementById('btn-toggle-backing');
        this.backingSectionBadge = document.getElementById('backing-section-badge');
        this.backingChordBadge = document.getElementById('backing-chord-badge');
        this.backingScaleBadge = document.getElementById('backing-scale-badge');

        // Tab 3: Settings elements (including Display Options)
        this.btnToggleDegrees = document.getElementById('btn-toggle-degrees');
        this.labelTypeText = document.getElementById('label-type-text');
        this.btnToggleGhost = document.getElementById('btn-toggle-ghost');
        this.ghostStatusText = document.getElementById('ghost-status-text');
        this.btnResetBoard = document.getElementById('btn-reset-board');
        this.btnAudioToggle = document.getElementById('btn-audio-toggle');
        this.audioIcon = document.getElementById('audio-icon');
        this.audioStatus = document.getElementById('audio-status');
        this.accidentalModeBadge = document.getElementById('accidental-mode-badge');
        this.btnOpenTuningModal = document.getElementById('btn-open-tuning-modal');
        this.inlineTuningRow = document.getElementById('inline-tuning-row');
        this.presetButtons = document.querySelectorAll('[data-settings-preset]');

        this._bindEvents();
    }

    _bindEvents() {
        if (this.noteRelationSelect) {
            this.noteRelationSelect.addEventListener('change', (e) => {
                this.viewModel.setNoteIntervalRelation(e.target.value);
            });
        }

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

        // Backing Track Event Bindings
        if (this.backingStyleSelect) {
            this.backingStyleSelect.addEventListener('change', (e) => {
                this.viewModel.setBackingStylePreset(e.target.value);
            });
        }

        if (this.backingBpmInput) {
            this.backingBpmInput.addEventListener('change', (e) => {
                this.viewModel.setBackingBpm(e.target.value);
            });
        }

        if (this.btnBpmDec) {
            this.btnBpmDec.addEventListener('click', () => {
                this.viewModel.adjustBackingBpm(-5);
            });
        }

        if (this.btnBpmInc) {
            this.btnBpmInc.addEventListener('click', () => {
                this.viewModel.adjustBackingBpm(5);
            });
        }

        if (this.btnToggleBacking) {
            this.btnToggleBacking.addEventListener('click', () => {
                this.viewModel.toggleBackingTrack();
            });
        }

        // Expandable Time Signature Filter Menu bindings
        if (this.backingMeterBadge && this.meterFilterMenu) {
            this.backingMeterBadge.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = this.meterFilterMenu.classList.contains('hidden');
                this.meterFilterMenu.classList.toggle('hidden', !isHidden);
                this.backingMeterBadge.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (this.meterFilterMenu && !this.meterFilterMenu.classList.contains('hidden')) {
                    if (!this.meterFilterWrapper || !this.meterFilterWrapper.contains(e.target)) {
                        this.meterFilterMenu.classList.add('hidden');
                        if (this.backingMeterBadge) {
                            this.backingMeterBadge.setAttribute('aria-expanded', 'false');
                        }
                    }
                }
            });

            // Handle clicking meter filter buttons
            const meterOptions = this.meterFilterMenu.querySelectorAll('.meter-filter-opt');
            meterOptions.forEach(optBtn => {
                optBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const selectedMeter = optBtn.getAttribute('data-meter');
                    this.meterFilterMenu.classList.add('hidden');
                    if (this.backingMeterBadge) {
                        this.backingMeterBadge.setAttribute('aria-expanded', 'false');
                    }
                    this.viewModel.setBackingMeterFilter(selectedMeter);
                });
            });
        }

        // Settings Event Bindings
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
                btn.className = `px-2.5 py-1 text-xs font-bold transition ${
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
                rootBtn.className = `px-1.5 py-0.5 text-xs font-bold transition ${
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

        // Populate Note Relation Dropdown (Tab 1)
        if (this.noteRelationSelect && data.noteRelations) {
            this.noteRelationSelect.innerHTML = '';
            data.noteRelations.forEach(rel => {
                const opt = document.createElement('option');
                opt.value = rel.id;
                opt.textContent = rel.label;
                if (rel.selected) opt.selected = true;
                this.noteRelationSelect.appendChild(opt);
            });
            this.noteRelationSelect.value = data.selectedNoteIntervalRelation || 'root_only';
        }

        // Update Mode 1 Status Counter (if present)
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
        if (this.btnPlayBox) {
            this.btnPlayBox.disabled = !data.hasClickedRoot || !data.audioEnabled;
            this.btnPlayBox.classList.toggle('opacity-50', !data.hasClickedRoot || !data.audioEnabled);
        }

        // Update MIDI Backing Track Controls (Tab 2)
        const currentMeterFilter = data.backingTrack ? (data.backingTrack.meterFilter || 'all') : 'all';
        if (this.backingStyleSelect && data.backingPresets && data.backingPresets.length > 0) {
            if (this.backingStyleSelect.children.length === 0 || this._lastRenderedMeterFilter !== currentMeterFilter) {
                this._lastRenderedMeterFilter = currentMeterFilter;
                this.backingStyleSelect.innerHTML = '';

                // Populate optgroups by category
                const categories = {};
                data.backingPresets.forEach(preset => {
                    const cat = preset.category || 'General';
                    if (!categories[cat]) categories[cat] = [];
                    categories[cat].push(preset);
                });

                Object.entries(categories).forEach(([catName, presetList]) => {
                    const group = document.createElement('optgroup');
                    group.label = catName;
                    presetList.forEach(p => {
                        const opt = document.createElement('option');
                        opt.value = p.id;
                        opt.textContent = p.name;
                        group.appendChild(opt);
                    });
                    this.backingStyleSelect.appendChild(group);
                });
            }
            if (data.backingTrack && this.backingStyleSelect.value !== data.backingTrack.stylePreset) {
                this.backingStyleSelect.value = data.backingTrack.stylePreset;
            }
        }

        if (this.backingMeterBadge && data.backingTrack) {
            const filter = data.backingTrack.meterFilter || 'all';
            const displayLabel = filter === 'all'
                ? (data.backingTrack.timeSignature ? `All (${data.backingTrack.timeSignature})` : 'All')
                : filter;
            if (this.meterBadgeText) {
                this.meterBadgeText.textContent = displayLabel;
            } else {
                this.backingMeterBadge.textContent = displayLabel;
            }
            this.backingMeterBadge.title = `Time Signature Filter: ${filter.toUpperCase()} (Click to change)`;
        }

        // Update active checkmarks inside meter filter popover menu
        if (this.meterFilterMenu && data.backingTrack) {
            const activeFilter = data.backingTrack.meterFilter || 'all';
            const options = this.meterFilterMenu.querySelectorAll('.meter-filter-opt');
            options.forEach(btn => {
                const meterVal = btn.getAttribute('data-meter');
                const isSelected = meterVal === activeFilter;
                const checkEl = btn.querySelector('.meter-check');
                if (checkEl) {
                    checkEl.classList.toggle('hidden', !isSelected);
                }
                btn.classList.toggle('bg-zinc-800', isSelected);
                btn.classList.toggle('text-orange-400', isSelected);
            });
        }

        if (this.backingBpmInput && data.backingTrack) {
            if (document.activeElement !== this.backingBpmInput) {
                this.backingBpmInput.value = data.backingTrack.bpm || 74;
            }
        }

        if (this.btnToggleBacking && data.backingTrack) {
            const isPlaying = data.backingTrack.isPlaying;
            const isCountingIn = data.backingTrack.isCountingIn;
            this.btnToggleBacking.disabled = !data.audioEnabled;
            this.btnToggleBacking.classList.toggle('opacity-50', !data.audioEnabled);

            if (isPlaying) {
                this.btnToggleBacking.className = 'px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-black border border-orange-400 font-extrabold text-xs transition flex items-center gap-1.5 shrink-0 shadow-lg shadow-orange-500/30';
                if (isCountingIn) {
                    this.btnToggleBacking.innerHTML = `<span>⏳</span><span>Count-in...</span>`;
                } else {
                    this.btnToggleBacking.innerHTML = `<span>⏹</span><span>Stop Backing</span>`;
                }
            } else {
                this.btnToggleBacking.className = 'px-3 py-1.5 bg-orange-500/15 hover:bg-orange-500 text-orange-400 hover:text-black border border-orange-500/40 font-bold text-xs transition flex items-center gap-1.5 shrink-0';
                this.btnToggleBacking.innerHTML = `<span>♫</span><span>Play Backing</span>`;
            }
        }

        if (this.backingSectionBadge && data.backingTrack) {
            const isPlaying = data.backingTrack.isPlaying;
            const section = data.backingTrack.currentSectionLabel;
            if (isPlaying && section) {
                this.backingSectionBadge.classList.remove('hidden');
                this.backingSectionBadge.textContent = section.startsWith('Count-in') ? section : `Section: ${section}`;
            } else {
                this.backingSectionBadge.classList.add('hidden');
            }
        }

        if (this.backingChordBadge && data.backingTrack) {
            const isPlaying = data.backingTrack.isPlaying;
            const chord = data.backingTrack.currentChordLabel;
            if (isPlaying && chord) {
                this.backingChordBadge.classList.remove('hidden');
                this.backingChordBadge.textContent = `Chord: ${chord}`;
            } else {
                this.backingChordBadge.classList.add('hidden');
            }
        }

        if (this.backingScaleBadge && data.backingTrack) {
            const currentPreset = (data.backingPresets || []).find(p => p.id === data.backingTrack.stylePreset);
            const scale = data.backingTrack.scaleRecommendation || (currentPreset && currentPreset.scaleRecommendation);
            if (scale) {
                this.backingScaleBadge.classList.remove('hidden');
                this.backingScaleBadge.textContent = `Scale: ${scale}`;
            } else {
                this.backingScaleBadge.classList.add('hidden');
            }
        }

        // Update Tab 3 Settings Controls
        if (this.audioIcon) {
            this.audioIcon.textContent = data.audioEnabled ? '🔊' : '🔇';
        }
        if (this.audioStatus) {
            this.audioStatus.textContent = data.audioEnabled ? 'ON' : 'OFF';
            this.audioStatus.className = data.audioEnabled ? 'text-orange-400' : 'text-zinc-500';
        }

        if (this.accidentalModeBadge) {
            const isSharps = data.accidentalMode === 'sharps';
            this.accidentalModeBadge.textContent = isSharps ? 'Auto: ♯ Sharps' : 'Auto: ♭ Flats';
            this.accidentalModeBadge.title = 'Key signature derived automatically from active Musical Mode and Root Note';
        }

        // Render Inline Tuning Row (6th string to 1st string)
        if (this.inlineTuningRow) {
            this.inlineTuningRow.innerHTML = '';
            data.inlineTuningStrings.forEach(strObj => {
                const col = document.createElement('div');
                col.className = 'flex flex-col items-center bg-zinc-950 p-2 border border-zinc-800';

                const lbl = document.createElement('span');
                lbl.className = 'text-[10px] font-bold text-zinc-500 mb-1';
                lbl.textContent = `Str ${strObj.stringNum}`;

                const sel = document.createElement('select');
                sel.className = 'w-full bg-zinc-900 border border-zinc-700 text-orange-400 font-bold text-xs px-1 py-1 text-center focus:outline-none focus:border-orange-500 cursor-pointer';
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
