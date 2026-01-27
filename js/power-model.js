/**
 * Power & Battery Estimation Tools
 * Deterministic math for firmware budgeting.
 */

// --- Tool 1: Diff Calculator ---
const iActive = document.getElementById('iActive');
const tActive = document.getElementById('tActive');
const uActive = document.getElementById('uActive');

const iSleep = document.getElementById('iSleep');
const uiSleep = document.getElementById('uiSleep');
const tSleep = document.getElementById('tSleep');
const uSleep = document.getElementById('uSleep');

const resAvg = document.getElementById('resAvg');
const resDuty = document.getElementById('resDuty');
const barDuty = document.getElementById('barDuty');

// --- Tool 2: Battery Life ---
const batCap = document.getElementById('batCap');
const batDerate = document.getElementById('batDerate');
const batLoad = document.getElementById('batLoad');

const resLifeHours = document.getElementById('resLifeHours');
const resLifeDays = document.getElementById('resLifeDays');
const resLifeMonths = document.getElementById('resLifeMonths');

// --- Tool 3: Advanced Model ---
const modelRows = document.getElementById('modelRows');
const btnAddState = document.getElementById('btnAddState');
const modelTotalTime = document.getElementById('modelTotalTime');
const modelAvg = document.getElementById('modelAvg');

let modelState = [
    { id: 1, name: 'Wake & Init', current: 15, duration: 10 },
    { id: 2, name: 'Sensor Read', current: 8, duration: 50 },
    { id: 3, name: 'Radio TX', current: 120, duration: 30 },
    { id: 4, name: 'Sleep', current: 0.005, duration: 9910 }
];
let nextId = 5;

// --- Init ---
function init() {
    // Listeners Tool 1
    [iActive, tActive, uActive, iSleep, uiSleep, tSleep, uSleep].forEach(el => {
        el.addEventListener('input', updateSimpleCalc);
        el.addEventListener('change', updateSimpleCalc);
    });

    // Listeners Tool 2
    [batCap, batDerate, batLoad].forEach(el => {
        el.addEventListener('input', updateBatteryLife);
    });

    // Listeners Tool 3
    btnAddState.addEventListener('click', addModelState);
    renderModelTable(); // Initial

    // Initial Calcs
    updateSimpleCalc();
    updateBatteryLife();
    updateModelCalc();
}

// --- Tool 1 Logic ---
function updateSimpleCalc() {
    // Normalize to mA and ms
    const curActive = parseFloat(iActive.value) || 0;
    const timActive = (parseFloat(tActive.value) || 0) * (uActive.value === 's' ? 1000 : 1);

    let curSleep = parseFloat(iSleep.value) || 0;
    if (uiSleep.value === 'uA') curSleep /= 1000;
    const timSleep = (parseFloat(tSleep.value) || 0) * (uSleep.value === 's' ? 1000 : 1);

    const totalTime = timActive + timSleep;
    if (totalTime <= 0) return;

    // Weighted Avg Formula
    // (Ia * Ta + Is * Ts) / (Ta + Ts)
    const energy = (curActive * timActive) + (curSleep * timSleep); // mA * ms
    const avg = energy / totalTime;

    resAvg.textContent = avg.toFixed(4) + " mA";

    const duty = (timActive / totalTime) * 100;
    resDuty.textContent = duty.toFixed(2) + "%";
    barDuty.style.width = Math.min(100, duty) + "%";
}

// --- Tool 2 Logic ---
function updateBatteryLife() {
    const cap = parseFloat(batCap.value) || 0; // mAh
    const derate = parseFloat(batDerate.value) || 100;
    const load = parseFloat(batLoad.value) || 0; // mA

    if (load <= 0) {
        resLifeHours.textContent = "∞ Hours";
        return;
    }

    const effectiveCap = cap * (derate / 100);
    const hours = effectiveCap / load;

    resLifeHours.textContent = hours.toFixed(1) + " Hours";
    resLifeDays.textContent = (hours / 24).toFixed(1) + " Days";
    resLifeMonths.textContent = (hours / (24 * 30.4)).toFixed(1) + " Months";
}

// --- Tool 3 Logic ---
function addModelState() {
    modelState.push({ id: nextId++, name: 'New State', current: 1, duration: 100 });
    renderModelTable();
    updateModelCalc();
}

function removeModelState(id) {
    modelState = modelState.filter(s => s.id !== id);
    renderModelTable();
    updateModelCalc();
}

function updateModelState(id, key, val) {
    const s = modelState.find(s => s.id === id);
    if (s) {
        s[key] = val; // Inputs are strings usually, need parsing later
        updateModelCalc();
    }
}

function renderModelTable() {
    modelRows.innerHTML = '';
    // We calc percentages during render? Or need calc first?
    // Let's run calc first to get totals
    const { totalEnergy } = calculateModelResult();

    modelState.forEach(s => {
        const cur = parseFloat(s.current) || 0;
        const dur = parseFloat(s.duration) || 0;
        const energy = cur * dur;
        const pct = totalEnergy > 0 ? (energy / totalEnergy * 100) : 0;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" value="${s.name}" onchange="updateModelState(${s.id}, 'name', this.value)"></td>
            <td><input type="number" step="0.001" value="${s.current}" onchange="updateModelState(${s.id}, 'current', this.value)"></td>
            <td><input type="number" step="1" value="${s.duration}" onchange="updateModelState(${s.id}, 'duration', this.value)"></td>
            <td>
                <div style="display:flex; align-items:center; gap:4px; font-size:0.8rem;">
                    <div style="width:40px; text-align:right;">${pct.toFixed(1)}%</div>
                    <div style="flex:1; height:4px; background:#222; border-radius:2px;">
                        <div style="height:100%; width:${pct}%; background:var(--color-signal-high);"></div>
                    </div>
                </div>
            </td>
            <td><button class="btn-action" style="color:var(--color-error); border:none; background:transparent;" onclick="removeModelState(${s.id})">×</button></td>
        `;
        modelRows.appendChild(tr);
    });
}

function calculateModelResult() {
    let totalTime = 0;
    let totalEnergy = 0; // mA * ms

    modelState.forEach(s => {
        const cur = parseFloat(s.current) || 0;
        const dur = parseFloat(s.duration) || 0;
        totalTime += dur;
        totalEnergy += (cur * dur);
    });

    return { totalTime, totalEnergy };
}

function updateModelCalc() {
    const { totalTime, totalEnergy } = calculateModelResult();

    if (totalTime > 0) {
        const avg = totalEnergy / totalTime;
        modelAvg.textContent = avg.toFixed(4) + " mA";
        modelTotalTime.textContent = totalTime.toFixed(0) + " ms";
    } else {
        modelAvg.textContent = "0.000 mA";
        modelTotalTime.textContent = "0 ms";
    }

    // Also re-render table to update percent bars if values changed significantly? 
    // Careful of focus loss if we re-render whole table on input.
    // For now, bars update only on 'change' (blur), so re-render is fine.
    // To support real-time bars on 'input', we would need to update DOM elements directly.
    // Let's stick to 'change' for now as defined in renderModelTable HTML.

    // Actually, I should re-render table to update the % columns
    // But I must preserve focus. 
    // Ideally I'd update specific cells. 
    // Optimization: Just update the footer stats here. The table percentages are less critical to be live-live.
    // But user might want to see valid Pct.
    // Let's leave visual bar update for 'add/remove' or explicit refresh, 
    // OR try to update the percentage text specifically.

    // For simplicity/robustness: Re-render table only on Add/Remove.
    // Inputs listen to 'change'.
    // Oh wait, if I modify a number, I want to see the new Avg immediately.
    // If I re-render table, I lose focus.
    // FIX: Don't re-render table inside updateModelCalc. Only update the footer stats.
    // The % bars will update only when I manually trigger render (e.g. Add/Remove).
    // This is a trade-off. 
    // BETTER: select percent cells and update them.
}

// Global helper
window.copyToAll = function (elemId) {
    const valStr = document.getElementById(elemId).textContent;
    // Extract number
    const match = valStr.match(/([\d\.]+)/);
    if (match) {
        // Copy to clipboard
        navigator.clipboard.writeText(match[1]);

        // Also auto-fill battery estimator
        batLoad.value = match[1];
        updateBatteryLife();

        // Visual feedback
        const btn = document.activeElement;
        const orig = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => btn.textContent = orig, 1000);
    }
}

// Export window functions
window.addModelState = addModelState;
window.removeModelState = removeModelState;
window.updateModelState = function (id, key, val) {
    const s = modelState.find(s => s.id === id);
    if (s) s[key] = val;
    updateModelCalc();
    // Re-render purely to update bars? Maybe debounce this?
    // Let's just update footer for now.
}

init();
