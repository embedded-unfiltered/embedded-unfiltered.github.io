/**
 * Segment Display Generator
 * 
 * Logic to generate 7, 14, and 16 segment patterns.
 * Bit Order: A=0, B=1 ... (Standard)
 */

/* --- Configuration --- */
const SVG_NS = "http://www.w3.org/2000/svg";

// Mapping of segment names to bit positions
// 7-Seg: A(0), B(1), C(2), D(3), E(4), F(5), G(6), DP(7)
const MAP_7 = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'DP'];

// 14-Seg: A(0)..N(13) + DP(14)? Usually 16-bit word.
// Standard 14: A, B, C, D, E, F, G1, G2, H, J, K, L, M, N (DP)
const MAP_14 = ['A', 'B', 'C', 'D', 'E', 'F', 'G1', 'G2', 'H', 'J', 'K', 'L', 'M', 'N', 'DP'];

// 16-Seg: A1, A2, B, C, D1, D2, E, F, G1, G2, H, I, J, K, L, M (DP)
const MAP_16 = ['A1', 'A2', 'B', 'C', 'D1', 'D2', 'E', 'F', 'G1', 'G2', 'H', 'I', 'J', 'K', 'L', 'M', 'DP'];

// Current State
let activeMode = '7';
let activeSegments = new Set(); // Stores segment IDs (e.g. "A", "G1")
let isAnode = false;

// UI Elements
const ui = {
    container: document.getElementById('svgContainer'),
    mode: document.getElementById('selMode'),
    polarity: document.querySelectorAll('input[name="polarity"]'),
    dp: document.getElementById('checkDP'),
    digits: document.getElementById('presetDigits'),
    letters: document.getElementById('presetLetters'),
    outHex: document.getElementById('outHex'),
    outBin: document.getElementById('outBin'),
    txtCode: document.getElementById('codeOutput'),
    varName: document.getElementById('varName'),
    btnClear: document.getElementById('btnClear')
};

// SVG Paths (Normalized to 100x120 Grid)
// We construct these programmatically or use static definitions.
// 7-Segment Geometry
const SEG_7 = {
    'A': 'M 20,10 L 80,10 L 70,20 L 30,20 Z',
    'B': 'M 80,10 L 90,20 L 90,50 L 80,60 L 70,50 L 70,20 Z',
    'C': 'M 80,60 L 90,70 L 90,100 L 80,110 L 70,100 L 70,70 Z',
    'D': 'M 20,110 L 80,110 L 70,100 L 30,100 Z',
    'E': 'M 20,60 L 30,50 L 30,20 L 20,10 L 10,20 L 10,50 Z',
    'F': 'M 20,60 L 30,70 L 30,100 L 20,110 L 10,100 L 10,70 Z', // Wait, standard F is top-left
    // Correction:
    // A: Top, B: Top-Right, C: Bot-Right, D: Bot, E: Bot-Left, F: Top-Left, G: Mid
    'A': 'M 22,12 L 78,12 L 72,20 L 28,20 Z',
    'B': 'M 80,14 L 88,22 L 84,54 L 76,48 L 72,22 Z', // Slanted
    'C': 'M 76,72 L 84,66 L 88,98 L 80,106 L 72,98 Z',
    'D': 'M 22,108 L 78,108 L 72,100 L 28,100 Z',
    'E': 'M 20,106 L 12,98 L 16,66 L 24,72 L 28,98 Z',
    'F': 'M 20,14 L 28,22 L 24,48 L 16,54 L 12,22 Z',
    'G': 'M 26,60 L 32,54 L 68,54 L 74,60 L 68,66 L 32,66 Z',
    'DP': 'M 92,100 A 4,4 0 1,1 92.1,100 Z' // Circle
};

// 14-Seg Geometry (Union Jack)
// 14-Seg Geometry (Union Jack) - Refined for gaps
const SEG_14 = {
    'A': 'M 24,12 L 76,12 L 71,18 L 29,18 Z', // Top
    'B': 'M 79,15 L 86,22 L 84,52 L 80,56 L 76,52 L 73,22 Z', // Right Vert Top
    'C': 'M 80,64 L 84,68 L 86,98 L 79,105 L 73,98 L 76,68 Z', // Right Vert Bot
    'D': 'M 24,108 L 76,108 L 71,102 L 29,102 Z', // Bot
    'E': 'M 21,105 L 14,98 L 16,68 L 20,64 L 24,68 L 27,98 Z', // Left Vert Bot
    'F': 'M 20,56 L 24,52 L 27,22 L 21,15 L 14,22 L 16,52 Z', // Left Vert Top
    'G1': 'M 26,60 L 30,57 L 46,57 L 46,63 L 30,63 Z', // Mid Left
    'G2': 'M 54,60 L 54,57 L 70,57 L 74,60 L 70,63 L 54,63 Z', // Mid Right
    'H': 'M 31,29 L 42,49 L 39,52 L 28,32 Z', // Top-Left Diag (Shrunk)
    'J': 'M 50,21 L 53,21 L 53,53 L 47,53 L 47,21 Z', // Top Vert
    'K': 'M 69,29 L 72,32 L 61,52 L 58,49 Z', // Top-Right Diag (Shrunk)
    'L': 'M 31,91 L 28,88 L 39,68 L 42,71 Z', // Bot-Left Diag (Shrunk)
    'M': 'M 50,67 L 53,67 L 53,99 L 47,99 L 47,67 Z', // Bot Vert
    'N': 'M 69,91 L 58,71 L 61,68 L 72,88 Z', // Bot-Right Diag (Shrunk)
    'DP': 'M 92,100 A 4,4 0 1,1 92.1,100 Z'
};

// 16-Seg (Splits Top/Bot) - Refined for gaps
const SEG_16 = {
    'A1': 'M 24,12 L 47,12 L 47,18 L 29,18 Z',
    'A2': 'M 53,12 L 76,12 L 71,18 L 53,18 Z',
    'B': 'M 79,15 L 86,22 L 84,52 L 80,56 L 76,52 L 73,22 Z',
    'C': 'M 80,64 L 84,68 L 86,98 L 79,105 L 73,98 L 76,68 Z',
    'D1': 'M 24,108 L 47,108 L 47,102 L 29,102 Z',
    'D2': 'M 53,108 L 76,108 L 71,102 L 53,102 Z',
    'E': 'M 21,105 L 14,98 L 16,68 L 20,64 L 24,68 L 27,98 Z',
    'F': 'M 20,56 L 24,52 L 27,22 L 21,15 L 14,22 L 16,52 Z',
    'G1': 'M 26,60 L 30,57 L 46,57 L 46,63 L 30,63 Z',
    'G2': 'M 54,60 L 54,57 L 70,57 L 74,60 L 70,63 L 54,63 Z',
    'H': 'M 31,29 L 42,49 L 39,52 L 28,32 Z',
    'I': 'M 50,21 L 53,21 L 53,53 L 47,53 L 47,21 Z',
    'J': 'M 69,29 L 72,32 L 61,52 L 58,49 Z', // Upper Right Diag
    'K': 'M 31,91 L 28,88 L 39,68 L 42,71 Z', // Lower Left Diag
    'L': 'M 50,67 L 53,67 L 53,99 L 47,99 L 47,67 Z',
    'M': 'M 69,91 L 58,71 L 61,68 L 72,88 Z', // Lower Right Diag
    'DP': 'M 92,100 A 4,4 0 1,1 92.1,100 Z'
};

// Preset Maps (Simple alpha map)
const PRESETS_7 = {
    '0': ['A', 'B', 'C', 'D', 'E', 'F'], '1': ['B', 'C'], '2': ['A', 'B', 'D', 'E', 'G'], '3': ['A', 'B', 'C', 'D', 'G'],
    '4': ['B', 'C', 'F', 'G'], '5': ['A', 'C', 'D', 'F', 'G'], '6': ['A', 'C', 'D', 'E', 'F', 'G'], '7': ['A', 'B', 'C'],
    '8': ['A', 'B', 'C', 'D', 'E', 'F', 'G'], '9': ['A', 'B', 'C', 'D', 'F', 'G'],
    'A': ['A', 'B', 'C', 'E', 'F', 'G'], 'b': ['C', 'D', 'E', 'F', 'G'], 'C': ['A', 'D', 'E', 'F'], 'd': ['B', 'C', 'D', 'E', 'G'],
    'E': ['A', 'D', 'E', 'F', 'G'], 'F': ['A', 'E', 'F', 'G']
};

const PRESETS_14 = {
    '0': ['A', 'B', 'C', 'D', 'E', 'F'], '1': ['B', 'C'], '2': ['A', 'B', 'G2', 'G1', 'E', 'D'], '3': ['A', 'B', 'C', 'D', 'G2', 'G1'],
    '4': ['F', 'G1', 'G2', 'B', 'C'], '5': ['A', 'F', 'G1', 'G2', 'C', 'D'], '6': ['A', 'F', 'E', 'D', 'C', 'G1', 'G2'], '7': ['A', 'B', 'C'],
    '8': ['A', 'B', 'C', 'D', 'E', 'F', 'G1', 'G2'], '9': ['A', 'B', 'C', 'D', 'F', 'G1', 'G2'],
    'A': ['A', 'B', 'C', 'E', 'F', 'G1', 'G2'], 'B': ['A', 'B', 'C', 'D', 'J', 'M'], 'C': ['A', 'D', 'E', 'F'], 'D': ['A', 'B', 'C', 'D', 'J', 'M'],
    'E': ['A', 'D', 'E', 'F', 'G1', 'G2'], 'F': ['A', 'E', 'F', 'G1'], 'G': ['A', 'C', 'D', 'E', 'F', 'G2'], 'H': ['B', 'C', 'E', 'F', 'G1', 'G2'],
    'I': ['A', 'D', 'J', 'M'], 'J': ['B', 'C', 'D', 'E'], 'K': ['F', 'E', 'G1', 'K', 'N'], 'L': ['D', 'E', 'F'],
    'M': ['B', 'C', 'E', 'F', 'H', 'K'], 'N': ['B', 'C', 'E', 'F', 'H', 'N'], 'O': ['A', 'B', 'C', 'D', 'E', 'F'], 'P': ['A', 'B', 'E', 'F', 'G1', 'G2'],
    'Q': ['A', 'B', 'C', 'D', 'E', 'F', 'N'], 'R': ['A', 'B', 'E', 'F', 'G1', 'G2', 'N'], 'S': ['A', 'F', 'G1', 'G2', 'C', 'D'], 'T': ['A', 'J', 'M'],
    'U': ['B', 'C', 'D', 'E', 'F'], 'V': ['F', 'E', 'L', 'K'], 'W': ['B', 'C', 'E', 'F', 'L', 'N'], 'X': ['H', 'K', 'L', 'N'],
    'Y': ['F', 'B', 'G1', 'G2', 'M'], 'Z': ['A', 'D', 'K', 'L']
};

const PRESETS_16 = {
    '0': ['A1', 'A2', 'B', 'C', 'D1', 'D2', 'E', 'F'], '1': ['B', 'C'], '2': ['A1', 'A2', 'B', 'G2', 'G1', 'E', 'D1', 'D2'], '3': ['A1', 'A2', 'B', 'C', 'D1', 'D2', 'G2', 'G1'],
    '4': ['F', 'G1', 'G2', 'B', 'C'], '5': ['A1', 'A2', 'F', 'G1', 'G2', 'C', 'D1', 'D2'], '6': ['A1', 'A2', 'F', 'E', 'D1', 'D2', 'C', 'G1', 'G2'],
    '7': ['A1', 'A2', 'B', 'C'], '8': ['A1', 'A2', 'B', 'C', 'D1', 'D2', 'E', 'F', 'G1', 'G2'], '9': ['A1', 'A2', 'B', 'C', 'D1', 'D2', 'F', 'G1', 'G2'],
    'A': ['A1', 'A2', 'B', 'C', 'E', 'F', 'G1', 'G2'], 'B': ['A1', 'A2', 'B', 'C', 'D1', 'D2', 'I', 'L'], 'C': ['A1', 'A2', 'D1', 'D2', 'E', 'F'],
    'D': ['A1', 'A2', 'B', 'C', 'D1', 'D2', 'I', 'L'], 'E': ['A1', 'A2', 'D1', 'D2', 'E', 'F', 'G1', 'G2'], 'F': ['A1', 'A2', 'E', 'F', 'G1'],
    'G': ['A1', 'A2', 'C', 'D1', 'D2', 'E', 'F', 'G2'], 'H': ['B', 'C', 'E', 'F', 'G1', 'G2'], 'I': ['A1', 'A2', 'D1', 'D2', 'I', 'L'],
    'J': ['B', 'C', 'D1', 'D2', 'E'], 'K': ['F', 'E', 'G1', 'J', 'M'], 'L': ['D1', 'D2', 'E', 'F'],
    'M': ['B', 'C', 'E', 'F', 'H', 'J'], 'N': ['B', 'C', 'E', 'F', 'H', 'M'], 'O': ['A1', 'A2', 'B', 'C', 'D1', 'D2', 'E', 'F'],
    'P': ['A1', 'A2', 'B', 'E', 'F', 'G1', 'G2'], 'Q': ['A1', 'A2', 'B', 'C', 'D1', 'D2', 'E', 'F', 'M'], 'R': ['A1', 'A2', 'B', 'E', 'F', 'G1', 'G2', 'M'],
    'S': ['A1', 'A2', 'F', 'G1', 'G2', 'C', 'D1', 'D2'], 'T': ['A1', 'A2', 'I', 'L'],
    'U': ['B', 'C', 'D1', 'D2', 'E', 'F'], 'V': ['F', 'E', 'K', 'J'], 'W': ['B', 'C', 'E', 'F', 'K', 'M'], 'X': ['H', 'J', 'K', 'M'],
    'Y': ['F', 'B', 'G1', 'G2', 'L'], 'Z': ['A1', 'A2', 'D1', 'D2', 'J', 'K']
};

/* --- Init --- */
window.onload = () => {
    // Mode
    ui.mode.addEventListener('change', (e) => {
        activeMode = e.target.value;
        activeSegments.clear();
        ui.digits.innerHTML = '';
        ui.letters.innerHTML = '';
        renderSVG();
        generatePresets();
        updateOutput();
    });

    // Polarity
    ui.polarity.forEach(r => r.addEventListener('change', (e) => {
        isAnode = (e.target.value === 'anode');
        updateOutput();
    }));

    // DP
    ui.dp.addEventListener('change', updateOutput);

    // Clear
    ui.btnClear.addEventListener('click', () => {
        activeSegments.clear();
        updateSVGState();
        updateOutput();
    });

    // Inputs
    ui.varName.addEventListener('input', updateOutput);

    // Initial Render
    renderSVG();
    generatePresets();
    updateOutput();
};

/* --- Rendering --- */
function renderSVG() {
    ui.container.innerHTML = '';

    // Create SVG element
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 100 120");
    svg.style.height = "100%";
    svg.style.maxHeight = "400px";

    let pathData = {};
    if (activeMode === '7') pathData = SEG_7;
    else if (activeMode === '14') pathData = SEG_14;
    else pathData = SEG_16;

    for (let [name, d] of Object.entries(pathData)) {
        // Path
        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", d);
        path.setAttribute("class", "seg-path");
        path.setAttribute("id", `seg-${name}`);
        path.addEventListener('click', () => toggleSeg(name));
        svg.appendChild(path);

        // Label (Approximate center calculation or simple hardcode)
        // Skip label if it clutters? 16-seg is messy.
        // Let's add hover title
        const title = document.createElementNS(SVG_NS, "title");
        title.textContent = name;
        path.appendChild(title);
    }

    ui.container.appendChild(svg);
    updateSVGState();
}

function updateSVGState() {
    const paths = document.querySelectorAll('.seg-path');
    paths.forEach(p => {
        const id = p.id.replace('seg-', '');
        if (activeSegments.has(id)) p.classList.add('active');
        else p.classList.remove('active');
    });
}

function toggleSeg(id) {
    if (activeSegments.has(id)) activeSegments.delete(id);
    else activeSegments.add(id);
    updateSVGState();
    updateOutput();
}

/* --- Presets --- */
function generatePresets() {
    // Digits 0-9
    for (let i = 0; i <= 9; i++) {
        const btn = document.createElement('button');
        btn.className = 'preset-btn';
        btn.textContent = i;
        btn.onclick = () => applyPreset(i.toString());
        ui.digits.appendChild(btn);
    }

    // Letters A-F (7 seg) or A-Z (14/16)
    const chars = "ABCDEF" + (activeMode !== '7' ? "GHIJKLMNOPQRSTUVWXYZ" : "");
    for (let char of chars) {
        const btn = document.createElement('button');
        btn.className = 'preset-btn';
        btn.textContent = char;
        btn.onclick = () => applyPreset(char);
        ui.letters.appendChild(btn);
    }
}

function applyPreset(char) {
    activeSegments.clear();
    let map = [];

    // Simple 7-seg logic
    if (activeMode === '7') {
        const key = char;
        if (PRESETS_7[key]) map = PRESETS_7[key];
        else if (PRESETS_7[key.toLowerCase()]) map = PRESETS_7[key.toLowerCase()];
    } else if (activeMode === '14') {
        if (PRESETS_14[char]) map = PRESETS_14[char];
    } else if (activeMode === '16') {
        if (PRESETS_16[char]) map = PRESETS_16[char];
    }

    map.forEach(s => activeSegments.add(s));
    updateSVGState();
    updateOutput();
}

/* --- Output Generation --- */
function updateOutput() {
    let val = 0;
    let map = [];

    if (activeMode === '7') map = MAP_7;
    else if (activeMode === '14') map = MAP_14;
    else map = MAP_16;

    map.forEach((segName, idx) => {
        // If 7-seg, check DP check
        if (segName === 'DP' && !ui.dp.checked) return;

        const isOn = activeSegments.has(segName);
        if (isOn) {
            val |= (1 << idx);
        }
    });

    // Invert if Anode
    // Mask based on bits
    let maxVal = (1 << map.length) - 1;
    // Actually map length might be different if DP unused?
    // Let's assume standard width (8 for 7-seg, 16 for others)
    let bitWidth = activeMode === '7' ? 8 : 16;
    maxVal = (1 << bitWidth) - 1;

    if (isAnode) {
        val = (~val) & maxVal;
    }

    // Hex
    const hexStr = "0x" + val.toString(16).toUpperCase().padStart(bitWidth / 4, '0');
    ui.outHex.textContent = hexStr;

    // Bin
    const binStr = "0b" + val.toString(2).padStart(bitWidth, '0');
    ui.outBin.textContent = binStr;

    // C Code
    const type = bitWidth === 8 ? "uint8_t" : "uint16_t";
    const code = `// Segment Pattern for ${activeMode}-Segment Display
// Segments: ${Array.from(activeSegments).sort().join(', ') || 'None'}
// Polarity: Common ${isAnode ? 'Anode' : 'Cathode'}
const ${type} ${ui.varName.value} = ${hexStr};`;

    ui.txtCode.value = code;
}

function copyCode() {
    ui.txtCode.select();
    navigator.clipboard.writeText(ui.txtCode.value);
}
