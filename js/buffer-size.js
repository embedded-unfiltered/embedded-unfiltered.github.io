// Buffer Size Calculator Logic

const numElementsInput = document.getElementById('numElements');
const elementSizeInput = document.getElementById('elementSize');
const totalBytesDisplay = document.getElementById('totalBytes');
const sizeKBDisplay = document.getElementById('sizeKB');
const sizeMBDisplay = document.getElementById('sizeMB');

function calculateBufferSize() {
    const numElements = parseInt(numElementsInput.value) || 0;
    const elementSize = parseInt(elementSizeInput.value) || 0;

    const totalBytes = numElements * elementSize;
    const sizeKB = totalBytes / 1024;
    const sizeMB = sizeKB / 1024;

    totalBytesDisplay.textContent = totalBytes.toLocaleString();
    sizeKBDisplay.textContent = sizeKB.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' KB';
    sizeMBDisplay.textContent = sizeMB.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 }) + ' MB';
}

// Event Listeners
numElementsInput.addEventListener('input', calculateBufferSize);
elementSizeInput.addEventListener('input', calculateBufferSize);
