/**
 * UUID Generator (v4 & v7)
 * Implements RFC 9562 for v7 and standard crypto.randomUUID for v4.
 */

// Elements
const genBtn = document.getElementById('genBtn');
const genCountInput = document.getElementById('genCount');
const previewContainer = document.getElementById('previewContainer');
const previewCount = document.getElementById('previewCount');
const codeOutput = document.getElementById('codeOutput');

// Inputs
const radioVer = document.getElementsByName('uuidVer');
const radioByteOrder = document.getElementsByName('byteOrder');
const checkFmtString = document.getElementById('fmtString');
const checkFmtCArray = document.getElementById('fmtCArray');
const checkFmtStruct = document.getElementById('fmtStruct');

// Init
window.onload = () => {
    genBtn.onclick = runGeneration;
    document.getElementById('copyPreviewBtn').onclick = copyPreviewList;
    // Generate one on load
    runGeneration();
};

function getSelectedVersion() {
    for (const r of radioVer) if (r.checked) return r.value;
    return 'v4';
}

function getOutputOrder() {
    for (const r of radioByteOrder) if (r.checked) return r.value;
    return 'big';
}

function runGeneration() {
    const ver = getSelectedVersion();
    const count = Math.min(Math.max(parseInt(genCountInput.value) || 1, 1), 100);
    const uuids = [];

    // Generate
    for (let i = 0; i < count; i++) {
        if (ver === 'v4') {
            uuids.push(generateV4());
        } else {
            uuids.push(generateV7());
        }
    }

    // Render Preview
    renderPreview(uuids, ver);

    // Render Code
    renderCode(uuids, ver);
}

// --- Generators ---

function generateV4() {
    // Platform agnostic standard v4
    if (crypto.randomUUID) {
        // Parse string to bytes to ensure we have raw data for Code Gen
        const str = crypto.randomUUID();
        return parseUUIDString(str);
    } else {
        // Fallback
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
        bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
        return { bytes, str: bytesToUUID(bytes) };
    }
}

function generateV7() {
    // RFC 9562 v7
    // 0-47: Unix TS ms
    // 48-51: ver (0111)
    // 52-63: rand_a
    // 64-65: var (10)
    // 66-127: rand_b

    const bytes = new Uint8Array(16);
    const ts = Date.now();

    // Fill Timestamp (Big Endian 48-bit)
    bytes[0] = (ts / 1099511627776) & 0xFF;
    bytes[1] = (ts / 4294967296) & 0xFF;
    bytes[2] = (ts / 16777216) & 0xFF;
    bytes[3] = (ts / 65536) & 0xFF;
    bytes[4] = (ts / 256) & 0xFF;
    bytes[5] = ts & 0xFF;

    // Fill Randomness
    const rnd = new Uint8Array(10);
    crypto.getRandomValues(rnd); // Fill temp buffer

    // Byte 6: ver (4) | rand_a (4) -> taking from rnd[0]
    // Ver is 7 (0111)
    bytes[6] = 0x70 | (rnd[0] & 0x0F);

    // Byte 7: rand_a (8) -> rnd[1]
    bytes[7] = rnd[1];

    // Byte 8: var (2) | rand_b (6) -> rnd[2]
    // Var is 2 (10xx) -> 0x80
    bytes[8] = 0x80 | (rnd[2] & 0x3F);

    // Bytes 9-15: rand_b -> rnd[3..9]
    for (let i = 0; i < 7; i++) {
        bytes[9 + i] = rnd[3 + i];
    }

    return { bytes, str: bytesToUUID(bytes), ts: ts };
}

// --- Helpers ---

function parseUUIDString(str) {
    const clean = str.replace(/-/g, '');
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
        bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
    }
    return { bytes, str };
}

function bytesToUUID(bytes) {
    const hex = [];
    for (let i = 0; i < 16; i++) {
        hex.push(bytes[i].toString(16).padStart(2, '0'));
    }
    return [
        hex.slice(0, 4).join(''),
        hex.slice(4, 6).join(''),
        hex.slice(6, 8).join(''),
        hex.slice(8, 10).join(''),
        hex.slice(10, 16).join('')
    ].join('-');
}

// --- Renderers ---

function renderPreview(uuids, ver) {
    previewContainer.innerHTML = '';
    previewCount.textContent = `${uuids.length} Generated`;

    uuids.forEach((u, index) => {
        const card = document.createElement('div');
        card.className = 'uuid-card';

        // Parse String for visualization
        // 8-4-4-4-12
        const parts = u.str.split('-');

        // Highlight logic
        let html = `<div style="display:flex; gap:12px; align-items:baseline;">`;
        // Numbering (1. 2. 3...)
        html += `<span style="color:var(--color-text-dim); font-size:0.9rem; width:24px;">${index + 1}.</span>`;
        html += `<div class="uuid-string">`;

        if (ver === 'v7') {
            // Part 1 (8 chars) is Time High
            // Part 2 (4 chars) is Time Low
            // Part 3 (4 chars): 1st char is Ver
            // Part 4 (4 chars): 1st char (top 2 bits) is Var
            html += `<span class="part-time">${parts[0]}</span>-`;
            html += `<span class="part-time">${parts[1]}</span>-`;

            // Ver
            const p3 = parts[2];
            html += `<span class="part-ver">${p3[0]}</span><span class="part-rand">${p3.substring(1)}</span>-`;

            // Var
            const p4 = parts[3];
            html += `<span class="part-var">${p4[0]}</span><span class="part-rand">${p4.substring(1)}</span>-`;

            // Rand
            html += `<span class="part-rand">${parts[4]}</span>`;

        } else {
            // v4
            html += `${parts[0]}-${parts[1]}-`;
            // Ver
            const p3 = parts[2];
            html += `<span class="part-ver">${p3[0]}</span><span class="part-rand">${p3.substring(1)}</span>-`;
            // Var
            const p4 = parts[3];
            html += `<span class="part-var">${p4[0]}</span><span class="part-rand">${p4.substring(1)}</span>-`;
            // Rand
            html += `${parts[4]}`;
        }
        html += `</div></div>`;

        // Metadata
        // Metadata section removed per user request
        // html += `<div class="uuid-meta">...</div>`;

        card.innerHTML = html;
        previewContainer.appendChild(card);
    });
}

function renderCode(uuids, ver) {
    let code = `// UUID Generation Output\n// Version: ${ver.toUpperCase()}\n// Count: ${uuids.length}\n`;
    const order = getOutputOrder();

    uuids.forEach((u, idx) => {
        code += `\n`;

        // Prepare bytes based on order
        const bytes = new Uint8Array(u.bytes); // Copy
        if (order === 'little') {
            bytes.reverse(); // Full reverse for Little Endian interpretation of 128-bit int (common embedded need)
            code += `// Note: Little Endian (Reversed)\n`;
        }

        if (checkFmtString.checked) {
            code += `// ${u.str}\n`;
        }
        if (ver === 'v7' && u.ts) {
            const d = new Date(u.ts).toISOString();
            code += `// Timestamp: ${d}\n`;
        }

        if (checkFmtCArray.checked) {
            code += `const uint8_t uuid_${idx}[16] = {\n    `;
            for (let i = 0; i < 16; i++) {
                code += `0x${bytes[i].toString(16).padStart(2, '0').toUpperCase()}`;
                if (i < 15) {
                    code += ', ';
                    if ((i + 1) % 4 === 0 && i !== 15) code += ' '; // Gap every 4
                    if (i === 7) code += '\n    '; // Wrap at 8
                }
            }
            code += `\n};\n`;
        }

        if (checkFmtStruct.checked) {
            // Example generic struct
            code += `uuid_t uuid_struct_${idx} = { `;
            if (checkFmtString.checked) code += `// ${u.str}`;
            code += `\n    .bytes = { `;
            for (let i = 0; i < 16; i++) {
                code += `0x${bytes[i].toString(16).padStart(2, '0').toUpperCase()}`;
                if (i < 15) code += ', ';
            }
            code += ` }\n};\n`;
        }
    });

    codeOutput.value = code;
}

function copyCode() {
    codeOutput.select();
    navigator.clipboard.writeText(codeOutput.value);
}

function copyPreviewList() {
    // Generate a clean list of just UUID strings
    // We can infer this from the generated content or just regenerate/store globally.
    // Ideally we store it. But for now, let's just grab from Code Output comments or regenerate?
    // Actually, `uuids` is local to runGeneration. Let's make it global or re-parse.
    // Simplest: Scrape the DOM or make `uuids` global state.
    // Let's rely on global state for cleaner arch.

    // For now, I'll just grab the UUID strings from the cards to avoid state refactor complexity
    const cards = document.querySelectorAll('.uuid-card .uuid-string');
    let text = '';
    cards.forEach(c => {
        text += c.textContent.replace(/\n| /g, '') + '\n';
    });
    navigator.clipboard.writeText(text);

    const btn = document.getElementById('copyPreviewBtn');
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = original, 1500);
}
