// Flash & RAM Usage Logic

function updateUsage(type) {
    const totalInput = document.getElementById(`${type}Total`);
    const usedInput = document.getElementById(`${type}Used`);
    const unitSelect = document.getElementById(`${type}Unit`);
    const bar = document.getElementById(`${type}Bar`);
    const text = document.getElementById(`${type}Text`);
    const remainingText = document.getElementById(`${type}Remaining`);
    const warning = document.getElementById(`${type}Warning`);

    const totalKB = parseFloat(totalInput.value) || 0;
    let usedVal = parseFloat(usedInput.value) || 0;

    // Convert used to KB if in bytes
    if (unitSelect.value === 'bytes') {
        usedVal = usedVal / 1024;
    }

    if (totalKB <= 0) return;

    const percent = (usedVal / totalKB) * 100;
    const remainingKB = totalKB - usedVal;

    // Update Bar
    const clampedPercent = Math.min(Math.max(percent, 0), 100);
    bar.style.width = `${clampedPercent}%`;
    text.textContent = `${percent.toFixed(1)}%`;

    // Colors
    if (percent > 90) {
        bar.style.backgroundColor = 'var(--color-error)'; // Red
        warning.style.display = 'inline';
    } else if (percent > 80) {
        bar.style.backgroundColor = 'var(--color-warning)'; // Amber
        warning.style.display = 'inline';
    } else {
        bar.style.backgroundColor = 'var(--color-success)'; // Green
        warning.style.display = 'none';
    }

    remainingText.textContent = `${remainingKB.toFixed(2)} KB`;
}

// Hook up listeners
['flash', 'ram'].forEach(type => {
    document.getElementById(`${type}Total`).addEventListener('input', () => updateUsage(type));
    document.getElementById(`${type}Used`).addEventListener('input', () => updateUsage(type));
    document.getElementById(`${type}Unit`).addEventListener('change', () => updateUsage(type));
    // Init
    updateUsage(type);
});
