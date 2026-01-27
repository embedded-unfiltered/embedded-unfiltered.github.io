/**
 * Epoch Converter & RTC Debugger
 * Deterministic, offline, embedded-focused.
 */

// DOM Elements
const inEpoch = document.getElementById('inputEpoch');
const inDate = document.getElementById('inputDate');
const inTime = document.getElementById('inputTime');
const inTz = document.getElementById('inputTz');

const displayCurrent = document.getElementById('currentEpochDisplay');
const btnRefresh = document.getElementById('btnRefreshCurrent');

const outIso = document.getElementById('resultIso');
const outRel = document.getElementById('resultRelative');
const outStruct = document.getElementById('resultStruct');
const outHex = document.getElementById('resultHex');
const outInt32 = document.getElementById('statusInt32');
const outUint32 = document.getElementById('statusUint32');

const warn32 = document.getElementById('epochWarning32');

const btnCopyIso = document.getElementById('btnCopyIso');
const btnCopyStruct = document.getElementById('btnCopyStruct');

// State
let currentlyEditing = null; // 'epoch' or 'human'

// --- Constants ---
const INT32_MAX = 2147483647;
const UINT32_MAX = 4294967295;

// --- Init ---
function init() {
    // Set initial to current time
    const now = Math.floor(Date.now() / 1000);
    inEpoch.value = now;
    displayCurrent.textContent = now;

    updateFromEpoch(); // Initial render

    // Listeners
    inEpoch.addEventListener('input', () => {
        currentlyEditing = 'epoch';
        updateFromEpoch();
    });

    [inDate, inTime, inTz].forEach(el => {
        el.addEventListener('input', () => {
            currentlyEditing = 'human';
            updateFromHuman();
        });
    });

    // Refresh Current Button
    btnRefresh.addEventListener('click', () => {
        const n = Math.floor(Date.now() / 1000);
        displayCurrent.textContent = n;
        // Optionally update input if user wants? 
        // Better behavior: Just update the reference display, don't overwrite user work unless empty
        if (!inEpoch.value) {
            inEpoch.value = n;
            updateFromEpoch();
        }
    });

    // Copy Buttons
    btnCopyIso.addEventListener('click', () => copyText(outIso.textContent));
    btnCopyStruct.addEventListener('click', () => copyText(outStruct.textContent));
}

// --- Logic ---

function updateFromEpoch() {
    const val = parseInt(inEpoch.value, 10);
    if (isNaN(val)) {
        clearOutputs();
        return;
    }

    const dateObj = new Date(val * 1000);

    // Sync Human Inputs (Avoid loops if currently editing human)
    if (currentlyEditing !== 'human') {
        const isUtc = inTz.value === 'UTC';

        // Format YYYY-MM-DD
        const y = isUtc ? dateObj.getUTCFullYear() : dateObj.getFullYear();
        const m = (isUtc ? dateObj.getUTCMonth() : dateObj.getMonth()) + 1;
        const d = isUtc ? dateObj.getUTCDate() : dateObj.getDate();

        const yStr = y.toString().padStart(4, '0');
        const mStr = m.toString().padStart(2, '0');
        const dStr = d.toString().padStart(2, '0');
        inDate.value = `${yStr}-${mStr}-${dStr}`;

        // Format HH:MM:SS
        const hh = (isUtc ? dateObj.getUTCHours() : dateObj.getHours()).toString().padStart(2, '0');
        const mm = (isUtc ? dateObj.getUTCMinutes() : dateObj.getMinutes()).toString().padStart(2, '0');
        const ss = (isUtc ? dateObj.getUTCSeconds() : dateObj.getSeconds()).toString().padStart(2, '0');
        inTime.value = `${hh}:${mm}:${ss}`;
    }

    renderResults(val, dateObj);
}

function updateFromHuman() {
    if (!inDate.value) return;

    // Construct Date
    // Date input: YYYY-MM-DD
    // Time input: HH:MM:SS (or empty)

    const timeStr = inTime.value || '00:00:00';
    const dateTimeStr = `${inDate.value}T${timeStr}`;

    let dateObj;
    if (inTz.value === 'UTC') {
        // Append Z to force UTC parsing
        dateObj = new Date(dateTimeStr + 'Z');
    } else {
        // Local parse
        dateObj = new Date(dateTimeStr);
    }

    if (isNaN(dateObj.getTime())) return;

    const epoch = Math.floor(dateObj.getTime() / 1000);

    // Sync Epoch Input
    if (currentlyEditing !== 'epoch') {
        inEpoch.value = epoch;
    }

    renderResults(epoch, dateObj);
}

function renderResults(epoch, dateObj) {
    // 1. ISO Output
    // Always show UTC ISO for engineering clarity
    try {
        outIso.textContent = dateObj.toISOString().replace('.000', '');
    } catch (e) {
        outIso.textContent = "Invalid Date";
    }

    // 2. Relative Time
    const now = Math.floor(Date.now() / 1000);
    const diff = now - epoch;
    let relText = "";
    if (diff === 0) relText = "Now";
    else if (diff > 0) relText = `${formatDuration(diff)} ago`;
    else relText = `in ${formatDuration(-diff)}`;
    outRel.textContent = relText;

    // 3. Struct TM (UTC)
    const y = dateObj.getUTCFullYear();
    const tm_y = y - 1900;
    const tm_m = dateObj.getUTCMonth(); // 0-11
    const tm_d = dateObj.getUTCDate();
    const tm_w = dateObj.getUTCDay();   // 0=Sun

    const structCode = `// C structure (UTC)
struct tm t;
t.tm_year = ${tm_y};   // ${y}
t.tm_mon  = ${tm_m};    // ${getMonthName(tm_m)}
t.tm_mday = ${tm_d};
t.tm_hour = ${dateObj.getUTCHours()};
t.tm_min  = ${dateObj.getUTCMinutes()};
t.tm_sec  = ${dateObj.getUTCSeconds()};
t.tm_wday = ${tm_w};    // ${getDayName(tm_w)}
t.tm_isdst= 0;     // UTC has no DST`;

    outStruct.textContent = structCode;

    // 4. Analysis
    // Hex
    let hex = (epoch >>> 0).toString(16).toUpperCase(); // unsigned shift for display
    outHex.textContent = '0x' + hex.padStart(8, '0');

    // 32-bit Checks
    if (epoch > INT32_MAX || epoch < -2147483648) {
        outInt32.textContent = "OVERFLOW";
        outInt32.style.color = "var(--color-error)";
        warn32.style.display = "block";
    } else {
        outInt32.textContent = "Safe";
        outInt32.style.color = "var(--color-success)";
        warn32.style.display = "none";
    }

    if (epoch > UINT32_MAX || epoch < 0) {
        outUint32.textContent = "OVERFLOW";
        outUint32.style.color = "var(--color-error)";
    } else {
        outUint32.textContent = "Safe";
        outUint32.style.color = "var(--color-success)";
    }
}

function clearOutputs() {
    outIso.textContent = "---";
    outStruct.textContent = "// Invalid Input";
}

// --- Helpers ---

function getMonthName(idx) {
    const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return m[idx] || "";
}

function getDayName(idx) {
    const d = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return d[idx] || "";
}

function formatDuration(sec) {
    if (sec < 60) return `${sec}s`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
    return `${Math.floor(sec / 86400)}d`;
}

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        // Could add visual feedback toast here
    } catch (err) {
        console.error('Copy failed', err);
    }
}

init();
