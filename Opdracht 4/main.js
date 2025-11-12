const ROTATION_SPEED = 0.5 // radians per second
let intensity = 0.5; // Initial intensity
let vecLightPos = {x: 2.0, y: 2.0, z: 2.0};

function drawCube(angle) {
    // Clear canvas
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Set rotation angle
    gl.uniform1f(rotationAngleLocation, angle);

    // Tell opengl to draw the vertices in the arrayBuffer pointed to
    // by the indices in the elementArrayBuffer as a series of triangles
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 8);
}

function draw() {
    let angle = ROTATION_SPEED * 0.001 * (Date.now() - startTime);
    drawCube(angle);
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
        float scale = 5.0;
        float checkX = floor(vPos.x * scale);
        float checkY = floor(vPos.y * scale);
        float checkZ = floor(vPos.z * scale);
        float checker = mod(checkX + checkY + checkZ, 5.0);
        
        // Flip texture vertically (WebGL Y-axis is inverted)
        vec2 flippedTexCoord = vec2(vTexCoord.x, 1.0 - vTexCoord.y);
        vec3 texColor = texture(uTexture, flippedTexCoord* scale * 2.0).rgb;

        vec3 color1 = texColor; // Use texture by default

        if(originalNormal.y > 0.9 || originalNormal.y < -0.9){
            color1 = vec3(1.0, 5.0, 0.0); // Red for right face (no texture)
        }

        // Mix between 2 colors on checker pattern
        vec3 color2 = abs(normalizedNormal);         // Color based on face orientation
        vec3 color = mix(color1, color2, checker) * uIntensity;
        
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

// Vertices for cube (position, normal, texCoord)
let vertices = new Float32Array([
    // Front face (z = 1)
     1,  1,  1, 0, 0, 1, 1, 1,
     1, -1,  1, 0, 0, 1, 1, 0,
    -1, -1,  1, 0, 0, 1, 0, 0,
    -1, -1,  1, 0, 0, 1, 0, 0,
    -1,  1,  1, 0, 0, 1, 0, 1,
     1,  1,  1, 0, 0, 1, 1, 1,

    // Back face (z = -1)
     1,  1, -1, 0, 0, -1, 0, 1,
     1, -1, -1, 0, 0, -1, 0, 0,
    -1, -1, -1, 0, 0, -1, 1, 0,
    -1, -1, -1, 0, 0, -1, 1, 0,
    -1,  1, -1, 0, 0, -1, 1, 1,
     1,  1, -1, 0, 0, -1, 0, 1,

    // Right face (x = 1)
     1,  1,  1, 1, 0, 0, 1, 1,
     1, -1,  1, 1, 0, 0, 1, 0,
     1, -1, -1, 1, 0, 0, 0, 0,
     1, -1, -1, 1, 0, 0, 0, 0,
     1,  1, -1, 1, 0, 0, 0, 1,
     1,  1,  1, 1, 0, 0, 1, 1,

    // Left face (x = -1)
    -1,  1,  1, -1, 0, 0, 0, 1,
    -1, -1,  1, -1, 0, 0, 0, 0,
    -1, -1, -1, -1, 0, 0, 1, 0,
    -1, -1, -1, -1, 0, 0, 1, 0,
    -1,  1, -1, -1, 0, 0, 1, 1,
    -1,  1,  1, -1, 0, 0, 0, 1,

    // Top face (y = 1)
     1,  1,  1, 0, 1, 0, 1, 1,
    -1,  1,  1, 0, 1, 0, 0, 1,
    -1,  1, -1, 0, 1, 0, 0, 0,
    -1,  1, -1, 0, 1, 0, 0, 0,
     1,  1, -1, 0, 1, 0, 1, 0,
     1,  1,  1, 0, 1, 0, 1, 1,

    // Bottom face (y = -1)
     1, -1,  1, 0, -1, 0, 1, 0,
    -1, -1,  1, 0, -1, 0, 0, 0,
    -1, -1, -1, 0, -1, 0, 0, 1,
    -1, -1, -1, 0, -1, 0, 0, 1,
     1, -1, -1, 0, -1, 0, 1, 1,
     1, -1,  1, 0, -1, 0, 1, 0
]);


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

// Create a texture buffer
var texture = gl.createTexture();

// Create an image
var image = new Image();
image.crossOrigin = "";
image.src = "https://1054254.github.io/Computer-Graphics/Opdracht%204/image.jpg";

// Bind the texture buffer
gl.bindTexture(gl.TEXTURE_2D, texture);

// Fill the texture buffer with a temporary texture of 1 texel
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array(3), 0);

// Specify how the texture should be scaled
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

// Once the image has loaded, use it to fill the texture buffer
image.addEventListener("load", function() {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
});


// Set the background color
gl.clearColor(0.1, 0.1, 0.1, 1); // r, g, b, alpha

let uIntensityLoc = gl.getUniformLocation(program, "uIntensity");
gl.uniform1f(uIntensityLoc, 0.5);

let uLightPosLoc = gl.getUniformLocation(program, "ulightPos");
gl.uniform3f(uLightPosLoc, vecLightPos.x, vecLightPos.y, vecLightPos.z);

// Perspective projection matrix
let projectionLocation = gl.getUniformLocation(program, "projection");
let projection = new Float32Array([1, 0, 0, 0,
                                    0, 1, 0, 0,
                                    0, 0, -1, -1,
                                    0, 0, -1, 0]); // In column-major order
gl.uniformMatrix4fv(projectionLocation, false, projection); // Transpose field MUST be FALSE

// Translation matrix; move everything 3 units to the back
let translationLocation = gl.getUniformLocation(program, "translation");
let translation = new Float32Array([1, 0, 0, 0,
                                    0, 1, 0, 0,
                                    0, 0, 1, 0,
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

// Set a square viewport
gl.viewport((gl.canvas.width - gl.canvas.height) / 2, 0, gl.canvas.height, gl.canvas.height);

gl.enable(gl.DEPTH_TEST);

// Start animation
var startTime = Date.now();
setInterval(draw, 50); // 20 frames per second

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