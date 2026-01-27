// String Length Calculator Logic

const stringInput = document.getElementById('stringInput');
const charCountDisplay = document.getElementById('charCount');
const byteCountDisplay = document.getElementById('byteCount');

function calculateLength() {
    const text = stringInput.value;

    // 1. Character Count (Code units)
    // Simply length of the string in JS (UTF-16 code units usually, but good enough proxy for "chars" unless using surrogates)
    // For a more robust "grapheme" count we'd need Intl.Segmenter, but prompt asked for simple "Character count".
    // Let's stick to .length for now as it's standard behavior for "char count" in most editors.
    // Actually, let's allow for spread operator to count code points effectively for emojis.
    const charCount = [...text].length; 

    // 2. UTF-8 Byte Length
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    const byteCount = bytes.length;

    // Update UI
    charCountDisplay.textContent = charCount.toLocaleString();
    byteCountDisplay.textContent = byteCount.toLocaleString();
}

// Event Listeners
stringInput.addEventListener('input', calculateLength);
