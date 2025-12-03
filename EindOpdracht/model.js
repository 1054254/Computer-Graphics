let loadedObjects = [];
let objLoaded = null;

function loadModel(name) {
    console.log('Loading model:', name);
    if (!objLoaded) {
        objLoaded = fetch('https://1054254.github.io/Computer-Graphics/EindOpdracht/solar-system/obj/solarSystem.obj')
            .then(response => {
                console.log('Fetching OBJ...');
                return response.text();
            })
            .then(fileContent => {
                loadedObjects = parseOBJ(fileContent);
            });
    }

    let model= [];
    let arrayBuffer = gl.createBuffer();

    // Wait for OBJ to load before processing
    objLoaded.then(() => {
        try {
            const objData = loadedObjects.find(obj => obj.name === name);
            if (!objData) {
                console.error('Object not found:', name);
                return;
            }
            vertices = objData.vertexData;

            x = vertices[0] 
            y = vertices[1]
            z = vertices[2]

            model.radius = Math.sqrt(x*x + y*y + z*z);
            model.verticesCount = objData.vertexCount;            
            
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
            console.error('error:', e);
        }
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
    model.position = {x: 0, y: 0, z: 0}; // Position offset
    model.orbitRadius = 0.0; // Orbit radius
    model.orbitRotationSpeed = 0.0; // Orbit rotation speed
    model.planetRotationspeed = 1.0; // Planet rotation speed (default 1 day)

    return model
}

function parseOBJ(fileContent) {
        console.log('Starting OBJ parse...');
        let positions = [];
        let texCoords = [];
        let normals = [];
        
        // Store multiple objects
        let objects = [];
        let currentObject = null;

        const lines = fileContent.split('\n');

        for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(/\s+/);
        const firstword = parts[0];
        switch(firstword){
            case 'o':
                // Start a new object
                if (currentObject) {
                    objects.push(currentObject);
                }
                currentObject = {
                    name: parts[1],
                    vertices: []
                };
                console.log('Found object:', parts[1]);
                break;
            case 'v':
                positions.push(parseFloat(parts[1])); // x
                positions.push(parseFloat(parts[2])); // y
                positions.push(parseFloat(parts[3])); // z
                break;
            case 'vt':
                texCoords.push(parseFloat(parts[1])); // u
                texCoords.push(parseFloat(parts[2])); // v
                break;
            case 'vn':
                normals.push(parseFloat(parts[1])); // nx
                normals.push(parseFloat(parts[2])); // ny
                normals.push(parseFloat(parts[3])); // nz
                break;
            case 'f':
                if (!currentObject) {
                    // No object defined yet, create a default one
                    currentObject = {
                        name: 'default',
                        vertices: []
                    };
                }
                
                for (let j = 1; j <= 3; j++) {
                    const indices = parts[j].split('/');
                    const posIndex = parseInt(indices[0]) - 1;
                    const texIndex = parseInt(indices[1]) - 1;
                    const normIndex = parseInt(indices[2]) - 1;
                    
                    currentObject.vertices.push(
                        positions[posIndex * 3], positions[posIndex * 3 + 1], positions[posIndex * 3 + 2],
                        normals[normIndex * 3], normals[normIndex * 3 + 1], normals[normIndex * 3 + 2],
                        texCoords[texIndex * 2], texCoords[texIndex * 2 + 1]
                    );
                }
                break;
            case 's':
            case '#':   // comments
                break;
            default:
                console.warn('Unknown OBJ line '+ i +' start: ', firstword);
                break;
        }
    }
    
    // Push the last object
    if (currentObject) {
        objects.push(currentObject);
    }
    
    console.log('OBJ parse complete, found', objects.length, 'objects');
    
    // Convert vertices arrays to Float32Array for each object
    objects.forEach(obj => {
        obj.vertexData = new Float32Array(obj.vertices);
        obj.vertexCount = obj.vertices.length / 8;
        delete obj.vertices; // Clean up temp array
        console.log(`Object "${obj.name}": ${obj.vertexCount} vertices`);
    });
    
    return objects;
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