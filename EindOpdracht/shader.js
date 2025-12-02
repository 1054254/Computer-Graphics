function vertexShader() {
    return `#version 300 es
    in vec3 aPos;
    in vec3 aNormal;
    in vec2 aTexCoord;
    uniform mat4 uTransform;
    out vec3 vNormal;
    out vec3 vPos;
    out vec2 vTexCoord;
    
    void main() {
        vNormal = aNormal;
        vPos = aPos;
        vTexCoord = aTexCoord;
        
        // Apply the combined transformation matrix
        gl_Position = uTransform * vec4(aPos, 1.0);
    }`;
}

function fragmentShader() {
    return `#version 300 es
    precision mediump float;
    in vec3 vNormal;
    in vec3 vPos;
    in vec2 vTexCoord;
    uniform vec3 uLightPos;
    uniform sampler2D uTexture;
    uniform bool isSun;
    out vec4 fragColor;
    void main() {
        // Simple directional lighting
        vec3 lightDir = normalize(uLightPos);
        vec3 normal = normalize(vNormal);
        float diff = max(dot(normal, lightDir), 0.0);
        
        // Sample texture
        vec3 texColor = texture(uTexture, vTexCoord).rgb;
        
        vec3 ambient = 0.7 * texColor;
        // Ambient + diffuse lighting
        if (isSun) {
            ambient *= 2.0;
        }
        vec3 diffuse = diff * texColor;
        vec3 light = ambient + diffuse;
        fragColor = vec4(light, 1.0);
    }`;
}