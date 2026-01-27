// Binary Packet Builder Logic

const packetBody = document.getElementById('packetBody');
const totalSizeDisplay = document.getElementById('totalSize');
const hexStreamDisplay = document.getElementById('hexStream');

let fields = [
    { name: 'Header', size: 1, value: '0xAA' },
    { name: 'Len', size: 1, value: '0x04' },
    { name: 'Cmd', size: 2, value: '0x1234' }
];

function render() {
    packetBody.innerHTML = '';

    fields.forEach((f, idx) => {
        const tr = document.createElement('tr');

        // Name
        const tdName = document.createElement('td');
        const inpName = document.createElement('input');
        inpName.value = f.name;
        inpName.oninput = (e) => { f.name = e.target.value; };
        tdName.appendChild(inpName);

        // Size
        const tdSize = document.createElement('td');
        const inpSize = document.createElement('input');
        inpSize.type = 'number';
        inpSize.min = 1;
        inpSize.value = f.size;
        inpSize.oninput = (e) => { f.size = parseInt(e.target.value) || 1; calc(); };
        tdSize.appendChild(inpSize);

        // Value
        const tdVal = document.createElement('td');
        const inpVal = document.createElement('input');
        inpVal.value = f.value;
        inpVal.placeholder = "0x.. or 123";
        inpVal.oninput = (e) => { f.value = e.target.value; calc(); };
        tdVal.appendChild(inpVal);

        // Action
        const tdAct = document.createElement('td');
        const btn = document.createElement('button');
        btn.textContent = 'x';
        btn.className = 'btn-sm text-error';
        btn.onclick = () => { fields.splice(idx, 1); render(); calc(); };
        tdAct.appendChild(btn);

        tr.appendChild(tdName);
        tr.appendChild(tdSize);
        tr.appendChild(tdVal);
        tr.appendChild(tdAct);
        packetBody.appendChild(tr);
    });
}

function addRow() {
    fields.push({ name: 'Data', size: 1, value: '0' });
    render();
    calc();
}

function calc() {
    let hexStream = "";
    let totalBytes = 0;

    fields.forEach(f => {
        let valStr = f.value.trim();
        let val = 0n;

        try {
            if (valStr.toLowerCase().startsWith('0x')) {
                val = BigInt(valStr);
            } else {
                val = BigInt(valStr);
            }
        } catch { val = 0n; }

        let hexPiece = val.toString(16).toUpperCase();
        // Pad to size*2 chars
        let targetLen = f.size * 2;
        if (hexPiece.length > targetLen) {
            // Warn? Truncate? Truncate high bits usually
            hexPiece = hexPiece.substring(hexPiece.length - targetLen);
        } else {
            hexPiece = hexPiece.padStart(targetLen, '0');
        }

        hexStream += hexPiece + " ";
        totalBytes += f.size;
    });

    totalSizeDisplay.textContent = `${totalBytes} bytes`;
    hexStreamDisplay.textContent = hexStream.trim();
}

render();
calc();
