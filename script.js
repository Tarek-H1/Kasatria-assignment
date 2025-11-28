// Import Three.js modules 
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ---------------- CONFIG ---------------- */
const CLIENT_ID = "513027051448-4lkkdallfvkv5gaa09edq8v5a9r5cbkl.apps.googleusercontent.com";
const SPREADSHEET_ID = "17FoUIbkCDA6s9qsqcVviXKy1reg0m9XvO_wJvrLkw_8";
const SHEET_RANGE = "'Data Template'!A1:Z999";

/* ---------------- STATE ---------------- */
let tokenClient;
let accessToken = null;

let camera, scene, renderer, controls;
const objects = [];
const targets = { table: [], sphere: [], helix: [], grid: [] };

const loginScreen = document.getElementById("login-screen");
const loadingOverlay = document.getElementById("loadingOverlay");
const container = document.getElementById("container");
const menu = document.getElementById("menu");
const networthMeter = document.getElementById("networth-meter");

/* ---------- GOOGLE AUTH ---------- */
window.onload = () => {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
        callback: (resp) => {
            accessToken = resp.access_token;
            loginScreen.style.display = "none";
            fetchSheetAndStart();
        }
    });
};

document.getElementById("googleSignInBtn").onclick = () =>
    tokenClient.requestAccessToken();


/* ---------- FETCH SHEET ---------- */
async function fetchSheetAndStart() {
    loadingOverlay.style.display = "flex";

    const url =
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_RANGE)}`;

    const response = await fetch(url, {
        headers: { Authorization: "Bearer " + accessToken }
    });

    const data = await response.json();
    const items = convertRowsToObjects(data.values);

    init3D();
    build3DTiles(items);
    buildLayouts();

    transform(targets.table, 2000);

    loadingOverlay.style.display = "none";
    container.style.display = "block";
    menu.style.display = "block";
    networthMeter.style.display = "block";
}

function convertRowsToObjects(values) {
    const headers = values[0].map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
    return values.slice(1).map(row => {
        const o = {};
        headers.forEach((h, i) => o[h] = row[i] || "");
        return o;
    });
}


/* ---------- 3D INIT ---------- */
function init3D() {
    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.z = 3000;

    scene = new THREE.Scene();

    renderer = new CSS3DRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 500;
    controls.maxDistance = 6000;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableRotate = true;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    window.addEventListener("resize", onResize);

    document.getElementById("tableBtn").onclick = () => transform(targets.table, 2000);
    document.getElementById("sphereBtn").onclick = () => transform(targets.sphere, 2000);
    document.getElementById("helixBtn").onclick = () => transform(targets.helix, 2000);
    document.getElementById("gridBtn").onclick = () => transform(targets.grid, 2000);

    render();
    animate();
}


/* ---------- BUILD TILES ---------- */
function build3DTiles(items) {
    items.forEach((item, i) => {
        const el = document.createElement("div");
        el.className = "element";

        const netRaw = item["net_worth"] || item["networth"] || "";
        const net = parseNetWorth(netRaw);

        let borderColor, bgColor;
        if (net < 100000) {
            borderColor = "#EF3022";
            bgColor = 'rgba(239, 48, 34, 0.15)';
        } else if (net < 200000) {
            borderColor = "#FDCA45";
            bgColor = 'rgba(253, 202, 69, 0.15)';
        } else {
            borderColor = "#3A9F48";
            bgColor = 'rgba(58, 159, 72, 0.15)';
        }

        el.style.borderColor = borderColor;
        el.style.background = `linear-gradient(135deg, ${bgColor}, rgba(30, 30, 30, 0.95))`;

        const country = document.createElement("div");
        country.className = "country";
        country.textContent = item["country"] || "";

        const age = document.createElement("div");
        age.className = "age";
        age.textContent = item["age"] || "";

        const photo = document.createElement("img");
        photo.className = "photo";
        photo.src = item["photo"] || "";
        photo.onerror = function () {
            this.style.display = "none";
        };

        const name = document.createElement("div");
        name.className = "name";
        name.textContent = item["name"] || "";

        const interest = document.createElement("div");
        interest.className = "interest";
        interest.textContent = item["interest"] || "";

        const networth = document.createElement("div");
        networth.className = "networth";
        networth.textContent = netRaw;
        networth.style.color = borderColor;

        el.appendChild(country);
        el.appendChild(age);
        el.appendChild(photo);
        el.appendChild(name);
        el.appendChild(interest);
        el.appendChild(networth);

        const obj = new CSS3DObject(el);
        obj.position.x = Math.random() * 4000 - 2000;
        obj.position.y = Math.random() * 4000 - 2000;
        obj.position.z = Math.random() * 4000 - 2000;

        scene.add(obj);
        objects.push(obj);
    });
}

function parseNetWorth(str) {
    let s = (str || "").replace(/[\$,]/g, "").trim().toUpperCase();
    if (s.endsWith("K")) return parseFloat(s) * 1000;
    if (s.endsWith("M")) return parseFloat(s) * 1e6;
    if (s.endsWith("B")) return parseFloat(s) * 1e9;
    return parseFloat(s) || 0;
}


/* ---------- LAYOUT TARGETS ---------- */
function buildLayouts() {
    // TABLE 20×10 
    const cols = 20, rows = 10;
    objects.forEach((o, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const obj = new THREE.Object3D();
        obj.position.x = col * 200 - ((cols - 1) * 200) / 2;
        obj.position.y = -row * 240 + ((rows - 1) * 240) / 2;
        targets.table.push(obj);
    });

    // SPHERE 
    const vector = new THREE.Vector3();
    const l = objects.length;
    objects.forEach((o, i) => {
        const phi = Math.acos(-1 + (2 * i) / l);
        const theta = Math.sqrt(l * Math.PI) * phi;
        const obj = new THREE.Object3D();
        obj.position.setFromSphericalCoords(800, phi, theta);
        vector.copy(obj.position).multiplyScalar(2);
        obj.lookAt(vector);
        targets.sphere.push(obj);
    });

    // DOUBLE HELIX 
    const radius = 900, turns = 4;
    objects.forEach((o, i) => {
        const t = i / l;
        const strand = i % 2 === 0 ? 0 : Math.PI;
        const angle = t * Math.PI * 2 * turns + strand;
        const obj = new THREE.Object3D();
        obj.position.x = Math.cos(angle) * radius;
        obj.position.y = (i - l / 2) * -10;
        obj.position.z = Math.sin(angle) * radius;
        obj.lookAt(new THREE.Vector3(0, obj.position.y, 0));
        targets.helix.push(obj);
    });

    // GRID 5×4×10 
    let idx = 0;
    for (let z = 0; z < 10; z++)
        for (let y = 0; y < 4; y++)
            for (let x = 0; x < 5; x++) {
                if (idx >= objects.length) break;
                const obj = new THREE.Object3D();
                obj.position.x = x * 380 - 760;
                obj.position.y = -y * 380 + 570;
                obj.position.z = z * 600 - 2700;
                targets.grid.push(obj);
                idx++;
            }
}


/* ---------- TRANSFORM ANIMATION ---------- */
function transform(targetsArray, duration) {
    TWEEN.removeAll();
    objects.forEach((obj, i) => {
        const target = targetsArray[i];
        new TWEEN.Tween(obj.position)
            .to({ x: target.position.x, y: target.position.y, z: target.position.z },
                Math.random() * duration + duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();
        new TWEEN.Tween(obj.rotation)
            .to({ x: target.rotation.x, y: target.rotation.y, z: target.rotation.z },
                Math.random() * duration + duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();
    });
    new TWEEN.Tween(this)
        .to({}, duration * 2)
        .onUpdate(render)
        .start();
}

function render() {
    renderer.render(scene, camera);
}

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    controls.update();
    render();
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
}