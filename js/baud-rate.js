/**
 * Baud Rate Error Calculator
 * Generic logic: Div = PCLK / (Over * Baud)
 */

const inClk = document.getElementById('inClk');
const uClk = document.getElementById('uClk');
const inBaud = document.getElementById('inBaud');
const selOver = document.getElementById('selOver');
const selDivType = document.getElementById('selDivType');

const resStatus = document.getElementById('resStatus');
const resError = document.getElementById('resError');
const visError = document.getElementById('visError');
const resActual = document.getElementById('resActual');
const resDiv = document.getElementById('resDiv');

function init() {
    [inClk, uClk, inBaud, selOver, selDivType].forEach(el => el.addEventListener('input', updateCalc));
    updateCalc();
}

function updateCalc() {
    let pclk = parseFloat(inClk.value) || 0;
    if (uClk.value === 'MHz') pclk *= 1000000;

    const targetBaud = parseFloat(inBaud.value) || 0;
    const oversampling = parseFloat(selOver.value) || 16;

    // Prevent div/0
    if (targetBaud <= 0 || pclk <= 0) {
        setResults(0, 0, 0);
        return;
    }

    // Ideal Divider
    const idealDiv = pclk / (oversampling * targetBaud);

    let usedDiv = 0;

    // MCU Rounding Logic
    if (selDivType.value === 'int') {
        // Standard Integer Divider: Round to nearest
        usedDiv = Math.round(idealDiv);
        if (usedDiv < 1) usedDiv = 1;
    } else if (selDivType.value === 'frac4') {
        // Fractional 4-bit (e.g. STM32 / PL011)
        // Fixed point 12.4 usually
        // Algorithm: Multiply by 16, round, divide by 16
        const steps = 16;
        let raw = Math.round(idealDiv * steps);
        if (raw < steps) raw = steps; // Min div 1
        usedDiv = raw / steps;
    }

    // Calculate Actual Values
    const actualBaud = pclk / (oversampling * usedDiv);

    // Error % ( (Actual - Target) / Target ) * 100
    // We display absolute usually, but signed is nice to know fast/slow
    const errPct = ((actualBaud - targetBaud) / targetBaud) * 100;

    setResults(usedDiv, actualBaud, errPct);
}

function setResults(div, actual, err) {
    if (div === 0) {
        resDiv.textContent = "-";
        resActual.textContent = "-";
        resError.textContent = "-";
        return;
    }

    resDiv.textContent = div.toFixed(selDivType.value === 'int' ? 0 : 4);
    resActual.textContent = Math.round(actual).toLocaleString();

    const absErr = Math.abs(err);
    const sign = err > 0 ? "+" : (err < 0 ? "-" : ""); // Explicit sign is helpful

    resError.textContent = sign + absErr.toFixed(2) + "%";

    // Visuals
    let color = '#3fb950'; // Green
    let status = 'OK';
    let badgeClass = 'status-ok';

    if (absErr > 5) {
        color = '#f85149'; // Red
        status = 'FAIL';
        badgeClass = 'status-fail';
    } else if (absErr > 2) {
        color = '#d29922'; // Amber
        status = 'RISKY';
        badgeClass = 'status-warn';
    }

    // Update Status Badge
    resStatus.textContent = status;
    resStatus.className = `status-badge ${badgeClass}`; // Reset class

    // Update Bar
    // Max scale 10%
    const barWidth = Math.min(100, (absErr / 5) * 100);
    visError.style.width = barWidth + "%";
    visError.style.backgroundColor = color;

    // Text Color
    resError.style.color = color;
}

init();
