// Voltage Divider Logic

const modeSelect = document.getElementById('modeSelect');
const vinInput = document.getElementById('vin');
const voutInput = document.getElementById('vout');
const r1Input = document.getElementById('r1');
const r2Input = document.getElementById('r2');
const seriesSelect = document.getElementById('series');

const resultMain = document.getElementById('resultMain');
const actualVoutDisplay = document.getElementById('actualVout');
const currentDrawDisplay = document.getElementById('currentDraw');

const groupVout = document.getElementById('group_output_voltage');
const groupR1 = document.getElementById('group_r1');
const groupR2 = document.getElementById('group_r2');

// Viz Elements
const barVin = document.getElementById('barVin');
const dispVin = document.getElementById('dispVin');
const barVout = document.getElementById('barVout');
const dispVout = document.getElementById('dispVout');

const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];
const E24 = [10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51, 56, 62, 68, 75, 82, 91];
const E96 = [
    100, 102, 105, 107, 110, 113, 115, 118, 121, 124, 127, 130, 133, 137, 140, 143, 147, 150,
    154, 158, 162, 165, 169, 174, 178, 182, 187, 191, 196, 200, 205, 210, 215, 221, 226, 232,
    237, 243, 249, 255, 261, 267, 274, 280, 287, 294, 301, 309, 316, 324, 332, 340, 348, 357,
    365, 374, 383, 392, 402, 412, 422, 432, 442, 453, 464, 475, 487, 499, 511, 523, 536, 549,
    562, 576, 590, 604, 619, 634, 649, 665, 681, 698, 715, 732, 750, 768, 787, 806, 825, 845,
    866, 887, 909, 931, 953, 976
];

function getClosestResistor(val, seriesName) {
    if (seriesName === 'exact') return val;
    let baseSeries = [];
    if (seriesName === 'E12') baseSeries = E12;
    if (seriesName === 'E24') baseSeries = E24;
    if (seriesName === 'E96') baseSeries = E96;

    const log10 = Math.log10(val);
    const exponent = Math.floor(log10);
    let normalized = val / Math.pow(10, exponent - (seriesName === 'E96' ? 2 : 1));

    let closest = baseSeries[0];
    let minDiff = Math.abs(normalized - closest);

    for (const s of baseSeries) {
        const diff = Math.abs(normalized - s);
        if (diff < minDiff) {
            minDiff = diff;
            closest = s;
        }
    }
    return closest * Math.pow(10, exponent - (seriesName === 'E96' ? 2 : 1));
}

function updateUI() {
    const mode = modeSelect.value;
    if (mode === 'vout') {
        groupVout.style.display = 'none';
        groupR1.style.display = 'block';
        groupR2.style.display = 'block';
    } else if (mode === 'r2') {
        groupVout.style.display = 'block';
        groupR1.style.display = 'block';
        groupR2.style.display = 'none';
    } else {
        groupVout.style.display = 'block';
        groupR1.style.display = 'none';
        groupR2.style.display = 'block';
    }
    calc();
}

function updateViz(vin, vout) {
    // Determine scale for bars
    // Vin is 100% height reference, unless Vout > Vin (Boost? Error)

    // Format text
    dispVin.textContent = vin.toFixed(2) + 'V';
    dispVout.textContent = vout.toFixed(2) + 'V';

    // Bar heights
    // Max height 100% = Max(Vin, Vout, 1.0)
    let max = Math.max(vin, vout);
    if (max <= 0) max = 1;

    const hVin = (vin / max) * 100;
    const hVout = (vout / max) * 100;

    // Use setTimeout to ensure CSS transition triggers if this was a fresh load
    requestAnimationFrame(() => {
        barVin.style.height = `${hVin}%`;
        barVout.style.height = `${hVout}%`;
    });

    // Color code Vout bar
    if (vout > vin) {
        barVout.style.backgroundColor = 'var(--color-error)'; // Boost warning
    } else {
        barVout.style.backgroundColor = 'var(--color-signal-high)';
    }
}

function calc() {
    const mode = modeSelect.value;
    const series = seriesSelect.value;

    const vin = parseFloat(vinInput.value) || 0;

    let vout = 0;
    let r1 = 0;
    let r2 = 0;

    let finalVout = 0;

    if (mode === 'vout') {
        r1 = parseFloat(r1Input.value) || 0;
        r2 = parseFloat(r2Input.value) || 0;
        if (r1 + r2 !== 0) {
            vout = vin * (r2 / (r1 + r2));
        }
        resultMain.textContent = `Vout = ${vout.toFixed(3)} V`;
        finalVout = vout;

    } else if (mode === 'r2') {
        vout = parseFloat(voutInput.value) || 0;
        r1 = parseFloat(r1Input.value) || 0;

        let calcR2 = 0;
        if (vin - vout !== 0) calcR2 = (vout * r1) / (vin - vout);
        if (calcR2 < 0) calcR2 = 0;

        r2 = getClosestResistor(calcR2, series);

        resultMain.innerHTML = `Calculated R2 = ${calcR2.toFixed(1)} &Omega;<br>Standard R2 = ${r2.toFixed(1)} &Omega;`;
        if (r1 + r2 !== 0) finalVout = vin * (r2 / (r1 + r2));

    } else if (mode === 'r1') {
        vout = parseFloat(voutInput.value) || 0;
        r2 = parseFloat(r2Input.value) || 0;

        let calcR1 = 0;
        if (vout !== 0) calcR1 = (vin * r2 / vout) - r2;
        if (calcR1 < 0) calcR1 = 0;

        r1 = getClosestResistor(calcR1, series);

        resultMain.innerHTML = `Calculated R1 = ${calcR1.toFixed(1)} &Omega;<br>Standard R1 = ${r1.toFixed(1)} &Omega;`;
        if (r1 + r2 !== 0) finalVout = vin * (r2 / (r1 + r2));
    }

    const current = (r1 + r2 > 0) ? vin / (r1 + r2) : 0;

    actualVoutDisplay.textContent = `${finalVout.toFixed(3)} V`;
    currentDrawDisplay.textContent = `${(current * 1000).toFixed(3)} mA`;

    updateViz(vin, finalVout);
}

modeSelect.addEventListener('change', updateUI);
[vinInput, voutInput, r1Input, r2Input, seriesSelect].forEach(el => el.addEventListener('input', calc));
updateUI();
