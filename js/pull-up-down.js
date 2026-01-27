// Pull Up/Down Logic

const vccInput = document.getElementById('vcc');
const currentInput = document.getElementById('current');
const resistorDisplay = document.getElementById('resistor');
const powerDisplay = document.getElementById('power');
const standardRDisplay = document.getElementById('standardR');

// Simple E24 lookup reuse or duplicate
const E24 = [10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51, 56, 62, 68, 75, 82, 91];

function getStandardE24(val) {
    if (val <= 0) return 0;
    const log10 = Math.log10(val);
    const exponent = Math.floor(log10);
    const normalized = val / Math.pow(10, exponent - 1); // 10-99 base

    let closest = E24[0];
    let minDiff = Math.abs(normalized - closest);

    for (const s of E24) {
        const diff = Math.abs(normalized - s);
        if (diff < minDiff) {
            minDiff = diff;
            closest = s;
        }
    }
    return closest * Math.pow(10, exponent - 1);
}

function calc() {
    const vcc = parseFloat(vccInput.value) || 0;
    const i_ma = parseFloat(currentInput.value) || 0;

    if (i_ma === 0) {
        resistorDisplay.textContent = 'Infinite (Open Circuit)';
        return;
    }

    const i_amps = i_ma / 1000;
    const r = vcc / i_amps;
    const power_watts = i_amps * i_amps * r;

    const stdR = getStandardE24(r);

    resistorDisplay.textContent = `${r.toFixed(0)} \u03A9`; // Omega
    powerDisplay.textContent = `${(power_watts * 1000).toFixed(2)} mW`;
    standardRDisplay.textContent = `${stdR.toFixed(0)} \u03A9`;
}

vccInput.addEventListener('input', calc);
currentInput.addEventListener('input', calc);
calc();
