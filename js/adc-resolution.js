// ADC Resolution Logic & Viz

const bitsInput = document.getElementById('bits');
const bitsSlider = document.getElementById('bitsSlider');
const vrefInput = document.getElementById('vref');
const maxCountDisplay = document.getElementById('maxCount');
const maxCountDecDisplay = document.getElementById('maxCountDec');
const lsbDisplay = document.getElementById('lsb');
const countsPerVoltDisplay = document.getElementById('countsPerVolt');

const inputVoltsInput = document.getElementById('inputVolts');
const adcCountDisplay = document.getElementById('adcCount');

const canvas = document.getElementById('adcViz');
const ctx = canvas.getContext('2d');

// Sync slider
bitsInput.addEventListener('input', () => { if (bitsInput.value <= 16) bitsSlider.value = bitsInput.value; calc(); });
bitsSlider.addEventListener('input', () => { bitsInput.value = bitsSlider.value; calc(); });

function drawStaircase(bits, vref) {
    if (!canvas.parentElement) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    const padding = 30;
    const graphW = w - padding * 2;
    const graphH = h - padding * 2;
    const originX = padding;
    const originY = h - padding;

    // AXES
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(originX, padding); // Y axis top
    ctx.lineTo(originX, originY); // Origin
    ctx.lineTo(w - padding, originY); // X axis right
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#8b949e';
    ctx.font = '10px monospace';
    ctx.fillText('0', originX - 10, originY + 10);
    ctx.fillText('Vref', w - padding - 10, originY + 15);
    ctx.fillText('MaxCount', originX - 25, padding + 5);

    // Viz Logic:
    // If bits > 4 or 5, we can't draw every step meaningfully.
    // So we draw a "zoomed" representation or just a symbolic staircase.
    // Let's draw a symbolic one with ~5-8 steps to illustrate the concept of quantization.
    const stepsToDraw = Math.min(Math.pow(2, bits), 8);

    const stepW = graphW / stepsToDraw;
    const stepH = graphH / stepsToDraw;

    // Draw ideal linear line (dashed)
    ctx.strokeStyle = '#30363d';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(originX + graphW, originY - graphH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Staircase
    ctx.strokeStyle = '#388bfd';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < stepsToDraw; i++) {
        const x1 = originX + (i * stepW);
        const y1 = originY - (i * stepH);
        const x2 = x1 + stepW;
        const y2 = y1;     // Flat part
        // Rise happens at transition? 
        // Ideal ADC: Output stays constant for a voltage range, then jumps.
        // Usually 0 to 1LSB reads 0. 1LSB to 2LSB reads 1.

        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y1); // Horizontal
        if (i < stepsToDraw - 1) {
            ctx.lineTo(x2, y1 - stepH); // Vertical rise
        }
    }
    ctx.stroke();

    // Annotate LSB
    if (stepsToDraw > 2) {
        const midStep = Math.floor(stepsToDraw / 2);
        const sx = originX + (midStep * stepW);
        const sy = originY - (midStep * stepH);

        // arrow for step height
        ctx.fillStyle = '#f85149';
        ctx.fillText('1 LSB', sx + 5, sy - stepH / 2 + 3);

        ctx.strokeStyle = '#f85149';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Bracket
        ctx.moveTo(sx + stepW - 5, sy);
        ctx.lineTo(sx + stepW - 5, sy - stepH);
        ctx.stroke();
    }
}

function calc() {
    const bits = parseInt(bitsInput.value) || 0;
    const vref = parseFloat(vrefInput.value) || 0;

    if (bits < 1) return;

    const maxCount = Math.pow(2, bits) - 1;
    const lsb = vref / Math.pow(2, bits);

    maxCountDisplay.textContent = '0x' + maxCount.toString(16).toUpperCase();
    maxCountDecDisplay.textContent = maxCount;

    if (lsb < 0.001) {
        lsbDisplay.textContent = `${(lsb * 1000000).toFixed(2)} \u00B5V`;
    } else if (lsb < 1) {
        lsbDisplay.textContent = `${(lsb * 1000).toFixed(2)} mV`;
    } else {
        lsbDisplay.textContent = `${lsb.toFixed(4)} V`;
    }

    const countsPerVolt = maxCount / vref;
    countsPerVoltDisplay.textContent = countsPerVolt.toFixed(1);

    // Dynamic conversion
    const inVolts = parseFloat(inputVoltsInput.value) || 0;
    let count = Math.round((inVolts / vref) * Math.pow(2, bits));
    if (count > maxCount) count = maxCount;
    if (count < 0) count = 0;

    adcCountDisplay.textContent = `${count} (0x${count.toString(16).toUpperCase()})`;

    drawStaircase(bits, vref);
}

[bitsInput, vrefInput, inputVoltsInput].forEach(el => el.addEventListener('input', calc));

window.addEventListener('resize', calc);
calc();
