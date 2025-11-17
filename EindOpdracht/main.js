// "Solar system" (https://skfb.ly/oKYnC) by dannzjs is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).
let animationSpeed = 5; // speed of animtion
let intensity = 1.0; // Initial intensity
let lightPosition = new THREE.Vector3(0.0, 0.0, 0.0);
let time = 0;
let checkerEnabled = 0.0; // Toggle for checker pattern

// Three.js Setup
let solarSystem;
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

// Load the solar system model from github
loader.load(
    'https://1054254.github.io/Computer-Graphics/EindOpdracht/solar-system/source/solar_system_animation.glb',
    function (gltf) {
        gltf.scene.traverse(function (child) {
            if (child.isMesh) {
                meshGroups.push(child);
            }
        });
        
        meshGroups.forEach((mesh) => {
            setTexture(mesh);
            console.log('Loaded mesh:', mesh.name, 'Position:', mesh.position, 'Scale:', mesh.scale, 'Parent:', mesh.parent?.name);
        })

    let sun     = getByParentPlanetMesh("sun");
    let earth   = getByParentPlanetMesh("erath");
    let moon    = getByParentPlanetMesh("moon");

    let mars    = getByParentPlanetMesh("mars");
    let venus   = getByParentPlanetMesh("venus");
    let jupiter = getByParentPlanetMesh("jupiter");
    let saturn  = getByParentPlanetMesh("saturn");
    let uranus  = getByParentPlanetMesh("uranus");
    let neptune = getByParentPlanetMesh("neptune");
    let pluto   = getByParentPlanetMesh("pluto");
    let mercury = getByParentPlanetMesh("mercury");
    

    // Just rename safely (if object exists):
    if (sun)     sun.name = "sun";
    if (earth)   earth.name = "earth";
    if (moon)    moon.name = "moon";
    if (mars)    mars.name = "mars";
    if (venus)   venus.name = "venus";
    if (jupiter) jupiter.name = "jupiter";
    if (saturn)  saturn.name = "saturn";
    if (uranus)  uranus.name = "uranus";
    if (neptune) neptune.name = "neptune";
    if (pluto)   pluto.name = "pluto";
    if (mercury) mercury.name = "mercury";

    moon.parent.parent.visible = false;

        solarSystem = gltf.scene;
        scene.add(solarSystem);
    },
    undefined,
    function (error) {
        console.error('An error happened while loading the model:', error);
    }
);

function getPlanetTextureNumber(planetName) {
    const searchName = planetName.toLowerCase();
    
    if (searchName.includes('moon')) return 0;
    if (searchName.includes('sun')) return 1;
    if (searchName.includes('erath') || searchName.includes('earth')) return 2;
    if (searchName.includes('mars')) return 3;
    if (searchName.includes('venus')) return 4;
    if (searchName.includes('jupiter')) return 5;
    if (searchName.includes('saturn')) return 6;
    if (searchName.includes('uranus')) return 7;
    if (searchName.includes('neptune')) return 8;
    if (searchName.includes('pluto')) return 9;
    if (searchName.includes('mercury')) return 10;
    
    return null;
}

function setTexture(mesh) {
    const parentName = mesh.parent?.name?.toLowerCase() || '';
    const fileNumber = getPlanetTextureNumber(parentName);
    
    if (fileNumber === null) {
        console.warn('Unknown parent for mesh:', mesh.name, 'Parent:', parentName);
        return;
    }
    
    // Check if this is the sun
    const isSun = parentName.includes('sun');
    
    const textureLoader = new THREE.TextureLoader();
    let texturePath = `https://1054254.github.io/Computer-Graphics/EindOpdracht/solar-system/textures/gltf_embedded_${fileNumber}.jpeg`
    
    textureLoader.load(
        texturePath,
        function (texture) {
            // Set texture wrapping and filtering
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            
            // Create ShaderMaterial with custom shaders
            const shaderMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    uTexture: { value: texture },
                    uIntensity: { value: intensity },
                    uLightPos: { value: lightPosition },
                    uCheckerEnabled: { value: checkerEnabled },
                    uIsSun: { value: isSun }
                },
                vertexShader: vertexShader(),
                fragmentShader: fragmentShader()
            });
            
            mesh.material = shaderMaterial;
            mesh.material.uniformsNeedUpdate = true;
            console.log(`Texture and shader applied to ${mesh.name}`, isSun ? '(SUN - emissive)' : '');
        },
        undefined,
        function (error) {
            console.error(`Error loading texture for ${mesh.name}:`, error);
        }
    );
}

function getByParentPlanetMesh(planetName) {
    // Find and return the mesh for a specific planet by searching parent names
    const searchName = planetName.toLowerCase();
    
    for (let mesh of meshGroups) {
        const parentName = mesh.parent?.name?.toLowerCase() || '';
        
        // Match the planet name in the parent name
        if (parentName.includes(searchName) && !parentName.includes('beziercircle')) {
            return mesh;
        }
    }
    
    console.warn(`Planet mesh not found for: ${planetName}`);
    return null;
}


function render() {
    renderer.render(scene, camera);
}

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(new THREE.Color(0x000000));

document.body.appendChild(renderer.domElement);

function animate() {
    time = Date.now() - startTime;
    
    // Rotate planets on their own axes (self-rotation)
    const sun = scene.getObjectByName('sun');   
    let sunWorldPosition = new THREE.Vector3();
    if (sun) {
        sun.rotation.y += 0.01 * animationSpeed; // Sun spinning on its axis
        sun.getWorldPosition(sunWorldPosition);
    }
    
    const earth = scene.getObjectByName('earth');
    if (earth) {
        earth.rotation.y += 0.02 * animationSpeed; // Earth spinning on its axis (faster rotation)
        const earthOrbit = earth.parent.parent;
        if (earthOrbit) {
            earthOrbit.rotation.y += 0.005 * animationSpeed; // Earth orbiting the sun (slower orbit)
        }
    }
    
    const moon = scene.getObjectByName('moon');
    if (moon) {
        moon.rotation.y += 0.015 * animationSpeed; // Moon spinning on its axis
        const moonOrbit = moon.parent.parent;
        if (moonOrbit) {
            moonOrbit.rotation.y += 0.03 * animationSpeed; // Moon orbiting the earth
        }
    }
    
    const mars = scene.getObjectByName('mars');
    if (mars) {
        mars.rotation.y += 0.01 * animationSpeed;
        const marsOrbit = mars.parent.parent;
        if (marsOrbit) {
            marsOrbit.rotation.y += 0.004 * animationSpeed;
        }
    }
    
    const venus = scene.getObjectByName('venus');
    if (venus) {
        venus.rotation.y += 0.01 * animationSpeed;
        const venusOrbit = venus.parent.parent;
        if (venusOrbit) {
            venusOrbit.rotation.y += 0.006 * animationSpeed;
        }
    }
    
    const jupiter = scene.getObjectByName('jupiter');
    if (jupiter) {
        jupiter.rotation.y += 0.01 * animationSpeed;
        const jupiterOrbit = jupiter.parent.parent;
        if (jupiterOrbit) {
            jupiterOrbit.rotation.y += 0.003 * animationSpeed;
        }
    }
    
    const saturn = scene.getObjectByName('saturn');
    if (saturn) {
        saturn.rotation.y += 0.01 * animationSpeed;
        const saturnOrbit = saturn.parent.parent;
        if (saturnOrbit) {
            saturnOrbit.rotation.y += 0.002 * animationSpeed;
        }
    }
    
    const uranus = scene.getObjectByName('uranus');
    if (uranus) {
        uranus.rotation.y += 0.01 * animationSpeed;
        const uranusOrbit = uranus.parent.parent;
        if (uranusOrbit) {
            uranusOrbit.rotation.y += 0.0015 * animationSpeed;
        }
    }
    
    const neptune = scene.getObjectByName('neptune');
    if (neptune) {
        neptune.rotation.y += 0.01 * animationSpeed;
        const neptuneOrbit = neptune.parent.parent;
        if (neptuneOrbit) {
            neptuneOrbit.rotation.y += 0.001 * animationSpeed;
        }
    }
    
    const pluto = scene.getObjectByName('pluto');
    if (pluto) {
        pluto.rotation.y += 0.01 * animationSpeed;
        const plutoOrbit = pluto.parent.parent;
        if (plutoOrbit) {
            plutoOrbit.rotation.y += 0.0008 * animationSpeed;
        }
    }
    
    const mercury = scene.getObjectByName('mercury');
    if (mercury) {
        mercury.rotation.y += 0.01 * animationSpeed;
        const mercuryOrbit = mercury.parent.parent.parent;
        if (mercuryOrbit) {
            mercuryOrbit.rotation.y += 0.008 * animationSpeed;
        }
    }
    
    render();
}

setInterval(animate, 50); // 20 FPS

addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
})

moveCameraSpeed = 0.3;
cameraAngle = 90;
cameraRadius = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);

addEventListener('keydown', (event) => {
    switch(event.key) {
        case 'W':
        case 'w':
            cameraRadius = Math.max(10, cameraRadius - moveCameraSpeed); // Zoom in
            camera.position.x = Math.cos(cameraAngle) * cameraRadius;
            camera.position.z = Math.sin(cameraAngle) * cameraRadius;
            camera.lookAt(0, 0, 0);
            break;
        case 'S':
        case 's':
            cameraRadius += moveCameraSpeed; // Zoom out
            camera.position.x = Math.cos(cameraAngle) * cameraRadius;
            camera.position.z = Math.sin(cameraAngle) * cameraRadius;
            camera.lookAt(0, 0, 0);
            break;
        case 'A':
        case 'a':
            camera.position.x = Math.cos(cameraAngle) * cameraRadius;
            camera.position.z = Math.sin(cameraAngle) * cameraRadius;
            cameraAngle -= Math.PI / 18 * moveCameraSpeed; // Rotate camera angle
            camera.lookAt(0, 0, 0); 
            break; 
        case 'D':
        case 'd':
            camera.position.x = Math.cos(cameraAngle) * cameraRadius;
            camera.position.z = Math.sin(cameraAngle) * cameraRadius;
            cameraAngle += Math.PI / 18 * moveCameraSpeed; // Rotate camera angle
            camera.lookAt(0, 0, 0);
            break;
        case 'ArrowUp': 
            animationSpeed += 0.1;
            break;
        case 'ArrowDown':
            animationSpeed = Math.max(0, animationSpeed - 0.1);
            break;
        case 'C':
        case 'c':
            checkerEnabled = checkerEnabled > 0.5 ? 0.0 : 1.0;
            // Update all mesh materials
            meshGroups.forEach((mesh) => {
                if (mesh.material && mesh.material.uniforms && mesh.material.uniforms.uCheckerEnabled) {
                    mesh.material.uniforms.uCheckerEnabled.value = checkerEnabled;
                }
            });
            console.log('Checker pattern:', checkerEnabled > 0.5 ? 'ON' : 'OFF');
            break;
    }
})