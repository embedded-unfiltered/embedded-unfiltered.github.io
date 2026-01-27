// Signed/Unsigned Logic

const rawInput = document.getElementById('rawInput');
const widthRadios = document.getElementsByName('width');
const hexRep = document.getElementById('hexRep');
const unsignedRep = document.getElementById('unsignedRep');
const signedRep = document.getElementById('signedRep');
const binaryRep = document.getElementById('binaryRep');

function updateConversion() {
    let width = 8;
    for (const r of widthRadios) { if (r.checked) width = parseInt(r.value); }

    const maxUnsigned = Math.pow(2, width) - 1;
    const maxSigned = Math.pow(2, width - 1) - 1;
    const minSigned = -Math.pow(2, width - 1);

    let valStr = rawInput.value.trim();
    if (!valStr) return;

    // Determine input base and value
    let val = 0;

    // JS parse int handles 0x but we need to be careful with negatives
    // If input is like "-1", parseInt("-1") gives -1.
    // If input is "0xFF", parseInt gives 255.

    val = parseInt(valStr); // Auto-detects hex if 0x present, decimal otherwise

    if (isNaN(val)) return;

    // Mask to width to simulate correct overflow behavior
    let mask = 0xFFFFFFFF;
    if (width === 8) mask = 0xFF;
    if (width === 16) mask = 0xFFFF;
    // 32-bit mask is default -1 in JS bitwise but let's be explicit with >>> 0 for unsigned view

    // Get the bits as an unsigned integer
    // If val is -1 (on 32-bit internal), val & mask will give us the proper positive int for that width
    let bits = val & mask;

    // Unsigned is just 'bits' (ensure positive)
    let unsignedVal = bits >>> 0;

    // Signed calculation
    // If MSB is set
    let signedVal = unsignedVal;
    let msbMask = 1 << (width - 1);

    // Check MSB for the specific width
    if (width === 32) {
        // JS bitwise operators are 32-bit signed already
        signedVal = bits | 0;
    } else {
        if (unsignedVal & msbMask) {
            // Negative
            // Two's complement manual conversion
            // Or simple subtraction
            signedVal = unsignedVal - (1 << width);
        }
    }

    // Display
    hexRep.textContent = '0x' + unsignedVal.toString(16).toUpperCase().padStart(width / 4, '0');
    unsignedRep.textContent = unsignedVal.toString(10);
    signedRep.textContent = signedVal.toString(10);
    binaryRep.textContent = unsignedVal.toString(2).padStart(width, '0');
}

rawInput.addEventListener('input', updateConversion);
for (const r of widthRadios) { r.addEventListener('change', updateConversion); }
