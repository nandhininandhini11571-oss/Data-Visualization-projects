const canvas = document.getElementById("Canvas");
const ctx = canvas.getContext("2d");

const yawSlider = document.getElementById("yawSlider");
const pitchSlider = document.getElementById("pitchSlider");
const rollSlider = document.getElementById("rollSlider");
const autoRotateCheckbox = document.getElementById("autoRotateCheckbox");
const projectionSelect = document.getElementById("projectionSelect");

let yaw = Number(yawSlider.value) * Math.PI / 180;
let pitch = Number(pitchSlider.value) * Math.PI / 180;
let roll = Number(rollSlider.value) * Math.PI / 180;

let projection = projectionSelect.value;
let points = [];

// Load points from JSON
fetch("data.json")
    .then(response => response.json())
    .then(data => {
        points = data;
        animate();
    })
    .catch(error => {
        console.error("Error loading data.json:", error);
    });

// Slider Events
yawSlider.oninput = function () {
    yaw = Number(this.value) * Math.PI / 180;
};

pitchSlider.oninput = function () {
    pitch = Number(this.value) * Math.PI / 180;
};

rollSlider.oninput = function () {
    roll = Number(this.value) * Math.PI / 180;
};

projectionSelect.onchange = function () {
    projection = this.value;
};

// Rotation around Z-axis
function rollZ(point, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    return {
        x: point.x * c - point.y * s,
        y: point.x * s + point.y * c,
        z: point.z
    };
}

// Rotation around X-axis
function pitchX(point, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    return {
        x: point.x,
        y: point.y * c - point.z * s,
        z: point.y * s + point.z * c
    };
}

// Rotation around Y-axis
function yawY(point, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    return {
        x: point.x * c + point.z * s,
        y: point.y,
        z: -point.x * s + point.z * c
    };
}

// Orthographic Projection
function orthographic(point) {
    return {
        x: point.x,
        y: point.y,
        scale: 1
    };
}

// Perspective Projection
function perspective(point) {
    const f = 700;

    const scale = f / (f + point.z);

    return {
        x: point.x * scale,
        y: point.y * scale,
        scale: scale
    };
}

// Draw Single Point
function drawPoint(x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);

    ctx.fillStyle = "#7C4DFF";
    ctx.shadowColor = "#7C4DFF";
    ctx.shadowBlur = 5;

    ctx.fill();

    ctx.shadowBlur = 0;
}

// Draw Scene
function drawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const viewScale = 4;

    for (let p of points) {

        let point = rollZ(p, roll);
        point = pitchX(point, pitch);
        point = yawY(point, yaw);

        point.z += 300;

        let screen;
        let size = 2;

        if (projection === "orthographic") {
            screen = orthographic(point);
        } else {
            screen = perspective(point);
            size = Math.max(1.5, 5 * screen.scale);
        }

        const x = centerX + screen.x * viewScale;
        const y = centerY - screen.y * viewScale;

        drawPoint(x, y, size);
    }
}

// Animation Loop
function animate() {

    if (autoRotateCheckbox.checked) {
        yaw += 0.01;
        pitch += 0.005;
        roll += 0.003;

        yawSlider.value = (yaw * 180 / Math.PI) % 360;
        pitchSlider.value = (pitch * 180 / Math.PI) % 360;
        rollSlider.value = (roll * 180 / Math.PI) % 360;
    }

    drawScene();

    requestAnimationFrame(animate);
}