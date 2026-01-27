// LED Resistor Logic

const vccInput = document.getElementById('vcc');
const vfInput = document.getElementById('vf');
const currentInput = document.getElementById('current');
const resistorCalcDisplay = document.getElementById('resistorCalc');
const resistorStdDisplay = document.getElementById('resistorStd');
const powerDisplay = document.getElementById('power');

const E24 = [10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51, 56, 62, 68, 75, 82, 91];

function getStandardE24(val) {
    if (val <= 0) return 0;
    const log10 = Math.log10(val);
    const exponent = Math.floor(log10);
    const normalized = val / Math.pow(10, exponent - 1);

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
    const vf = parseFloat(vfInput.value) || 0;
    const i_ma = parseFloat(currentInput.value) || 0;

    if (i_ma === 0) return;
    const i_amps = i_ma / 1000;

    const v_drop = vcc - vf;
    if (v_drop < 0) {
        resistorCalcDisplay.textContent = 'Error (Vf > Vcc)';
        return;
    }

    const r = v_drop / i_amps;
    const power = i_amps * i_amps * r;
    const stdR = getStandardE24(r);

    resistorCalcDisplay.textContent = `${r.toFixed(1)} \u03A9`;
    resistorStdDisplay.textContent = `${stdR.toFixed(1)} \u03A9`;
    powerDisplay.textContent = `${(power * 1000).toFixed(1)} mW`;
}

[vccInput, vfInput, currentInput].forEach(el => el.addEventListener('input', calc));
calc();
