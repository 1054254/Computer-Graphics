// "Solar system" (https://skfb.ly/oKYnC) by dannzjs is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).
let animationSpeed = 0.5; // speed of animtion
let intensity = 1.0; // Initial intensity
let lightPosition = new THREE.Vector3(2.0, 2.0, 2.0);

// Three.js Setup
let solarSystem;
let pointLight, ambientLight;
let meshGroups = [];
let textures = [];
let texturesLoaded = 0;
let startTime = Date.now();
let planets = []; // Array to store planet data with orbit info

let canvas = document.createElement('canvas');
let renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
let scene = new THREE.Scene();

let camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 25, 50);
camera.lookAt(0, 0, 0);

const loader = new THREE.GLTFLoader();

loader.load(
    'https://1054254.github.io/Computer-Graphics/EindOpdracht/solar-system/source/solar_system_animation.glb',
    function (gltf) {
        solarSystem = gltf.scene;
        scene.add(solarSystem);
    },
    undefined,
    function (error) {
        console.error('An error happened while loading the model:', error);
    }
);

function render() {
    renderer.render(scene, camera);
    }

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(new THREE.Color(0x000000));

document.body.appendChild(renderer.domElement);

setInterval(render, 50); // 20 FPS