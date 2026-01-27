// Number Base Converter Logic

const decInput = document.getElementById('decInput');
const hexInput = document.getElementById('hexInput');
const binInput = document.getElementById('binInput');

// Helper to sanitize and clamp to 32-bit uint
function parseValue(valStr, radix) {
    if (!valStr) return NaN;
    // Remove prefixes if present
    let cleaned = valStr.trim();
    if (radix === 16 && cleaned.toLowerCase().startsWith('0x')) cleaned = cleaned.substring(2);
    if (radix === 2 && cleaned.toLowerCase().startsWith('0b')) cleaned = cleaned.substring(2);
    // Remove spaces that might be used for formatting (e.g. 0000 1111)
    cleaned = cleaned.replace(/\s/g, '');

    // Parse
    let num = parseInt(cleaned, radix);
    if (isNaN(num)) return NaN;

    // Clamp to 32-bit unsigned
    return num >>> 0;
}

function updateInputs(source) {
    let val = 0;

    if (source === 'dec') {
        val = parseValue(decInput.value, 10);
    } else if (source === 'hex') {
        val = parseValue(hexInput.value, 16);
    } else if (source === 'bin') {
        val = parseValue(binInput.value, 2);
    }

    if (isNaN(val)) {
        // If one is invalid, maybe just don't update others? or clear?
        // Let's not clear immediately to allow editing, but if it is empty we clear.
        if (source === 'dec' && decInput.value === '') { hexInput.value = ''; binInput.value = ''; }
        if (source === 'hex' && hexInput.value === '') { decInput.value = ''; binInput.value = ''; }
        if (source === 'bin' && binInput.value === '') { decInput.value = ''; hexInput.value = ''; }
        return;
    }

    // Update others
    if (source !== 'dec') decInput.value = val.toString(10);
    if (source !== 'hex') hexInput.value = '0x' + val.toString(16).toUpperCase();
    if (source !== 'bin') {
        // Format binary with spaces every 4 bits? Optional nice-to-have, but keep simple for now.
        // Actually simple is better for copy paste.
        binInput.value = val.toString(2);
    }
}

decInput.addEventListener('input', () => updateInputs('dec'));
hexInput.addEventListener('input', () => updateInputs('hex'));
binInput.addEventListener('input', () => updateInputs('bin'));
