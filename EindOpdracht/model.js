function loadModel(name) {
    console.log('Loading model:', name);
    let model= [];
    let arrayBuffer = gl.createBuffer();
    let radius

    fetch(getModelUrl(name))
    .then(response => {
        console.log('Fetching OBJ...');
        return response.text();
    })
    .then(fileContent => {
        console.log('OBJ downloaded, size:', fileContent.length, 'bytes');
        
        // Use setTimeout to allow UI to update
        setTimeout(() => {
            try {
                vertices = parseSTL(fileContent, name);

                x = vertices[0] 
                y = vertices[1]
                z = vertices[2]

                radius = Math.sqrt(x*x + y*y + z*z);

                model.verticesCount = vertices.length / 8;
                model.radius = radius;
                console.log('OBJ parsed, vertices:', vertices.length / 8, 'radius:', radius);
                
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
        console.error('Error loading OBJ:', error);
    });

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Create a placeholder 1x1 pixel while loading
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 200, 100, 255]));

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = getTextureUrl(name);
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
    model.orbitRadius = 0.0; // Orbit radius
    model.radius = radius
    model.orbitRotationSpeed = 0.0; // Orbit rotation speed
    model.planetRotationspeed = 1.0; // Planet rotation speed (default 1 day)
    model.ambient = 0.2; // Ambient light factor
    model.diffuse = 0.7; // Diffuse light factor
    model.specular = 0.5; // Specular light factor

    return model
}

function parseSTL(fileContent, modelName) {
    console.log('Starting STL parse...');
    const lines = fileContent.split('\n');
    let vertices = [];

    let currentNormal = [0, 0, 0];
    let vertexCount = 0;
    
    // For Saturn ring analysis
    let ringAnalysis = null;

    // First pass: collect all vertices for ring analysis
    if (modelName === 'saturn_ring') {
        let ringVertices = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const parts = line.split(/\s+/);
            if (parts[0] === 'vertex') {
                const x = parseFloat(parts[1]);
                const y = parseFloat(parts[2]);
                const z = parseFloat(parts[3]);
                ringVertices.push({x, y, z});
            }
        }
        
        // Analyze ring geometry to find plane and radii
        ringAnalysis = analyzeRingGeometry(ringVertices);
        console.log('Ring analysis:', ringAnalysis);
        console.log('Total ring vertices:', ringVertices.length);
    }

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
                
                let u, v;
                
                if (modelName === 'saturn_ring' && ringAnalysis) {
                    // Use the analyzed ring properties
                    const radius = getRingRadius(x, y, z, ringAnalysis.plane);
                    const angle = getRingAngle(x, y, z, ringAnalysis.plane);
                    
                    // For Saturn ring texture: U = radial distance, V = angular position
                    // This matches typical ring texture layout where bands go horizontally
                    u = (radius - ringAnalysis.innerRadius) / (ringAnalysis.outerRadius - ringAnalysis.innerRadius);
                    u = Math.max(0, Math.min(1, u)); // Clamp to 0-1
                    
                    // V wraps around the ring
                    v = (angle + Math.PI) / (2 * Math.PI);
                } else {
                    // Calculate spherical UV coordinates for planets
                    const len = Math.sqrt(x*x + y*y + z*z);
                    u = 0.5 + Math.atan2(z, x) / (2 * Math.PI);
                    v = 0.5 - Math.asin(y / len) / Math.PI;
                }
                
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

function analyzeRingGeometry(vertices) {
    // Calculate bounding box
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    vertices.forEach(v => {
        minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
        minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z);
    });
    
    // Determine which axis has the smallest range (ring's thickness direction)
    const xRange = maxX - minX;
    const yRange = maxY - minY;
    const zRange = maxZ - minZ;
    
    let plane;
    if (xRange < yRange && xRange < zRange) {
        plane = 'yz'; // Ring is in YZ plane, X is thickness
    } else if (yRange < xRange && yRange < zRange) {
        plane = 'xz'; // Ring is in XZ plane, Y is thickness
    } else {
        plane = 'xy'; // Ring is in XY plane, Z is thickness
    }
    
    // Find inner and outer radius based on the determined plane
    let radii = [];
    vertices.forEach(v => {
        const radius = getRingRadius(v.x, v.y, v.z, plane);
        radii.push(radius);
    });
    
    radii.sort((a, b) => a - b);
    const innerRadius = radii[Math.floor(radii.length * 0.1)]; // 10th percentile
    const outerRadius = radii[Math.floor(radii.length * 0.9)]; // 90th percentile
    
    return {
        plane: plane,
        innerRadius: innerRadius,
        outerRadius: outerRadius,
        bounds: {minX, maxX, minY, maxY, minZ, maxZ}
    };
}

function getRingRadius(x, y, z, plane) {
    switch(plane) {
        case 'xy': return Math.sqrt(x*x + y*y);
        case 'xz': return Math.sqrt(x*x + z*z);
        case 'yz': return Math.sqrt(y*y + z*z);
        default: return Math.sqrt(x*x + z*z);
    }
}

function getRingAngle(x, y, z, plane) {
    switch(plane) {
        case 'xy': return Math.atan2(y, x);
        case 'xz': return Math.atan2(z, x);
        case 'yz': return Math.atan2(z, y);
        default: return Math.atan2(z, x);
    }
}

function parseOBJ(fileContent) {
    const lines = fileContent.split('\n');
    let vertices = [];
    let normals = [];
    let texCoords = [];
    let vertexData = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(/\s+/);
        switch(parts[0]){
            case 'v':
                vertices.push([
                    parseFloat(parts[1]),
                    parseFloat(parts[2]),
                    parseFloat(parts[3])
                ]);
                break;
            case 'vn':
                normals.push([
                    parseFloat(parts[1]),
                    parseFloat(parts[2]),
                    parseFloat(parts[3])
                ]);
                break;
            case 'vt':
                texCoords.push([
                    parseFloat(parts[1]),
                    parseFloat(parts[2])
                ]);
                break;
            default:
                console.warn('Unknown OBJ line ' + i + ' start: ', firstword);
                break;
        }
    }
    return vertexData;
}

function getTextureUrl(name) {
    let texturePath = `https://1054254.github.io/Computer-Graphics/EindOpdracht/solar-system/textures/${name}.`

    if (name === 'saturn_ring') {
        texturePath += 'png';
    } else {
        texturePath += 'jpeg';
    }
    return texturePath;
}

function getModelUrl(name) {
    return `https://1054254.github.io/Computer-Graphics/EindOpdracht/solar-system/stl/${name}.stl`;
}