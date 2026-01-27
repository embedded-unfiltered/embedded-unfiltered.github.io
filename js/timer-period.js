// Timer Period Logic

const clockFreqInput = document.getElementById('clockFreq');
const clockUnitSelect = document.getElementById('clockUnit');
const prescalerInput = document.getElementById('prescaler');
const periodInput = document.getElementById('period');

const timerFreqDisplay = document.getElementById('timerFreq');
const resultTimeDisplay = document.getElementById('resultTime');
const invertFreqDisplay = document.getElementById('invertFreq');

function calc() {
    let clock = parseFloat(clockFreqInput.value) || 0;
    const unit = clockUnitSelect.value;

    // Normalize to Hz
    if (unit === 'MHz') clock *= 1000000;
    if (unit === 'kHz') clock *= 1000;

    const prescaler = parseFloat(prescalerInput.value) || 1;
    const periodCount = parseFloat(periodInput.value) || 0;
    // Usually Count is Size. E.g. period=1000 means it counts 0..999 or 0..1000 depending on timer.
    // Standard formula: F_timer = F_clk / Prescaler.
    // T_overflow = (Period * Prescaler) / F_clk ??? 
    // Or: Timer count rate = F_clk / Prescaler.
    // Time per Tick = 1 / (F_clk / Prescaler) = Prescaler / F_clk.
    // Total Time = Time per Tick * (Period). 
    // Note: Some timers are Period+1. We'll use "Reload Value" literally as the count depth.

    if (clock === 0 || prescaler === 0) return;

    const tickFreq = clock / prescaler;
    const totalTimeSec = periodCount / tickFreq;

    // Formatting
    if (tickFreq > 1000000) timerFreqDisplay.textContent = (tickFreq / 1000000).toFixed(3) + " MHz";
    else if (tickFreq > 1000) timerFreqDisplay.textContent = (tickFreq / 1000).toFixed(3) + " kHz";
    else timerFreqDisplay.textContent = tickFreq.toFixed(3) + " Hz";

    if (totalTimeSec < 0.000001) resultTimeDisplay.textContent = (totalTimeSec * 1000000000).toFixed(2) + " ns";
    else if (totalTimeSec < 0.001) resultTimeDisplay.textContent = (totalTimeSec * 1000000).toFixed(2) + " \u00B5s";
    else if (totalTimeSec < 1) resultTimeDisplay.textContent = (totalTimeSec * 1000).toFixed(4) + " ms";
    else resultTimeDisplay.textContent = totalTimeSec.toFixed(4) + " s";

    // Invert (Frequency of overflow)
    const freq = 1 / totalTimeSec;
    if (freq > 1000000) invertFreqDisplay.textContent = (freq / 1000000).toFixed(3) + " MHz";
    else if (freq > 1000) invertFreqDisplay.textContent = (freq / 1000).toFixed(3) + " kHz";
    else invertFreqDisplay.textContent = freq.toFixed(3) + " Hz";
}

[clockFreqInput, clockUnitSelect, prescalerInput, periodInput].forEach(el => el.addEventListener('input', calc));
calc();
