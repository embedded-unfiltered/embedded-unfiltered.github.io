// Encoding Logic

const asciiIn = document.getElementById('asciiInput');
const hexIn = document.getElementById('hexInput');
const base64In = document.getElementById('base64Input');

// We use active element to prevent loops
let isTyping = false;

function fromAscii() {
    if (isTyping) return;
    isTyping = true;

    const text = asciiIn.value;
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    // To Hex
    let hex = "";
    for (let b of data) {
        hex += b.toString(16).toUpperCase().padStart(2, '0') + " ";
    }
    hexIn.value = hex.trim();

    // To Base64 (Trick for unicode strings: encodeURIComponent? No, standar btoa expects binary string)
    // Correct way for UTF-8 to Base64:
    // Convert Uint8Array to binary string
    let binStr = "";
    for (let b of data) binStr += String.fromCharCode(b);
    try {
        base64In.value = btoa(binStr);
    } catch {
        base64In.value = "Error";
    }

    isTyping = false;
}

function fromHex() {
    if (isTyping) return;
    isTyping = true;

    const hexClean = hexIn.value.replace(/\s+/g, '');
    let bytes = [];
    for (let i = 0; i < hexClean.length; i += 2) {
        bytes.push(parseInt(hexClean.substr(i, 2), 16));
    }

    const arr = new Uint8Array(bytes);
    const decoder = new TextDecoder();
    asciiIn.value = decoder.decode(arr);

    let binStr = "";
    for (let b of arr) binStr += String.fromCharCode(b);
    try {
        base64In.value = btoa(binStr);
    } catch {
        base64In.value = "Error";
    }

    isTyping = false;
}

function fromBase64() {
    if (isTyping) return;
    isTyping = true;

    try {
        const binStr = atob(base64In.value);
        const len = binStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binStr.charCodeAt(i);
        }

        const decoder = new TextDecoder();
        asciiIn.value = decoder.decode(bytes);

        let hex = "";
        for (let b of bytes) {
            hex += b.toString(16).toUpperCase().padStart(2, '0') + " ";
        }
        hexIn.value = hex.trim();

    } catch {
        // Invalid base64
    }

    isTyping = false;
}


asciiIn.addEventListener('input', () => { setTimeout(fromAscii, 0); });
hexIn.addEventListener('input', () => { setTimeout(fromHex, 0); });
base64In.addEventListener('input', () => { setTimeout(fromBase64, 0); });
