// Bit Mask Generator Logic

const startBitInput = document.getElementById('startBit');
const endBitInput = document.getElementById('endBit');
const bitGrid = document.getElementById('bitGrid');
const hexMask = document.getElementById('hexMask');
const binMask = document.getElementById('binMask');
const cMacro = document.getElementById('cMacro');

function createGrid() {
    bitGrid.innerHTML = '';
    for (let i = 31; i >= 0; i--) {
        const cell = document.createElement('div');
        cell.className = 'bit-cell';

        const box = document.createElement('div');
        box.className = 'bit-box';
        box.id = `bit-${i}`;
        box.textContent = i; // Number inside the box

        cell.appendChild(box);
        bitGrid.appendChild(cell);
    }
}

function calculateMask() {
    const start = Math.min(31, Math.max(0, parseInt(startBitInput.value) || 0));
    const end = Math.min(31, Math.max(0, parseInt(endBitInput.value) || 0));

    // Ensure start >= end for typical [MSB:LSB] notation
    const high = Math.max(start, end);
    const low = Math.min(start, end);

    // Build mask
    let mask = 0n;
    for (let i = low; i <= high; i++) {
        mask |= (1n << BigInt(i));
    }

    // Update Display
    hexMask.textContent = '0x' + mask.toString(16).toUpperCase();
    binMask.textContent = '0b' + mask.toString(2);
    cMacro.textContent = `#define REG_MASK_FIELD  (0x${mask.toString(16).toUpperCase()}U)`;

    // Update Grid Visuals
    for (let i = 0; i <= 31; i++) {
        const box = document.getElementById(`bit-${i}`);
        if (i >= low && i <= high) {
            box.classList.add('selected');
        } else {
            box.classList.remove('selected');
        }
    }
}

createGrid();
startBitInput.addEventListener('input', calculateMask);
endBitInput.addEventListener('input', calculateMask);
calculateMask();
