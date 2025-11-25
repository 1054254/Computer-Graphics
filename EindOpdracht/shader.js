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