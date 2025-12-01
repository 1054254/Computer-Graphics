    // "Solar system" (https://skfb.ly/oKYnC) by dannzjs is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).
    let animationSpeed = 1; // speed of animtion
    let intensity = 1.0; // Initial intensity
    let vecLightPos = {x: 2.0, y: 2.0, z: 2.0};
    let time = 0;
    let checkerEnabled = 0.0; // Toggle for checker pattern
    let near = 0.1, far = 100.0, FovInDegree = 90, aspectRatio = 1.0;
    let projection, fixedRotation, scaleMatrix, translationMatrix;

    let startTime = Date.now();

    // Array to store multiple models
    let models = [];

    let canvas = document.createElement('canvas');
    document.body.appendChild(canvas);

    var gl = canvas.getContext("webgl2");
    if (!gl) {
        alert('WebGL2 not supported');
        throw new Error('WebGL2 not supported');
    }

    setScreenSizeToMax();
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);

    // Create shaders

    const vsSource = vertexShader();
    const fsSource = fragmentShader();

    // Compile shaders
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error('Vertex shader error:', gl.getShaderInfoLog(vs));
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error('Fragment shader error:', gl.getShaderInfoLog(fs));
    }

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
    }
    gl.useProgram(program);

    let uIntensityLoc = gl.getUniformLocation(program, "uIntensity");
    gl.uniform1f(uIntensityLoc, 0.5);

    let uLightPosLoc = gl.getUniformLocation(program, "uLightPos");
    gl.uniform3f(uLightPosLoc, vecLightPos.x, vecLightPos.y, vecLightPos.z);


    let sunModel = loadModel('sun');
    let mercuryModel = loadModel('mercury');
    let venusModel = loadModel('venus');
    let earthModel = loadModel('earth');
    let marsModel = loadModel('mars');
    let jupiterModel = loadModel('jupiter');
    let saturnModel = loadModel('saturn');
    let saturnRingModel = loadModel('saturn_ring');
    let uranusModel = loadModel('uranus');
    let neptuneModel = loadModel('neptune');
    let moonModel = loadModel('moon');

    models.push(sunModel);
    models.push(mercuryModel);
    models.push(venusModel);
    models.push(earthModel);
    models.push(marsModel);
    models.push(jupiterModel);
    models.push(saturnModel);
    models.push(saturnRingModel);
    models.push(uranusModel);
    models.push(neptuneModel);
    models.push(moonModel);

    // number from https://courses.lumenlearning.com/suny-astronomy/chapter/physical-and-orbital-data-for-the-planets/
    // Wait for sun model to load, then set up orbit positions
    setTimeout(() => {
        let sunRadius = 0.00465046726; // Sun radius in AU
        let scaleOrbits = (sunModel.radius / sunRadius); // Scale factor for orbit distances
        
        console.log('Sun radius:', sunModel.radius, 'Scale factor:', scaleOrbits);
        
        mercuryModel.orbitRadius = 0.39 * scaleOrbits;
        venusModel.orbitRadius = 0.72 * scaleOrbits;
        earthModel.orbitRadius = 1.0 * scaleOrbits;
        marsModel.orbitRadius = 1.52 * scaleOrbits;
        jupiterModel.orbitRadius = 5.2 * scaleOrbits;
        saturnModel.orbitRadius = 9.54 * scaleOrbits;
        uranusModel.orbitRadius = 19.19 * scaleOrbits;
        neptuneModel.orbitRadius = 30.06 * scaleOrbits;
        moonModel.orbitRadius = 0.00257 * scaleOrbits; // Moon relative to Earth
        
        
        // Set orbit speeds (relative to Earth = 1)
        sunModel.orbitRotationSpeed = 0.0; // Sun doesn't orbit
        mercuryModel.orbitRotationSpeed = 1/ 0.24; // Mercury orbits faster
        venusModel.orbitRotationSpeed = 1/ 0.6;
        earthModel.orbitRotationSpeed = 1.0;
        marsModel.orbitRotationSpeed = 1/ 1.88;
        jupiterModel.orbitRotationSpeed = 1/ 11.86;
        saturnModel.orbitRotationSpeed = 1/ 29.46;
        saturnRingModel.orbitRotationSpeed = 1/ 29.46;
        uranusModel.orbitRotationSpeed = 1/ 84.01;
        neptuneModel.orbitRotationSpeed = 1/ 164.82;
        moonModel.orbitRotationSpeed = 1/ 0.0748; // Moon orbits Earth faster

        // Set planet rotation speeds where 1 is one a day on earth
        sunModel.planetRotationspeed = 25.4; // Sun rotates about once per 25.4 days
        mercuryModel.planetRotationspeed = 58
        venusModel.planetRotationspeed = -243
        earthModel.planetRotationspeed = 1
        marsModel.planetRotationspeed = 1.026
        jupiterModel.planetRotationspeed = 0.414
        saturnModel.planetRotationspeed = 0.440
        saturnRingModel.planetRotationspeed = 0.440
        uranusModel.planetRotationspeed = -0.718
        neptuneModel.planetRotationspeed = 0.671

        moonModel.parentPlanet = earthModel;
        saturnRingModel.parentPlanet = saturnModel;
    }, 500); // Wait 500ms for sun to load


    // Create individual transformation matrices
    fixedRotation = rotateX(Math.PI / 6); // Rotate 30° around x-axis

    let scaleValue = 0.1;
    scaleMatrix = scale(scaleValue, scaleValue, scaleValue);

    translationMatrix = translation(0, 0, -3); // Move 3 units back

    // Combine all static transformations: projection * translation * fixedRotation * scale
    let baseTransform = multiplyMatrices(projection, translationMatrix);
    baseTransform = multiplyMatrices(baseTransform, fixedRotation);
    baseTransform = multiplyMatrices(baseTransform, scaleMatrix);

    // Get uniform location for the combined matrix
    let transformLocation = gl.getUniformLocation(program, "uTransform");


    function render(angle) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        // Render each model
        models.forEach(model => {
            if (model.verticesCount > 0) {
                // Calculate model-specific transformations

                let planetRotation = rotateY(model.planetRotationspeed * angle);
                let orbitRotation = rotateY(model.orbitRotationSpeed * angle);
                
                let orbitPosition = translation(model.orbitRadius, 0, 0);

                if (model.parentPlanet !== undefined) {
                    let parent = model.parentPlanet;

                    let parentOrbitPostion = translation(parent.orbitRadius, 0, 0);
                    let parentOrbitRotation = rotateY(parent.orbitRotationSpeed * angle);

                    let temp = multiplyMatrices(parentOrbitPostion, parentOrbitRotation);

                    orbitPosition = multiplyMatrices(temp, translation(model.orbitRadius, 0, 0));       
                }            
                // Combine transformations in correct order: scale * planetRotation * orbitPosition * orbitRotation
                let temp = multiplyMatrices(scaleMatrix, planetRotation);
                temp = multiplyMatrices(temp, orbitPosition);
                temp = multiplyMatrices(temp, orbitRotation);
                
                // Apply view transformations: projection * translation * fixedRotation * model
                let finalTransform = multiplyMatrices(projection, translationMatrix);
                finalTransform = multiplyMatrices(finalTransform, fixedRotation);
                finalTransform = multiplyMatrices(finalTransform, temp);
                
                // Send final combined matrix to shader
                gl.uniformMatrix4fv(transformLocation, false, finalTransform);

                // Bind the model's buffer and texture before drawing
                gl.bindBuffer(gl.ARRAY_BUFFER, model.buffer);
                
                // Re-set vertex attribute pointers for this buffer
                const aPos = gl.getAttribLocation(program, 'aPos');
                gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 32, 0);
                gl.enableVertexAttribArray(aPos);

                const aNormal = gl.getAttribLocation(program, 'aNormal');
                gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 32, 12);
                gl.enableVertexAttribArray(aNormal);

                const aTexCoord = gl.getAttribLocation(program, 'aTexCoord');
                gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 32, 24);
                gl.enableVertexAttribArray(aTexCoord);
                
                gl.bindTexture(gl.TEXTURE_2D, model.texture);
                gl.drawArrays(gl.TRIANGLES, 0, model.verticesCount);
            }
        });
    }

    function animate() {
        time = Date.now() - startTime;
        let angle = animationSpeed * 0.00001 * (time);
        render(angle);
    }

    setInterval(animate, 5); 

    addEventListener('resize', () => {
        setScreenSizeToMax();
    })

    moveCameraSpeed = 0.3;

    //cameraRadius = Math.sqrt(camera.orbitRadius ** 2 + camera.position.z ** 2);

    addEventListener('keydown', (event) => {
        switch(event.key) {
            case 'ArrowUp': 
                animationSpeed += 0.1;
                break;
            case 'ArrowDown':
                animationSpeed = Math.max(0, animationSpeed - 0.1);
                break;
            case 'C':
            case 'c':
                checkerEnabled = checkerEnabled > 0.5 ? 0.0 : 1.0;
                // Update all mesh materials
                console.log('Checker pattern:', checkerEnabled > 0.5 ? 'ON' : 'OFF');
                break;
            case 'W':
            case 'w':
                // near += moveCameraSpeed;
                // far = Math.max(near + moveCameraSpeed, far - moveCameraSpeed);
                // projection = perspective(FovInDegree * Math.PI / 180, aspectRatio, near, far);
                break;
            case 'S':
            case 's':
                // near = Math.max(moveCameraSpeed, near - moveCameraSpeed);
                // far += 0.1;
                // projection = perspective(FovInDegree * Math.PI / 180, aspectRatio, near, far);
                break;
        }
    })
        
    function rotateX(angle) {
        let c = Math.cos(angle);
        let s = Math.sin(angle);
        return new Float32Array([
            1,  0, 0, 0,
            0,  c, s, 0,
            0, -s, c, 0,
            0,  0, 0, 1
        ]);
    }

    function rotateY(angle) {
        let c = Math.cos(angle);
        let s = Math.sin(angle);
        return new Float32Array([
            c, 0, s, 0,
            0, 1, 0, 0,
        -s, 0, c, 0,
            0, 0, 0, 1
        ]);
    }

    function rotateZ(angle) {
        let c = Math.cos(angle);
        let s = Math.sin(angle);
        return new Float32Array([
            c, -s, 0, 0,
            s,  c, 0, 0,
            0,  0, 1, 0,
            0,  0, 0, 1
        ]);
    }

    function translation(x, y, z) {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            x, y, z, 1
        ]);
    }

    function scale(x, y, z) {
        return new Float32Array([
            x, 0, 0, 0,
            0, y, 0, 0,
            0, 0, z, 0,
            0, 0, 0, 1
        ]);
    }

    function multiplyMatrices(a, b) {
        let result = new Float32Array(16);
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                result[col * 4 + row] = 0;
                for (let i = 0; i < 4; i++) {
                    result[col * 4 + row] += a[i * 4 + row] * b[col * 4 + i];
                }
            }
        }
        return result;
    }   

    // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_model_view_projection#perspective_projection_matrix
    function perspective(fieldOfViewInRadians, aspectRatio, near, far) {
    const f = 1.0 / Math.tan(fieldOfViewInRadians / 2);
    const rangeInv = 1 / (near - far);

    // prettier-ignore
        return [
            f / aspectRatio, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (near + far) * rangeInv, -1,
            0, 0, near * far * rangeInv * 2, 0,
        ];
    }

    function setScreenSizeToMax(){
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        aspectRatio = canvas.width / canvas.height;
        projection = perspective(FovInDegree * Math.PI / 180, aspectRatio, near, far);
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
