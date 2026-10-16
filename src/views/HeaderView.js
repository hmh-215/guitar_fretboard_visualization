/**
 * ==========================================================================
 * VIEW LAYER: HeaderView
 * Renders the top navigation bar, hamburger dropdown menu, and active tab
 * indicator badge, and binds user navigation events to FretboardViewModel.
 * ==========================================================================
 */
window.GuitarApp = window.GuitarApp || {};
window.GuitarApp.Views = window.GuitarApp.Views || {};

class HeaderView {
    constructor(viewModel) {
        this.viewModel = viewModel;

        // DOM references
        this.hamburgerContainer = document.getElementById('hamburger-container');
        this.hamburgerBtn = document.getElementById('hamburger-btn');
        this.hamburgerDropdown = document.getElementById('hamburger-dropdown');
        this.activeTabBadge = document.getElementById('active-tab-badge');

        this.menuItems = {
            note: document.getElementById('menu-item-note'),
            scale: document.getElementById('menu-item-scale'),
            settings: document.getElementById('menu-item-settings')
        };

        this.checkMarks = {
            note: document.getElementById('check-note'),
            scale: document.getElementById('check-scale'),
            settings: document.getElementById('check-settings')
        };

        this.dotIndicators = {
            note: document.getElementById('menu-dot-note'),
            scale: document.getElementById('menu-dot-scale'),
            settings: document.getElementById('menu-dot-settings')
        };

        this._bindEvents();
    }

    _bindEvents() {
        if (this.hamburgerBtn) {
            this.hamburgerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewModel.toggleHamburgerMenu();
            });
        }

        Object.entries(this.menuItems).forEach(([tabKey, btnEl]) => {
            if (btnEl) {
                btnEl.addEventListener('click', () => {
                    this.viewModel.selectTabFromMenu(tabKey);
                });
            }
        });

        // Close hamburger menu when clicking outside
        window.addEventListener('click', (e) => {
            if (this.hamburgerContainer && !this.hamburgerContainer.contains(e.target)) {
                this.viewModel.closeHamburgerMenu();
            }
        });

        // Close overlays on Escape key
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.viewModel.closeHamburgerMenu();
                this.viewModel.closeTuningModal();
            }
        });
    }

    render() {
        const data = this.viewModel.getHeaderViewData();

        if (this.hamburgerDropdown) {
            this.hamburgerDropdown.classList.toggle('hidden', !data.isHamburgerOpen);
        }

        if (this.activeTabBadge) {
            this.activeTabBadge.textContent = data.activeTabLabel;
        }

        data.tabs.forEach(({ key, isActive }) => {
            const checkEl = this.checkMarks[key];
            const itemEl = this.menuItems[key];
            const dotEl = this.dotIndicators[key];

            if (checkEl && itemEl) {
                if (isActive) {
                    checkEl.classList.remove('hidden');
                    itemEl.classList.add('bg-zinc-900', 'text-orange-400');
                    itemEl.classList.remove('text-zinc-300');
                } else {
                    checkEl.classList.add('hidden');
                    itemEl.classList.remove('bg-zinc-900', 'text-orange-400');
                    itemEl.classList.add('text-zinc-300');
                }
            }

            if (dotEl) {
                dotEl.className = isActive
                    ? 'w-2.5 h-2.5 rounded-full bg-orange-500'
                    : 'w-2.5 h-2.5 rounded-full bg-orange-500/40';
            }
        });
    }
}

window.GuitarApp.Views.HeaderView = HeaderView;
