function vertexShader() {
    return `#version 300 es
    in vec3 aPos;
    in vec3 aNormal;
    in vec2 aTexCoord;
    uniform mat4 projection;
    uniform mat4 translation;
    uniform mat4 fixedRotation;
    uniform float planetRotationspeed;
    uniform float orbitRotation;
    uniform vec3 uPositionOffset;
    out vec3 vNormal;
    out vec3 vPos;
    out vec2 vTexCoord;


    mat4 calculatRotation(float angle);
    
    void main() {
        mat4 rotation = calculatRotation(planetRotationspeed);
        mat4 orbitRotationMatrix = calculatRotation(orbitRotation);

        vNormal = aNormal;
        vPos = aPos;
        vTexCoord = aTexCoord;
        
        // Apply position offset after rotation
        vec4 rotatedPos = rotation * vec4(aPos, 1.0);
        vec4 offsetPos = rotatedPos + vec4(uPositionOffset, 0.0);
        vec4 orbitPos = offsetPos * orbitRotationMatrix;
        gl_Position = projection * translation * fixedRotation * orbitPos;
    }
    mat4 calculatRotation(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat4(c, 0, -s, 0,
                0, 1,  0, 0,
                s, 0,  c, 0,
                0, 0,  0, 1);
    }`;
}

function fragmentShader() {
    return `#version 300 es
    precision mediump float;
    in vec3 vNormal;
    in vec3 vPos;
    in vec2 vTexCoord;
    uniform sampler2D uTexture;
    out vec4 fragColor;
    void main() {
        // Simple directional lighting
        vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0));
        vec3 normal = normalize(vNormal);
        float diff = max(dot(normal, lightDir), 0.0);
        
        // Sample texture
        vec3 texColor = texture(uTexture, vTexCoord).rgb;
        
        // Ambient + diffuse lighting
        vec3 ambient = 0.3 * texColor;
        vec3 diffuse = diff * texColor;
        
        fragColor = vec4(ambient + diffuse, 1.0);
    }`;
}