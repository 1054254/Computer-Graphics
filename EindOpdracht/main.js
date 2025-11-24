// "Solar system" (https://skfb.ly/oKYnC) by dannzjs is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).
let animationSpeed = 5; // speed of animtion
let intensity = 1.0; // Initial intensity
let vecLightPos = {x: 2.0, y: 2.0, z: 2.0};
let time = 0;
let checkerEnabled = 0.0; // Toggle for checker pattern


let meshGroups = [];
let textures = [];
let texturesLoaded = 0;
let startTime = Date.now();
let planets = []; // Array to store planet data with orbit info

let canvas = document.createElement('canvas');
canvas.width = 600;
canvas.height = 600;
document.body.appendChild(canvas);

var gl = canvas.getContext("webgl2");
if (!gl) {
    alert('WebGL2 not supported');
    throw new Error('WebGL2 not supported');
}

gl.viewport(0, 0, canvas.width, canvas.height);
gl.enable(gl.DEPTH_TEST);
gl.clearColor(0.1, 0.1, 0.1, 1.0);

// Create shaders

const vsSource = vertexShader();
const fsSource = fragmentShader();

// Compile shaders
const vs = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vs, vsSource);
gl.compileShader(vs);
if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    console.error('Vertex shader error:', gl.getShaderInfoLog(vs));
}

const fs = gl.createShader(gl.FRAGMENT_SHADER);

gl.shaderSource(fs, fsSource);
gl.compileShader(fs);
if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    console.error('Fragment shader error:', gl.getShaderInfoLog(fs));
}

const program = gl.createProgram();
gl.attachShader(program, vs);
gl.attachShader(program, fs);
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
}
gl.useProgram(program);

let uIntensityLoc = gl.getUniformLocation(program, "uIntensity");
gl.uniform1f(uIntensityLoc, 0.5);

let uLightPosLoc = gl.getUniformLocation(program, "uLightPos");
gl.uniform3f(uLightPosLoc, vecLightPos.x, vecLightPos.y, vecLightPos.z);

// Perspective projection matrix
let projectionLocation = gl.getUniformLocation(program, "projection");
let projection = new Float32Array([1, 0, 0, 0,
                                    0, 1, 0, 0,
                                    0, 0, -1, -1,
                                    0, 0, -1, 0]); // In column-major order
gl.uniformMatrix4fv(projectionLocation, false, projection); // Transpose field MUST be FALSE

// Translation matrix; move everything 3 units to the back
let scale = 0.1;
let translationLocation = gl.getUniformLocation(program, "translation");
let translation = new Float32Array([scale, 0, 0, 0,
                                    0, scale, 0, 0,
                                    0, 0, scale, 0,
                                    0, 0, -3, 1]); // In column-major order
gl.uniformMatrix4fv(translationLocation, false, translation); // Transpose field MUST be FALSE

// Fixed rotation matrix; rotate 30° around x-axis
let fixedRotationLocation = gl.getUniformLocation(program, "fixedRotation");
let c = Math.cos(Math.PI / 6);
let s = Math.sin(Math.PI / 6);
let fixedRotation = new Float32Array([1,  0, 0, 0,
                                        0,  c, s, 0,
                                        0, -s, c, 0,
                                        0,  0, 0, 1]); // In column-major order
gl.uniformMatrix4fv(fixedRotationLocation, false, fixedRotation); // Transpose field MUST be FALSE

// Load the solar system model from github
let stlFileUrl = 'https://1054254.github.io/Computer-Graphics/EindOpdracht/solar-system/stl/Sun.stl';
let vertices = new Float32Array([]);

// Load STL file
fetch(stlFileUrl)
    .then(response => {
        console.log('Fetching STL...');
        return response.text();
    })
    .then(fileContent => {
        console.log('STL downloaded, size:', fileContent.length, 'bytes');
        
        // Use setTimeout to allow UI to update
        setTimeout(() => {
            try {
                vertices = parseSTL(fileContent);
                console.log('STL parsed, vertices:', vertices.length / 8);
                
                // Update buffer after loading
                gl.bindBuffer(gl.ARRAY_BUFFER, arrayBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
                
                // Remove loading indicator
                console.log('Ready to render!');
            } catch (e) {
                console.error('Parse error:', e);

            }
        }, 100);
    })
    .catch(error => {
        console.error('Error loading STL:', error);
    });

let arrayBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, arrayBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

// Set up vertex attributes
const aPos = gl.getAttribLocation(program, 'aPos');
gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 32, 0);
gl.enableVertexAttribArray(aPos);

const aNormal = gl.getAttribLocation(program, 'aNormal');
gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 32, 12);
gl.enableVertexAttribArray(aNormal);

const aTexCoord = gl.getAttribLocation(program, 'aTexCoord');
gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 32, 24);
gl.enableVertexAttribArray(aTexCoord);

var rotationAngleLocation = gl.getUniformLocation(program, "rotationAngle");

// Load Sun texture
const texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texture);

// Create a placeholder 1x1 pixel while loading
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 200, 100, 255]));

const image = new Image();
image.crossOrigin = "anonymous";
image.src = 'https://1054254.github.io/Computer-Graphics/EindOpdracht/solar-system/textures/gltf_embedded_10.jpeg';
image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    console.log('Sun texture loaded!');
};

// Set texture unit
const uTextureLocation = gl.getUniformLocation(program, 'uTexture');
gl.uniform1i(uTextureLocation, 0);
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, texture);

function getTextureNumber(planetName) {
    const searchName = planetName.toLowerCase();
    
    if (searchName.includes('moon')) return 9;
    if (searchName.includes('sun')) return 10;
    if (searchName.includes('erath') || searchName.includes('earth')) return 2;
    if (searchName.includes('mars')) return 3;
    if (searchName.includes('venus')) return 1;
    if (searchName.includes('jupiter')) return 4;
    if (searchName.includes('saturn_ring')) return 6; // Check ring BEFORE saturn
    if (searchName.includes('saturn')) return 5;
    if (searchName.includes('uranus')) return 7;
    if (searchName.includes('neptune')) return 8;
    if (searchName.includes('pluto')) return 9;
    if (searchName.includes('mercury')) return 0;
    
    console.warn('Unknown planet for texture number:', planetName);
    return null;
}

function setTexture(mesh) {
    const parentName = mesh.parent?.name?.toLowerCase() || '';
    const fileNumber = getTextureNumber(parentName);
    
    if (fileNumber === null) {
        console.warn('Unknown parent for mesh:', mesh.name, 'Parent:', parentName);
        return;
    }
    
    // Check if this is the sun
    const isSun = parentName.includes('sun');
    
    let texturePath = `https://1054254.github.io/Computer-Graphics/EindOpdracht/solar-system/textures/gltf_embedded_${fileNumber}.`

    if (fileNumber === 6) {
        texturePath += 'png';
    } else {
        texturePath += 'jpeg';
    }

    const texture = gl.createTexture();
    const image = new Image();
    image.src = texturePath;
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        texturesLoaded++;
        console.log(`Texture loaded for ${parentName} from ${texturePath}`);
    }
}

function getByParentPlanetMesh(planetName) {
    // Find and return the mesh for a specific planet by searching parent names
    
    console.warn(`Planet mesh not found for: ${planetName}`);
    return null;
}


function render(angle) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Set rotation angle
    gl.uniform1f(rotationAngleLocation, angle);
    
    if (vertices.length > 0) {
        gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 8);
    }
}

function animate() {
    time = Date.now() - startTime;
    let angle = 1 * 0.001 * (time);
    render(angle);
}

setInterval(animate, 50); // 20 FPS

addEventListener('resize', () => {
    // canvas.width = window.innerWidth;
    // canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
})

moveCameraSpeed = 0.3;
cameraAngle = 90;
//cameraRadius = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);

addEventListener('keydown', (event) => {
    switch(event.key) {
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
            console.log('Checker pattern:', checkerEnabled > 0.5 ? 'ON' : 'OFF');
            break;
    }
})


function parseSTL(fileContent) {
    console.log('Starting STL parse...');
    const lines = fileContent.split('\n');
    let vertices = [];

    let currentNormal = [0, 0, 0];
    let vertexCount = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(/\s+/);
        const firstword = parts[0];

        switch(firstword){
            case 'solid':
                break;
            case 'facet': // normal
                if (parts[1] === 'normal') {
                    currentNormal = [
                        parseFloat(parts[2]),
                        parseFloat(parts[3]),
                        parseFloat(parts[4])
                    ];
                }
                break;
            case 'outer': // loop
                break;
            case 'vertex':
                const x = parseFloat(parts[1]);
                const y = parseFloat(parts[2]);
                const z = parseFloat(parts[3]);
                
                // Calculate spherical UV coordinates
                const len = Math.sqrt(x*x + y*y + z*z);
                const u = 0.5 + Math.atan2(z, x) / (2 * Math.PI);
                const v = 0.5 - Math.asin(y / len) / Math.PI;
                
                // Push: position (3), normal (3), texCoord (2)
                vertices.push(x, y, z, currentNormal[0], currentNormal[1], currentNormal[2], u, v); 
                vertexCount++;
                
                break;
            case 'endloop':
                break;
            case 'endfacet':
                break;
            case 'endsolid':
                break;
            default:
                console.warn('Unknown STL line start: ', firstword);
                break;
        }
    }
    console.log('STL parse complete, total vertices:', vertexCount);
    return new Float32Array(vertices);
}