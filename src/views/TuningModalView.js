/**
 * ==========================================================================
 * VIEW LAYER: TuningModalView
 * Renders and binds the Guitar String Tuning pop-up modal (#tuning-modal),
 * including quick tuning preset buttons and individual string selectors.
 * ==========================================================================
 */
window.GuitarApp = window.GuitarApp || {};
window.GuitarApp.Views = window.GuitarApp.Views || {};

class TuningModalView {
    constructor(viewModel) {
        this.viewModel = viewModel;

        this.modalEl = document.getElementById('tuning-modal');
        this.stringsListEl = document.getElementById('tuning-strings-list');
        this.closeButtons = document.querySelectorAll('[data-close-tuning-modal]');
        this.modalPresetButtons = document.querySelectorAll('[data-modal-preset]');

        this._bindEvents();
    }

    _bindEvents() {
        this.closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.viewModel.closeTuningModal();
            });
        });

        // Close when clicking the dark backdrop outside the dialog card
        if (this.modalEl) {
            this.modalEl.addEventListener('click', (e) => {
                if (e.target === this.modalEl) {
                    this.viewModel.closeTuningModal();
                }
            });
        }

        this.modalPresetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const rawNotes = btn.getAttribute('data-modal-preset');
                if (rawNotes) {
                    const parsed = JSON.parse(rawNotes);
                    this.viewModel.applyTuningPreset(parsed);
                }
            });
        });
    }

    render() {
        const data = this.viewModel.getConfigViewData();

        if (this.modalEl) {
            if (data.isTuningModalOpen) {
                this.modalEl.classList.remove('hidden');
                this.modalEl.classList.add('flex');
            } else {
                this.modalEl.classList.add('hidden');
                this.modalEl.classList.remove('flex');
            }
        }

        if (!this.stringsListEl) return;
        this.stringsListEl.innerHTML = '';

        data.modalTuningStrings.forEach(strObj => {
            const row = document.createElement('div');
            row.className = 'flex items-center justify-between gap-3 bg-zinc-900 px-3 py-2 rounded-lg border border-zinc-800';

            const leftInfo = document.createElement('div');
            leftInfo.className = 'flex items-center gap-2.5';
            leftInfo.innerHTML = `
                <span class="w-6 h-6 rounded-md bg-zinc-950 border border-zinc-800 text-orange-400 font-extrabold text-xs flex items-center justify-center">
                    ${strObj.stringNum}
                </span>
                <div>
                    <div class="text-xs font-bold text-white">${strObj.desc}</div>
                    <div class="text-[10px] text-zinc-400">${strObj.wound ? 'Wound String' : 'Plain Steel String'}</div>
                </div>
            `;

            const select = document.createElement('select');
            select.className = 'bg-zinc-950 border border-zinc-700 text-orange-400 font-bold text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer';

            strObj.options.forEach(optData => {
                const opt = document.createElement('option');
                opt.value = optData.noteIdx;
                opt.textContent = optData.label;
                if (optData.selected) opt.selected = true;
                select.appendChild(opt);
            });

            select.addEventListener('change', (e) => {
                this.viewModel.tuneSingleString(strObj.stringNum, parseInt(e.target.value, 10));
            });

            row.appendChild(leftInfo);
            row.appendChild(select);
            this.stringsListEl.appendChild(row);
        });
    }
}

window.GuitarApp.Views.TuningModalView = TuningModalView;
