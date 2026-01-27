/**
 * Interactive IC Pinout Viewer Logic
 * Handles Package Rendering via SVG and Pin Interaction.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

const ui = {
    selector: document.getElementById('icSelector'),
    svgContainer: document.getElementById('svgContainer'),
    metaPackage: document.getElementById('metaPackage'),
    metaPins: document.getElementById('metaPins'),
    metaDatasheet: document.getElementById('metaDatasheet'),
    pinDetail: document.getElementById('pinDetailContent'),
    search: document.getElementById('pinSearch'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    btnReset: document.getElementById('btnResetView')
};

let currentIC = null;
let selectedPin = null; // index
let activeFilter = null;
let searchTerm = "";

// Zoom/Pan State
let panX = 0, panY = 0, zoom = 1.0;
let isDragging = false;
let startX = 0, startY = 0;

window.onload = () => {
    populateSelector();

    // Select first by default
    const keys = Object.keys(IC_DATA);
    if (keys.length > 0) loadIC(keys[0]);

    ui.selector.addEventListener('change', (e) => loadIC(e.target.value));

    ui.search.addEventListener('input', (e) => {
        searchTerm = e.target.value.toUpperCase();
        updateHighlights();
    });

    ui.filterBtns.forEach(btn => btn.addEventListener('click', (e) => {
        // Toggle
        const type = btn.dataset.filter;
        if (activeFilter === type) {
            activeFilter = null;
            btn.classList.remove('active');
        } else {
            activeFilter = type;
            ui.filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }
        updateHighlights();
    }));

    // Pan/Zoom Events
    ui.svgContainer.addEventListener('mousedown', startPan);
    window.addEventListener('mousemove', doPan);
    window.addEventListener('mouseup', endPan);
    ui.svgContainer.addEventListener('wheel', doZoom);
    ui.btnReset.addEventListener('click', resetView);
};

function populateSelector() {
    Object.keys(IC_DATA).forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = key;
        ui.selector.appendChild(opt);
    });
}

function loadIC(key) {
    currentIC = IC_DATA[key];
    if (!currentIC) return;

    // reset view
    resetView();
    selectedPin = null;

    // Meta
    ui.metaPackage.textContent = currentIC.meta.package;
    ui.metaPins.textContent = currentIC.pins.length;
    ui.metaDatasheet.href = currentIC.meta.datasheet;

    renderPackage();
    updateDetailPanel();
    updateHighlights();
}


/* --- SVG PACKAGE RENDERER --- */
function renderPackage() {
    ui.svgContainer.innerHTML = ''; // clear

    const pkgType = currentIC.meta.package.split('-')[0]; // DIP, LQFP
    const pinCount = currentIC.pins.length;

    // Create SVG
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.overflow = "visible"; // Allow pan out

    const g = document.createElementNS(SVG_NS, "g");
    g.id = "viewport";
    svg.appendChild(g);
    ui.svgContainer.appendChild(svg);

    // Geometry Logic
    if (pkgType === "DIP") renderDIP(g, pinCount);
    else if (pkgType === "LQFP" || pkgType === "TQFP") renderQFP(g, pinCount);
    else renderGeneric(g, pinCount);

    updateTransform();
}

function renderDIP(g, pinCount) {
    // 2 Rows. Pitch = 30. Width = 100.
    const pitch = 40;
    const bodyW = 120;
    const rowCount = pinCount / 2;
    const bodyH = rowCount * pitch + 20;

    // Center it
    const startX = -bodyW / 2;
    const startY = -bodyH / 2;

    // Body
    const body = document.createElementNS(SVG_NS, "rect");
    body.setAttribute("x", startX);
    body.setAttribute("y", startY);
    body.setAttribute("width", bodyW);
    body.setAttribute("height", bodyH);
    body.setAttribute("class", "ic-body");
    g.appendChild(body);

    // Notch
    const notch = document.createElementNS(SVG_NS, "path");
    notch.setAttribute("d", `M ${startX + 40},${startY} A 20,20 0 0,0 ${startX + 80},${startY}`);
    notch.setAttribute("class", "ic-notch");
    g.appendChild(notch);

    // Pins
    for (let i = 0; i < pinCount; i++) {
        // Pins 1..N/2 Left side (Top down)
        // Pins N/2+1 .. N Right side (Bottom up)

        // Logical Index (1-based)
        const pinN = i + 1;
        let px, py, pw = 20, ph = 14;

        let labelX, labelAnchor;

        if (pinN <= rowCount) {
            // Left Side
            px = startX - pw;
            py = startY + 10 + (i * pitch) + (pitch / 2) - (ph / 2);
            labelX = startX + 10;
            labelAnchor = "start";
        } else {
            // Right Side
            // Index from bottom for alignment? standard DIP counts U-shape
            // Pin N/2 + 1 is bottom right
            const idxFromBottom = i - rowCount; // 0 is bottom right
            // Wait, standard:
            // 1 2 3
            // 6 5 4
            // So right side goes UP.

            // Invert index for Y calculation
            const revIdx = (rowCount - 1) - idxFromBottom;

            px = startX + bodyW;
            py = startY + 10 + (revIdx * pitch) + (pitch / 2) - (ph / 2);
            labelX = startX + bodyW - 10;
            labelAnchor = "end";
        }

        createPinGroup(g, i, px, py, pw, ph, labelX, py + ph / 2 + 5, labelAnchor);
    }
}

function renderQFP(g, pinCount) {
    // 4 Sides.
    const sideCount = pinCount / 4;
    const pitch = 25;
    const padding = 30; // Corner padding
    const sideLen = (sideCount * pitch) + (padding * 2);

    // Body is Square
    const startX = -sideLen / 2;
    const startY = -sideLen / 2;

    // Body
    const body = document.createElementNS(SVG_NS, "rect");
    body.setAttribute("x", startX);
    body.setAttribute("y", startY);
    body.setAttribute("width", sideLen);
    body.setAttribute("height", sideLen);
    body.setAttribute("transform", "rotate(45, 0, 0)"); // Rotated? No, usually flat square for QFP schematic
    body.setAttribute("class", "ic-body");
    g.appendChild(body);

    // Pin 1 Dot (Top Left corner usually)
    const dot = document.createElementNS(SVG_NS, "circle");
    dot.setAttribute("cx", startX + 20);
    dot.setAttribute("cy", startY + 20);
    dot.setAttribute("r", 5);
    dot.setAttribute("class", "ic-notch");
    g.appendChild(dot);

    // Pins
    // 1..N/4 Left (TopDown)
    // .. Bottom (LeftRight)
    // .. Right (BottomUp)
    // .. Top (RightLeft)

    const pw = 20, ph = 12;

    for (let i = 0; i < pinCount; i++) {
        const pinN = i + 1;
        let px, py, angle = 0;
        let lx, ly, anchor = "middle", baseline = "middle";

        const sideIdx = Math.floor(i / sideCount); // 0,1,2,3
        const idxInSide = i % sideCount;

        // Offset for alignment within side
        const offset = startY + padding + (idxInSide * pitch) + (pitch / 2);

        if (sideIdx === 0) {
            // Left Side
            px = startX - pw;
            py = offset - (ph / 2);
            lx = startX + 10; ly = py + ph / 2 + 4; anchor = "start";
        } else if (sideIdx === 1) {
            // Bottom Side
            // Rotate coord system? Easier to verify math
            // x grows, y fixed bottom
            px = startX + padding + (idxInSide * pitch) + (pitch / 2) - (ph / 2); // actually ph is width here
            // Swap dim for horizontal pins
            // Let's use rotation for simplicity?
            // Actually manual calc cleaner for text
            const tmpX = startX + padding + (idxInSide * pitch) + (pitch / 2) - (ph / 2); // vertical thin pin?
            // Pins are vertical rects
            px = tmpX;
            py = startY + sideLen;
            lx = px + ph / 2; ly = startY + sideLen - 10; anchor = "middle";
            // Swap w/h for draw
        }

        // To save code complexity, generic rotation wrapper:

        const grp = document.createElementNS(SVG_NS, "g");
        grp.dataset.idx = i;
        grp.onclick = () => selectPin(i);
        grp.style.cursor = "pointer";
        grp.setAttribute("class", "pin-group");

        const rect = document.createElementNS(SVG_NS, "rect");
        rect.setAttribute("class", "ic-pin");
        grp.appendChild(rect);

        const txt = document.createElementNS(SVG_NS, "text");
        txt.textContent = currentIC.pins[i].name;
        txt.style.fontSize = "12px";
        txt.style.fontFamily = "monospace";
        txt.style.fill = "#aaa";
        grp.appendChild(txt);
        g.appendChild(grp);

        // Positioning Logic per side
        if (sideIdx === 0) { // Left
            rect.setAttribute("x", startX - 20);
            rect.setAttribute("y", startY + padding + idxInSide * pitch);
            rect.setAttribute("width", 20);
            rect.setAttribute("height", 14);
            txt.setAttribute("x", startX + 5);
            txt.setAttribute("y", startY + padding + idxInSide * pitch + 11);
            txt.style.textAnchor = "start";
        }
        else if (sideIdx === 1) { // Bottom
            rect.setAttribute("x", startX + padding + idxInSide * pitch);
            rect.setAttribute("y", startY + sideLen);
            rect.setAttribute("width", 14);
            rect.setAttribute("height", 20);
            txt.setAttribute("x", startX + padding + idxInSide * pitch + 7);
            txt.setAttribute("y", startY + sideLen - 5);
            txt.style.textAnchor = "middle"; // vert text later?
        }
        else if (sideIdx === 2) { // Right (Bottom Up)
            // Pins 25-36
            // Order: Bottom one is 25? Yes
            const revIdx = (sideCount - 1) - idxInSide;
            rect.setAttribute("x", startX + sideLen);
            rect.setAttribute("y", startY + padding + revIdx * pitch);
            rect.setAttribute("width", 20);
            rect.setAttribute("height", 14);
            txt.setAttribute("x", startX + sideLen - 5);
            txt.setAttribute("y", startY + padding + revIdx * pitch + 11);
            txt.style.textAnchor = "end";
        }
        else if (sideIdx === 3) { // Top (Right Left)
            // Pins 37-48
            // Rightmost is 37
            const revIdx = (sideCount - 1) - idxInSide;
            rect.setAttribute("x", startX + padding + revIdx * pitch);
            rect.setAttribute("y", startY - 20);
            rect.setAttribute("width", 14);
            rect.setAttribute("height", 20);
            txt.setAttribute("x", startX + padding + revIdx * pitch + 7);
            txt.setAttribute("y", startY + 15);
            txt.style.textAnchor = "middle";
        }
    }
}

function renderGeneric(g, pinCount) {
    // Fallback text
    const txt = document.createElementNS(SVG_NS, "text");
    txt.textContent = "Package not supported in renderer";
    txt.setAttribute("fill", "white");
    g.appendChild(txt);
}

function createPinGroup(g, i, x, y, w, h, lx, ly, anchor) {
    const grp = document.createElementNS(SVG_NS, "g");
    grp.dataset.idx = i;
    grp.onclick = () => selectPin(i);
    grp.setAttribute("class", "pin-group");

    // Pin Rect
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", w);
    rect.setAttribute("height", h);
    rect.setAttribute("class", "ic-pin");
    grp.appendChild(rect);

    // Label
    const txt = document.createElementNS(SVG_NS, "text");
    txt.textContent = currentIC.pins[i].name;
    txt.setAttribute("x", lx);
    txt.setAttribute("y", ly);
    txt.style.fontSize = "12px";
    txt.style.fontFamily = "monospace";
    txt.style.fill = "#aaa";
    txt.style.textAnchor = anchor;
    txt.style.pointerEvents = "none"; // Make text click-through
    grp.appendChild(txt);

    g.appendChild(grp);
}


/* --- INTERACTION --- */
function selectPin(idx) {
    selectedPin = idx;

    // Highlight in SVG
    const groups = document.querySelectorAll('.pin-group');
    groups.forEach(g => {
        g.querySelector('rect').classList.remove('selected');
        if (parseInt(g.dataset.idx) === idx) {
            g.querySelector('rect').classList.add('selected');
        }
    });

    updateDetailPanel();
}

function updateDetailPanel() {
    if (selectedPin === null) {
        ui.pinDetail.innerHTML = `<div style="text-align:center; color:var(--color-text-secondary); margin-top:40px;">Select a pin to view details.</div>`;
        return;
    }

    const pin = currentIC.pins[selectedPin];

    let html = `
    <div style="text-align:center; margin-bottom:20px;">
        <div style="font-size:2rem; color:var(--color-signal-high); font-weight:bold;">${pin.name}</div>
        <div style="color:var(--color-text-secondary);">Pin ${pin.n}</div>
    </div>
    
    <div class="detail-row"><span class="detail-label">Type</span><span class="detail-val">${pin.type}</span></div>
    <div class="detail-row"><span class="detail-label">Description</span><span class="detail-val" style="font-size:0.8rem;">${pin.desc || '-'}</span></div>
    
    <div style="margin-top:20px;">
        <div class="detail-label" style="margin-bottom:8px;">Alternate Functions</div>
        <div>
    `;

    if (pin.func && pin.func.length > 0) {
        pin.func.forEach(f => {
            // Check if matches search/filter
            const match = (searchTerm && f.toUpperCase().includes(searchTerm)) ||
                (activeFilter && isFilterMatch(pin, f, activeFilter));
            html += `<span class="alt-func-tag ${match ? 'match' : ''}">${f}</span>`;
        });
    } else {
        html += `<span style="color:#666; font-size:0.8rem;">None</span>`;
    }

    html += `</div></div>`;
    ui.pinDetail.innerHTML = html;
}

function updateHighlights() {
    const groups = document.querySelectorAll('.pin-group');

    groups.forEach(g => {
        const idx = parseInt(g.dataset.idx);
        const pin = currentIC.pins[idx];
        const rect = g.querySelector('rect');

        // Default State
        rect.classList.remove('dimmed', 'highlight-power', 'highlight-analog', 'highlight-comm', 'highlight-pwm');

        let highlight = false;
        let dim = false;

        // 1. Search Logic
        if (searchTerm) {
            const txt = (pin.name + " " + (pin.func ? pin.func.join(" ") : "")).toUpperCase();
            if (txt.includes(searchTerm)) highlight = true;
            else dim = true;
        }

        // 2. Filter Logic (Overlay)
        if (activeFilter) {
            if (isFilterMatch(pin, null, activeFilter)) highlight = true;
            else if (!searchTerm) dim = true; // Only dim if search isn't already driving
        }

        // Apply
        if ((searchTerm || activeFilter) && !highlight) rect.classList.add('dimmed');

        if (highlight) {
            // Add specific color class
            // Priority: Power -> Analog -> Comm -> PWM
            if (activeFilter) {
                rect.classList.add(`highlight-${activeFilter}`);
            } else {
                // Infer from pin type/func
                if (pin.type === 'POWER') rect.classList.add('highlight-power');
                else if (pin.type === 'ANALOG' || (pin.func && pin.func.some(f => f.includes('ADC')))) rect.classList.add('highlight-analog');
                else rect.classList.add('selected'); // Generic search match
            }
        }
    });

    // Refresh Panel if key
    if (selectedPin !== null) updateDetailPanel();
}

function isFilterMatch(pin, funcStr, filter) {
    if (filter === 'power') return pin.type === 'POWER' || pin.type === 'GND'; // though GND usually separate
    if (filter === 'analog') return pin.type === 'ANALOG' || (pin.func && pin.func.some(f => f.includes('ADC') || f.includes('DAC')));
    if (filter === 'comm') return pin.func && pin.func.some(f => /UART|USART|SPI|I2C|TX|RX|SCL|SDA|MISO|MOSI/.test(f));
    if (filter === 'pwm') return pin.func && pin.func.some(f => /OC\d|TIM/.test(f)); // basic heuristic
    return false;
}

/* --- ZOOM/PAN --- */
function updateTransform() {
    const g = document.getElementById('viewport');
    if (g) g.setAttribute('transform', `translate(${panX}, ${panY}) scale(${zoom})`);
}

function doZoom(e) {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 0.9 : 1.1;
    zoom *= scale;
    updateTransform();
}

function startPan(e) {
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
}

function doPan(e) {
    if (!isDragging) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    updateTransform();
}

function endPan() {
    isDragging = false;
}

function resetView() {
    panX = window.innerWidth < 1200 ? 150 : 300; // rough center offset
    panY = 300;
    zoom = 1.0;
    // Auto-center? 
    // Just reset to middle of container
    const rect = ui.svgContainer.getBoundingClientRect();
    panX = rect.width / 2;
    panY = rect.height / 2;
    updateTransform();
}
