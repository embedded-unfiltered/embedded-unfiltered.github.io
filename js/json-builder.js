// JSON Builder Logic

const jsonInput = document.getElementById('jsonInput');
const jsonPreview = document.getElementById('jsonPreview');
const byteSizeDisplay = document.getElementById('byteSize');
const charCountDisplay = document.getElementById('charCount');
const formatBtn = document.getElementById('formatBtn');
const minifyBtn = document.getElementById('minifyBtn');

function update() {
    const raw = jsonInput.value;

    try {
        // Try to parse to ensure validity
        const obj = JSON.parse(raw);

        // Create minified version
        const minified = JSON.stringify(obj);

        jsonPreview.value = minified;
        jsonInput.style.borderColor = 'var(--color-border)';

        // Calculate size
        const encoder = new TextEncoder();
        const bytes = encoder.encode(minified).length;

        byteSizeDisplay.textContent = `${bytes} bytes`;
        charCountDisplay.textContent = `${minified.length} chars`;

    } catch (e) {
        jsonPreview.value = "Invalid JSON";
        byteSizeDisplay.textContent = "-";
        charCountDisplay.textContent = "-";
        jsonInput.style.borderColor = 'var(--color-error)';
    }
}

formatBtn.addEventListener('click', () => {
    try {
        const obj = JSON.parse(jsonInput.value);
        jsonInput.value = JSON.stringify(obj, null, 4);
        update();
    } catch (e) { }
});

minifyBtn.addEventListener('click', () => {
    try {
        const obj = JSON.parse(jsonInput.value);
        jsonInput.value = JSON.stringify(obj);
        update();
    } catch (e) { }
});

jsonInput.addEventListener('input', update);
update(); // Init
