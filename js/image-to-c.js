/**
 * Image to C Array Converter
 * Handles canvas manipulation, thresholding, and binary packing.
 */

// Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const inputWidth = document.getElementById('inputWidth');
const inputHeight = document.getElementById('inputHeight');
const keepAspect = document.getElementById('keepAspect');
const formatSelect = document.getElementById('formatSelect');
const thresholdRange = document.getElementById('thresholdRange');
const thresholdValue = document.getElementById('thresholdValue');
const invertColors = document.getElementById('invertColors');
const previewCanvas = document.getElementById('previewCanvas');
const previewDims = document.getElementById('previewDims');
const codeOutput = document.getElementById('codeOutput');
const varName = document.getElementById('varName');
const memorySize = document.getElementById('memorySize');
const monoControls = document.getElementById('monoControls');

// State
let rawImage = null; // Original Image Object
let ctx = previewCanvas.getContext('2d', { willReadFrequently: true });

// Init
function init() {
    setupEventListeners();
}

function setupEventListeners() {
    // File Input
    dropZone.onclick = () => fileInput.click();
    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); };
    dropZone.ondragleave = () => dropZone.classList.remove('drag-over');
    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFile(e.dataTransfer.files[0]);
    };
    fileInput.onchange = (e) => handleFile(e.target.files[0]);

    // Dimensions
    inputWidth.oninput = () => processImage(true); // Source: Width changed
    inputHeight.oninput = () => processImage(false); // Source: Height changed

    // Controls
    [formatSelect, thresholdRange, invertColors].forEach(el => {
        el.oninput = () => {
            updateUI(); // Show/Hide relevant controls
            processImage();
        };
    });

    thresholdRange.oninput = () => {
        thresholdValue.textContent = thresholdRange.value;
        processImage();
    };

    varName.oninput = generateCode; // Just re-gen code
}

function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            rawImage = img;
            // Set initial inputs
            inputWidth.value = img.width;
            inputHeight.value = img.height;
            processImage();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function updateUI() {
    const format = formatSelect.value;
    const isMono = format.startsWith('MONO');
    monoControls.style.display = isMono ? 'flex' : 'none';
}

function processImage(widthChanged = null) {
    if (!rawImage) return;

    // 1. Calculate Dimensions
    let w = parseInt(inputWidth.value) || rawImage.width;
    let h = parseInt(inputHeight.value) || rawImage.height;

    // Aspect Ratio Logic
    if (keepAspect.checked && widthChanged !== null) {
        const ratio = rawImage.width / rawImage.height;
        if (widthChanged === true) {
            h = Math.round(w / ratio);
            inputHeight.value = h;
        } else {
            w = Math.round(h * ratio);
            inputWidth.value = w;
        }
    }

    // 2. Resize & Data Extraction
    previewCanvas.width = w;
    previewCanvas.height = h;
    // Draw scaled image to get RGB data
    ctx.drawImage(rawImage, 0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data; // RGBA array

    // 3. Process Pixels based on Format
    const format = formatSelect.value;
    const threshold = parseInt(thresholdRange.value);
    const invert = invertColors.checked;

    // Processed Buffer for Code Generation (Not for Preview yet)
    // We modify imageData.data in-place for Preview Visualization

    if (format.startsWith('MONO')) {
        for (let i = 0; i < data.length; i += 4) {
            // Grayscale Rec. 601 luimance
            const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
            let val = gray >= threshold ? 255 : 0;

            if (invert) val = 255 - val;

            // Update Preview Pixels
            data[i] = val;   // R
            data[i + 1] = val; // G
            data[i + 2] = val; // B
            data[i + 3] = 255; // Alpha full
        }
    } else if (format.startsWith('RGB565')) {
        for (let i = 0; i < data.length; i += 4) {
            // Quantize to 5-6-5 range for preview?
            // R: 5 bits (0-31) -> scale back to 255
            const r5 = (data[i] >> 3);
            const g6 = (data[i + 1] >> 2);
            const b5 = (data[i + 2] >> 3);

            // Invert? (Usually not for color, but user might want negative)
            // if (invert) ... logic complex for color. Skip for now.

            // Scale back for preview
            data[i] = (r5 * 255 / 31);
            data[i + 1] = (g6 * 255 / 63);
            data[i + 2] = (b5 * 255 / 31);
            data[i + 3] = 255;
        }
    }

    // Put modified data back to canvas for preview
    ctx.putImageData(imageData, 0, 0);
    previewDims.textContent = `${w} x ${h}`;

    // 4. Generate Code
    generateCode();
}

function generateCode() {
    if (!rawImage) return;

    const w = previewCanvas.width;
    const h = previewCanvas.height;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const format = formatSelect.value;

    let outputBytes = [];

    if (format.startsWith('MONO')) {
        // Packing Logic
        // MONO_V_LSB: Vertical Byte, LSB Top (e.g. SSD1306)
        // MONO_H_MSB: Horizontal Byte, MSB Left

        const isVertical = format.includes('_V_');
        const isLSB = format.includes('_LSB'); // LSB first

        if (isVertical) {
            // Vertical addressing (Page mode)
            // Rows are pages of 8 bits height.
            // Columns are iterated 0..W
            const pages = Math.ceil(h / 8);

            for (let p = 0; p < pages; p++) {
                for (let x = 0; x < w; x++) {
                    let byte = 0;
                    for (let bit = 0; bit < 8; bit++) {
                        let y = p * 8 + bit;
                        if (y < h) {
                            // index in data array
                            const idx = (y * w + x) * 4;
                            // Check if pixel is "White" (255) in our preview
                            // "On" pixel usually means 1.
                            // Our preview: 255 is White. 0 is Black.
                            // Protocol: 1 = On (White).
                            const isOn = data[idx] > 128;

                            if (isOn) {
                                if (isLSB) byte |= (1 << bit);
                                else byte |= (1 << (7 - bit));
                            }
                        }
                    }
                    outputBytes.push(byte);
                }
            }
        } else {
            // Horizontal addressing (Raster)
            // Scan across width, pack 8 pixels into byte
            let byte = 0;
            let bitCount = 0;

            for (let i = 0; i < w * h; i++) {
                const colorIdx = i * 4;
                const isOn = data[colorIdx] > 128;

                if (isOn) {
                    if (isLSB) byte |= (1 << bitCount); // LSB first (bit 0 filled first)
                    else byte |= (1 << (7 - bitCount)); // MSB first (bit 7 filled first)
                }

                bitCount++;
                if (bitCount === 8) {
                    outputBytes.push(byte);
                    byte = 0;
                    bitCount = 0;
                }
            }
            // Flush remaining
            if (bitCount > 0) outputBytes.push(byte);
        }

    } else if (format.startsWith('RGB565')) {
        const isLE = format.includes('_LE');

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // RGB565: RRRRRGGG GGGBBBBB
            const r5 = (r >> 3) & 0x1F;
            const g6 = (g >> 2) & 0x3F;
            const b5 = (b >> 3) & 0x1F;

            const rgb565 = (r5 << 11) | (g6 << 5) | b5;

            if (isLE) {
                outputBytes.push(rgb565 & 0xFF);        // Low byte
                outputBytes.push((rgb565 >> 8) & 0xFF); // High byte
            } else {
                outputBytes.push((rgb565 >> 8) & 0xFF); // High byte
                outputBytes.push(rgb565 & 0xFF);        // Low byte
            }
        }
    }

    // Formatting C Array
    let cCode = `// File: image_data.c\n`;
    cCode += `// Resolution: ${w}x${h}\n`;
    cCode += `// Format: ${format}\n`;
    cCode += `// Size: ${outputBytes.length} bytes\n\n`;
    cCode += `#include <stdint.h>\n\n`;
    const vName = varName.value.replace(/[^a-zA-Z0-9_]/g, '_') || 'image_data';
    cCode += `const uint8_t ${vName}[] = {\n    `;

    for (let i = 0; i < outputBytes.length; i++) {
        cCode += '0x' + outputBytes[i].toString(16).padStart(2, '0').toUpperCase();
        if (i < outputBytes.length - 1) cCode += ', ';
        if ((i + 1) % 12 === 0) cCode += '\n    ';
    }
    cCode += '\n};';

    codeOutput.value = cCode;
    memorySize.textContent = `${outputBytes.length} Bytes`; // Corrected backticks
}

function copyCode() {
    codeOutput.select();
    navigator.clipboard.writeText(codeOutput.value);
    // Visual feedback?
}

window.onload = init;
