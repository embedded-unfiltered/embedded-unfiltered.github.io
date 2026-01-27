// Watchdog Logic

const lsiInput = document.getElementById('lsi');
const prescalerSelect = document.getElementById('prescaler');
const reloadInput = document.getElementById('reload');
const timeoutDisplay = document.getElementById('timeout');
const minTimeoutDisplay = document.getElementById('minTimeout');
const maxTimeoutDisplay = document.getElementById('maxTimeout');

function calc() {
    const lsi = (parseFloat(lsiInput.value) || 32) * 1000; // Hz
    const psc = parseInt(prescalerSelect.value);
    const rlr = parseInt(reloadInput.value) || 0;

    if (lsi === 0) return;

    // Timeout = (Prescaler * (Reload + 1)) / LSI_Freq
    // Or sometimes just Reload/Freq. STM32 IWDG is P * (R+1) / LSI roughly? 
    // Usually T = (PSC * RLR) / LSI is close enough, but +1 is technically correct for counters.

    // Formula: T = 1 / (LSI / PSC) * RLR
    // = (PSC / LSI) * RLR

    function getMs(count) {
        return ((psc / lsi) * count) * 1000;
    }

    const t_ms = getMs(rlr);

    // For Min/Max, assume 12-bit (0..4095) as typical example, or let user decide?
    // We'll just show current. And maybe max of current input max?
    // Let's assume 4095 (12-bit) typical if not specified, but we can't guess.
    // Just calculate specific value provided.

    timeoutDisplay.textContent = t_ms.toFixed(2) + " ms";

    // Ranges for this Prescaler
    const minMs = getMs(0); // or 1? WDT usually resets at 0. So timeout is effectively 0->Reset? 
    // STM32 Min timeout is usually RLR=0.
    const maxMs = getMs(4095); // 12-bit

    minTimeoutDisplay.textContent = minMs.toFixed(3) + " ms (RLR=0)";
    maxTimeoutDisplay.textContent = maxMs.toFixed(2) + " ms (RLR=4095)";
}

[lsiInput, prescalerSelect, reloadInput].forEach(el => el.addEventListener('input', calc));
calc();
