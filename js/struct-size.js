// Structure Size Estimator Logic

const fieldsContainer = document.getElementById('fieldsContainer');
const packSettings = document.getElementById('packSettings');
const totalSizeDisplay = document.getElementById('totalSize');
const paddingParamsDisplay = document.getElementById('paddingParams');
const efficiencyDisplay = document.getElementById('efficiency');
const visualizer = document.getElementById('visualizer');

const TYPES = {
    'uint8_t': 1,
    'int8_t': 1,
    'char': 1,
    'uint16_t': 2,
    'int16_t': 2,
    'short': 2,
    'uint32_t': 4,
    'int32_t': 4,
    'float': 4,
    'int': 4,
    'uint64_t': 8,
    'int64_t': 8,
    'double': 8,
    'pointer': 8 // Assuming 64-bit target for generic "pointer", user can select uint32 for 32-bit ptr
};

let fields = [
    { type: 'uint8_t', name: 'var1' },
    { type: 'uint32_t', name: 'var2' }
];

function renderFields() {
    fieldsContainer.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'field-row';
    header.innerHTML = '<span style="flex:1; font-size:0.8em; color:var(--color-text-secondary)">Type</span><span style="flex:1; font-size:0.8em; color:var(--color-text-secondary)">Name (Optional)</span><span style="width:40px"></span>';
    fieldsContainer.appendChild(header);

    fields.forEach((field, index) => {
        const row = document.createElement('div');
        row.className = 'field-row';

        const typeSelect = document.createElement('select');
        for (const [t, s] of Object.entries(TYPES)) {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = `${t} (${s})`;
            if (t === field.type) opt.selected = true;
            typeSelect.appendChild(opt);
        }
        typeSelect.style.flex = '1';
        typeSelect.onchange = (e) => { fields[index].type = e.target.value; calculateStruct(); };

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = 'Name';
        nameInput.value = field.name;
        nameInput.style.flex = '1';
        nameInput.oninput = (e) => { fields[index].name = e.target.value; };

        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn-remove';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = () => { fields.splice(index, 1); renderFields(); calculateStruct(); };

        row.appendChild(typeSelect);
        row.appendChild(nameInput);
        row.appendChild(removeBtn);
        fieldsContainer.appendChild(row);
    });
}

function addField() {
    fields.push({ type: 'uint32_t', name: '' });
    renderFields();
    calculateStruct();
}

function calculateStruct() {
    let currentOffset = 0;
    let maxAlignment = 1;
    let paddingTotal = 0;
    const isPacked = packSettings.value === '1';

    let visualizationHTML = '';

    // Pass 1: Calculate offsets and paddings
    fields.forEach(field => {
        const size = TYPES[field.type];
        const alignment = isPacked ? 1 : size;

        // Update struct max alignment (for trailing padding)
        if (alignment > maxAlignment) maxAlignment = alignment;

        // Calculate padding needed before this member
        let paddingBefore = 0;
        if (currentOffset % alignment !== 0) {
            paddingBefore = alignment - (currentOffset % alignment);
        }

        currentOffset += paddingBefore; // Advance offset past padding
        paddingTotal += paddingBefore;

        // Visuals for padding
        for (let i = 0; i < paddingBefore; i++) {
            visualizationHTML += '<div class="byte-box byte-padding" title="Padding"></div>';
        }

        // Visuals for data
        for (let i = 0; i < size; i++) {
            visualizationHTML += `<div class="byte-box byte-data" title="${field.name || field.type} byte ${i}"></div>`;
        }

        currentOffset += size; // Advance offset past member
    });

    // Trailing padding to align the whole struct size to maxAlignment
    let trailingPadding = 0;
    if (currentOffset % maxAlignment !== 0) {
        trailingPadding = maxAlignment - (currentOffset % maxAlignment);
    }

    currentOffset += trailingPadding;
    paddingTotal += trailingPadding;

    for (let i = 0; i < trailingPadding; i++) {
        visualizationHTML += '<div class="byte-box byte-padding" title="Trailing Padding"></div>';
    }

    // Output
    totalSizeDisplay.textContent = currentOffset + ' bytes';
    paddingParamsDisplay.textContent = paddingTotal + ' bytes';

    const efficiency = currentOffset > 0 ? ((currentOffset - paddingTotal) / currentOffset * 100) : 100;
    efficiencyDisplay.textContent = efficiency.toFixed(1) + '%';

    // update color based on "goodness"
    if (efficiency < 70) efficiencyDisplay.className = 'result-value text-error';
    else if (efficiency < 90) efficiencyDisplay.className = 'result-value text-warning';
    else efficiencyDisplay.className = 'result-value';

    visualizer.innerHTML = visualizationHTML;
}

packSettings.onchange = calculateStruct;

// Default init
renderFields();
calculateStruct();
