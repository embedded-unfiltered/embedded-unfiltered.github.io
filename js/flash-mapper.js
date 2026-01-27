/**
 * Flash Memory Mapper (Refined V2)
 * Bottom-Up Visualization for Firmware Mental Model
 */

// Colors
const COL_USED = '#58a6ff';
const COL_COLLISION = '#f85149';
const COL_FREE = '#161b22';
const COL_BG = '#050505';
const COL_TEXT = '#8b949e';
const COL_GRID = '#21262d';

// State
let state = {
    baseAddr: 0x08000000,
    totalSize: 512 * 1024, // bytes
    regions: [
        { id: 1, name: 'bootloader', start: '0x00', size: 32, sizeUnit: 'KB' },
        { id: 2, name: 'primary_app', start: '0x8000', size: 256, sizeUnit: 'KB' },
        { id: 3, name: 'nv_storage', start: '0x48000', size: 64, sizeUnit: 'KB' }
    ],
    nextId: 4
};

// DOM
const canvas = document.getElementById('flashMap');
const ctx = canvas.getContext('2d');
const inputBase = document.getElementById('flashBase');
const inputSize = document.getElementById('flashSize');
const selectSizeUnit = document.getElementById('flashSizeUnit');
const regionList = document.getElementById('regionList');
const btnAdd = document.getElementById('addRegionBtn');
const statUsed = document.getElementById('statUsed');
const statFree = document.getElementById('statFree');
const statHoles = document.getElementById('statHoles');

// --- Init ---
function init() {
    renderRegionTable();
    updateMap();

    // Listeners
    inputBase.addEventListener('change', updateMap);
    inputSize.addEventListener('input', updateMap);
    selectSizeUnit.addEventListener('change', updateMap);
    btnAdd.addEventListener('click', addRegion);

    window.addEventListener('resize', requestRender);
}

// --- Logic ---

function addRegion() {
    state.regions.push({
        id: state.nextId++,
        name: 'new_region',
        start: '0',
        size: 16,
        sizeUnit: 'KB'
    });
    renderRegionTable();
    updateMap();
}

function removeRegion(id) {
    state.regions = state.regions.filter(r => r.id !== id);
    renderRegionTable();
    updateMap();
}

function updateRegion(id, key, value) {
    const r = state.regions.find(r => r.id === id);
    if (r) {
        r[key] = value;
        updateMap();
    }
}

function parseAddress(strInput, baseAddr) {
    strInput = strInput.trim();
    if (strInput.toLowerCase().startsWith('0x')) {
        return parseInt(strInput, 16); // Absolute or Offset Hex
    }
    return parseInt(strInput, 10); // Offset Dec
}

function updateMap() {
    // 1. Parse Global Settings
    state.baseAddr = parseInt(inputBase.value, 16) || 0;

    let rawSize = parseInt(inputSize.value) || 0;
    state.totalSize = rawSize * (selectSizeUnit.value === 'MB' ? 1024 * 1024 : 1024);

    // 2. Process Regions
    let processedRegions = [];

    state.regions.forEach(r => {
        // Size
        let bytes = parseFloat(r.size);
        if (r.sizeUnit === 'KB') bytes *= 1024;
        else if (r.sizeUnit === 'MB') bytes *= 1024 * 1024;

        // Start Address
        let addrRaw = parseAddress(r.start);
        let absStart = 0;

        // Smart offset/absolute detection
        if (addrRaw >= state.baseAddr && state.baseAddr > 0) {
            absStart = addrRaw;
        } else {
            absStart = state.baseAddr + addrRaw;
        }

        const absEnd = absStart + bytes;

        processedRegions.push({
            ...r,
            absStart,
            absEnd,
            bytes,
            collision: false
        });
    });

    // 3. Collision Detection
    for (let i = 0; i < processedRegions.length; i++) {
        for (let j = i + 1; j < processedRegions.length; j++) {
            const a = processedRegions[i];
            const b = processedRegions[j];

            if (a.absStart < b.absEnd && a.absEnd > b.absStart) {
                a.collision = true;
                b.collision = true;
            }
        }
    }

    // 4. Stats
    const usedBytes = processedRegions.reduce((sum, r) => sum + r.bytes, 0);

    statUsed.textContent = formatBytes(usedBytes);
    statFree.textContent = formatBytes(Math.max(0, state.totalSize - usedBytes));
    statHoles.textContent = `${processedRegions.length} Defined`;

    // Render
    drawMap(processedRegions);
}

// --- DOM Rendering ---

function renderRegionTable() {
    regionList.innerHTML = '';
    state.regions.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" value="${r.name}" onchange="updateRegion(${r.id}, 'name', this.value)" style="width:100%; font-family:var(--font-mono); color:var(--color-signal-high);"></td>
            <td><input type="text" value="${r.start}" onchange="updateRegion(${r.id}, 'start', this.value)" style="width:100%; font-family:monospace;"></td>
            <td>
                <div style="display:flex; gap:4px;">
                    <input type="number" value="${r.size}" onchange="updateRegion(${r.id}, 'size', this.value)" style="width:50px;">
                    <select onchange="updateRegion(${r.id}, 'sizeUnit', this.value)">
                        <option value="Bytes" ${r.sizeUnit === 'Bytes' ? 'selected' : ''}>B</option>
                        <option value="KB" ${r.sizeUnit === 'KB' ? 'selected' : ''}>KB</option>
                        <option value="MB" ${r.sizeUnit === 'MB' ? 'selected' : ''}>MB</option>
                    </select>
                </div>
            </td>
            <td><button class="btn-action btn-delete" onclick="removeRegion(${r.id})">×</button></td>
        `;
        regionList.appendChild(tr);
    });
}

// --- Canvas Rendering (BOTTOM UP) ---

let renderReq = false;
function requestRender() {
    if (!renderReq) {
        renderReq = true;
        requestAnimationFrame(() => { renderReq = false; updateMap(); });
    }
}

function drawMap(regions) {
    const w = canvas.parentElement.offsetWidth * (window.devicePixelRatio || 1);
    const h = canvas.parentElement.offsetHeight * (window.devicePixelRatio || 1);

    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
    }
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    ctx.fillStyle = COL_BG;
    ctx.fillRect(0, 0, w, h);

    // Layout
    const trackWidth = 140; // Wider for detailed labels
    const trackX = 120;     // Space for labels on left?
    const paddingY = 40;
    const mapH = h - (paddingY * 2);

    const pxPerByte = mapH / state.totalSize;

    // --- Draw Memory Bar (Empty) ---
    // In bottom-up:
    // Bottom (Low Addr) = h - paddingY
    // Top (High Addr) = paddingY
    const yBottom = h - paddingY;
    const yTop = paddingY;

    // Track Background
    ctx.fillStyle = '#111';
    ctx.fillRect(trackX, yTop, trackWidth, mapH);
    ctx.strokeStyle = COL_GRID;
    ctx.strokeRect(trackX, yTop, trackWidth, mapH);

    // --- Draw Regions ---
    regions.forEach(r => {
        // Rel Offset from Base
        const startOffset = Math.max(0, r.absStart - state.baseAddr);
        const endOffset = Math.min(state.totalSize, r.absEnd - state.baseAddr);

        if (startOffset >= state.totalSize) return;

        // Bottom-Up Calc:
        // yEnd (Top of rect) corresponds to endOffset (Higher Address)
        // yStart (Bottom of rect) corresponds to startOffset (Lower Address)
        // Canvas Y=0 is top.
        // So Y for Higher Address should be SMALLER.

        const hReg = (endOffset - startOffset) * pxPerByte;
        const yBase = yBottom - (startOffset * pxPerByte); // Bottom edge of region in canvas coords
        const yRectTop = yBase - hReg; // Top edge of region

        // Safety clip
        const drawY = Math.max(yTop, yRectTop);
        const drawH = Math.min(mapH, hReg);

        if (drawH <= 0) return;

        ctx.fillStyle = r.collision ? COL_COLLISION : COL_USED;
        ctx.fillRect(trackX + 2, drawY, trackWidth - 4, drawH);

        ctx.strokeStyle = '#000';
        ctx.strokeRect(trackX + 2, drawY, trackWidth - 4, drawH);

        // Labels
        ctx.fillStyle = COL_TEXT;
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.textBaseline = 'middle';

        // 1. Address Label (Left, at visual bottom of block -> Start Addr)
        const hexAddr = '0x' + r.absStart.toString(16).toUpperCase();
        ctx.textAlign = 'right';
        // Align with bottom of block (Start Address)
        ctx.fillText(hexAddr, trackX - 10, yBase);

        // 2. Name Label (Right)
        ctx.textAlign = 'left';
        ctx.fillStyle = r.collision ? COL_COLLISION : '#fff';
        // Center vertically in block
        let lblY = drawY + (drawH / 2);
        // If block too small, ensure label is readable or adjust
        ctx.fillText(r.name, trackX + trackWidth + 10, lblY);

        // 3. Size Label (Right sub)
        ctx.fillStyle = COL_TEXT;
        ctx.font = '10px sans-serif';
        // ctx.fillText(formatBytes(r.bytes), trackX + trackWidth + 10, lblY + 14);
    });

    // --- Draw Global Address Markers ---
    ctx.fillStyle = COL_TEXT;
    ctx.textAlign = 'right';

    // Base Address (Bottom)
    ctx.fillText('0x' + state.baseAddr.toString(16).toUpperCase(), trackX - 10, yBottom + 14);

    // End Address (Top)
    const finalAddr = state.baseAddr + state.totalSize;
    ctx.fillText('0x' + finalAddr.toString(16).toUpperCase(), trackX - 10, yTop - 6);

    // Direction Arrow
    ctx.strokeStyle = COL_GRID;
    ctx.beginPath();
    const arrowX = trackX - 100;
    // ctx.moveTo(arrowX, yBottom);
    // ctx.lineTo(arrowX, yTop);
    // ctx.stroke();
    // ctx.textAlign = 'center';
    // ctx.fillText("ADDR", arrowX, yBottom + 10);
    // ctx.fillText("↑", arrowX, yBottom - 10);
}

// --- Utils ---
function formatBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / (1024 * 1024)).toFixed(2) + ' MB';
}

window.updateRegion = updateRegion;
window.removeRegion = removeRegion;

init();
