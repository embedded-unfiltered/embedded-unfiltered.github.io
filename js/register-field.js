// Register Field Logic

const regValInput = document.getElementById('regVal');
const maskValInput = document.getElementById('maskVal');
const shiftValInput = document.getElementById('shiftVal');
const newValInput = document.getElementById('newVal');

const extractValDisplay = document.getElementById('extractVal');
const updatedRegDisplay = document.getElementById('updatedReg');

function parseHex(str) {
    if (!str) return 0n;
    let clean = str.trim();
    if (clean.toLowerCase().startsWith('0x')) clean = clean.substring(2);
    if (!clean) return 0n;
    try {
        return BigInt('0x' + clean);
    } catch {
        return 0n;
    }
}

function calc() {
    const reg = parseHex(regValInput.value);
    const mask = parseHex(maskValInput.value);
    const shift = BigInt(parseInt(shiftValInput.value) || 0);
    const newField = parseHex(newValInput.value);

    // Extraction
    // (Value & Mask) >> Shift ? Usually Mask is IN PLACE or SHIFTED? 
    // Usually "Mask" implies the in-place bits. e.g. 0x000000FF.
    // So (Reg & Mask) >> Shift.
    const extracted = (reg & mask) >> shift;

    // Insertion
    // (Reg & ~Mask) | ((NewVal << Shift) & Mask)
    // We mask the shifted value again just to be safe it fits.
    // Note: Bitwise NOT in BigInt is infinite series of 1s, need to mask to 32 bits effectively if we want 32-bit behavior?
    // Or just rely on BigInt.

    // ~Mask in 32-bit context:
    const mask32 = 0xFFFFFFFFn;
    const invMask = (~mask) & mask32;

    const valShifted = (newField << shift);
    const valMasked = valShifted & mask;

    const newReg = (reg & invMask) | valMasked;

    // Display
    extractValDisplay.textContent = '0x' + extracted.toString(16).toUpperCase();
    updatedRegDisplay.textContent = '0x' + newReg.toString(16).toUpperCase().padStart(8, '0');
}

[regValInput, maskValInput, shiftValInput, newValInput].forEach(el => {
    el.addEventListener('input', calc);
});

calc();
