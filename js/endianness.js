// Endianness Logic

const hexInput = document.getElementById('hexInput');
const littleContainer = document.getElementById('littleContainer');
const bigContainer = document.getElementById('bigContainer');

function updateViz() {
    let cleanHex = hexInput.value.trim().toLowerCase();
    if (cleanHex.startsWith('0x')) cleanHex = cleanHex.substring(2);

    // Pad to even length (full bytes)
    if (cleanHex.length % 2 !== 0) cleanHex = '0' + cleanHex;

    // Split into bytes
    const bytes = [];
    for (let i = 0; i < cleanHex.length; i += 2) {
        bytes.push(cleanHex.substring(i, i + 2).toUpperCase());
    }

    // Render Little Endian (Reverse order of bytes for display conceptually, 
    // but in memory addr 0 holds LSB. So if input is 0x1234, LSB is 34.
    // Memory: Addr 0: 34, Addr 1: 12.
    // So we show the array REVERSED relative to the hex string reading direction for LE memory layout)

    // Actually, let's just show Address 0 -> N

    // LSB is at end of string.
    // 0x12345678 -> 12, 34, 56, 78
    // LSB = 78

    // Little Endian: Addr 0 = 78, Addr 1 = 56, Addr 2 = 34, Addr 3 = 12
    const leBytes = [...bytes].reverse();
    renderGrid(littleContainer, leBytes);

    // Big Endian: Addr 0 = 12, Addr 1 = 34, Addr 2 = 56, Addr 3 = 78
    const beBytes = bytes;
    renderGrid(bigContainer, beBytes);
}

function renderGrid(container, bytes) {
    container.innerHTML = '';
    bytes.forEach((byte, idx) => {
        const cell = document.createElement('div');
        cell.className = 'byte-cell';

        const label = document.createElement('span');
        label.className = 'byte-label';
        label.textContent = `Addr +${idx}`;

        const val = document.createElement('div');
        val.className = 'byte-val';
        val.textContent = byte;

        cell.appendChild(label);
        cell.appendChild(val);
        container.appendChild(cell);
    });
}

hexInput.addEventListener('input', updateViz);
updateViz();
