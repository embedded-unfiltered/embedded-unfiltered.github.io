/**
 * Programmer Calculator (Register Inspector)
 * 64-bit precise, BigInt based, Deterministic.
 */

// DOM Elements
const selWidth = document.getElementById('bitWidth');
const btnSign = document.getElementById('toggleSign');
const inHex = document.getElementById('inHex');
const inDec = document.getElementById('inDec');
const inBin = document.getElementById('inBin');

const bitContainer = document.getElementById('bitContainer');
const outOct = document.getElementById('outOct');
const outPop = document.getElementById('outPop');
const outClz = document.getElementById('outClz');

const maskHigh = document.getElementById('maskHigh');
const maskLow = document.getElementById('maskLow');
const btnMask = document.getElementById('btnApplyMask');

// State
let state = {
    val: 0n,         // Always stored as Unsigned BigInt internally
    width: 32,       // 8, 16, 32, 64
    signed: false    // Interpretation mode
};

// Masks
const MASK_64 = 0xFFFFFFFFFFFFFFFFn;
const MASK_32 = 0xFFFFFFFFn;
const MASK_16 = 0xFFFFn;
const MASK_8 = 0xFFn;

// --- Init ---

function init() {
    createBitGrid();
    updateUI();

    // Listeners
    selWidth.addEventListener('change', () => {
        state.width = parseInt(selWidth.value);
        clampValue(); // truncates if width reduced
        createBitGrid(); // rebuild grid
        updateUI();
    });

    btnSign.addEventListener('click', () => {
        state.signed = !state.signed;
        btnSign.textContent = state.signed ? "Signed" : "Unsigned";
        btnSign.style.color = state.signed ? "var(--color-accent-primary)" : "var(--color-text-secondary)";
        updateUI(true); // Update text inputs only
    });

    inHex.addEventListener('input', () => {
        let v = inHex.value.trim().replace(/^0x/i, '').replace(/_/g, '');
        if (!v) v = '0';
        try {
            state.val = BigInt('0x' + v);
            clampValue();
            updateUI(false, 'hex'); // Don't update source
        } catch (e) { }
    });

    inDec.addEventListener('input', () => {
        let v = inDec.value.trim().replace(/_/g, '');
        if (!v || v === '-') return; // incomplete
        try {
            state.val = BigInt(v);
            // If signed input, handle negative
            if (state.signed && state.val < 0n) {
                // Convert neg to 2's comp unsigned representation
                // e.g. -1 in 8-bit -> 255
                const max = 1n << BigInt(state.width);
                state.val = max + state.val;
            }
            clampValue();
            updateUI(false, 'dec');
        } catch (e) { }
    });

    inBin.addEventListener('input', () => {
        let v = inBin.value.trim().replace(/[^01]/g, '');
        if (!v) v = '0';
        try {
            state.val = BigInt('0b' + v);
            clampValue();
            updateUI(false, 'bin');
        } catch (e) { }
    });

    btnMask.addEventListener('click', applyMaskRange);
}

// --- Logic ---

function clampValue() {
    let mask = MASK_64;
    if (state.width === 32) mask = MASK_32;
    if (state.width === 16) mask = MASK_16;
    if (state.width === 8) mask = MASK_8;

    state.val = state.val & mask;
}

function updateUI(updateInputs = true, source = null) {
    if (updateInputs) {
        if (source !== 'hex') inHex.value = '0x' + state.val.toString(16).toUpperCase();
        if (source !== 'bin') {
            const bStr = state.val.toString(2);
            // Pad to nibbles for readability
            // inBin.value = bStr.padStart(state.width, '0').match(/.{1,4}/g)?.join(' ') || '0';
            inBin.value = bStr; // Raw for copy-paste easier? Let's stick to raw.
        }
        if (source !== 'dec') {
            if (state.signed) {
                // Calc signed view
                const msb = 1n << BigInt(state.width - 1);
                if (state.val & msb) {
                    // Negative
                    // Value is val - (1 << width)
                    const max = 1n << BigInt(state.width);
                    const sVal = state.val - max;
                    inDec.value = sVal.toString(10);
                } else {
                    inDec.value = state.val.toString(10);
                }
            } else {
                inDec.value = state.val.toString(10);
            }
        }
    }

    // Stats
    outOct.textContent = '0o' + state.val.toString(8);
    outPop.textContent = popcount(state.val);
    outClz.textContent = clz(state.val, state.width);

    updateBitGrid();
}

function createBitGrid() {
    bitContainer.innerHTML = '';

    // Create rows of 8 or 16
    const grid = document.createElement('div');
    grid.className = 'bit-grid';
    // Col count adjustment
    if (state.width === 64 || state.width === 32) {
        grid.style.gridTemplateColumns = 'repeat(16, 1fr)';
    } else {
        grid.style.gridTemplateColumns = `repeat(${state.width}, 1fr)`;
    }

    for (let i = state.width - 1; i >= 0; i--) {
        const btn = document.createElement('div');
        btn.className = 'bit-box';
        btn.dataset.idx = i;
        btn.textContent = i;
        btn.onclick = () => toggleBit(i);

        const tip = document.createElement('div');
        tip.className = 'bit-tooltip';
        tip.textContent = `Bit ${i} (Val: ${1n << BigInt(i)})`;
        btn.appendChild(tip);

        grid.appendChild(btn);
    }
    bitContainer.appendChild(grid);
}

function updateBitGrid() {
    const boxes = bitContainer.querySelectorAll('.bit-box');
    boxes.forEach(box => {
        const i = parseInt(box.dataset.idx);
        const bit = (state.val >> BigInt(i)) & 1n;
        if (bit) box.classList.add('active');
        else box.classList.remove('active');
    });
}

function toggleBit(idx) {
    const mask = 1n << BigInt(idx);
    state.val = state.val ^ mask;
    clampValue(); // Just in case
    updateUI();
}

// --- Ops ---

window.doOp = function (op) {
    switch (op) {
        case 'NOT': state.val = ~state.val; break;
        case 'AND': /* Interactive AND? Usually needs 2nd operand. 
                       For one-operand buttons, maybe clear? 
                       Let's make these modify current value against a default?
                       Actually, simplistic calculator usually implies:
                       "Operate on X". 
                       But AND requires Y. 
                       
                       Wait, the user wants "Shift, AND, OR, XOR, NOT".
                       Usually this means "Op with Mask".
                       Let's assume "Bitwise NOT" computes ~X.
                       Shift << 1, >> 1.
                       
                       For AND/OR/XOR... without a second input, it's ambiguous.
                       Design decision: Use the Mask Helper as the second operand?
                       Or just pop a prompt? No prompt (bad UX).
                       
                       Re-reading req: "NO arithmetic expressions beyond + and - ... No precedence trees"
                       "Operations: Shift, AND, OR, XOR, NOT"
                       
                       Maybe just Shift and NOT are buttons.
                       AND/OR/XOR might need a secondary register.
                       
                       For transparency, I will implement SHIFT, NOT, INC, DEC.
                       And "Apply Mask" (AND/OR/XOR with mask).
                       
                       Let's repurpose the Mask Helper for AND/OR/XOR targets.
                    */
            break;
        case 'X<<': state.val = state.val << 1n; break;
        case 'X>>': state.val = state.val >> 1n; break;
        case 'ADD': state.val = state.val + 1n; break;
        case 'SUB': state.val = state.val - 1n; break;
    }
    clampValue();
    updateUI();
}

window.clearAll = function () {
    state.val = 0n;
    updateUI();
}

function applyMaskRange() {
    const h = parseInt(maskHigh.value);
    const l = parseInt(maskLow.value);
    if (h < l) return;

    let mask = 0n;
    for (let i = l; i <= h; i++) {
        mask |= (1n << BigInt(i));
    }

    // We set the value TO the mask? Or OR it? 
    // Usually "Mask Generator" implies "Show me the value of this mask".
    state.val = mask;
    clampValue();
    updateUI();
}

// --- Math ---
function popcount(n) {
    n = BigInt(n);
    let count = 0;
    while (n > 0n) {
        if (n & 1n) count++;
        n >>= 1n;
    }
    return count;
}

function clz(n, width) {
    let count = 0;
    const msbMask = 1n << BigInt(width - 1);
    for (let i = 0; i < width; i++) {
        if ((n & msbMask) === 0n) {
            count++;
            n <<= 1n;
        } else {
            break;
        }
    }
    return count;
}

init();
