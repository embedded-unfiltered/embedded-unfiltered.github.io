/**
 * PWM Calculator Logic & "Oscilloscope" Renderer
 * Designed for Embedded Unfiltered v2 - Instrument Theme
 */

// DOM Elements
const inputClock = document.getElementById('timerClock');
const selectClockUnit = document.getElementById('clockUnit');
const inputFreq = document.getElementById('targetFreq');
const selectFreqUnit = document.getElementById('freqUnit');
const inputDuty = document.getElementById('dutyInput');
const sliderDuty = document.getElementById('dutySlider');
const displayDuty = document.getElementById('dutyValueDisplay');

const outArr = document.getElementById('arrCounts');
const outCcr = document.getElementById('ccrCounts');
const outRes = document.getElementById('resolution');

const canvas = document.getElementById('pwmWaveform');
const ctx = canvas.getContext('2d');

// State
let state = {
    clockHz: 84000000,
    targetHz: 20000,
    dutyPercent: 50
};

// --- Initialization ---

function init() {
    addListeners();
    updateState(); // Initial calc
    loop(); // Start animation loop (though we only redraw on change usually, loop helps with fluid resizing)
}

function addListeners() {
    const inputs = [inputClock, selectClockUnit, inputFreq, selectFreqUnit, inputDuty, sliderDuty];

    inputs.forEach(el => {
        el.addEventListener('input', (e) => {
            // Sync Slider & Text
            if (e.target === inputDuty) {
                sliderDuty.value = inputDuty.value;
            } else if (e.target === sliderDuty) {
                inputDuty.value = sliderDuty.value;
            }
            updateState();
        });
    });

    window.addEventListener('resize', requestRender);
}

// --- Logic ---

function updateState() {
    // 1. Parse Inputs
    let clock = parseFloat(inputClock.value) || 0;
    const paddingMultiplier = selectClockUnit.value === 'MHz' ? 1e6 : (selectClockUnit.value === 'kHz' ? 1e3 : 1);
    state.clockHz = clock * paddingMultiplier;

    let params = parseFloat(inputFreq.value) || 0;
    const freqMultiplier = selectFreqUnit.value === 'kHz' ? 1e3 : 1;
    state.targetHz = params * freqMultiplier;

    state.dutyPercent = parseFloat(inputDuty.value) || 0;

    // Clamp duty
    if (state.dutyPercent < 0) state.dutyPercent = 0;
    if (state.dutyPercent > 100) state.dutyPercent = 100;
    displayDuty.textContent = state.dutyPercent.toFixed(1) + '%';

    // 2. Calculate Registers
    if (state.clockHz > 0 && state.targetHz > 0) {
        // ARR = (F_clk / F_pwm) - 1
        const totalCounts = Math.round(state.clockHz / state.targetHz);
        const arr = totalCounts - 1;

        // CCR = (TotalCounts * Duty)
        const ccr = Math.round(totalCounts * (state.dutyPercent / 100));

        // Resolution
        const bits = Math.log2(totalCounts);

        // Update DOM
        outArr.textContent = arr >= 0 ? arr : 'Err';
        outCcr.textContent = ccr >= 0 ? ccr : 'Err';
        outRes.textContent = bits > 0 ? bits.toFixed(1) : '0.0';
    }

    requestRender();
}

// --- Rendering ---
let renderRequested = false;

function requestRender() {
    if (!renderRequested) {
        renderRequested = true;
        requestAnimationFrame(render);
    }
}

function loop() {
    // Optional: continuous loop for smooth resizing or animations if added later
    // For now we use demand-based rendering for efficiency
}

function render() {
    renderRequested = false;

    // 1. Resize Canvas to Parent
    const parent = canvas.parentElement;
    if (parent) {
        const rect = parent.getBoundingClientRect();
        // Handle high DPI displays
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        // Set display size usually handled by CSS width:100%, but good to ensure
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        drawScope(rect.width, rect.height);
    }
}

function drawScope(w, h) {
    // Colors
    const colBg = '#000000';
    const colGrid = '#1e2329';
    const colTrace = '#58a6ff';
    const colTraceFill = 'rgba(88, 166, 255, 0.15)';
    const colText = '#6e7681';

    // Clear
    ctx.fillStyle = colBg;
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = colGrid;
    ctx.beginPath();
    // Vertical lines (time divisions)
    for (let x = 0; x <= w; x += 40) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
    }
    // Horizontal lines (voltage divisions)
    for (let y = 0; y <= h; y += 40) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Signal Setup
    const margin = 40;
    const yHigh = margin + 20;
    const yLow = h - margin - 10;
    const amplitude = yLow - yHigh;

    // Draw Reference Labels (VCC / GND)
    ctx.fillStyle = colText;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('VCC (3.3V)', 5, yHigh - 6);
    ctx.fillText('GND', 5, yLow + 14);

    // Calculate Waveform Geometry
    // We want to show roughly 2 periods always for clarity
    const periodWidth = (w - 100) / 2;
    const startX = 60; // Leave room for labels

    const dutyW = periodWidth * (state.dutyPercent / 100);
    const lowW = periodWidth - dutyW;

    // Draw Pulse
    ctx.strokeStyle = colTrace;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.shadowColor = colTrace;
    ctx.shadowBlur = 8; // Glow effect

    ctx.beginPath();
    ctx.moveTo(0, yLow); // Start from off-screen

    // Period 1
    ctx.lineTo(startX, yLow); // To start
    if (state.dutyPercent > 0) {
        ctx.lineTo(startX, yHigh); // Rising Edge
        ctx.lineTo(startX + dutyW, yHigh); // High
        ctx.lineTo(startX + dutyW, yLow); // Falling Edge
    }
    ctx.lineTo(startX + periodWidth, yLow); // Low

    // Period 2
    if (state.dutyPercent > 0) {
        ctx.lineTo(startX + periodWidth, yHigh); // Rising Edge
        ctx.lineTo(startX + periodWidth + dutyW, yHigh); // High
        ctx.lineTo(startX + periodWidth + dutyW, yLow); // Falling
    }
    ctx.lineTo(startX + periodWidth * 2, yLow); // Low
    ctx.lineTo(w, yLow); // To end

    ctx.stroke();

    // Fill Area under High (Energy Visual)
    ctx.shadowBlur = 0; // Remove glow for fill
    ctx.fillStyle = colTraceFill;
    ctx.lineTo(w, yLow);
    ctx.lineTo(startX + periodWidth * 2 + (state.dutyPercent > 0 ? dutyW : 0), yLow); // Trace back... simplifies to:
    // Just re-trace the high parts for cleaner fill logic
    ctx.beginPath();
    if (state.dutyPercent > 0) {
        // P1 rect
        ctx.rect(startX, yHigh, dutyW, amplitude);
        // P2 rect
        ctx.rect(startX + periodWidth, yHigh, dutyW, amplitude);
    }
    ctx.fill();

    // Annotations (Dimension Lines)
    ctx.strokeStyle = '#8b949e'; // Dimension color
    ctx.fillStyle = '#8b949e';
    ctx.lineWidth = 1;

    // Measure Period (T)
    const yDim = h - 20;
    drawDimensionLine(ctx, startX, yDim, startX + periodWidth, yDim, 'T');

    // Measure Duty (High Time)
    if (state.dutyPercent > 5 && state.dutyPercent < 95) {
        const yDimDuty = yHigh + 30; // Inside the pulse
        // drawDimensionLine(ctx, startX, yDimDuty, startX + dutyW, yDimDuty, 'Ton');
    }

    // Time Label
    const tSec = 1 / state.targetHz;
    let tText = tSec < 0.001 ? (tSec * 1e6).toFixed(1) + 'µs' : (tSec * 1e3).toFixed(2) + 'ms';
    ctx.fillText(`Period: ${tText} @ ${state.targetHz > 1000 ? (state.targetHz / 1000).toFixed(1) + 'kHz' : state.targetHz + 'Hz'}`, startX + 10, yDim - 8);
}

function drawDimensionLine(ctx, x1, y1, x2, y2, label) {
    ctx.beginPath();
    ctx.moveTo(x1, y1 - 4); ctx.lineTo(x1, y1 + 4); // Tick 1
    ctx.moveTo(x2, y2 - 4); ctx.lineTo(x2, y2 + 4); // Tick 2
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); // Line
    ctx.stroke();
}

// Start
init();
