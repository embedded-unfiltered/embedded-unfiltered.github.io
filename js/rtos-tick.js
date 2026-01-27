// RTOS Tick Logic

const hzInput = document.getElementById('hz');
const tickTimeDisplay = document.getElementById('tickTime');
const msInput = document.getElementById('msInput');
const msToTicksDisplay = document.getElementById('msToTicks');
const ticksInput = document.getElementById('ticksInput');
const ticksToMsDisplay = document.getElementById('ticksToMs');

function calc() {
    const hz = parseFloat(hzInput.value) || 1000;
    if (hz <= 0) return;

    // Time per tick
    const msPerTick = 1000 / hz;

    if (msPerTick < 1) {
        tickTimeDisplay.textContent = `${(msPerTick * 1000).toFixed(2)} \u00B5s`;
    } else {
        tickTimeDisplay.textContent = `${msPerTick.toFixed(3)} ms`;
    }

    // Convert
    const ms = parseFloat(msInput.value) || 0;
    const ticksFromMs = Math.round(ms / msPerTick); // Ceiling or Floor? Usually round to nearest or ceil for timeout.
    // pdMS_TO_TICKS usually does round up logic or integer math. We'll round.

    msToTicksDisplay.textContent = ticksFromMs; // pdMS_TO_TICKS(ms)

    const ticks = parseFloat(ticksInput.value) || 0;
    const msFromTicks = ticks * msPerTick;

    ticksToMsDisplay.textContent = msFromTicks.toFixed(2);
}

[hzInput, msInput, ticksInput].forEach(el => el.addEventListener('input', calc));
calc();
