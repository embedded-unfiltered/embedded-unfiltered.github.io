/**
 * Global Search Functionality
 * Filters tool cards based on title and description.
 * Auto-hides empty sections and advanced mode panel.
 */

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('toolSearch');
    const toolCards = document.querySelectorAll('.tool-card');
    const toolGrids = document.querySelectorAll('.tool-grid');
    const advancedDetails = document.querySelector('details.panel');

    // Global shortcut
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
        }
    });

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();

        // 1. Filter Cards
        toolCards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            const desc = card.querySelector('p').textContent.toLowerCase();
            // Also check section name for context? No, strictly tool content.

            const match = title.includes(query) || desc.includes(query);

            if (match) {
                card.style.display = 'flex';
                // If inside advanced mode, ensure it's open if searching?
                // Optional: valid UX improvement
                if (query.length > 0 && card.closest('details')) {
                    advancedDetails.open = true;
                }
            } else {
                card.style.display = 'none';
            }
        });

        // 2. Hide Empty Sections
        toolGrids.forEach(grid => {
            // Count visible cards in this grid
            const visibleCards = Array.from(grid.children).filter(child =>
                child.classList.contains('tool-card') && child.style.display !== 'none'
            );

            const isSectionEmpty = visibleCards.length === 0;

            // Hide Grid
            grid.style.display = isSectionEmpty ? 'none' : 'grid';

            // Hide Preceding H2 (Standard Sections)
            // The H2 is usually the previous Element Sibling
            const prev = grid.previousElementSibling;
            if (prev && prev.tagName === 'H2') {
                prev.style.display = isSectionEmpty ? 'none' : 'block';
            }
        });

        // 3. Handle Advanced Mode Panel specifically
        if (advancedDetails) {
            const grid = advancedDetails.querySelector('.tool-grid');
            const visibleCards = Array.from(grid.children).filter(child =>
                child.classList.contains('tool-card') && child.style.display !== 'none'
            );

            // If query is empty, allow it to show (obeying user toggle state)
            // If query is active and no matches, hide the whole panel
            if (query.length > 0 && visibleCards.length === 0) {
                advancedDetails.style.display = 'none';
            } else {
                advancedDetails.style.display = 'block';
            }
        }
    });
    // 4. Scroll Position Restoration
    // Save scroll position when clicking a tool card
    toolCards.forEach(card => {
        card.addEventListener('click', () => {
            sessionStorage.setItem('scrollPos', window.scrollY);
        });
    });

    // Restore scroll position if returning from a tool
    const savedScroll = sessionStorage.getItem('scrollPos');
    if (savedScroll) {
        // slight delay to ensure layout is stable
        setTimeout(() => {
            window.scrollTo(0, parseInt(savedScroll));
            sessionStorage.removeItem('scrollPos'); // Clear it so it doesn't jump on fresh loads
        }, 50);
    }
});
