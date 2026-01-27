// MQTT Calc Logic

const topicInput = document.getElementById('topic');
const payloadInput = document.getElementById('payload');
const topicLenDisplay = document.getElementById('topicLen');
const payloadLenDisplay = document.getElementById('payloadLen');
const remLenDisplay = document.getElementById('remLen');
const fixedHeaderDisplay = document.getElementById('fixedHeader');
const totalSizeDisplay = document.getElementById('totalSize');

function calc() {
    const encoder = new TextEncoder();

    // MQTT Strings are UTF-8
    const topicBytes = encoder.encode(topicInput.value).length;
    const payloadBytes = encoder.encode(payloadInput.value).length;

    // Remaining Length = Length(Variable Header) + Length(Payload)
    // Variable Header in PUBLISH (QoS 0) = Length MSB + Length LSB + Topic String
    // So 2 bytes for topic length field itself + topic bytes.
    // (Note: Packet ID field exists only for QoS > 0)

    const variableHeaderLen = 2 + topicBytes;
    const remainingLength = variableHeaderLen + payloadBytes;

    // Fixed Header: 1 Byte (Control+Flags) + Variable Byte Integer (Remaining Length)
    // Calc Variable Byte Int Size
    let varByteSize = 0;
    let val = remainingLength;
    do {
        varByteSize++;
        val = val >> 7;
    } while (val > 0)

    const fixedHeader = 1 + varByteSize;
    const total = fixedHeader + remainingLength;

    topicLenDisplay.textContent = topicBytes;
    payloadLenDisplay.textContent = payloadBytes;
    remLenDisplay.textContent = remainingLength;
    fixedHeaderDisplay.textContent = `${fixedHeader} bytes (1 Ctrl + ${varByteSize} Len)`;
    totalSizeDisplay.textContent = `${total} bytes`;
}

topicInput.addEventListener('input', calc);
payloadInput.addEventListener('input', calc);
calc();
