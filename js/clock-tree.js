/**
 * MCU Clock Tree Calculator
 * Generic PLL Model: Source -> /M -> xN -> /P -> AHB -> APB
 */

// DOM
const inHsi = document.getElementById('inHsi');
const inHse = document.getElementById('inHse');
const selSource = document.getElementById('selSource');
const outPllIn = document.getElementById('outPllIn');

const pllM = document.getElementById('pllM');
const pllN = document.getElementById('pllN');
const pllP = document.getElementById('pllP');
const outSysClk = document.getElementById('outSysClk');
const warnPll = document.getElementById('warnPll');
const errPll = document.getElementById('errPll');

const preAhb = document.getElementById('preAhb');
const outHclk = document.getElementById('outHclk');

const preApb1 = document.getElementById('preApb1');
const outPclk1 = document.getElementById('outPclk1');
const mulApb1 = document.getElementById('mulApb1');
const outTim1 = document.getElementById('outTim1');

const preApb2 = document.getElementById('preApb2');
const outPclk2 = document.getElementById('outPclk2');
const mulApb2 = document.getElementById('mulApb2');
const outTim2 = document.getElementById('outTim2');

// Loop prevention
let isUpdating = false;

// --- Init ---
function init() {
    // Listeners
    [inHsi, inHse, selSource].forEach(el => el.addEventListener('input', updateCalc));
    [pllM, pllN, pllP].forEach(el => el.addEventListener('input', updateCalc));
    [preAhb, preApb1, preApb2].forEach(el => el.addEventListener('input', updateCalc));

    updateCalc();
}

// --- Logic ---

function updateCalc() {
    if (isUpdating) return;
    isUpdating = true;

    // Reset warnings
    warnPll.style.display = 'none';
    errPll.style.display = 'none';

    // 1. Source Mux
    const hsi = parseFloat(inHsi.value) || 0;
    const hse = parseFloat(inHse.value) || 0;

    let pllInFreq = 0;
    if (selSource.value === 'HSI') {
        pllInFreq = hsi;
        inHsi.style.color = "var(--color-signal-high)";
        inHse.style.color = "var(--color-text-secondary)";
    } else {
        pllInFreq = hse;
        inHsi.style.color = "var(--color-text-secondary)";
        inHse.style.color = "var(--color-signal-high)";
    }

    outPllIn.textContent = fmtFreq(pllInFreq);

    // 2. PLL Stage
    const m = parseFloat(pllM.value) || 1;
    const n = parseFloat(pllN.value) || 1;
    const p = parseFloat(pllP.value) || 1;

    // Validations
    if (m <= 0 || p <= 0 || n <= 0) {
        showError("Dividers/Multipliers must be > 0");
        setAllOutputs(0);
        isUpdating = false;
        return;
    }

    const vcoIn = pllInFreq / m;

    // Warn if VCO Input is weird (typically 1-2 MHz for traditional PLLs, but varies)
    // We'll just be generic.

    const vcoOut = vcoIn * n;
    const sysClk = vcoOut / p;

    outSysClk.textContent = fmtFreq(sysClk);

    // 3. AHB (HCLK)
    const ahbDiv = parseFloat(preAhb.value) || 1;
    const hclk = sysClk / ahbDiv;
    outHclk.textContent = fmtFreq(hclk);

    // 4. APB1 (Low Speed)
    const apb1Div = parseFloat(preApb1.value) || 1;
    const pclk1 = hclk / apb1Div;
    outPclk1.textContent = fmtFreq(pclk1);

    // Timer 1 Logic: If div=1, x1. Else x2.
    const tim1Mult = (apb1Div === 1) ? 1 : 2;
    mulApb1.textContent = tim1Mult;
    outTim1.textContent = fmtFreq(pclk1 * tim1Mult);

    // 5. APB2 (High Speed)
    const apb2Div = parseFloat(preApb2.value) || 1;
    const pclk2 = hclk / apb2Div;
    outPclk2.textContent = fmtFreq(pclk2);

    // Timer 2 Logic
    const tim2Mult = (apb2Div === 1) ? 1 : 2;
    mulApb2.textContent = tim2Mult;
    outTim2.textContent = fmtFreq(pclk2 * tim2Mult);

    // 6. Generic Limits (Soft Warnings)
    checkLimits(sysClk, hclk, pclk1, pclk2);

    isUpdating = false;
}

function fmtFreq(mhz) {
    if (mhz < 0.001) return "0 MHz";
    if (Number.isInteger(mhz)) return mhz + " MHz";
    return mhz.toFixed(3) + " MHz";
}

function setAllOutputs(val) {
    const s = fmtFreq(val);
    outSysClk.textContent = s;
    outHclk.textContent = s;
    outPclk1.textContent = s;
    outPclk2.textContent = s;
    outTim1.textContent = s;
    outTim2.textContent = s;
}

function showError(msg) {
    errPll.textContent = "Error: " + msg;
    errPll.style.display = 'block';
}

function showWarning(msg) {
    // Append if multiple?
    warnPll.textContent = "Warning: " + msg;
    warnPll.style.display = 'block';
}

function checkLimits(sys, ahb, apb1, apb2) {
    // These are generic 'safety' checks, not exhaustive
    if (sys > 216) showWarning("SYSCLK > 216 MHz (Ensure MCU supports overdrive)");
    if (apb1 > 54) showWarning("APB1 > 54 MHz (Check datasheet limits)");

    // Overclocking check
    // ...
}

init();
