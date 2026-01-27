// CRC Calculator Logic

const dataInput = document.getElementById('dataInput');
const crcPreset = document.getElementById('crcPreset');
const customParams = document.getElementById('customParams');
const resultHexDisplay = document.getElementById('resultHex');

// Custom Params
const paramWidth = document.getElementById('paramWidth');
const paramPoly = document.getElementById('paramPoly');
const paramInit = document.getElementById('paramInit');
const paramXor = document.getElementById('paramXor');
const paramRefAdjust = document.getElementById('paramRefAdjust');

const PRESETS = {
    'crc8': { width: 8, poly: 0x07, init: 0x00, xorOption: 0x00, reflect: false }, // SMBus
    'crc16ccitt': { width: 16, poly: 0x1021, init: 0xFFFF, xorOption: 0x00, reflect: false },
    'crc16modbus': { width: 16, poly: 0x8005, init: 0xFFFF, xorOption: 0x00, reflect: true },
    'crc32': { width: 32, poly: 0x04C11DB7, init: 0xFFFFFFFF, xorOption: 0xFFFFFFFF, reflect: true }
};

function parseHex(str) {
    if (!str) return 0;
    let clean = str.trim();
    if (clean.toLowerCase().startsWith('0x')) clean = clean.substring(2);
    return parseInt(clean, 16) || 0;
}

function reflect(val, width) {
    let res = 0;
    for (let i = 0; i < width; i++) {
        if ((val & (1 << i)) !== 0) {
            res |= (1 << ((width - 1) - i));
        }
    }
    return res;
}

function calcCRC() {
    const text = dataInput.value;
    let dataBytes = [];

    // Auto-detect Hex Input
    if (text.trim().toLowerCase().startsWith('0x')) {
        // Parse hex string
        let hexStr = text.trim().substring(2).replace(/\s+/g, '');
        if (hexStr.length % 2 !== 0) hexStr = '0' + hexStr;
        for (let i = 0; i < hexStr.length; i += 2) {
            dataBytes.push(parseInt(hexStr.substring(i, i + 2), 16));
        }
    } else {
        // ASCII
        for (let i = 0; i < text.length; i++) {
            dataBytes.push(text.charCodeAt(i));
        }
    }

    let config = {};
    if (crcPreset.value === 'custom') {
        config.width = parseInt(paramWidth.value);
        config.poly = parseHex(paramPoly.value);
        config.init = parseHex(paramInit.value);
        config.xorOption = parseHex(paramXor.value);
        config.reflect = paramRefAdjust.checked;
    } else {
        config = PRESETS[crcPreset.value];
    }

    let crc = config.init;
    const mask = (config.width === 32) ? 0xFFFFFFFF : ((1 << config.width) - 1);
    const msbMask = 1 << (config.width - 1);

    for (let byte of dataBytes) {
        if (config.reflect) {
            byte = reflect(byte, 8);
        }

        // Standard CRC shift calculation
        // XOR byte into MSB of CRC? Or different algo?
        // Most straightforward implementation:
        // Align byte to MSB
        let alignedByte = (byte << (config.width - 8));
        if (config.width < 8) alignedByte = (byte >> (8 - config.width)); // Edge case unlikely for CRC-8+

        crc ^= alignedByte;

        for (let i = 0; i < 8; i++) {
            if ((crc & msbMask) !== 0) {
                crc = (crc << 1) ^ config.poly;
            } else {
                crc = (crc << 1);
            }
        }

        crc &= mask; // Keep to width
    }

    if (config.reflect) {
        // Reflect Final CRC BEFORE XorOut? Or after?
        // Usually: Reflect Input, then Process, then Reflect Result, then XorOut.
        // Wait, if "Reflect Input" is true, standard algos usually also Reflect Output.
        // My reflect(byte) handles input. Now reflect CRC.
        crc = reflect(crc, config.width);
    }

    crc ^= config.xorOption;
    crc &= mask;

    resultHexDisplay.textContent = '0x' + crc.toString(16).toUpperCase().padStart(Math.ceil(config.width / 4), '0');
}

function updatePresetUI() {
    if (crcPreset.value === 'custom') {
        customParams.style.display = 'block';
    } else {
        customParams.style.display = 'none';
        const p = PRESETS[crcPreset.value];
        // Pre-fill custom fields just in case they switch
        paramWidth.value = p.width;
        paramPoly.value = '0x' + p.poly.toString(16).toUpperCase();
        paramInit.value = '0x' + p.init.toString(16).toUpperCase();
        paramXor.value = '0x' + p.xorOption.toString(16).toUpperCase();
        paramRefAdjust.checked = p.reflect;
    }
    calcCRC();
}

crcPreset.addEventListener('change', updatePresetUI);
dataInput.addEventListener('input', calcCRC);
[paramWidth, paramPoly, paramInit, paramXor, paramRefAdjust].forEach(el => el.addEventListener('input', calcCRC));
updatePresetUI();
