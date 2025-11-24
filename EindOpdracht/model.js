function loadModel(stlFileUrl, name) {
    console.log('Loading model:', name);
    let model= [];
    let arrayBuffer = gl.createBuffer();

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
                vertices = parseSTL(fileContent, 1);

                model.verticesCount = vertices.length / 8;
                console.log('STL parsed, vertices:', vertices.length / 8);
                
                // Update buffer after loading
                gl.bindBuffer(gl.ARRAY_BUFFER, arrayBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
                
                // Set up vertex attributes AFTER buffer has data
                const aPos = gl.getAttribLocation(program, 'aPos');
                gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 32, 0);
                gl.enableVertexAttribArray(aPos);

                const aNormal = gl.getAttribLocation(program, 'aNormal');
                gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 32, 12);
                gl.enableVertexAttribArray(aNormal);

                const aTexCoord = gl.getAttribLocation(program, 'aTexCoord');
                gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 32, 24);
                gl.enableVertexAttribArray(aTexCoord);
                
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

    var planetRotation = gl.getUniformLocation(program, "planetRotation");
    var orbitRadius = gl.getUniformLocation(program, "orbitRadius");
    var orbitSpeed = gl.getUniformLocation(program, "orbitSpeed");

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
        console.log(name, ' texture loaded!');
    };

    // Set texture unit
    const uTextureLocation = gl.getUniformLocation(program, 'uTexture');
    gl.uniform1i(uTextureLocation, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    model.name = name;
    model.buffer = arrayBuffer;
    model.texture = texture;
    model.verticesCount = 0; // Will be set after loading
    model.position = {x: 0, y: 0, z: 0}; // Position offset
    model.orbitRotationSpeed = 0.0; // Orbit rotation angle

    return model
}

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

function getUrl(name) {
    let texturePath = `https://1054254.github.io/Computer-Graphics/EindOpdracht/solar-system/textures/gltf_embedded_${name}.`

    if (name === 'saturn_ring') {
        texturePath += 'png';
    } else {
        texturePath += 'jpeg';
    }
    return texturePath;
}
