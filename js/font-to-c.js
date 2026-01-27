/**
 * Font to C Array Converter
 * Uses Browser FontFace API to render and convert fonts to GFX bitmaps.
 */

// Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileNameDisplay = document.getElementById('fileName');
const fontSizeInput = document.getElementById('fontSize');
const rangeSelect = document.getElementById('rangeSelect');
const processBtn = document.getElementById('processBtn');
const statusMsg = document.getElementById('statusMsg');
const previewGrid = document.getElementById('previewGrid');
const codeOutput = document.getElementById('codeOutput');
const fontNameInput = document.getElementById('fontName');
const memorySize = document.getElementById('memorySize');
const glyphCountDisplay = document.getElementById('glyphCount');
const showBaselineCheck = document.getElementById('showBaseline');
const showMetricsCheck = document.getElementById('showMetrics');
const fontThreshold = document.getElementById('fontThreshold');
const thresholdVal = document.getElementById('thresholdVal');


// State
let customFont = null;
let fontFamilyName = 'UploadedFont';
let generatedGlyphs = []; // Store for preview toggling

// Init
function init() {
    setupEventListeners();
}

function setupEventListeners() {
    dropZone.onclick = () => fileInput.click();
    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); };
    dropZone.ondragleave = () => dropZone.classList.remove('drag-over');
    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFile(e.dataTransfer.files[0]);
    };
    fileInput.onchange = (e) => handleFile(e.target.files[0]);

    processBtn.onclick = generateFont;
    fontBackgroundMonitor();
}

function fontBackgroundMonitor() {
    // Live Threshold Update (Debounced)
    let debounceTimer;
    fontThreshold.oninput = () => {
        thresholdVal.textContent = fontThreshold.value;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (customFont) generateFont();
        }, 150); // 150ms debounce
    };

    // Preview Toggles Updates
    showBaselineCheck.onchange = updatePreviewStyles;
    showMetricsCheck.onchange = updatePreviewStyles;
}

function updatePreviewStyles() {
    if (showMetricsCheck.checked) {
        previewGrid.classList.add('show-metrics');
    } else {
        previewGrid.classList.remove('show-metrics');
    }
    if (generatedGlyphs.length > 0) {
        const size = parseInt(fontSizeInput.value) || 16;
        renderPreviewGrid(size);
    }
}

async function handleFile(file) {
    if (!file || (!file.name.endsWith('.ttf') && !file.name.endsWith('.otf') && !file.name.endsWith('.woff'))) {
        statusMsg.textContent = "Invalid file type. Please upload .ttf or .otf";
        statusMsg.style.color = "var(--color-error)";
        return;
    }

    statusMsg.textContent = "Loading font...";
    statusMsg.style.color = "var(--color-text-secondary)";
    fileNameDisplay.textContent = file.name;

    try {
        const buffer = await file.arrayBuffer();
        const fontFace = new FontFace(fontFamilyName, buffer);
        await fontFace.load();
        document.fonts.add(fontFace);
        customFont = fontFace;

        statusMsg.textContent = "Font loaded! Adjust settings and click 'Generate'.";
        statusMsg.style.color = "var(--color-success)";

        // Auto-set name
        const cleanName = generateFontName(file.name, fontSizeInput.value);
        fontNameInput.value = cleanName;

        // Auto-generate on load
        generateFont();

    } catch (err) {
        console.error(err);
        statusMsg.textContent = "Error loading font.";
        statusMsg.style.color = "var(--color-error)";
    }
}

function generateFontName(filename, size) {
    let name = filename.split('.')[0];
    name = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `${name}_${size}px_1b`; // Add logic for BPP later
}

function generateFont() {
    if (!customFont) {
        // Only warn if user clicked button, not on auto-init
        // But for simplicity, just return. 
        // Actually, if called from button, we want feedback.
        if (event && event.target === processBtn) {
            statusMsg.textContent = "Please upload a font first.";
            statusMsg.style.color = "var(--color-warning)";
        }
        return;
    }

    statusMsg.textContent = "Processing glyphs...";
    previewGrid.innerHTML = ''; // Clear preview
    generatedGlyphs = []; // Clear cache

    const size = parseInt(fontSizeInput.value);
    const threshold = parseInt(fontThreshold.value);
    const range = getRange();
    const glyphs = [];
    const bitmaps = []; // Flat array of all bitmap data
    let bitmapOffset = 0;

    // Helper Canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false; // Disable default smoothing

    // Canvas Size: Needs to be large enough to hold any glyph from the font.
    // 3x Size is a safe heuristic for most fonts (even script ones).
    canvas.width = size * 3;
    canvas.height = size * 3;
    ctx.font = `${size}px "${fontFamilyName}"`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'white';

    // Calculate Global Metrics and Standard Baseline
    // We render characters at (size, size*2).
    // The "Standard Baseline" Y coordinate on our scratch canvas is thus `size*2`.
    ctx.clearRect(0, 0, 10, 10);
    ctx.fillText('H', 0, 0);
    const globalMetrics = ctx.measureText('H');
    const ascent = globalMetrics.fontBoundingBoxAscent || size;

    const cursorX = size;
    const cursorY = size * 2;

    for (let i = range.start; i <= range.end; i++) {
        const char = String.fromCharCode(i);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillText(char, cursorX, cursorY);

        const metrics = ctx.measureText(char);
        const xAdvance = Math.ceil(metrics.width);

        // Scan for Bounding Box
        const bbox = getBoundingBox(ctx, canvas.width, canvas.height, threshold);

        let glyphBitmap = [];
        let w = 0, h = 0, xOff = 0, yOff = 0;

        if (bbox) {
            w = bbox.x2 - bbox.x1 + 1;
            h = bbox.y2 - bbox.y1 + 1;

            xOff = bbox.x1 - cursorX;
            yOff = bbox.y1 - cursorY;

            // Extract Bitmap
            const imageData = ctx.getImageData(bbox.x1, bbox.y1, w, h);
            glyphBitmap = packBitmap1Bit(imageData.data, w, h, threshold);
        }

        const glyphObj = {
            char: char,
            code: i,
            bitmapOffset: bitmapOffset,
            width: w,
            height: h,
            xAdvance: xAdvance,
            xOffset: xOff,
            yOffset: yOff,
            bitmap: glyphBitmap,
            bbox: bbox,
            ascent: ascent
        };

        glyphs.push(glyphObj);
        generatedGlyphs.push(glyphObj);

        if (glyphBitmap.length > 0) {
            bitmaps.push(...glyphBitmap);
            bitmapOffset += glyphBitmap.length;
        }
    }

    renderPreviewGrid(size);
    generateCode(glyphs, bitmaps);

    statusMsg.textContent = "Font generated successfully!";
    glyphCountDisplay.textContent = `${glyphs.length} Glyphs`;
}

function renderPreviewGrid(fontSize) {
    previewGrid.innerHTML = '';

    // Intelligent Auto-Scaling
    // Calculate the maximum ascent, descent, AND WIDTH.
    let maxAscent = 0;
    let maxDescent = 0;
    let maxWidth = 0;

    generatedGlyphs.forEach(g => {
        if (g.bbox) {
            // Y metrics
            const asc = -g.yOffset;
            if (asc > maxAscent) maxAscent = asc;

            const desc = g.yOffset + g.height;
            if (desc > maxDescent) maxDescent = desc;

            // Width metrics
            if (g.width > maxWidth) maxWidth = g.width;
        }
    });

    // Add healthy padding
    // Height Padding - Massive increase to ensuring nothing touches edges
    const vPadding = Math.max(48, fontSize * 2.5);
    const totalContentHeight = maxAscent + maxDescent;
    const boxHeight = totalContentHeight + vPadding;

    // Debug stats to helper understand scaling
    console.log(`MaxAsc: ${maxAscent}, MaxDesc: ${maxDescent}, BoxH: ${boxHeight}`);
    statusMsg.textContent = `Font Generated! (H: ${totalContentHeight}px within ${boxHeight}px box)`;

    // Width Padding
    const hPadding = Math.max(32, fontSize * 0.8);
    const minBoxWidth = Math.max(64, maxWidth + hPadding);

    // Baseline Position
    const baselineY = Math.floor((boxHeight - totalContentHeight) / 2 + maxAscent);

    // Update grid style using calculated Min Width
    previewGrid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${minBoxWidth}px, 1fr))`;

    generatedGlyphs.forEach(g => {
        if (g.bbox) {
            addPreviewGlyph(g, boxHeight, baselineY);
        }
    });
}

function getRange() {
    const val = rangeSelect.value;
    if (val === 'ASCII') return { start: 32, end: 126 };
    if (val === 'NUMBERS') return { start: 48, end: 57 };
    if (val === 'UPPERCASE') return { start: 65, end: 90 };
    return { start: 32, end: 126 };
}

function getBoundingBox(ctx, w, h, threshold) {
    const data = ctx.getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    let found = false;

    // Alpha channel at i*4 + 3
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const alpha = data[(y * w + x) * 4 + 3];
            if (alpha > threshold) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                found = true;
            }
        }
    }

    if (!found) return null;

    return { x1: minX, y1: minY, x2: maxX, y2: maxY };
}

function packBitmap1Bit(rgba, w, h, threshold) {
    // Standard Raster (Row-by-Row), MSB first.
    const bytes = [];
    let byte = 0;
    let bitCount = 0;

    for (let i = 0; i < w * h; i++) {
        const alpha = rgba[i * 4 + 3];
        const on = alpha > threshold;

        if (on) {
            byte |= (1 << (7 - bitCount)); // MSB first
        }

        bitCount++;
        if (bitCount === 8) {
            bytes.push(byte);
            byte = 0;
            bitCount = 0;
        }
    }

    if (bitCount > 0) bytes.push(byte);
    return bytes;
}

function addPreviewGlyph(g, boxHeight, baselineY) {
    const div = document.createElement('div');
    div.className = 'glyph-item';
    div.style.height = `${boxHeight}px`; // Dynamic height
    div.title = `Char: '${g.char}' (${g.code})\nWxH: ${g.width}x${g.height}\nOff: ${g.xOffset}, ${g.yOffset}`;

    // Metric Overlay
    const overlay = document.createElement('div');
    overlay.className = 'metric-overlay';
    overlay.textContent = `${g.width}x${g.height}`;
    div.appendChild(overlay);

    // Baseline Line
    if (showBaselineCheck.checked) {
        const line = document.createElement('div');
        line.className = 'baseline-indicator';
        line.style.top = `${baselineY}px`;
        div.appendChild(line);
    }

    const cvs = document.createElement('canvas');
    cvs.width = g.width;
    cvs.height = g.height;
    // Add border to show exact bounding box extents
    cvs.style.border = '1px dotted rgba(255,255,255,0.1)';
    const ctx = cvs.getContext('2d');

    // Render back
    const imgData = ctx.createImageData(g.width, g.height);
    let byteIdx = 0;
    let bitIdx = 0;

    for (let i = 0; i < g.width * g.height; i++) {
        const byte = g.bitmap[byteIdx];
        // Standard MSB extraction matching packer
        const on = (byte >> (7 - bitIdx)) & 1;

        const idx = i * 4;
        imgData.data[idx] = on ? 255 : 0;     // R
        imgData.data[idx + 1] = on ? 255 : 0;   // G
        imgData.data[idx + 2] = on ? 255 : 0;   // B
        imgData.data[idx + 3] = on ? 255 : 0;   // A 

        bitIdx++;
        if (bitIdx === 8) {
            bitIdx = 0;
            byteIdx++;
        }
    }
    ctx.putImageData(imgData, 0, 0);

    // Absolute Positioning based on Baseline
    const topPos = baselineY + g.yOffset;

    cvs.style.position = 'absolute';
    cvs.style.top = `${topPos}px`;
    cvs.style.left = '50%';
    cvs.style.transform = 'translateX(-50%)';

    div.appendChild(cvs);

    const label = document.createElement('span');
    label.className = 'glyph-char';
    label.textContent = g.char;
    // Explicit positioning style
    label.style.position = 'absolute';
    label.style.top = '4px';
    label.style.left = '6px';
    label.style.fontSize = '0.75rem';
    label.style.color = '#888';
    label.style.pointerEvents = 'none';
    label.style.fontWeight = 'bold';

    div.appendChild(label);

    previewGrid.appendChild(div);
}

function generateCode(glyphs, bitmaps) {
    const name = fontNameInput.value || 'my_font';

    let c = `// Font: ${fileNameDisplay.textContent || 'Custom'}\n`;
    c += `// Size: ${fontSizeInput.value}px\n`;
    c += `// Range: ${rangeSelect.value}\n`;
    c += `// Size: ${bitmaps.length} bytes (1-bit Bitmap) + Structs\n\n`;
    c += `#include <stdint.h>\n\n`;

    // Bitmap Array
    c += `const uint8_t ${name}_bitmaps[] = {\n    `;
    for (let i = 0; i < bitmaps.length; i++) {
        c += '0x' + bitmaps[i].toString(16).padStart(2, '0').toUpperCase();
        if (i < bitmaps.length - 1) c += ', ';
        if ((i + 1) % 12 === 0) c += '\n    ';
    }
    c += `\n};\n\n`;

    // Glyph Structs
    c += `typedef struct {\n`;
    c += `    uint16_t bitmapOffset;\n`;
    c += `    uint8_t width;\n`;
    c += `    uint8_t height;\n`;
    c += `    uint8_t xAdvance;\n`;
    c += `    int8_t xOffset;\n`;
    c += `    int8_t yOffset;\n`;
    c += `} ${name}_glyph_t;\n\n`;

    c += `const ${name}_glyph_t ${name}_glyphs[] = {\n`;
    glyphs.forEach(g => {
        c += `    { ${g.bitmapOffset}, ${g.width}, ${g.height}, ${g.xAdvance}, ${g.xOffset}, ${g.yOffset} }, // '${g.char}'\n`;
    });
    c += `};\n`;

    codeOutput.value = c;
    memorySize.textContent = `${Math.ceil((bitmaps.length + glyphs.length * 7) / 1024 * 10) / 10} KB`;
}

function copyCode() {
    codeOutput.select();
    navigator.clipboard.writeText(codeOutput.value);
}

window.onload = init;
