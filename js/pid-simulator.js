/**
 * PID Loop Simulator
 * First-Order System + PID Controller
 */

// UI Elements
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

const inputs = {
    kp: document.getElementById('sliderKp'),
    ki: document.getElementById('sliderKi'),
    kd: document.getElementById('sliderKd'),
    setpoint: document.getElementById('inpSetpoint'),
    windup: document.getElementById('checkWindup')
};

const labels = {
    kp: document.getElementById('valKp'),
    ki: document.getElementById('valKi'),
    kd: document.getElementById('valKd')
};

const stats = {
    rise: document.getElementById('statRise'),
    overshoot: document.getElementById('statOvershoot'),
    stable: document.getElementById('statStable')
};

const codeOutput = document.getElementById('codeOutput');
const btnReset = document.getElementById('btnReset');

// Simulation Constants
const SIM_STEPS = 400;
const DT = 0.05; // Fixed Time Step
const SYSTEM_TAU = 2.0; // System Time Constant (Lag)
const SYSTEM_GAIN = 1.0;

// State
let simulationData = [];

// Init
window.onload = () => {
    // Resize canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Bind Listeners
    Object.keys(inputs).forEach(k => {
        inputs[k].oninput = update;
    });

    btnReset.onclick = resetDefaults;

    // Initial Run
    update();
};

function resetDefaults() {
    inputs.kp.value = 1.0;
    inputs.ki.value = 0.1;
    inputs.kd.value = 0.5;
    inputs.setpoint.value = 50;
    inputs.windup.checked = true;
    update();
}

function resizeCanvas() {
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    // Don't call update() here to avoid loop if resize triggers rapidly, 
    // but we can requestFrame.
    if (simulationData.length > 0) renderGraph();
}

function update() {
    // Update labels
    labels.kp.textContent = inputs.kp.value;
    labels.ki.textContent = inputs.ki.value;
    labels.kd.textContent = inputs.kd.value;

    const params = {
        kp: parseFloat(inputs.kp.value),
        ki: parseFloat(inputs.ki.value),
        kd: parseFloat(inputs.kd.value),
        setpoint: parseFloat(inputs.setpoint.value),
        noWindup: !inputs.windup.checked
    };

    runSimulation(params);
    analyzeResult(params.setpoint);
    generateCode(params);
    renderGraph(params.setpoint);
}

function runSimulation(p) {
    simulationData = [];

    // System State
    let processVal = 0;
    let prevProcessVal = 0;

    // PID State
    let integral = 0;
    let prevError = 0;

    // Limits
    const outMin = -100;
    const outMax = 100;

    for (let i = 0; i < SIM_STEPS; i++) {
        // 1. Calculate Error
        const error = p.setpoint - processVal;

        // 2. Integral Term
        integral += error * DT;

        // Anti-Windup (Clamping Integral) - Simplified approach
        // Real embedded systems often clamp the I-term separately or back-calculate.
        // We will simple clamp the I-sum if enabled.
        if (!p.noWindup) {
            // Rough clamping to output limits scaled by Ki (to prevent massive windup)
            // Or just clamp the integral sum itself safely.
            // Let's standard clamp:
            const iMax = outMax / (p.ki || 0.001);
            if (integral > iMax) integral = iMax;
            if (integral < -iMax) integral = -iMax;
        }

        // 3. Derivative Term
        const derivative = (error - prevError) / DT;

        // 4. PID Output
        let output = (p.kp * error) + (p.ki * integral) + (p.kd * derivative);

        // Clamp Output for realism (Actuator saturation)
        if (output > outMax) output = outMax;
        if (output < outMin) output = outMin;

        // 5. System Plant Model (First Order Lag)
        // y[k] = y[k-1] + (Gain*Input - y[k-1]) * dt / Tau
        // Using "Actual Process Value" physics
        const delta = (SYSTEM_GAIN * output - processVal) * DT / SYSTEM_TAU;
        processVal += delta;

        // Store
        simulationData.push({
            t: i,
            pv: processVal,
            sp: p.setpoint,
            out: output
        });

        // Prep next
        prevError = error;
    }
}

function analyzeResult(sp) {
    // Rise Time: Time to reach 90% of SP first time
    const threshold = sp * 0.9;
    let riseIndex = -1;

    // Overshoot: Max value - SP
    let maxVal = 0;

    // Stability
    let stable = true;
    // Check last 10% samples variance?

    for (let i = 0; i < simulationData.length; i++) {
        const pv = simulationData[i].pv;
        if (pv > maxVal) maxVal = pv;
        if (riseIndex === -1 && pv >= threshold) riseIndex = i;
    }

    const overshoot = ((maxVal - sp) / sp) * 100;

    // Simple visual stats
    stats.rise.textContent = riseIndex !== -1 ? `${riseIndex} ticks` : 'Not reached';
    stats.overshoot.textContent = maxVal > sp ? `${overshoot.toFixed(1)}%` : '0%';

    // Check stability (is the end near SP?)
    const finalErr = Math.abs(simulationData[SIM_STEPS - 1].pv - sp);
    if (finalErr < (sp * 0.02)) {
        stats.stable.textContent = "Stable";
        stats.stable.className = "stat-val text-success";
        stats.stable.style.color = "var(--color-success)";
    } else {
        stats.stable.textContent = "Unsettled";
        stats.stable.style.color = "var(--color-warning)";
    }
}

function renderGraph(sp) {
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (simulationData.length === 0) return;

    // Scale
    const padding = 20;
    const w = canvas.width - padding * 2;
    const h = canvas.height - padding * 2;

    // Find Y range
    let maxY = sp * 1.5; // Default headroom
    simulationData.forEach(d => {
        if (Math.abs(d.pv) > maxY) maxY = Math.abs(d.pv);
    });
    // Ensure min range
    if (maxY < 10) maxY = 10;

    const yRatio = h / maxY; // pixels per unit
    const xRatio = w / SIM_STEPS;

    // Helper transform
    const tx = (i) => padding + i * xRatio;
    const ty = (val) => canvas.height - padding - (val * yRatio); // Invert Y (0 at bottom)

    // Draw Grid (Zero Line)
    ctx.beginPath();
    ctx.strokeStyle = '#333';
    ctx.moveTo(padding, ty(0));
    ctx.lineTo(padding + w, ty(0));
    ctx.stroke();

    // Draw Setpoint (Dashed)
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#666';
    ctx.moveTo(padding, ty(sp));
    ctx.lineTo(padding + w, ty(sp));
    ctx.stroke();
    ctx.setLineDash([]); // Reset

    // Draw Process Value
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00ff88'; // Brand Accent
    ctx.moveTo(tx(0), ty(simulationData[0].pv));

    for (let i = 1; i < simulationData.length; i++) {
        ctx.lineTo(tx(i), ty(simulationData[i].pv));
    }
    ctx.stroke();
}

function generateCode(p) {
    const code = `// PID Controller Configuration
// Target: First-order discretized system

typedef struct {
    float kp;
    float ki;
    float kd;
    float prev_error;
    float integral;
} pid_t;

// Initialization
pid_t my_pid = {
    .kp = ${p.kp.toFixed(2)}f,
    .ki = ${p.ki.toFixed(2)}f,
    .kd = ${p.kd.toFixed(2)}f,
    .prev_error = 0.0f,
    .integral = 0.0f
};

float pid_update(pid_t *pid, float setpoint, float measured, float dt) {
    float error = setpoint - measured;
    
    // Integral
    pid->integral += error * dt;
    // Note: Add anti-windup clamping here
    
    // Derivative
    float derivative = (error - pid->prev_error) / dt;
    
    float output = (pid->kp * error) + 
                   (pid->ki * pid->integral) + 
                   (pid->kd * derivative);
                   
    pid->prev_error = error;
    return output;
}
`;
    codeOutput.value = code;
}

function copyCode() {
    codeOutput.select();
    navigator.clipboard.writeText(codeOutput.value);
}
