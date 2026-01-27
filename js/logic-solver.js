/**
 * Logic Gate & K-Map Solver
 * Implements Quine-McCluskey Algorithm for simplification.
 * Supports up to 4 variables (A, B, C, D).
 */

class LogicSolver {
    constructor(numVars) {
        this.numVars = numVars;
        this.vars = ['A', 'B', 'C', 'D'].slice(0, numVars);
        this.minterms = new Set(); // Set of integers where output is 1
    }

    setMinterms(indices) {
        this.minterms = new Set(indices);
    }

    // --- Quine-McCluskey Algorithm ---
    solve() {
        if (this.minterms.size === 0) return { expression: '0', groups: [] };
        if (this.minterms.size === (1 << this.numVars)) return { expression: '1', groups: [] };

        // 1. Group minterms by number of 1s
        let groups = {}; // bitCount -> array of Term objects
        this.minterms.forEach(m => {
            const term = new Term(m, new Set([m]), this.numVars);
            const bits = term.countBits();
            if (!groups[bits]) groups[bits] = [];
            groups[bits].push(term);
        });

        let primeImplicants = [];

        // Iteratively merge
        let currentGroups = groups;
        while (Object.keys(currentGroups).length > 0) {
            let nextGroups = {};
            let merged = new Set(); // Keep track of terms that were merged

            const keys = Object.keys(currentGroups).map(k => parseInt(k)).sort((a, b) => a - b);

            for (let i = 0; i < keys.length - 1; i++) {
                const k1 = keys[i];
                const k2 = keys[i + 1];
                if (k2 !== k1 + 1) continue; // Must be adjacent bit counts

                const list1 = currentGroups[k1];
                const list2 = currentGroups[k2];

                list1.forEach(t1 => {
                    list2.forEach(t2 => {
                        const decimals = new Set([...t1.decimals, ...t2.decimals]);
                        // Check diff
                        let diff = 0;
                        let diffIdx = -1;
                        for (let b = 0; b < this.numVars; b++) {
                            if (t1.mask[b] !== t2.mask[b]) {
                                diff++;
                                diffIdx = b;
                            }
                        }

                        if (diff === 1) {
                            // Valid merge
                            const newMask = [...t1.mask];
                            newMask[diffIdx] = '-';
                            const newTerm = new Term(t1.val, decimals, this.numVars); // val doesn't matter much for dash
                            newTerm.mask = newMask;

                            // Add to next group
                            const bits = newTerm.countBits(); // Count only 1s (dashes ignored)
                            if (!nextGroups[bits]) nextGroups[bits] = [];

                            // Dedup check logic omitted for brevity, adding roughly
                            // Need precise string key check to avoid duplicates in next level
                            const key = newTerm.toString();
                            if (!nextGroups[bits].some(t => t.toString() === key)) {
                                nextGroups[bits].push(newTerm);
                            }

                            t1.merged = true;
                            t2.merged = true;
                        }
                    });
                });
            }

            // Collect unmerged from this level
            Object.values(currentGroups).flat().forEach(t => {
                if (!t.merged) {
                    // Dedup before pushing to PIs
                    const k = t.toString();
                    if (!primeImplicants.some(pi => pi.toString() === k)) {
                        primeImplicants.push(t);
                    }
                }
            });

            currentGroups = nextGroups;
        }

        // Essential Prime Implicant search (Simpler greedy approach suitable for 4 vars)
        // We need to cover all minterms.
        let needed = new Set(this.minterms);
        let finalTerms = [];

        // 1. Find Essentials
        // Map minterm -> list of PIs covering it
        let coverage = {};
        this.minterms.forEach(m => coverage[m] = []);

        primeImplicants.forEach(pi => {
            pi.decimals.forEach(d => {
                if (coverage[d]) coverage[d].push(pi);
            });
        });

        // If any minterm covered by only 1 PI, that PI is essential
        let essentials = new Set();
        for (let m of needed) {
            if (coverage[m] && coverage[m].length === 1) {
                const pi = coverage[m][0];
                if (!essentials.has(pi)) {
                    essentials.add(pi);
                    finalTerms.push(pi);
                    // Remove covered minterms
                    pi.decimals.forEach(d => needed.delete(d));
                }
            }
        }

        // Refresh coverage for remaining needed
        if (needed.size > 0) {
            // Greedy: Pick PI that covers most remaining minterms
            while (needed.size > 0) {
                // Filter PIs to those relevant
                const candidates = primeImplicants.filter(pi => !essentials.has(pi));
                if (candidates.length === 0) break; // Should not happen

                let bestPI = null;
                let bestCount = -1;

                candidates.forEach(pi => {
                    let count = 0;
                    pi.decimals.forEach(d => { if (needed.has(d)) count++; });
                    if (count > bestCount) {
                        bestCount = count;
                        bestPI = pi;
                    }
                });

                if (bestPI && bestCount > 0) {
                    finalTerms.push(bestPI);
                    essentials.add(bestPI);
                    bestPI.decimals.forEach(d => needed.delete(d));
                } else {
                    break; // Done or stuck
                }
            }
        }

        // Generate Expression
        const parts = finalTerms.map(t => t.toExpression(this.vars));
        let expr = parts.join(' || ');
        if (!expr) expr = '0'; // Should be caught earlier

        return { expression: expr, groups: finalTerms, rawPIs: primeImplicants };
    }
}

class Term {
    constructor(val, decimals, numVars) {
        this.val = val;
        this.decimals = decimals; // Set of integers
        this.numVars = numVars;
        this.mask = []; // Array of '0', '1', '-'
        this.merged = false;

        // Init mask from val
        for (let i = numVars - 1; i >= 0; i--) {
            this.mask.push((val & (1 << i)) ? '1' : '0');
        }
        // If constructed from merge, mask is set manually later
    }

    toString() {
        return this.mask.join('');
    }

    countBits() {
        return this.mask.filter(c => c === '1').length;
    }

    toExpression(varNames) {
        let parts = [];
        for (let i = 0; i < this.numVars; i++) {
            const b = this.mask[i]; // 0 or 1 or -
            if (b === '0') parts.push('!' + varNames[i]);
            if (b === '1') parts.push(varNames[i]);
        }
        if (parts.length === 0) return '1';
        return parts.length > 1 ? `(${parts.join(' && ')})` : parts[0];
    }

    // For C code (bitwise macro)
    toBitwise(varNames) {
        let parts = [];
        for (let i = 0; i < this.numVars; i++) {
            const b = this.mask[i];
            if (b === '0') parts.push(`(~${varNames[i]})`);
            if (b === '1') parts.push(`(${varNames[i]})`);
        }
        return parts.length > 0 ? parts.join(' & ') : '1';
    }
}


/* --- Expression Parser --- */
function evaluateExpression(expr, inputs) {
    try {
        // Replace custom ops
        // Allow A, B, C, D
        // Replace with values
        let evalStr = expr
            .replace(/&&/g, '&')
            .replace(/\|\|/g, '|')
            .replace(/!/g, '~'); // Bitwise simpler for eval 0/1

        // Regex replace vars 
        // Care needed: 'A' vs '!A'. Just replace keys.
        // We will eval with Function
        // inputs is object {A:1, B:0...}
        const keys = Object.keys(inputs);
        // Sort keys length desc to prevent overlap issues (e.g. A1, A) - here single char so ok

        // Better approach: Create Function with args
        const funcArgs = keys.join(',');
        // JS boolean ops
        let jsExpr = expr
            .replace(/AND/gi, '&&')
            .replace(/OR/gi, '||')
            .replace(/NOT/gi, '!');

        // Map common symbols
        jsExpr = jsExpr.replace(/&/g, '&&').replace(/\|/g, '||').replace(/~/g, '!');
        // Fix double &&&
        jsExpr = jsExpr.replace(/&&&&/g, '&&').replace(/\|\|\|\|/g, '||');

        const func = new Function(keys, `return (${jsExpr}) ? 1 : 0;`);
        const args = keys.map(k => inputs[k]);
        return func(...args);
    } catch (e) {
        return null; // Error
    }
}

/* --- UI Logic --- */
const GRAY_CODES = {
    2: [0, 1, 3, 2], // Actually 2 vars is 00 01 10 11? 
    // K-Map Order:
    // 2 Vars (A,B): A is row, B col. 
    // Row 0(A=0), 1(A=1). Col 0(B=0), 1(B=1).
    // Cell order: 0(00), 1(01), 2(10), 3(11).
    // Gray is usually for >2 axis.

    // 3 Vars (A, B, C): A Row (0,1). BC Cols (00, 01, 11, 10 -> 0, 1, 3, 2).
    // 4 Vars (A, B, C, D): AB Rows (00, 01, 11, 10). CD Cols (00, 01, 11, 10).
};

const ui = {
    truthTable: document.getElementById('truthTable'),
    kmap: document.getElementById('kmapContainer'),
    outBool: document.getElementById('outBoolean'),
    outC: document.getElementById('outC'),
    outMacro: document.getElementById('outMacro'),
    statIn: document.getElementById('statInputs'),
    statMin: document.getElementById('statMinterms'),
    statGrp: document.getElementById('statGroups'),
    exprInput: document.getElementById('exprInput'),
    exprError: document.getElementById('exprError'),
    btns: document.querySelectorAll('.tab-btn'),
};

let state = {
    mode: 'table', // table or expr
    vars: 3,
    minterms: new Set(),
};

window.onload = () => {
    // Mode Switch
    ui.btns.forEach(b => b.addEventListener('click', () => {
        ui.btns.forEach(btn => btn.classList.remove('active'));
        b.classList.add('active');
        state.mode = b.dataset.mode;

        document.getElementById('controls-table').style.display = state.mode === 'table' ? 'block' : 'none';
        document.getElementById('controls-expr').style.display = state.mode === 'expr' ? 'block' : 'none';

        update();
    }));

    // Var Change
    document.querySelectorAll('input[name="vars"]').forEach(r => {
        r.addEventListener('change', (e) => {
            state.vars = parseInt(e.target.value);
            state.minterms.clear(); // Reset on var change
            renderTable();
            update();
        });
    });

    // Table Actions
    document.getElementById('btnResetTable').addEventListener('click', () => {
        state.minterms.clear();
        updateTableUI();
        update();
    });
    document.getElementById('btnSetTable').addEventListener('click', () => {
        const total = 1 << state.vars;
        for (let i = 0; i < total; i++) state.minterms.add(i);
        updateTableUI();
        update();
    });

    // Expression Input
    ui.exprInput.addEventListener('input', () => {
        if (state.mode === 'expr') parseExpression();
    });

    // Initial
    renderTable();
    update();
};

function renderTable() {
    ui.truthTable.innerHTML = '';
    const total = 1 << state.vars;
    const varNames = ['A', 'B', 'C', 'D'].slice(0, state.vars);

    // Header
    let thead = '<thead><tr>';
    varNames.forEach(v => thead += `<th>${v}</th>`);
    thead += '<th>Out</th></tr></thead>';
    ui.truthTable.innerHTML = thead;

    // Body
    let tbody = document.createElement('tbody');
    for (let i = 0; i < total; i++) {
        const tr = document.createElement('tr');
        tr.className = 'truth-row';

        // Bits
        for (let b = state.vars - 1; b >= 0; b--) {
            const td = document.createElement('td');
            td.textContent = (i & (1 << b)) ? '1' : '0';
            tr.appendChild(td);
        }

        // Output Button
        const td = document.createElement('td');
        const btn = document.createElement('div');
        btn.className = 'truth-cell-out';
        btn.textContent = '0';
        btn.onclick = () => {
            if (state.minterms.has(i)) state.minterms.delete(i);
            else state.minterms.add(i);
            updateTableUI();
            update();
        };
        btn.dataset.idx = i;
        td.appendChild(btn);
        tr.appendChild(td);
        tbody.appendChild(tr);
    }
    ui.truthTable.appendChild(tbody);
}

function updateTableUI() {
    const outs = document.querySelectorAll('.truth-cell-out');
    outs.forEach(o => {
        const i = parseInt(o.dataset.idx);
        if (state.minterms.has(i)) {
            o.classList.add('active');
            o.textContent = '1';
        } else {
            o.classList.remove('active');
            o.textContent = '0';
        }
    });
}

function parseExpression() {
    const expr = ui.exprInput.value.trim();
    ui.exprError.textContent = '';
    if (!expr) return;

    state.minterms.clear();
    const total = 1 << state.vars;
    const varNames = ['A', 'B', 'C', 'D'].slice(0, state.vars);

    // Evaluate for every combination
    for (let i = 0; i < total; i++) {
        let context = {};
        for (let b = 0; b < state.vars; b++) {
            // Context A, B...
            // i bit 0 is D (last var), bit N is A
            // Wait, standard binary A is MSB.
            // i=1 (001) -> A=0, B=0, C=1.
            // A corresponds to bit state.vars-1
            context[varNames[b]] = (i & (1 << (state.vars - 1 - b))) ? 1 : 0;
        }

        const res = evaluateExpression(expr, context);
        if (res === null) {
            ui.exprError.textContent = 'Invalid Syntax';
            break;
        }
        if (res) state.minterms.add(i);
    }
    update();
}

function update() {
    // Solve
    const solver = new LogicSolver(state.vars);
    solver.setMinterms(state.minterms);
    const solution = solver.solve();

    // Stats
    ui.statIn.textContent = state.vars;
    ui.statMin.textContent = state.minterms.size;
    ui.statGrp.textContent = solution.groups.length;

    // Outputs
    ui.outBool.textContent = solution.expression;

    // Simplistic C Gen
    const cExpr = solution.expression.replace(/\|\|/g, '||').replace(/&&/g, '&&').replace(/!/g, '!'); // Already JS style
    ui.outC.value = `// Gate Reduced Logic (${state.minterms.size > 0 ? solution.groups.length : 0} groups)\nif (${cExpr}) {\n    output = 1;\n} else {\n    output = 0;\n}`;

    // Macro
    const varList = ['A', 'B', 'C', 'D'].slice(0, state.vars).join(',');
    const macroBody = solution.groups.map(g => `(${g.toBitwise(solver.vars)})`).join(' | ') || '0';
    ui.outMacro.textContent = `#define LOGIC_CHECK(${varList}) (${macroBody})`;

    // K-Map Render
    renderKMap(solution.groups);
}

function renderKMap(groups) {
    ui.kmap.innerHTML = '';

    // Config
    // 2 Vars: 2x2. Rows A, Cols B.
    // 3 Vars: 2x4. Rows A, Cols BC.
    // 4 Vars: 4x4. Rows AB, Cols CD.

    let rows, cols;
    let rowVars, colVars;
    let rowGray, colGray;

    if (state.vars === 2) {
        rows = 2; cols = 2;
        rowVars = ['A']; colVars = ['B'];
        rowGray = [0, 1]; colGray = [0, 1];
    } else if (state.vars === 3) {
        rows = 2; cols = 4;
        rowVars = ['A']; colVars = ['B', 'C'];
        rowGray = [0, 1]; colGray = [0, 1, 3, 2];
    } else {
        rows = 4; cols = 4;
        rowVars = ['A', 'B']; colVars = ['C', 'D'];
        rowGray = [0, 1, 3, 2]; colGray = [0, 1, 3, 2];
    }

    const cellW = 60, cellH = 60;
    const marginL = 40, marginT = 40;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", marginL + cols * cellW + 20);
    svg.setAttribute("height", marginT + rows * cellH + 20);

    // Headers
    // Row Labels
    rowGray.forEach((val, r) => {
        const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
        txt.textContent = val.toString(2).padStart(rowVars.length, '0');
        txt.setAttribute("x", marginL - 10);
        txt.setAttribute("y", marginT + r * cellH + cellH / 2);
        txt.setAttribute("class", "kmap-label");
        txt.style.textAnchor = "end";
        svg.appendChild(txt);
    });
    // Col Labels
    colGray.forEach((val, c) => {
        const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
        txt.textContent = val.toString(2).padStart(colVars.length, '0');
        txt.setAttribute("x", marginL + c * cellW + cellW / 2);
        txt.setAttribute("y", marginT - 10);
        txt.setAttribute("class", "kmap-label");
        svg.appendChild(txt);
    });

    // Axis Labels
    const lRow = document.createElementNS("http://www.w3.org/2000/svg", "text");
    lRow.textContent = rowVars.join('');
    lRow.setAttribute("x", 10);
    lRow.setAttribute("y", marginT + rows * cellH / 2);
    lRow.setAttribute("class", "kmap-label");
    lRow.style.fontWeight = "bold";
    lRow.setAttribute("transform", `rotate(-90, 10, ${marginT + rows * cellH / 2})`);
    svg.appendChild(lRow);

    const lCol = document.createElementNS("http://www.w3.org/2000/svg", "text");
    lCol.textContent = colVars.join('');
    lCol.setAttribute("x", marginL + cols * cellW / 2);
    lCol.setAttribute("y", 20);
    lCol.setAttribute("class", "kmap-label");
    lCol.style.fontWeight = "bold";
    svg.appendChild(lCol);

    // Cells
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            // Reconstruct index from Row/Col Gray vals
            // Index bits: [RowVars][ColVars]
            const rVal = rowGray[r];
            const cVal = colGray[c];
            // Shift rVal by # col vars
            const idx = (rVal << colVars.length) | cVal;

            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", marginL + c * cellW);
            rect.setAttribute("y", marginT + r * cellH);
            rect.setAttribute("width", cellW);
            rect.setAttribute("height", cellH);
            rect.setAttribute("class", "kmap-cell");

            if (state.minterms.has(idx)) {
                rect.classList.add('active-1');
                const val = document.createElementNS("http://www.w3.org/2000/svg", "text");
                val.textContent = "1";
                val.setAttribute("x", marginL + c * cellW + cellW / 2);
                val.setAttribute("y", marginT + r * cellH + cellH / 2);
                val.setAttribute("class", "kmap-label");
                val.style.fill = "#fff";
                val.style.fontSize = "18px";
                svg.appendChild(rect); // Rect first
                svg.appendChild(val);
            } else {
                svg.appendChild(rect);
            }

            // Interaction
            rect.onclick = () => {
                if (state.minterms.has(idx)) state.minterms.delete(idx);
                else state.minterms.add(idx);
                updateTableUI();
                update(); // Full re-render needed for groups
            };
        }
    }

    // Groups Overlays
    // Each group is a Term object (mask).
    // Mapping masks to rectangular areas is tricky due to wrapping.
    // Simple approach: For each group, verify which cells it covers.
    // If adjacent cells form a rect, draw it. 
    // Usually easier to handle wrapping by drawing multiple rects if needed or using paths.

    // We will define colors for groups
    const colors = ['#00e5ff', '#ff4081', '#00e676', '#ffea00', '#aa00ff'];

    groups.forEach((g, i) => {
        const color = colors[i % colors.length];

        // Find grid coords for all decimals in group
        let coords = [];
        g.decimals.forEach(d => {
            // d -> Gray coords
            // Split d into row/col bits
            const mask = (1 << colVars.length) - 1;
            const cBits = d & mask;
            const rBits = d >> colVars.length;

            const r = rowGray.indexOf(rBits);
            const c = colGray.indexOf(cBits);
            coords.push({ r, c });
        });

        // Draw bounding boxes. 
        // Naive: Just highlight cells. 
        // Better: Draw rounded rect around bounds. Note wrapping breaks standard connectivity logic.
        // We will just draw a distinct outline for each cell in the group with same color, merged?
        // Simpler: Just draw individual rect outlines slightly inset.

        const inset = 4 * (i + 1); // Nested outlines for overlap

        // TODO: Proper shape merging typically uses boolean ops on paths.
        // Fallback: draw independent rects for each cell involved.
        coords.forEach(pt => {
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", marginL + pt.c * cellW + 2 + i * 2);
            rect.setAttribute("y", marginT + pt.r * cellH + 2 + i * 2);
            rect.setAttribute("width", cellW - 4 - i * 4);
            rect.setAttribute("height", cellH - 4 - i * 4);
            rect.setAttribute("rx", 8);
            rect.setAttribute("fill", "none");
            rect.setAttribute("stroke", color);
            rect.setAttribute("stroke-width", "2");
            rect.style.pointerEvents = "none";
            svg.appendChild(rect);
        });
    });

    ui.kmap.appendChild(svg);
}
