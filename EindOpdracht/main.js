// "Solar system" (https://skfb.ly/oKYnC) by dannzjs is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).
let animationSpeed = 5; // speed of animtion
let intensity = 1.0; // Initial intensity
let vecLightPos = {x: 2.0, y: 2.0, z: 2.0};
let time = 0;
let checkerEnabled = 0.0; // Toggle for checker pattern


let textures = [];
let texturesLoaded = 0;
let startTime = Date.now();
let planets = []; // Array to store planet data with orbit info

// Array to store multiple models
let models = [];

let canvas = document.createElement('canvas');
canvas.width = 1000;
canvas.height = 1000;
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
let scale = 0.01;
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

let sunModel = loadModel('sun');
let mercuryModel = loadModel('mercury');
let venusModel = loadModel('venus');
let earthModel = loadModel('earth');
let marsModel = loadModel('mars');
let jupiterModel = loadModel('jupiter');
let saturnModel = loadModel('saturn');
let saturnRingModel = loadModel('saturn_ring');
let uranusModel = loadModel('uranus');
let neptuneModel = loadModel('neptune');
let moonModel = loadModel('moon');

models.push(sunModel);
models.push(mercuryModel);
models.push(venusModel);
models.push(earthModel);
models.push(marsModel);
models.push(jupiterModel);
models.push(saturnModel);
models.push(saturnRingModel);
models.push(uranusModel);
models.push(neptuneModel);
models.push(moonModel);

// number from https://courses.lumenlearning.com/suny-astronomy/chapter/physical-and-orbital-data-for-the-planets/
// Wait for sun model to load, then set up orbit positions
setTimeout(() => {
    let sunRadius = 0.00465046726; // Sun radius in AU
    let scaleOrbits = (sunModel.radius / sunRadius) / 100; // Scale factor for orbit distances
    
    console.log('Sun radius:', sunModel.radius, 'Scale factor:', scaleOrbits);
    
    mercuryModel.position.x = 0.39 * scaleOrbits;
    venusModel.position.x = 0.72 * scaleOrbits;
    earthModel.position.x = 1.0 * scaleOrbits;
    marsModel.position.x = 1.52 * scaleOrbits;
    jupiterModel.position.x = 5.2 * scaleOrbits;
    saturnModel.position.x = 9.54 * scaleOrbits;
    saturnRingModel.position.x = 9.54 * scaleOrbits;
    uranusModel.position.x = 19.19 * scaleOrbits;
    neptuneModel.position.x = 30.06 * scaleOrbits;
    
    // Set orbit speeds (relative to Earth = 1)
    mercuryModel.orbitRotationSpeed = 1/ 0.24; // Mercury orbits faster
    venusModel.orbitRotationSpeed = 1/ 0.6;
    earthModel.orbitRotationSpeed = 1.0;
    marsModel.orbitRotationSpeed = 1/ 1.88;
    jupiterModel.orbitRotationSpeed = 1/ 11.86;
    saturnModel.orbitRotationSpeed = 1/ 29.46;
    saturnRingModel.orbitRotationSpeed = 1/ 29.46;
    uranusModel.orbitRotationSpeed = 1/ 84.01;
    neptuneModel.orbitRotationSpeed = 1/ 164.82;

    // Set planet rotation speeds where 1 is one a day on earth
    mercuryModel.planetRotationspeed = 58
    venusModel.planetRotationspeed = -243
    earthModel.planetRotationspeed = 1
    marsModel.planetRotationspeed = 1.026
    jupiterModel.planetRotationspeed = 0.414
    saturnModel.planetRotationspeed = 0.440
    uranusModel.planetRotationspeed = -0.718
    neptuneModel.planetRotationspeed = 0.671
}, 500); // Wait 500ms for sun to load


function render(angle) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Set rotation angle
    models.forEach(model => {
        let planetRotationspeed = gl.getUniformLocation(program, "planetRotationspeed");
        gl.uniform1f(planetRotationspeed, angle);

        // Set position offset
        let posOffsetLoc = gl.getUniformLocation(program, "uPositionOffset");
        gl.uniform3f(posOffsetLoc, model.position.x, model.position.y, model.position.z);

        let orbitRotationLoc = gl.getUniformLocation(program, "orbitRotation");
        gl.uniform1f(orbitRotationLoc, model.orbitRotationSpeed * angle); // Example orbit speed

        if (model.verticesCount > 0) {
            // Bind the model's buffer and texture before drawing
            gl.bindBuffer(gl.ARRAY_BUFFER, model.buffer);
            
            // Re-set vertex attribute pointers for this buffer
            const aPos = gl.getAttribLocation(program, 'aPos');
            gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 32, 0);
            gl.enableVertexAttribArray(aPos);

            const aNormal = gl.getAttribLocation(program, 'aNormal');
            gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 32, 12);
            gl.enableVertexAttribArray(aNormal);

            const aTexCoord = gl.getAttribLocation(program, 'aTexCoord');
            gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 32, 24);
            gl.enableVertexAttribArray(aTexCoord);
            
            gl.bindTexture(gl.TEXTURE_2D, model.texture);
            gl.drawArrays(gl.TRIANGLES, 0, model.verticesCount);
        }
    });
    
    
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


