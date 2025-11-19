var c = document.getElementById("myCanvas");
var ctx = c.getContext("2d");

function plotLine(x1, y1, x2, y2, colour) {
    var startPoint, endPoint

    // maak startpunt de kleinste x-waarde
    if (x1 < x2){
        var startPoint = [x1,y1]
        var endPoint = [x2,y2]
    }else{
        var startPoint = [x2,y2]
        var endPoint = [x1,y1]
    }

    ctx.fillStyle = colour;

    // bereken Richtingscoëfficiënt
    var slope = (endPoint[1] - startPoint[1]) / (endPoint[0] - startPoint[0]);
    
    // bepaal of we per x of per y moeten tekenen aan de hand van de richtingscoëfficiënt
    if (startPoint[1] === endPoint[1] && startPoint[0] != endPoint[0]) {
        // teken lijn per x pixel
        for (let x = startPoint[0]; x <= endPoint[0]; x++){
            let y = Math.round(startPoint[1] + slope * (x - startPoint[0]));    
            ctx.fillRect(x,y,1,1)
        }
    }else{
        // teken lijn per y pixel
        for (let y = Math.min(startPoint[1], endPoint[1]); y <= Math.max(startPoint[1], endPoint[1]); y++){
            let x = Math.round(startPoint[0] + (y - startPoint[1]) / slope);
            ctx.fillRect(x,y,1,1)
        }
    }
}


function drawTriangle(x1,y1,x2,y2,x3,y3,colour){
    plotLine(x1,y1,x2,y2,colour)
    plotLine(x1,y1,x3,y3,colour)
    plotLine(x2,y2,x3,y3,colour)
}

function drawRectangle2Point(x1,y1,x2,y2,colour){
    drawRectangle4Point(x1, y1, x1, y2, x2, y2, x2, y1, colour)
}

function drawRectangle4Point(x1,y1,x2,y2,x3,y3,x4,y4,colour){
    plotLine(x1,y1,x2,y2,colour)
    plotLine(x1,y1,x4,y4,colour)
    plotLine(x3,y3,x2,y2,colour)
    plotLine(x3,y3,x4,y4,colour)
}

function drawCircle(x,y,r,colour){
    ctx.beginPath();
    ctx.arc(x,y,r,0,2 * Math.PI);
    ctx.strokeStyle = colour;
    ctx.stroke();
}

function keyDownChangeColour(keydown, key,colour){
    if (keydown == key){
        globalColour = colour
    }
}

// draai rechthoek om zijn middelpunt
function rotateRect(angle) {
    let cx = (globalx1 + globalx2) / 2
    let cy = (globaly1 + globaly2) / 2

    let corners = [
        [globalx1, globaly1],
        [globalx2, globaly1],
        [globalx2, globaly2],
        [globalx1, globaly2]
    ];
    let rad = angle * Math.PI / 180

    let rotated = corners.map(([x, y]) => {
        let dx = x - cx
        let dy = y - cy
        let xNew = cx + dx * Math.cos(rad) - dy * Math.sin(rad)
        let yNew = cy + dx * Math.sin(rad) + dy * Math.cos(rad)
        return [xNew, yNew];
    });

    globalx1 = rotated[0][0]
    globaly1 = rotated[0][1]
    globalx2 = rotated[2][0]
    globaly2 = rotated[2][1]
}

var globalColour = "black"

var globalx1 = 10
var globaly1 = 20
var globalx2 = 40
var globaly2 = 50

var rotatex = 100
var rotatey = 100

setInterval(() => {
    ctx.clearRect(0,0,640,480); // clear all
    rotateRect(4);
    drawRectangle2Point(globalx1,globaly1,globalx2,globaly2,globalColour)
    drawCircle(c.getBoundingClientRect().width/2,c.getBoundingClientRect().height/2,30,globalColour)  
}, 50);



document.addEventListener("keydown", function(event){
    var key = event.key
    keyDownChangeColour(key, "r", "red")
    keyDownChangeColour(key, "g", "green")
    keyDownChangeColour(key, "b", "blue")
})

