   const rotateSpeed = 0.5
    var startTime = Date.now()
    
    var vertices = [
        [1, 1, 1],
        [1, -1, 1],
        [1, 1, -1],
        [1, -1, -1],
        [-1, 1, 1],
        [-1, -1, 1],
        [-1, 1, -1],
        [-1, -1, -1]
    ]
    
    var edges = [
        [0, 1],
        [0, 2],
        [0, 4],
        [1, 3],
        [1, 5],
        [2, 3],
        [2, 6],
        [3, 7],
        [4, 5],
        [4, 6],
        [5, 7],
        [6, 7]
    ]
    
    const canvas = document.getElementById('myCanvas')
    const ctx = canvas.getContext('2d')
    
    function rotateX(angle) {
        return [
            [1, 0, 0, 0],
            [0, Math.cos(angle), -Math.sin(angle), 0],
            [0, Math.sin(angle), Math.cos(angle), 0],
            [0, 0, 0, 1]
        ]
    }
    
    function rotateY(angle) {
        return [
            [Math.cos(angle), 0, Math.sin(angle), 0],
            [0, 1, 0, 0],
            [-Math.sin(angle), 0, Math.cos(angle), 0],
            [0, 0, 0, 1]
        ]
    }
    
    function translation(x, y, z) {
        return [
            [1, 0, 0, x],
            [0, 1, 0, y],
            [0, 0, 1, z],
            [0, 0, 0, 1]
        ]
    }
    
    function scale(scale) {
        return [
            [scale, 0, 0, 0],
            [0, scale, 0, 0],
            [0, 0, scale, 0],
            [0, 0, 0, 1]
        ]
    }
    
    function projection(far, aspect, near, fov) {
        let f = 1 / Math.tan(fov / 2);
        return [
            [f / aspect, 0, 0, 0],
            [0, f, 0, 0],
            [0, 0, (far + near) / (near - far), (2 * far * near) / (near - far)],
            [0, 0, -1, 0]
        ]
    }
    
    let scaleMatrix = scale(4);
    let rotXMatrix = rotateX(30 * Math.PI / 180); // Fixed rotation of 30 degrees around x-axis
    let transMatrix = translation(0, 0, 10)
    let projMatrix = projection(1000, canvas.width / canvas.height, 0.1, 90 * Math.PI / 180)
     

    function draw() {
        let angle = rotateSpeed * 0.001 * (Date.now() - startTime)

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Maak transformatiematrix
        let rotYMatrix = rotateY(angle * 1.5)

        // Combineer alle matrices
        let transform = math.multiply(projMatrix, transMatrix, rotYMatrix, rotXMatrix, scaleMatrix)


        // Transformeer vertices
        let projectedVertices = vertices.map(v => {
            let vertex = [...v, 1]
            let t = math.multiply(transform, vertex)

            // Perspective divide (clip → NDC)
            let x = t[0] / t[3]
            let y = t[1] / t[3]

            // NDC → screen space
            return [
                (x * 0.5 + 0.5) * canvas.width,
                (-y * 0.5 + 0.5) * canvas.height
            ]
        })
    
        // Teken edges
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 2
        edges.forEach(edge => {
            let p1 = projectedVertices[edge[0]]
            let p2 = projectedVertices[edge[1]]
            
            ctx.beginPath()
            ctx.moveTo(p1[0], p1[1])
            ctx.lineTo(p2[0], p2[1])
            ctx.stroke()
        })
    }
    
    setInterval(draw, 50)