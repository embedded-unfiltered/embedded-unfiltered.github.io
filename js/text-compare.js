/**
 * Embedded Text Comparator - Deterministic Diff Logic
 * 
 * Features:
 * - Line-by-line diff with Meyers-ish approach (simplified for logs)
 * - Char-by-char diff for changed lines
 * - Byte counting (UTF-8)
 * - Hex view
 */

// DOM Elements - IDs must match HTML
const inputA = document.getElementById('inputA');
const inputB = document.getElementById('inputB');
const viewA = document.getElementById('viewA');
const viewB = document.getElementById('viewB');
const gutterA = document.getElementById('gutterA');
const gutterB = document.getElementById('gutterB');
const scrollA = document.getElementById('scrollA');
const scrollB = document.getElementById('scrollB');
const backdropA = document.getElementById('backdropA');
const backdropB = document.getElementById('backdropB');

const statsA = {
    chars: document.getElementById('charsA'),
    bytes: document.getElementById('bytesA'),
    lines: document.getElementById('linesA'),
    ending: document.getElementById('endingA'),
    trailing: document.getElementById('trailingA')
};
const statsB = {
    chars: document.getElementById('charsB'),
    bytes: document.getElementById('bytesB'),
    lines: document.getElementById('linesB'),
    ending: document.getElementById('endingB'),
    trailing: document.getElementById('trailingB')
};

const statusIndicator = document.getElementById('statusIndicator');

// Options
const optIgnoreWS = document.getElementById('ignoreWhitespace');
const optIgnoreEmpty = document.getElementById('ignoreEmptyLines');
const optNormalize = document.getElementById('normalizeEndings');
const optInvisibles = document.getElementById('showInvisibles');
const optHex = document.getElementById('hexMode');

// State
let isHexMode = false;
const hexLegend = document.getElementById('hexLegend');

// Helper to expand textarea height
function autoExpand(el) {
    el.style.height = 'auto'; // Reset
    el.style.height = el.scrollHeight + 'px'; // Set to content
}

// Event Listeners
const triggers = [inputA, inputB, optIgnoreWS, optIgnoreEmpty, optNormalize, optInvisibles];
// Triggers for comparison
triggers.forEach(el => {
    ['input', 'change'].forEach(evt => {
        el.addEventListener(evt, () => {
            // If input changed, expand height
            if (el === inputA) autoExpand(inputA);
            if (el === inputB) autoExpand(inputB);

            runCompare();

            // Also update gutters for editing
            if (!isHexMode && (inputA.style.display !== 'none')) {
                updateEditGutters();
            }
        });
    });
});

optHex.addEventListener('change', toggleHexMode);

// Sync Scrolls (Containers)
scrollA.addEventListener('scroll', () => {
    if (!isHexMode) {
        // Debounce or check? Usually fine for dual sync.
        // Avoid infinite loop by checking difference
        if (Math.abs(scrollB.scrollTop - scrollA.scrollTop) > 2) {
            scrollB.scrollTop = scrollA.scrollTop;
        }
    }
});
scrollB.addEventListener('scroll', () => {
    if (!isHexMode) {
        if (Math.abs(scrollA.scrollTop - scrollB.scrollTop) > 2) {
            scrollA.scrollTop = scrollB.scrollTop;
        }
    }
});
// No listeners needed for viewA/viewB scroll because they are now inside scrollA/scrollB content

function updateEditGutters() {
    // Simple line count for edit mode
    renderBasicGutter(inputA.value, gutterA);
    renderBasicGutter(inputB.value, gutterB);
}

function renderBasicGutter(text, gutter) {
    const lines = text.split(/\r\n|\r|\n/).length;
    let html = '';
    for (let i = 1; i <= lines; i++) {
        html += `<div class="line-number">${i}</div>`;
    }
    gutter.innerHTML = html;
}



// ...

function runCompare() {
    if (isHexMode) return updateHexView();

    const rawA = inputA.value;
    const rawB = inputB.value;

    updateStats(rawA, statsA);
    updateStats(rawB, statsB);

    const linesA = splitLines(rawA);
    const linesB = splitLines(rawB);

    // Initial Render of Basic Gutters (will be overwritten by highlight classes if diffs exist)
    renderBasicGutter(rawA, gutterA);
    renderBasicGutter(rawB, gutterB);

    // Clear Backdrops
    backdropA.innerHTML = '';
    backdropB.innerHTML = '';

    if (rawA === rawB) {
        showStatus('match', '✅ Exact Match');
        if (viewA.style.display === 'block') {
            renderSimple(linesA, viewA);
            renderSimple(linesB, viewB);
        }
        return;
    }

    // Diff Logic
    const diff = computeLineDiff(linesA, linesB);
    const diffCount = diff.filter(d => d.type !== 'same').length;

    if (diffCount === 0) {
        if (rawA !== rawB) {
            // Content matches only because of normalization/ignoring
            let msg = '✅ Match (ignoring format/whitespace)';
            if (optIgnoreWS.checked && optIgnoreEmpty.checked) msg = '✅ Match (ignoring whitespace & empty lines)';
            else if (optIgnoreWS.checked) msg = '✅ Match (ignoring whitespace)';
            else if (optIgnoreEmpty.checked) msg = '✅ Match (ignoring empty lines)';

            showStatus('match', msg);
        } else {
            showStatus('match', '✅ Exact Match');
        }

        // Ensure visuals are cleared/updated for "Same" rows
        if (inputA.style.display !== 'none') {
            updateEditorVisuals(diff);
        }
    } else {
        let firstDiff = findFirstDiff(diff);
        showStatus('diff', `❌ Differences found <span style="margin-left:12px; opacity:0.8; font-weight:400;">First diff: Line ${firstDiff.line}</span>`);

        // Render Live Highlights in Edit Mode
        if (inputA.style.display !== 'none') {
            updateEditorVisuals(diff);
        }
    }

    // Render View if active
    if (viewA.style.display === 'block') {
        renderDiff(diff, viewA, viewB);
    }
}

function updateEditorVisuals(diff) {
    let htmlBackA = '';
    let htmlBackB = '';

    // Live access to children
    const guttersA = gutterA.children;
    const guttersB = gutterB.children;

    let lineIdxA = 0;
    let lineIdxB = 0;

    diff.forEach(item => {
        if (item.type === 'same') {
            // Keep synced
            htmlBackA += `<div class="backdrop-row"></div>`;
            htmlBackB += `<div class="backdrop-row"></div>`;
            lineIdxA++;
            lineIdxB++;
        } else if (item.type === 'rem') {
            // Deleted from A -> highlight A
            htmlBackA += `<div class="backdrop-row highlight-rem"></div>`;
            if (guttersA[lineIdxA]) guttersA[lineIdxA].classList.add('highlight-rem');
            lineIdxA++;
        } else if (item.type === 'add') {
            // Added to B -> highlight B
            htmlBackB += `<div class="backdrop-row highlight-add"></div>`;
            if (guttersB[lineIdxB]) guttersB[lineIdxB].classList.add('highlight-add');
            lineIdxB++;
        }
    });

    backdropA.innerHTML = htmlBackA;
    backdropB.innerHTML = htmlBackB;
}

function findFirstDiff(diff) {
    let line = 0;
    for (let i = 0; i < diff.length; i++) {
        // Count lines implies we are counting 'output' lines or 'input' lines?
        // User wants "Line X". Usually referring to the SOURCE line number.
        // If it's a REMOVE, it's line X in A. If ADD, it's line Y in B.
        // Let's just count visual lines (rows) for simplicity in this View.
        line++;
        if (diff[i].type !== 'same') {
            return { line: line };
        }
    }
    return { line: 1 };
}

function updateStats(text, ui) {
    const chars = text.length;
    const bytes = new Blob([text]).size; // Accurate UTF-8
    // Simple split for line count
    const lines = text.length === 0 ? 0 : text.split(/\r\n|\r|\n/).length;

    // Detect line endings
    let ending = 'Mixed';
    if (!text.match(/[\r\n]/)) ending = 'None';
    else if (text.match(/\r\n/) && !text.match(/[^\r]\n/)) ending = 'CRLF';
    else if (text.match(/\n/) && !text.match(/\r/)) ending = 'LF';
    else if (text.match(/\r/) && !text.match(/\n/)) ending = 'CR';

    // Trailing Whitespace
    // Check if trimming the end changes the length
    const hasTrailing = text !== text.trimEnd();

    // Update UI
    ui.chars.textContent = chars;
    ui.bytes.textContent = bytes;
    ui.lines.textContent = lines;
    ui.ending.textContent = ending;
    ui.trailing.textContent = hasTrailing ? 'Trailing WS: Yes' : 'No Trailing WS';

    // Color alert for trailing
    ui.trailing.style.color = hasTrailing ? 'var(--color-accent)' : 'inherit';
}

function splitLines(text) {
    let lines;

    // 1. Split logic
    if (optNormalize.checked) {
        lines = text.split(/\r\n|\r|\n/);
    } else {
        lines = text.split(/\r\n|\r|\n/); // Default split anyway
    }

    // 2. Filter Empty (Warning: desyncs index for visual highlighting if used)
    if (optIgnoreEmpty.checked) {
        lines = lines.filter(l => l.length > 0);
    }

    // 3. Ignore Whitespace
    if (optIgnoreWS.checked) {
        lines = lines.map(l => l.trim());
    }

    return lines;
}

function computeLineDiff(a, b) {
    // Basic LCS
    const n = a.length;
    const m = b.length;
    const matrix = Array(n + 1).fill().map(() => Array(m + 1).fill(0));

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            if (a[i - 1] === b[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1] + 1;
            } else {
                matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
            }
        }
    }

    // Backtrack
    let i = n, j = m;
    const result = [];

    while (i > 0 && j > 0) {
        if (a[i - 1] === b[j - 1]) {
            result.unshift({ type: 'same', content: a[i - 1] });
            i--; j--;
        } else if (matrix[i - 1][j] > matrix[i][j - 1]) {
            result.unshift({ type: 'rem', content: a[i - 1] });
            i--;
        } else {
            result.unshift({ type: 'add', content: b[j - 1] });
            j--;
        }
    }

    while (i > 0) {
        result.unshift({ type: 'rem', content: a[i - 1] });
        i--;
    }
    while (j > 0) {
        result.unshift({ type: 'add', content: b[j - 1] });
        j--;
    }

    return result;
}

function renderDiff(diff, containerA, containerB) {
    let htmlA = '';
    let htmlB = '';

    let lineA = 1;
    let lineB = 1;
    let firstDiffFound = false;

    diff.forEach(item => {
        const content = escapeHtml(item.content);
        const inv = optInvisibles.checked ? showInvisibles(content) : content;

        let rowClassA = 'diff-row';
        let rowClassB = 'diff-row';

        // Determine type and classes
        if (item.type === 'same') {
            // No highlight
            htmlA += `<div class="${rowClassA}">
                        <div class="diff-gutter-cell">${lineA++}</div>
                        <div class="diff-text-cell">${inv}</div>
                      </div>`;
            htmlB += `<div class="${rowClassB}">
                        <div class="diff-gutter-cell">${lineB++}</div>
                        <div class="diff-text-cell">${inv}</div>
                      </div>`;
        } else if (item.type === 'rem') {
            // Deleted from A (Red)
            rowClassA += ' diff-removed';
            if (!firstDiffFound) { rowClassA += ' first-diff'; firstDiffFound = true; }

            htmlA += `<div class="${rowClassA}">
                        <div class="diff-gutter-cell">${lineA++}</div>
                        <div class="diff-text-cell">${inv}</div>
                      </div>`;
            // Spacer for B
            htmlB += `<div class="diff-row">
                        <div class="diff-gutter-cell"></div>
                        <div class="diff-text-cell"></div>
                      </div>`;
        } else if (item.type === 'add') {
            // Added to B (Green)
            rowClassB += ' diff-added';
            if (!firstDiffFound) { rowClassB += ' first-diff'; firstDiffFound = true; }

            // Spacer for A
            htmlA += `<div class="diff-row">
                        <div class="diff-gutter-cell"></div>
                        <div class="diff-text-cell"></div>
                      </div>`;
            htmlB += `<div class="${rowClassB}">
                        <div class="diff-gutter-cell">${lineB++}</div>
                        <div class="diff-text-cell">${inv}</div>
                      </div>`;
        }
    });

    viewA.innerHTML = htmlA;
    viewB.innerHTML = htmlB;

    // Switch to View Mode
    inputA.style.display = 'none';
    inputB.style.display = 'none';

    // Hide Edit Gutters (View Mode has internal gutters)
    gutterA.style.display = 'none';
    gutterB.style.display = 'none';

    viewA.style.display = 'block';
    viewB.style.display = 'block';

    // Click to edit
    viewA.onclick = enableEditing;
    viewB.onclick = enableEditing;
}

function enableEditing() {
    inputA.style.display = 'block';
    inputB.style.display = 'block';

    // Show Edit Gutters
    gutterA.style.display = 'block';
    gutterB.style.display = 'block';

    viewA.style.display = 'none';
    viewB.style.display = 'none';
    inputA.focus();
    updateEditGutters();
}

function renderSimple(lines, container) {
    // Render as rows (no highlight)
    // We need to know which container to update gutter for? 
    // Wait, in View Mode with Rows, we don't need external gutters.

    let html = '';
    lines.forEach((l, i) => {
        const c = escapeHtml(l);
        const inv = optInvisibles.checked ? showInvisibles(c) : c;
        html += `<div class="diff-row">
                    <div class="diff-gutter-cell">${i + 1}</div>
                    <div class="diff-text-cell">${inv}</div>
                 </div>`;
    });

    container.innerHTML = html;

    // Switch to View Mode logic (shared)
    inputA.style.display = 'none';
    inputB.style.display = 'none';
    gutterA.style.display = 'none';
    gutterB.style.display = 'none';
    viewA.style.display = 'block';
    viewB.style.display = 'block';

    viewA.onclick = enableEditing;
    viewB.onclick = enableEditing;
}

// Button to force diff view (optional, but good for UX)
// We assume user can click 'Copy Differences' or check status. 
// Standard behavior: If I paste text, I see "Exact Match" or "Differences Found".
// If "Differences Found", I usually want to see them.
// My previous code in `runCompare` only switches to view mode if `viewA` is already block.
// Meaning: We stick to Edit Mode unless we are in View Mode.
// How to enter View Mode?
// I'll make the Status Indicator clickable to "Show Diff".
statusIndicator.style.cursor = 'pointer';
statusIndicator.title = "Click to toggle Diff View";
statusIndicator.onclick = () => {
    if (viewA.style.display === 'none') {
        const rawA = inputA.value;
        const rawB = inputB.value;
        const linesA = splitLines(rawA);
        const linesB = splitLines(rawB);
        if (rawA === rawB) {
            renderSimple(linesA, viewA);
            renderSimple(linesB, viewB);
        } else {
            renderDiff(computeLineDiff(linesA, linesB), viewA, viewB);
        }
    } else {
        enableEditing();
    }
};

function renderSimple(lines, container) {
    let html = '';
    let gut = '';
    lines.forEach((l, i) => {
        const c = escapeHtml(l);
        html += `<div class="diff-line">${optInvisibles.checked ? showInvisibles(c) : c}</div>`;
        gut += `<div class="line-number">${i + 1}</div>`;
    });

    container.innerHTML = html;

    if (container === viewA) {
        gutterA.innerHTML = gut;
    } else {
        gutterB.innerHTML = gut;
    }

    inputA.style.display = 'none';
    inputB.style.display = 'none';
    viewA.style.display = 'block';
    viewB.style.display = 'block';

    viewA.onclick = () => enableEditing();
    viewB.onclick = () => enableEditing();
}

function showStatus(type, msg) {
    statusIndicator.className = type === 'match'
        ? 'diff-status status-match'
        : 'diff-status status-diff';

    const icon = type === 'match'
        ? '<polyline points="20 6 9 17 4 12"></polyline>'
        : '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>';

    statusIndicator.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg> ${msg}`;
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showInvisibles(text) {
    // Replace spaces with · ? Maybe too noisy.
    // Just endings.
    // Since we split lines, endings are gone from string. 
    // We can append visual \n or \r if we knew them.
    // For now, implicit.
    return text.replace(/ /g, '·'); // Optional: replace spaces
}

function toggleHexMode() {
    isHexMode = optHex.checked;
    if (isHexMode) {
        inputA.style.display = 'none';
        inputB.style.display = 'none';

        // Force clear visuals
        backdropA.style.display = 'none';
        backdropB.style.display = 'none';
        backdropA.innerHTML = '';
        backdropB.innerHTML = '';

        viewA.style.display = 'block';
        viewB.style.display = 'block';
        hexLegend.style.display = 'inline';
        updateHexView();
    } else {
        inputA.style.display = 'block';
        inputB.style.display = 'block';
        backdropA.style.display = 'block';
        backdropB.style.display = 'block';
        viewA.style.display = 'none';
        viewB.style.display = 'none';
        hexLegend.style.display = 'none';
        runCompare(); // Re-run standard text diff
    }
}

function updateHexView() {
    const hexA = toHex(inputA.value);
    const hexB = toHex(inputB.value);
    viewA.textContent = hexA;
    viewB.textContent = hexB;

    // Update gutters for Hex content (simple count, no highlights)
    renderBasicGutter(hexA, gutterA);
    renderBasicGutter(hexB, gutterB);
}

function toHex(str) {
    let result = '';
    const buffer = new TextEncoder().encode(str);
    for (let i = 0; i < buffer.length; i++) {
        const byte = buffer[i].toString(16).padStart(2, '0').toUpperCase();
        result += byte + ' ';
        if ((i + 1) % 16 === 0) result += '\n';
        else if ((i + 1) % 8 === 0) result += '  ';
    }
    return result;
}

function clearAll() {
    inputA.value = '';
    inputB.value = '';
    inputA.style.display = 'block';
    inputB.style.display = 'block';
    viewA.style.display = 'none';
    viewB.style.display = 'none';
    gutterA.innerHTML = '';
    gutterB.innerHTML = '';
    backdropA.innerHTML = '';
    backdropB.innerHTML = '';
    inputA.style.height = 'auto'; // Reset
    inputB.style.height = 'auto'; // Reset

    statsA.chars.textContent = '0'; statsA.bytes.textContent = '0'; statsA.lines.textContent = '1'; statsA.ending.textContent = 'None'; statsA.trailing.textContent = 'No Trailing WS'; statsA.trailing.style.color = 'inherit';
    statsB.chars.textContent = '0'; statsB.bytes.textContent = '0'; statsB.lines.textContent = '1'; statsB.ending.textContent = 'None'; statsB.trailing.textContent = 'No Trailing WS'; statsB.trailing.style.color = 'inherit';

    statusIndicator.className = 'diff-status status-match';
    statusIndicator.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Exact Match`;
}

function copyDiffs() {
    // TODO: Implementation for copying only differences
    const diff = computeLineDiff(splitLines(inputA.value), splitLines(inputB.value));
    const changes = diff.filter(x => x.type !== 'same')
        .map(x => (x.type === 'add' ? '+ ' : '- ') + x.content)
        .join('\n');

    if (changes) {
        navigator.clipboard.writeText(changes).then(() => alert('Differences copied to clipboard!'));
    } else {
        alert('No differences to copy.');
    }
}

// Initial
autoExpand(inputA);
autoExpand(inputB);
runCompare();
