/**
 * ==========================================================================
 * VIEW LAYER: FretboardView
 * Renders the central guitar fretboard stage, status header bar, string
 * tuning labels, horizontal wound/plain strings overlay, fret numbers,
 * inlay markers, and interactive note dots.
 * ==========================================================================
 */
window.GuitarApp = window.GuitarApp || {};
window.GuitarApp.Views = window.GuitarApp.Views || {};

class FretboardView {
    constructor(viewModel) {
        this.viewModel = viewModel;

        // DOM references
        this.fretboardStage = document.getElementById('fretboard-stage');
        this.diagramModeTitle = document.getElementById('diagram-mode-title');
        this.diagramModeSubtitle = document.getElementById('diagram-mode-subtitle');
        this.boxRangeIndicator = document.getElementById('box-range-indicator');
        this.currentTuningBadge = document.getElementById('current-tuning-badge');

        this.stringLabelsCol = document.getElementById('string-labels-col');
        this.stringsLayer = document.getElementById('strings-layer');
        this.fretNumbersTop = document.getElementById('fret-numbers-top');
        this.fretNumbersBottom = document.getElementById('fret-numbers-bottom');
        this.fretsGrid = document.getElementById('frets-grid');
    }

    render() {
        const data = this.viewModel.getFretboardViewData();

        // Hide the fretboard stage completely when in Settings mode
        if (this.fretboardStage) {
            this.fretboardStage.classList.toggle('hidden', data.isSettingsTab);
        }

        // Update Status Bar Above Fretboard
        if (this.diagramModeTitle) {
            this.diagramModeTitle.textContent = data.diagramModeTitle;
        }
        if (this.diagramModeSubtitle) {
            this.diagramModeSubtitle.textContent = data.diagramModeSubtitle;
        }
        if (this.boxRangeIndicator) {
            this.boxRangeIndicator.classList.toggle('hidden', !data.showBoxBadge);
            if (data.showBoxBadge) {
                this.boxRangeIndicator.textContent = data.boxBadgeText;
            }
        }
        if (this.currentTuningBadge) {
            this.currentTuningBadge.textContent = data.tuningBadgeText;
        }

        // 1. Render Left String Labels (E B G D A E from top 1st to bottom 6th)
        if (this.stringLabelsCol) {
            this.stringLabelsCol.innerHTML = '';
            data.orderedStrings.forEach(str => {
                const lbl = document.createElement('div');
                lbl.className = 'h-7 flex items-center justify-end pr-1 font-extrabold text-sm text-zinc-200';
                lbl.innerHTML = `
                    <span class="w-8 h-7 rounded-lg bg-zinc-900 border border-zinc-800 text-orange-400 flex items-center justify-center shadow-inner text-xs" title="${str.desc} - Tuned to ${str.openNoteName}">
                        ${str.openNoteName}
                    </span>
                `;
                this.stringLabelsCol.appendChild(lbl);
            });
        }

        // 2. Render Horizontal Guitar Strings Overlay
        if (this.stringsLayer) {
            this.stringsLayer.innerHTML = '';
            data.orderedStrings.forEach((str, rowIndex) => {
                const topPercent = ((rowIndex + 0.5) / 6) * 100;
                const line = document.createElement('div');
                line.className = `guitar-string ${str.wound ? 'string-wound' : 'string-plain'}`;
                line.style.top = `${topPercent}%`;
                line.style.height = `${str.thickness}px`;
                this.stringsLayer.appendChild(line);
            });
        }

        // 3. Render Top/Bottom Fret Numbers & Fret Columns
        if (!this.fretNumbersTop || !this.fretNumbersBottom || !this.fretsGrid) return;

        this.fretNumbersTop.innerHTML = '';
        this.fretNumbersBottom.innerHTML = '';
        this.fretsGrid.innerHTML = '';

        data.fretColumns.forEach(col => {
            const { fret, weight, isInActiveBox, isSingleInlay, isDoubleInlay, cells } = col;

            // Top fret number cell
            const topCell = document.createElement('div');
            topCell.style.flex = `${weight} 1 0%`;
            topCell.className = `text-center transition ${
                isInActiveBox
                    ? 'text-orange-400 font-extrabold'
                    : (fret === 0 ? 'text-orange-500/90 font-bold' : 'text-zinc-500')
            }`;
            topCell.textContent = fret === 0 ? '0 (Nut)' : fret;
            this.fretNumbersTop.appendChild(topCell);

            // Bottom fret indicator cell
            const botCell = document.createElement('div');
            botCell.style.flex = `${weight} 1 0%`;
            botCell.className = 'text-center flex flex-col items-center';
            if (fret === 0) {
                botCell.innerHTML = `<span class="text-[11px] text-orange-400/80 font-bold">Open</span>`;
            } else if (isSingleInlay) {
                botCell.innerHTML = `<span class="text-[11px] text-orange-400/90 font-bold">• ${fret}</span>`;
            } else if (isDoubleInlay) {
                botCell.innerHTML = `<span class="text-[11px] text-orange-400 font-extrabold">•• ${fret}</span>`;
            } else {
                botCell.innerHTML = `<span class="text-[11px] opacity-40">${fret}</span>`;
            }
            this.fretNumbersBottom.appendChild(botCell);

            // Fret Column on the Maple Neck
            const fretCol = document.createElement('div');
            fretCol.style.flex = `${weight} 1 0%`;
            fretCol.className = `relative flex flex-col justify-between py-[6px] transition-colors ${
                fret === 0 ? 'guitar-nut border-r-4 border-stone-600/90' : ''
            } ${
                isInActiveBox ? 'bg-orange-500/15' : ''
            }`;

            if (fret > 0) {
                const wire = document.createElement('div');
                wire.className = 'absolute right-0 top-0 bottom-0 w-[3px] fret-wire z-10';
                fretCol.appendChild(wire);
            }

            // Black Fretboard Inlay Dots
            if (isSingleInlay) {
                const inlay = document.createElement('div');
                inlay.className = 'pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-stone-900/85 shadow-inner z-0';
                fretCol.appendChild(inlay);
            } else if (isDoubleInlay) {
                const inlayTop = document.createElement('div');
                inlayTop.className = 'pointer-events-none absolute left-1/2 top-[33%] -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-stone-900/85 shadow-inner z-0';
                const inlayBot = document.createElement('div');
                inlayBot.className = 'pointer-events-none absolute left-1/2 top-[67%] -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-stone-900/85 shadow-inner z-0';
                fretCol.appendChild(inlayTop);
                fretCol.appendChild(inlayBot);
            }

            // Create 6 Interactive String Cells inside this Fret Column
            cells.forEach(({ stringObj, cellData, showDegreeSubLabel }) => {
                const cell = document.createElement('div');
                cell.className = 'relative z-20 flex-1 flex items-center justify-center cursor-pointer group';
                const fretDesc = fret === 0 ? 'Fret 0 (Open String)' : `Fret ${fret}`;
                const roleSuffix = cellData.roleTitle ? ` • ${cellData.roleTitle}` : '';
                cell.title = `String ${stringObj.stringNum} (${stringObj.openNoteName}), ${fretDesc}: ${cellData.noteName}${roleSuffix}`;

                cell.addEventListener('click', () => {
                    this.viewModel.handleFretClick(stringObj.stringNum, fret);
                });

                if (cellData.visible) {
                    const dot = document.createElement('div');
                    const ghostClasses = cellData.isGhost ? 'opacity-25 scale-90' : 'opacity-100';
                    dot.className = `note-dot w-7 h-7 sm:w-[30px] sm:h-[30px] rounded-full border-2 flex flex-col items-center justify-center leading-none select-none ${cellData.colorClass} ${ghostClasses}`;

                    if (showDegreeSubLabel) {
                        dot.innerHTML = `
                            <span class="text-[11px] font-extrabold tracking-tighter">${cellData.label}</span>
                            <span class="text-[8px] font-bold opacity-90">${cellData.degreeText}</span>
                        `;
                    } else {
                        dot.innerHTML = `<span class="text-xs font-extrabold tracking-tight">${cellData.label}</span>`;
                    }

                    cell.appendChild(dot);
                } else {
                    const hoverDot = document.createElement('div');
                    hoverDot.className = 'w-6 h-6 rounded-full bg-zinc-900/85 border border-white/70 text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow';
                    hoverDot.textContent = cellData.noteName;
                    cell.appendChild(hoverDot);
                }

                fretCol.appendChild(cell);
            });

            this.fretsGrid.appendChild(fretCol);
        });
    }
}

window.GuitarApp.Views.FretboardView = FretboardView;
