function vertexShader() {
    return `
    varying vec3 vPos;
    varying vec2 vTexCoord;
    varying vec3 vNormal;
    varying vec3 vFragPos;
    
    void main() {
        vPos = position;
        vTexCoord = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vFragPos = worldPos.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;
}

function fragmentShader() {
    return `
    precision mediump float;
    
    uniform float uIntensity;
    uniform vec3 uLightPos;
    uniform sampler2D uTexture;
    uniform bool uCheckerEnabled;
    uniform bool uIsSun;
    
    varying vec3 vPos;
    varying vec2 vTexCoord;
    varying vec3 vNormal;
    varying vec3 vFragPos;
    
    void main() {
        // Sample the texture
        vec3 texColor = texture2D(uTexture, vTexCoord).rgb;
        vec3 color;
        
        
        // Regular lighting for planets
        vec3 normalizedNormal = normalize(vNormal);
        vec3 lightDirection = normalize(uLightPos - vFragPos);
        vec3 viewDirection = normalize(cameraPosition - vFragPos);
        vec3 reflectDirection = reflect(-lightDirection, normalizedNormal);
        
        float ambient = 0.3;
        float diffuse = 0.6 * max(0.0, dot(normalizedNormal, lightDirection));
        float specular = 0.3 * pow(max(0.0, dot(viewDirection, reflectDirection)), 32.0);
        
        float lightness = ambient + diffuse + specular;
        
        if (uCheckerEnabled) {
            // Create checker pattern using texture coordinates
            float scale = 50.0;
            float checkX = floor(vTexCoord.x * scale);
            float checkY = floor(vTexCoord.y * scale);
            float checker = mod(checkX + checkY, 5.0);
            
            // Mix between texture and bright color on checker pattern
            vec3 color1 = texColor;
            vec3 color2 = vec3(0.2, 0.1, 0.4); // Bright green for contrast
            color = mix(color1, color2, checker) * uIntensity;
        } else {
            color = texColor * uIntensity;
        }
        gl_FragColor = vec4(color * lightness, 1.0);
        if (uIsSun) {
            gl_FragColor = vec4(color * 2.0, 1.0); // Extra bright for sun
        }
    }`;
}