function vertexShader() {
    return `#version 300 es
    in vec3 aPos;
    in vec3 aNormal;
    in vec2 aTexCoord;
    uniform mat4 uTransform;
    out vec3 vNormal;
    out vec3 vPos;
    out vec2 vTexCoord;
    out vec3 oNormal;
    
    void main() {
        // Transform position and normal to world space for proper lighting
        vec4 worldPos = uTransform * vec4(aPos, 1.0);
        vPos = worldPos.xyz / worldPos.w;
        vNormal = mat3(uTransform) * aNormal;
        vTexCoord = aTexCoord;
        
        oNormal = aNormal;

        // Apply the combined transformation matrix
        gl_Position = worldPos;
    }`;
}

function fragmentShader() {
    return `#version 300 es
    precision mediump float;
    in vec3 vNormal;
    in vec3 oNormal;
    in vec3 vPos;
    in vec2 vTexCoord;
    uniform vec3 uLightPos;
    uniform vec3 uCameraPos;
    uniform sampler2D uTexture;
    uniform float uAmbient;
    uniform float uDiffuse;
    uniform float uSpecular;
    uniform bool uCheckerEnabled;
    out vec4 fragColor;
    void main() {
        vec3 normalizedNormal = normalize(vNormal);
        vec3 lightDirection = normalize(uLightPos - vPos);
        vec3 viewDirection = normalize(uCameraPos - vPos);
        vec3 reflectedDirection = reflect(-lightDirection, normalizedNormal);
        
        // Sample texture
        vec3 texColor = texture(uTexture, vTexCoord).rgb;

        float ambient = uAmbient;
        float diffuse = uDiffuse * max(0.0, dot(normalizedNormal, lightDirection));
        float specular = uSpecular * pow(max(0.0, dot(viewDirection, reflectedDirection)), 32.0);

        float light = ambient + diffuse + specular;

        // Create a checker pattern based on texture coordinates
        if (uCheckerEnabled) {
            float scale = 50.0; // Scale of the checker pattern
            float checker = mod(floor(vTexCoord.x * scale) + floor(vTexCoord.y * scale), 2.0);
            
            normalizedNormal = normalize(oNormal) * 0.5 + 0.2;
            texColor = mix(texColor, normalizedNormal, checker);
        }

        fragColor = vec4(texColor * light, 1.0);
    }`;
}