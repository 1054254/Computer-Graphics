// "Solar system" (https://skfb.ly/oKYnC) by dannzjs is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).
const ROTATION_SPEED = 0.5 // radians per second
let intensity = 0.5; // Initial intensity
let vecLightPos = {x: 2.0, y: 2.0, z: 2.0};

// Function to parse STL file (handles both ASCII and binary formats)
function parseSTL(arrayBuffer) {
    // Check if it's ASCII format
    const uint8Array = new Uint8Array(arrayBuffer);
    const text = new TextDecoder().decode(uint8Array.slice(0, 100));
    
    if (text.toLowerCase().includes('solid')) {
        console.log("Detected ASCII STL format");
        return parseASCIISTL(arrayBuffer);
    } else {
        console.log("Detected binary STL format");
        return parseBinarySTL(arrayBuffer);
    }
}

// Parse ASCII STL
function parseASCIISTL(arrayBuffer) {
    const text = new TextDecoder().decode(new Uint8Array(arrayBuffer));
    const vertices = [];
    const lines = text.split('\n');
    
    let currentNormal = [0, 0, 0];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('facet normal')) {
            const parts = line.split(/\s+/);
            currentNormal = [parseFloat(parts[2]), parseFloat(parts[3]), parseFloat(parts[4])];
        } else if (line.startsWith('vertex')) {
            const parts = line.split(/\s+/);
            const x = parseFloat(parts[1]);
            const y = parseFloat(parts[2]);
            const z = parseFloat(parts[3]);
            
            // Push: position (3), normal (3), texCoord (2)
            vertices.push(x, y, z, currentNormal[0], currentNormal[1], currentNormal[2], 0, 0);
        }
    }
    
    console.log("ASCII STL parsed, total vertices:", vertices.length / 8);
    return new Float32Array(vertices);
}

// Parse binary STL
function parseBinarySTL(arrayBuffer) {
    const dataView = new DataView(arrayBuffer);
    
    // Check if file is large enough
    if (arrayBuffer.byteLength < 84) {
        throw new Error("File too small to be a valid binary STL");
    }
    
    // Skip 80-byte header
    const triangleCount = dataView.getUint32(80, true); // little-endian
    console.log("Binary STL Triangle count:", triangleCount);
    
    // Validate file size
    const expectedSize = 84 + triangleCount * 50; // header(80) + count(4) + triangles(50 each)
    if (arrayBuffer.byteLength < expectedSize) {
        console.warn("File size mismatch. Expected:", expectedSize, "Got:", arrayBuffer.byteLength);
    }
    
    const vertices = [];
    let offset = 84; // Start after header (80) and triangle count (4)
    
    for (let i = 0; i < triangleCount; i++) {
        if (offset + 50 > arrayBuffer.byteLength) {
            console.warn("Reached end of file at triangle", i);
            break;
        }
        
        // Read normal (3 floats)
        const nx = dataView.getFloat32(offset, true);
        const ny = dataView.getFloat32(offset + 4, true);
        const nz = dataView.getFloat32(offset + 8, true);
        offset += 12;
        
        // Read 3 vertices (each has x, y, z)
        for (let v = 0; v < 3; v++) {
            const x = dataView.getFloat32(offset, true);
            const y = dataView.getFloat32(offset + 4, true);
            const z = dataView.getFloat32(offset + 8, true);
            offset += 12;
            
            // Push: position (3), normal (3), texCoord (2)
            vertices.push(x, y, z, nx, ny, nz, 0, 0);
        }
        
        // Skip attribute byte count (2 bytes)
        offset += 2;
    }
    
    console.log("Binary STL parsed, total vertices:", vertices.length / 8);
    return new Float32Array(vertices);
}

// Function to load STL file
function loadSTL(url, callback) {
    console.log("Fetching STL from:", url);
    fetch(url)
        .then(response => {
            console.log("Fetch response status:", response.status);
            if (!response.ok) {
                throw new Error("HTTP error " + response.status);
            }
            return response.arrayBuffer();
        })
        .then(arrayBuffer => {
            console.log("ArrayBuffer received, size:", arrayBuffer.byteLength);
            const vertices = parseSTL(arrayBuffer);
            console.log("Parsed vertices, calling callback...");
            callback(vertices);
        })
        .catch(error => {
            console.error("Error loading STL:", error);
            alert("Failed to load STL file: " + error.message);
        });
}

function draw3Dmodel(angle) {
    // Clear canvas
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Set rotation angle
    gl.uniform1f(rotationAngleLocation, angle);

    if (meshGroups.length > 0) {
        // Draw each mesh group with its own texture
        let vertexOffset = 0;
        for (let i = 0; i < meshGroups.length; i++) {
            const meshVertexCount = meshGroups[i].length / 8;
            
            // Bind the appropriate texture for this mesh
            const textureIndex = i % textures.length; // Wrap if more meshes than textures
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, textures[textureIndex]);
            gl.uniform1i(objectIDLocation, i);
            
            gl.drawArrays(gl.TRIANGLES, vertexOffset, meshVertexCount);
            vertexOffset += meshVertexCount;
        }
    } else {
        // Fallback: draw all vertices as one object
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textures[0]);
        gl.uniform1i(objectIDLocation, 0);
        gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 8);
    }
}   

function draw() {
    let angle = ROTATION_SPEED * 0.001 * (Date.now() - startTime);
    draw3Dmodel(angle);
}

// Get WebGL 2.0 context
var gl = document.getElementById("myCanvas").getContext("webgl2");

// Compile vertex shader
let vs = gl.createShader(gl.VERTEX_SHADER);
let vsSource =
    `#version 300 es
    in vec3 aPos;
    in vec3 aNormal;
    in vec2 aTexCoord;
    out vec3 vPos;
    out vec2 vTexCoord;
    out vec3 normal;
    out vec3 originalNormal;
    out vec3 fragPos;
    uniform mat4 projection;
    uniform mat4 translation;
    uniform mat4 fixedRotation;
    uniform float rotationAngle;

    void main() {
        float s = sin(rotationAngle);
        float c = cos(rotationAngle);
        mat4 rotation = mat4(c, 0, -s, 0,
                                0, 1,  0, 0,
                                s, 0,  c, 0,
                                0, 0,  0, 1); // Rotation matrix in column-major order

        vec4 worldPos = translation * fixedRotation * rotation * vec4(aPos, 1.0);
        normal = mat3(fixedRotation * rotation) * aNormal;
        originalNormal = aNormal; // Keep original normal before rotation
        fragPos = worldPos.xyz;
        vTexCoord = aTexCoord;
        vPos = aPos;

        gl_Position = projection * worldPos; 
    }`;
gl.shaderSource(vs, vsSource);
gl.compileShader(vs);
let compileStatus = gl.getShaderParameter(vs, gl.COMPILE_STATUS);
if (!compileStatus) {
    let log = gl.getShaderInfoLog(vs);
    throw new Error(log);
}

// Compile fragment shader
let fs = gl.createShader(gl.FRAGMENT_SHADER);
let fsSource = 
    `#version 300 es
    precision mediump float;
    uniform float uIntensity;
    uniform vec3 ulightPos;
    uniform sampler2D uTexture;
    in vec3 vPos;
    in vec2 vTexCoord;
    in vec3 normal;
    in vec3 originalNormal;
    in vec3 fragPos;
    uniform int objectID;
    out vec4 fragColor;
    void main() {
        vec3 lightPos = ulightPos;
        
        vec3 normalizedNormal = normalize(normal);
        vec3 reverseLightDirection = normalize(lightPos - fragPos);
        vec3 viewingDirection = normalize(fragPos);
        vec3 reflectedDirection = reflect(reverseLightDirection, normalizedNormal);
        
        float ambient = 0.2;
        float diffuse = 0.5 * max(0.0, dot(normalizedNormal, reverseLightDirection));
        float specular = 0.5 * pow(max(0.0, dot(viewingDirection, reflectedDirection)), 32.0);
        
        float lightness = ambient + diffuse + specular;
        
        // Create checker pattern using texture coordinates
        float scale = 0.01;
        float checkX = floor(vPos.x * scale);
        float checkY = floor(vPos.y * scale);
        float checkZ = floor(vPos.z * scale);
        float checker = mod(checkX + checkY + checkZ, 2.0);
        
        // Use texture for color
        // Generate spherical UV coordinates from normal direction
        vec3 n = normalize(originalNormal);
        float u = 0.5 + atan(n.z, n.x) / (2.0 * 3.14159265);
        float v = 0.5 - asin(clamp(n.y, -1.0, 1.0)) / 3.14159265;
        vec2 sphericalUV = vec2(u, v);
        
        vec3 texColor = texture(uTexture, sphericalUV).rgb;
        
        // Apply lighting to texture color
        vec3 color = texColor * uIntensity;
        
        fragColor = vec4(color, 1.0);
        fragColor.rgb *= lightness;
    }`;
gl.shaderSource(fs, fsSource);
gl.compileShader(fs);
let compileStatusFs = gl.getShaderParameter(fs, gl.COMPILE_STATUS);
if (!compileStatusFs) {
    let log = gl.getShaderInfoLog(fs);
    throw new Error(log);
}

// Combine the two shaders into a program
let program = gl.createProgram();
gl.attachShader(program, vs);
gl.attachShader(program, fs);
gl.linkProgram(program);
gl.deleteShader(vs);
gl.deleteShader(fs);
gl.useProgram(program);

// Store separate meshes for different planets
let meshGroups = [];
let textures = [];
let texturesLoaded = 0;

// Function to separate meshes by position
function separateMeshes(vertices) {
    const groups = [];
    const vertexCount = vertices.length / 8;
    
    // First pass: find all unique positions (center of each object)
    const positions = [];
    for (let i = 0; i < vertexCount; i += 100) { // Sample every 100th vertex
        const x = vertices[i * 8 + 0];
        const y = vertices[i * 8 + 1];
        const z = vertices[i * 8 + 2];
        positions.push({x, y, z});
    }
    
    // Calculate distances to find clusters
    const centers = [];
    const minDistance = 10; // Minimum distance between object centers
    
    for (let pos of positions) {
        let tooClose = false;
        for (let center of centers) {
            const dx = pos.x - center.x;
            const dy = pos.y - center.y;
            const dz = pos.z - center.z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            if (dist < minDistance) {
                tooClose = true;
                break;
            }
        }
        if (!tooClose) {
            centers.push(pos);
        }
    }
    
    console.log("Found", centers.length, "object centers");
    
    // Second pass: assign each vertex to nearest center
    for (let c = 0; c < centers.length; c++) {
        groups[c] = [];
    }
    
    for (let i = 0; i < vertexCount; i++) {
        const x = vertices[i * 8 + 0];
        const y = vertices[i * 8 + 1];
        const z = vertices[i * 8 + 2];
        
        // Find nearest center
        let minDist = Infinity;
        let nearestGroup = 0;
        
        for (let g = 0; g < centers.length; g++) {
            const dx = x - centers[g].x;
            const dy = y - centers[g].y;
            const dz = z - centers[g].z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            if (dist < minDist) {
                minDist = dist;
                nearestGroup = g;
            }
        }
        
        // Add vertex to nearest group
        for (let j = 0; j < 8; j++) {
            groups[nearestGroup].push(vertices[i * 8 + j]);
        }
    }
    
    console.log("Mesh group sizes:", groups.map(g => g.length / 8));
    return groups.map(g => new Float32Array(g));
}

// Load STL file and initialize rendering
console.log("Attempting to load STL file...");
loadSTL('https://1054254.github.io/Computer-Graphics/EindOpdracht/solar_system_animation.stl', function(loadedVertices) {
    console.log("STL loaded successfully!");
    console.log("Total vertices:", loadedVertices.length / 8);
    
    // Separate into different meshes
    meshGroups = separateMeshes(loadedVertices);
    console.log("Mesh group sizes:", meshGroups.map(g => g.length / 8));
    
    // Use all vertices combined for now
    vertices = loadedVertices;
    
    // Update the buffer with new vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, arrayBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    
    // Start animation after loading
    startTime = Date.now();
    setInterval(draw, 50);
});

// Vertices will be loaded from STL file
let vertices = new Float32Array([]);

// Create an arrayBuffer and fill it with data
let arrayBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, arrayBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

// Positions using 3 floats per vertex, stride of 32 bytes (8 32-bit floats)
let posLocation = gl.getAttribLocation(program, "aPos");
gl.vertexAttribPointer(posLocation, 3, gl.FLOAT, false, 32, 0);
gl.enableVertexAttribArray(posLocation);

// Normals using 3 floats per vertex, stride of 32 bytes, offset of 12 bytes
let normalLocation = gl.getAttribLocation(program, "aNormal");
gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 32, 12);
gl.enableVertexAttribArray(normalLocation);

// Texture coordinates using 2 floats per vertex, stride of 32 bytes, offset of 24 bytes
let texCoordLocation = gl.getAttribLocation(program, "aTexCoord");
gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 32, 24);
gl.enableVertexAttribArray(texCoordLocation);

// Load textures for each planet (0-9)
function loadTextures() {
    const baseURL = "https://1054254.github.io/Computer-Graphics/EindOpdracht/solar-system/textures/";
    
    for (let i = 0; i < 10; i++) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        
        // Fill with temporary 1x1 pixel
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, 
                     new Uint8Array([128, 128, 128, 255]));
        
        // Load the actual image
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = baseURL + "gltf_embedded_" + i + ".jpeg";
        
        image.onload = function() {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            texturesLoaded++;
            console.log("Loaded texture", i, "Size:", image.width, "x", image.height, "(" + texturesLoaded + "/10)");
        };
        
        image.onerror = function() {
            console.error("Failed to load texture", i, "from URL:", image.src);
            // Use a solid color instead
            const colors = [
                [255, 200, 0, 255],    // 0: Yellow
                [180, 180, 180, 255],  // 1: Gray
                [255, 180, 100, 255],  // 2: Orange
                [80, 120, 220, 255],   // 3: Blue
                [220, 100, 50, 255],   // 4: Red
                [200, 180, 130, 255],  // 5: Tan
                [230, 200, 150, 255],  // 6: Pale yellow
                [100, 180, 230, 255],  // 7: Cyan
                [50, 80, 200, 255],    // 8: Deep blue
                [180, 180, 200, 255]   // 9: Light gray
            ];
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, 
                         new Uint8Array(colors[i]));
        };
        
        textures.push(texture);
    }
}

// Load all textures
loadTextures();


// Set the background color
gl.clearColor(0.1, 0.1, 0.1, 1); // r, g, b, alpha

let uIntensityLoc = gl.getUniformLocation(program, "uIntensity");
gl.uniform1f(uIntensityLoc, 0.5);

let uLightPosLoc = gl.getUniformLocation(program, "ulightPos");
gl.uniform3f(uLightPosLoc, vecLightPos.x, vecLightPos.y, vecLightPos.z);

// Set texture sampler to use texture unit 0
let uTextureLoc = gl.getUniformLocation(program, "uTexture");
gl.uniform1i(uTextureLoc, 0);

// Perspective projection matrix
let projectionLocation = gl.getUniformLocation(program, "projection");
let projection = new Float32Array([1, 0, 0, 0,
                                    0, 1, 0, 0,
                                    0, 0, -1, -1,
                                    0, 0, -1, 0]); // In column-major order
gl.uniformMatrix4fv(projectionLocation, false, projection); // Transpose field MUST be FALSE

// Translation and scale matrix; scale down and move back 3 units
let translationLocation = gl.getUniformLocation(program, "translation");
let scale = 0.1; // Adjust this value: smaller = smaller model (try 0.1, 0.01, 0.001, etc.)
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

// Get location of rotation angle uniform
var rotationAngleLocation = gl.getUniformLocation(program, "rotationAngle");

// Get location of objectID uniform (for different colors per mesh)
var objectIDLocation = gl.getUniformLocation(program, "objectID");
gl.uniform1i(objectIDLocation, 0); // Default to 0

// Set a square viewport
gl.viewport((gl.canvas.width - gl.canvas.height) / 2, 0, gl.canvas.height, gl.canvas.height);

gl.enable(gl.DEPTH_TEST);

// Start animation - moved inside loadSTL callback
var startTime = Date.now();

document.addEventListener("keydown", function(e){
    switch(e.key){
        case "ArrowUp":
            intensity += 0.1;// increase by 0.1 each press
            if (intensity > 2.0) intensity = 2.0; // clamp max
            gl.useProgram(program);
            gl.uniform1f(uIntensityLoc, intensity);
            break;
        case "ArrowDown":
            intensity -= 0.1;// decrease by 0.1 each press
            if (intensity < 0.0) intensity = 0.0; // clamp min
            gl.useProgram(program);
            gl.uniform1f(uIntensityLoc, intensity);
            break;
        case "ArrowLeft":
            // Change to blue color
            break;
        case "ArrowRight":
            // Change to red color
            break;
    }
})


document.addEventListener("mousemove", function(e) {
    // Use e.clientX and e.clientY directly and update light position so the variables are used
    let mouseX = e.clientX;
    let mouseY = e.clientY;
    
    // Map mouse to a reasonable light position range and update the uniform
    vecLightPos.x = (mouseX / window.innerWidth - 0.5) * 4.0 + 2.0;
    vecLightPos.y = (0.5 - mouseY / window.innerHeight) * 4.0 + 2.0;
    gl.useProgram(program);
    gl.uniform3f(uLightPosLoc, vecLightPos.x, vecLightPos.y, vecLightPos.z);
})