/**
 * Unified Passive Component Decoder
 * Handles SMD Resistors, Color Bands, Capacitors, and Inductors.
 */

/* --- Data & Lookups --- */

const EIA96_CODES = {
    '01': 100, '02': 102, '03': 105, '04': 107, '05': 110, '06': 113, '07': 115, '08': 118,
    '09': 121, '10': 124, '11': 127, '12': 130, '13': 133, '14': 137, '15': 140, '16': 143,
    '17': 147, '18': 150, '19': 154, '20': 158, '21': 162, '22': 165, '23': 169, '24': 174,
    '25': 178, '26': 182, '27': 187, '28': 191, '29': 196, '30': 200, '31': 205, '32': 210,
    '33': 215, '34': 221, '35': 226, '36': 232, '37': 237, '38': 243, '39': 249, '40': 255,
    '41': 261, '42': 267, '43': 274, '44': 280, '45': 287, '46': 294, '47': 301, '48': 309,
    '49': 316, '50': 324, '51': 332, '52': 340, '53': 348, '54': 357, '55': 365, '56': 374,
    '57': 383, '58': 392, '59': 402, '60': 412, '61': 422, '62': 432, '63': 442, '64': 453,
    '65': 464, '66': 475, '67': 487, '68': 499, '69': 511, '70': 523, '71': 536, '72': 549,
    '73': 562, '74': 576, '75': 590, '76': 604, '77': 619, '78': 634, '79': 649, '80': 665,
    '81': 681, '82': 698, '83': 715, '84': 732, '85': 750, '86': 768, '87': 787, '88': 806,
    '89': 825, '90': 845, '91': 866, '92': 887, '93': 909, '94': 931, '95': 953, '96': 976
};

const EIA96_MULTIPLIERS = {
    'Z': 0.001,
    'Y': 0.01, 'R': 0.01,
    'X': 0.1, 'S': 0.1,
    'A': 1,
    'B': 10, 'H': 10,
    'C': 100,
    'D': 1000,
    'E': 10000,
    'F': 100000
};

// Standard Colors
const COLORS = [
    { name: 'Black', hex: '#000000', val: 0, mult: 1, tol: null },
    { name: 'Brown', hex: '#8B4513', val: 1, mult: 10, tol: 1 },
    { name: 'Red', hex: '#ff3333', val: 2, mult: 100, tol: 2 },
    { name: 'Orange', hex: '#ffa500', val: 3, mult: 1000, tol: null },
    { name: 'Yellow', hex: '#ffff00', val: 4, mult: 10000, tol: null },
    { name: 'Green', hex: '#00cc00', val: 5, mult: 100000, tol: 0.5 },
    { name: 'Blue', hex: '#3366ff', val: 6, mult: 1000000, tol: 0.25 },
    { name: 'Violet', hex: '#9933cc', val: 7, mult: 10000000, tol: 0.1 },
    { name: 'Grey', hex: '#808080', val: 8, mult: null, tol: 0.05 },
    { name: 'White', hex: '#ffffff', val: 9, mult: null, tol: null },
    { name: 'Gold', hex: '#d4af37', val: null, mult: 0.1, tol: 5 },
    { name: 'Silver', hex: '#c0c0c0', val: null, mult: 0.01, tol: 10 }
];

/* --- State --- */
let activeMode = 'smd';
let bandState = { count: 4, bands: [1, 0, 2, 10] }; // Indices into COLORS array

/* --- Initialization --- */
window.onload = () => {
    initTabs();
    initSMD();
    initBands();
    initCap();
    initInd();
};

/* --- TAB LOGIC --- */
function initTabs() {
    const btns = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.decoder-panel');

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            // UI Update
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            panels.forEach(p => p.classList.remove('active'));
            const target = `panel-${btn.dataset.tab}`;
            document.getElementById(target).classList.add('active');

            activeMode = btn.dataset.tab;
        });
    });
}

/* --- SMD DECODER --- */
function initSMD() {
    const input = document.getElementById('smdInput');
    const viz = document.getElementById('smdVizText');
    const res = document.getElementById('smdResult');
    const meta = document.getElementById('smdMeta');

    input.addEventListener('input', () => {
        const val = input.value.trim().toUpperCase();
        viz.textContent = val || '---';

        if (!val) {
            res.textContent = '-- Ω';
            meta.textContent = 'Waiting for input...';
            return;
        }

        const decoded = decodeSMD(val);
        if (decoded.error) {
            res.textContent = 'Invalid Code';
            res.style.color = 'var(--color-error)';
            meta.textContent = decoded.error;
        } else {
            res.textContent = formatResistor(decoded.value);
            res.style.color = 'var(--color-signal-high)';
            meta.textContent = `Format: ${decoded.type}`;
        }
    });
}

function decodeSMD(str) {
    // 1. Check for EIA-96 (2 digits + Letter)
    // Regex: ^[0-9]{2}[A-Z]$
    if (/^[0-9]{2}[A-Z]$/.test(str)) {
        const code = str.substring(0, 2);
        const multChar = str.substring(2);

        const base = EIA96_CODES[code];
        const mult = EIA96_MULTIPLIERS[multChar];

        if (base && mult !== undefined) {
            return { value: base * mult, type: 'EIA-96 (1% Tolerance)' };
        }
    }

    // 2. Check for "R" notation (4R7, R10)
    if (str.includes('R')) {
        const num = parseFloat(str.replace('R', '.'));
        if (!isNaN(num)) {
            return { value: num, type: 'Decimal "R" Notation' };
        }
    }

    // 3. Standard 3-digit (103)
    if (/^[0-9]{3}$/.test(str)) {
        const sig = parseInt(str.substring(0, 2));
        const pow = parseInt(str.substring(2));
        return { value: sig * Math.pow(10, pow), type: 'Standard 3-Digit (5% Tolerance)' };
    }

    // 4. Standard 4-digit (1002)
    if (/^[0-9]{4}$/.test(str)) {
        const sig = parseInt(str.substring(0, 3));
        const pow = parseInt(str.substring(3));
        return { value: sig * Math.pow(10, pow), type: 'Standard 4-Digit (1% Tolerance)' };
    }

    return { error: 'Unknown format' };
}

/* --- COLOR BAND DECODER --- */
function initBands() {
    const radios = document.querySelectorAll('input[name="bandCount"]');
    radios.forEach(r => {
        r.addEventListener('change', (e) => {
            bandState.count = parseInt(e.target.value);
            updateBandSelectors();
            updateBandCalc();
        });
    });

    updateBandSelectors();
    updateBandCalc();
}

function updateBandSelectors() {
    const container = document.getElementById('bandSelectors');
    container.innerHTML = '';

    // Define band roles based on count
    // 4 Band: Digit, Digit, Mult, Tol
    // 5 Band: Digit, Digit, Digit, Mult, Tol
    // 6 Band: Digit, Digit, Digit, Mult, Tol, Temp
    let roles = [];
    if (bandState.count === 4) roles = ['Digit 1', 'Digit 2', 'Multiplier', 'Tolerance'];
    else if (bandState.count === 5) roles = ['Digit 1', 'Digit 2', 'Digit 3', 'Multiplier', 'Tolerance'];
    else roles = ['Digit 1', 'Digit 2', 'Digit 3', 'Multiplier', 'Tolerance', 'Temp Coeff.'];

    // Ensure state array size matches
    while (bandState.bands.length < bandState.count) bandState.bands.push(0);

    roles.forEach((role, idx) => {
        const row = document.createElement('div');
        row.className = 'band-row';

        const label = document.createElement('span');
        label.textContent = role;
        label.style.width = '100px';
        label.style.color = 'var(--color-text-secondary)';
        label.style.textAlign = 'right';

        const select = document.createElement('select');
        select.style.flex = '1';

        // Populate logic (simplification: not all colors valid for all pos, but good enough for generic tool)
        COLORS.forEach((c, cIdx) => {
            // Tolerance band (last or 2nd last) restriction
            // Multiplier restriction
            // Digit restriction (Gold/Silver not valid digits)
            let valid = true;
            if (role.startsWith('Digit') && c.val === null) valid = false;
            // if (role === 'Multiplier' && c.mult === null) valid = false; // All fit mult except wht/gry limit?

            if (valid) {
                const opt = document.createElement('option');
                opt.value = cIdx;
                opt.innerText = c.name;
                opt.style.background = c.hex;
                opt.style.color = (c.name === 'Black' || c.name === 'Blue' || c.name === 'Red') ? 'white' : 'black';
                if (cIdx === bandState.bands[idx]) opt.selected = true;
                select.appendChild(opt);
            }
        });

        select.addEventListener('change', (e) => {
            bandState.bands[idx] = parseInt(e.target.value);
            updateBandCalc();
        });

        // Swatch
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.background = COLORS[bandState.bands[idx]].hex;
        select.addEventListener('change', (e) => {
            swatch.style.background = COLORS[parseInt(e.target.value)].hex;
        });

        row.appendChild(label);
        row.appendChild(select);
        row.appendChild(swatch);
        container.appendChild(row);
    });
}

function updateBandCalc() {
    // Visualize
    const vizContainer = document.getElementById('bandVizContainer');
    vizContainer.innerHTML = '';
    for (let i = 0; i < bandState.count; i++) {
        const bar = document.createElement('div');
        bar.style.width = '12px';
        bar.style.height = '100%';
        bar.style.background = COLORS[bandState.bands[i]].hex;
        // Spacing: Tolerance usually separated
        if (i === bandState.count - 1) bar.style.marginLeft = 'auto'; // Push tolerance to right
        vizContainer.appendChild(bar);
    }

    // Calculate
    let val = 0;
    let digits = [];
    const bands = bandState.bands.map(i => COLORS[i]);

    // Collect Digits
    let multIdx = bandState.count === 4 ? 2 : 3;
    let tolIdx = bandState.count === 4 ? 3 : 4;

    for (let i = 0; i < multIdx; i++) {
        digits.push(bands[i].val);
    }

    const base = parseInt(digits.join(''));
    const mult = bands[multIdx].mult || 0;
    const finalVal = base * mult;
    const tol = bands[tolIdx].tol !== null ? bands[tolIdx].tol : 20; // 20% default if undefined

    document.getElementById('bandResult').textContent = formatResistor(finalVal);
    document.getElementById('bandMeta').textContent = `Tolerance: ±${tol}%`;
}


/* --- CAPACITOR DECODER --- */
function initCap() {
    const input = document.getElementById('capInput');
    const viz = document.getElementById('capVizText');
    const res = document.getElementById('capResult');
    const meta = document.getElementById('capMeta');

    input.addEventListener('input', () => {
        const val = input.value.trim().toUpperCase();
        viz.textContent = val || '---';
        if (!val) return;

        // Logic
        // 1. 3-digit (104 -> 100nF)
        if (/^[0-9]{3}$/.test(val)) {
            const sig = parseInt(val.substring(0, 2));
            const pow = parseInt(val.substring(2));
            const pF = sig * Math.pow(10, pow);
            res.textContent = formatCap(pF);
            meta.textContent = 'EIA Standard (pF base)';
        }
        // 2. Letter voltage codes (106C)
        else if (/^[0-9]{3}[A-Z]$/.test(val)) {
            const sig = parseInt(val.substring(0, 2));
            const pow = parseInt(val.substring(2, 3));
            const char = val.substring(3);
            const pF = sig * Math.pow(10, pow);
            res.textContent = formatCap(pF);

            // Volts lookup
            const volts = { 'A': 10, 'C': 16, 'E': 25, 'V': 35, 'H': 50 }; // Common tantalum subset
            if (volts[char]) meta.textContent = `Voltage: ${volts[char]}V (Approx)`;
            else meta.textContent = `Voltage Code: ${char} (Check datasheet)`;
        }
        // 3. Direct units (4n7)
        else if (val.includes('N') || val.includes('P') || val.includes('U')) {
            // simple parse
            let mult = 1e-12; // p default
            if (val.includes('N')) mult = 1e-9;
            if (val.includes('U')) mult = 1e-6;

            const num = parseFloat(val.replace(/[NPU]/, '.'));
            res.textContent = formatCap(num / 1e-12);
            meta.textContent = 'Direct Value';
        }
        else {
            res.textContent = 'Invalid';
        }
    });
}

/* --- INDUCTOR DECODER --- */
function initInd() {
    const input = document.getElementById('indInput');
    const res = document.getElementById('indResult');
    const meta = document.getElementById('indMeta');

    input.addEventListener('input', () => {
        const val = input.value.trim().toUpperCase();
        if (!val) return;

        // Inductors usually uH based for 3-digit codes (101 = 100uH)
        if (/^[0-9]{3}$/.test(val)) {
            const sig = parseInt(val.substring(0, 2));
            const pow = parseInt(val.substring(2));
            const uH = sig * Math.pow(10, pow);
            res.textContent = formatInd(uH);
            meta.textContent = 'Standard uH Code';
        } else if (val.includes('R')) {
            const uH = parseFloat(val.replace('R', '.'));
            res.textContent = formatInd(uH);
            meta.textContent = 'Decimal "R" Notation';
        } else {
            res.textContent = 'Invalid';
        }

    });
}


/* --- HELPERS --- */
function formatResistor(ohms) {
    if (ohms >= 1e6) return (ohms / 1e6).toFixed(2).replace(/\.00$/, '') + ' MΩ';
    if (ohms >= 1e3) return (ohms / 1e3).toFixed(2).replace(/\.00$/, '') + ' kΩ';
    return ohms.toFixed(2).replace(/\.00$/, '') + ' Ω';
}

function formatCap(pF) {
    if (pF >= 1e6) return (pF / 1e6).toFixed(1).replace(/\.0$/, '') + ' µF';
    if (pF >= 1e3) return (pF / 1e3).toFixed(1).replace(/\.0$/, '') + ' nF';
    return pF.toFixed(0) + ' pF';
}

function formatInd(uH) {
    if (uH >= 1e3) return (uH / 1e3).toFixed(2).replace(/\.00$/, '') + ' mH';
    return uH.toFixed(2).replace(/\.00$/, '') + ' µH';
}
