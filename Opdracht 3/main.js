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
    
    function scale(x, y, z) {
        return [
            [x, 0, 0, 0],
            [0, y, 0, 0],
            [0, 0, z, 0],
            [0, 0, 0, 1]
        ]
    }
    
    
    function draw() {
        let angle = rotateSpeed * 0.001 * (Date.now() - startTime)

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Maak transformatiematrix
        let scaleMatrix = scale(100, 100, 100)
        let rotXMatrix = rotateX(angle)
        let rotYMatrix = rotateY(angle * 0.7)
        let transMatrix = translation(500, 250, 5)

        // Combineer alle matrices
        let transform = math.multiply(transMatrix, rotYMatrix, rotXMatrix, scaleMatrix)

        // Transformeer vertices
        let projectedVertices = vertices.map(v => {
            let vertex = [...v, 1]
            let transformed = math.multiply(transform, vertex)
            
            // Perspectief divisie
            let z0 = transformed[3]
            return [
                transformed[0]/z0,
                transformed[1]/z0
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