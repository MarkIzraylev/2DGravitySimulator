class Player {
    constructor(settings) {
        this.fixed = false
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        if (settings!=undefined) {
            for(let keyName of Object.keys(settings)) {
                this[keyName] = settings[keyName]
            }
        }

        gameObjects.push(this)
    }

    show(scale, shift, canvasWidth, canvasHeight) {
        switch(this.shape) {
            case 'ellipse':
                push()
                fill(this.fill)
                ellipse(canvasWidth/2 + (this.pos.x + shift.x)*scale, canvasHeight/2 + (this.pos.y + shift.y)*scale, this.radius*2*scale)
                if(this.name != undefined) {
                    fill(255,255,255)
                    textAlign(CENTER, 0);
                    textSize(13);
                    text(this.name, canvasWidth/2 + (this.pos.x + shift.x)*scale , canvasHeight/2 + (this.pos.y + shift.y)*scale + this.radius*scale + 13);
                }
                
                pop()
                break
        }
    }

    addToArray() {
        gameObjects.push(this)
    }

    move(timeStep) {
        //this.vel.x = Number(this.vel.x.toFixed(8))
        //this.vel.y = Number(this.vel.y.toFixed(8))
        if(!this.fixed) {
            
            this.pos.add(p5.Vector.mult(this.vel, timeStep))
        }
        
    }
    
    borders(boundary, bounce) {
        if(this.pos.x < boundary.left+this.radius) {
            this.pos.x = boundary.left+this.radius
            this.vel.x *= -bounce
        } else if(this.pos.x > boundary.right-this.radius) {
            this.pos.x = boundary.right - this.radius
            this.vel.x *= -bounce
        }

        if(this.pos.y > boundary.bottom+this.radius) {
            this.pos.y = boundary.bottom+this.radius
            this.vel.y *= -bounce
        } else if(this.pos.y < boundary.top-this.radius) {
            this.pos.y = boundary.top-this.radius
            this.vel.y *= -bounce
        }
    }

    penetrationResolution(otherBody) {
        let distance = p5.Vector.sub(this.pos, otherBody.pos)
        let pen_depth = this.radius + otherBody.radius - distance.mag()
        let pen_res = distance.normalize().mult(pen_depth/2)
        this.pos.add(pen_res)
        otherBody.pos.add(pen_res.mult(-1))
    }

    collisionResolution(otherBody, bounce) {
        let normal = p5.Vector.sub(this.pos, otherBody.pos).normalize();
        let relVel = p5.Vector.sub(this.vel, otherBody.vel)
        let sepVel = p5.Vector.dot(relVel, normal)
        let newSepVel = -sepVel
        let sepVelVec = normal.mult(newSepVel)

        this.vel = p5.Vector.add(this.vel, sepVelVec.mult(bounce))
        otherBody.vel = p5.Vector.sub(otherBody.vel, sepVelVec.mult(bounce))
    }

    showVectors(scale, shift, canvasWidth, canvasHeight, vecSizeMultiplier) {
        push()
        stroke('white')
        strokeWeight(this.radius*scale*0.2)
        line(canvasWidth/2 + (this.pos.x + shift.x)*scale, canvasHeight/2 + (this.pos.y + shift.y)*scale, canvasWidth/2 + (this.pos.x + this.vel.x*vecSizeMultiplier  + shift.x)*scale, canvasHeight/2 + (this.pos.y+this.vel.y*vecSizeMultiplier + shift.y)*scale)
        pop()
    }
}

let gameObjects = []

let canvasWidth = 1080
let canvasHeight = 720

let particles = []

let collisions = false


// SETTINGS
let bounce = 1
let particlesRadius = 3
let G = 1.1
let showGravitationalForceLine = false;
let showVectors = false;
let showCreatingVector = true;
let backgroundTransparency = 1
let timeStep = 1
let maxNumberOfCoordinatesSavedInTrails = 200
let indexOfObjectCameraIsFixedTo = false
let vecSizeMultiplier = 10
let maxLengthOfGravityVector = 0.1

let pauseMode = false
let selectMode = false

let isRecording = false

// VARIABLES FOR SETTINGS BUTTONS, CHECKBOXES AND SLIDERS
let showVectors_checkbox, maxNumberOfCoordinatesSavedInTrails_slider, timeStep_slider

/*
for(let i = 0; i < gameObjects.length; i++) {
    if(dist(mouseX, mouseY, canvasWidth/2 + (gameObjects[i].pos.x + shift.x)*scale, canvasHeight/2 + (gameObjects[i].pos.y + shift.y)*scale) < gameObjects[i].radius*scale) {
        alert(i)
    }
}
*/

let scale = 3
let shift


/*
        THIS VARIABLE
        SHOULD BE EQUAL
        TO 1 IF YOU WANT TO
        GET THE REAL SCALE
        OF THE SOLAR SYSTEM
    */
let radiusScale = 1

let systemSizesmultiplier = 1
let systemMassesmultiplier = 15

let showPreparedSimulations = false;

function setup() {
    canvasWidth = windowWidth
    canvasHeight = windowHeight - 120
    shift = createVector(0,0)
    canvas = createCanvas(canvasWidth, canvasHeight)
    
    
    // SETTINGS CHECKBOXES
    
    showVectors_checkbox = createCheckbox(" Показывать векторы скорости", showVectors)
    showVectors_checkbox.changed(() => {showVectors = !showVectors})

    labelForTrailsSlider = createDiv('Длина сохраняемых дорожек ')
    labelForTimeSlider = createDiv('Течение времени ')
    
    maxNumberOfCoordinatesSavedInTrails_slider = createSlider("show trails", 1000, 100).parent(labelForTrailsSlider);
    maxNumberOfCoordinatesSavedInTrails_slider.changed(() => {maxNumberOfCoordinatesSavedInTrails = maxNumberOfCoordinatesSavedInTrails_slider.value()})

    timeStep_slider = createSlider("time step", 500, timeStep*100+250).parent(labelForTimeSlider);
    timeStep_slider.changed(() => {timeStep = (timeStep_slider.value()-250)/100})
    

    let startRecBtn = createButton("Начать запись видео").mousePressed(() => {isRecording = !isRecording; if(isRecording) {startRecording(); document.getElementById('recordingButton').innerHTML = "Закончить запись видео"} else {stopRecording(); document.getElementById('recordingButton').innerHTML = "Начать запись видео"}}).id("recordingButton")
    //let rotateBtn = createButton("Rotate").mousePressed(rotateObjects)
    let addParticlesToggleBtn = createButton("Режим добавления").id('addingMode').mousePressed(() => {stopToggle(); if(stopped) {document.getElementById('addingMode').innerHTML = 'Завершить режим добавления'} else {document.getElementById('addingMode').innerHTML = 'Режим добавления'}})
    let pauseToggleBtn = createButton("Пауза").mousePressed(() => {stopped = !stopped; cancelCreatingNewParicle = true; pauseMode = !pauseMode;})
    let selectModeToggleBtn = createButton("Режим выбора").id('selectMode').mousePressed(() => {stopped = !stopped; cancelCreatingNewParicle = true; pauseMode = !pauseMode; selectMode = !selectMode; if(stopped) {document.getElementById('selectMode').innerHTML = 'Завершить режим выбора'} else {document.getElementById('selectMode').innerHTML = 'Режим выбора'}})
    let choosePreparedSimulation = createButton("Готовые симуляции").mousePressed(() => {showPreparedSimulations = !showPreparedSimulations; if(showPreparedSimulations) {document.getElementById('preparedSimulations').style.display = 'block';} else {document.getElementById('preparedSimulations').style.display = 'none';}})
    
    let deleteAllBtn = createButton("Удалить все объекты").mousePressed(() => {gameObjects = []; trails = []})

    
    

    
    
    //thisOneMass = 0.00000733*systemMassesmultiplier
    //thisOneX = -3.844*systemSizesmultiplier+thisOneX
    //distToSun = abs(thisOneX)
    //particles.push(new Player({pos: createVector(thisOneX, 0), shape: 'ellipse', vel: createVector(0.0028999, -1359.9*sqrt(G * ((gameObjects[1].mass * thisOneMass) / 15 ))), fill: random([[156, 255, 224], /*[247, 37, 133], [76, 201, 240]*/]), radius: 0.0174*systemSizesmultiplier, mass: thisOneMass, fixed: false}))
    
    //thisOneMass = 10
    //thisOneX = -1000
    //distToSun = abs(thisOneX)
    //particles.push(new Player({pos: createVector(thisOneX, 0), shape: 'ellipse', vel: createVector(0, -sqrt(G * ((gameObjects[0].mass * thisOneMass) / distToSun ))), fill: random([[153, 221, 204], /*[247, 37, 133], [76, 201, 240]*/]), radius: 5, mass: thisOneMass, fixed: false}))
    
    
    //thisOneMass = 10
    //thisOneX = -1025
    //distToSun = abs(thisOneX)
    //particles.push(new Player({pos: createVector(thisOneX, 0), shape: 'ellipse', vel: createVector(0, -0.6*sqrt(G * ((gameObjects[3].mass * thisOneMass) / 35 ))), fill: random([[255, 93, 162], /*[247, 37, 133], [76, 201, 240]*/]), radius: 5, mass: thisOneMass, fixed: false}))
    

    //thisOneMass = 10
    //thisOneX = 1300
    //distToSun = abs(thisOneX)
    //particles.push(new Player({pos: createVector(thisOneX, 0), shape: 'ellipse', vel: createVector(0, sqrt(G * ((gameObjects[0].mass * thisOneMass) / distToSun ))), fill: random([[153, 221, 204], /*[247, 37, 133], [76, 201, 240]*/]), radius: 5, mass: thisOneMass, fixed: false}))
    

    //thisOneMass = 10
    //thisOneX = 1325
    //distToSun = abs(thisOneX)
    //particles.push(new Player({pos: createVector(thisOneX, 0), shape: 'ellipse', vel: createVector(0, 0.6*sqrt(G * ((gameObjects[3].mass * thisOneMass) / 35 ))), fill: random([[255, 255, 0], /*[247, 37, 133], [76, 201, 240]*/]), radius: 5, mass: thisOneMass, fixed: false}))
    

    //particles.push(new Player({pos: createVector(0, 100), shape: 'ellipse', vel: createVector(0, -sqrt(G * (gameObjects[0].mass / 200))), fill: random([[0,255,0], /*[247, 37, 133], [76, 201, 240]*/]), radius: 1, mass: 1}))
    //particles.push(new Player({pos: createVector(-400, 100), shape: 'ellipse', vel: createVector(0, -1), fill: random([[0,255,0], /*[247, 37, 133], [76, 201, 240]*/]), radius: 1, mass: 1}))

    
    //particles.push(new Player({pos: createVector(-300, 100), shape: 'ellipse', vel: createVector(0, -sqrt(G*(gameObjects[0].radius/(200*200*0.00000028)))), fill: random([[73,15,209], /*[247, 37, 133], [76, 201, 240]*/]), radius: 5}))
    
    //for(let i = 0; i < 30; i++) {
    //    let ball = new Player({pos: createVector(random(-200, -100), random(-50, 50)), vel: createVector(0, 0.2), shape: 'ellipse', fill: random([[73,15,209], /*[247, 37, 133], [76, 201, 240]*/]), radius: particlesRadius, mass: 5})
    //    particles.push(ball)
    //}

    //for(let i = 0; i < 30; i++) {
    //    let ball = new Player({pos: createVector(random(300, 400), random(-50, 50)), vel: createVector(0, -0.2), shape: 'ellipse', fill: random([[73,15,209], /*[247, 37, 133], [76, 201, 240]*/]), radius: particlesRadius, mass: 5})
    //    particles.push(ball)
    //}
    
    
}

let trails = []




let cancelCreatingNewParicle = false

let stopped = false;
let creatingVectorOfANewParticle = false;

function mouseWheel(event) {
    background(0)
    if(event.delta > 0) {
        scale += 0.09 * (scale)
    } else {
        scale -= 0.09 * (scale)
    }
}

function draw() {
    
    if(indexOfObjectCameraIsFixedTo) {
        try {
            shift.x = -gameObjects[indexOfObjectCameraIsFixedTo].pos.x
            shift.y = -gameObjects[indexOfObjectCameraIsFixedTo].pos.y
        } catch {}
    }
    
    cancelCreatingNewParicle = false
    background(color('rgba(0, 0, 0, '+backgroundTransparency+')'))

    

    
    

    
    
    if(creatingVectorOfANewParticle && showCreatingVector && !cancelCreatingNewParicle) {
        push();
        stroke('white')
        strokeWeight(1*scale)
        line(((particles[particles.length - 1].pos.x + shift.x)*scale + canvasWidth/2), ((particles[particles.length - 1].pos.y + shift.y)*scale + canvasHeight/2), mouseX, mouseY)
        pop()
    }
    
        if (keyIsPressed === true) {
            if (keyCode == UP_ARROW) {
                shift.add(createVector(0, 10 * 1/scale))
            }
            if (keyCode == DOWN_ARROW) {
                shift.add(createVector(0, -10 * 1/scale))
            }
            if (keyCode == RIGHT_ARROW) {
                shift.add(createVector(-10 * 1/scale, 0))
            }
            if (keyCode == LEFT_ARROW) {
                shift.add(createVector(10 * 1/scale, 0))
            }
            background(0)
        }

    
        // DRAW TRAILS
        if(maxNumberOfCoordinatesSavedInTrails) {
            for(let thisTrailIndex = 0; thisTrailIndex < trails.length; thisTrailIndex++) {
                if(trails[thisTrailIndex].coordinates.length > maxNumberOfCoordinatesSavedInTrails) {
                    //trails[thisTrailIndex].stroke[0] /= 1.01
                    //trails[thisTrailIndex].stroke[1] /= 1.01
                    //trails[thisTrailIndex].stroke[2] /= 1.01
                    trails[thisTrailIndex].coordinates = trails[thisTrailIndex].coordinates.slice(trails[thisTrailIndex].coordinates.length-maxNumberOfCoordinatesSavedInTrails, trails[thisTrailIndex].coordinates.length-1)
                }
                push()
                strokeWeight(trails[thisTrailIndex].strokeWeight)
                for(let i = 0; i < trails[thisTrailIndex].coordinates.length-1; i++) {
                    //console.log([trails[thisTrailIndex].stroke[0] / trails[thisTrailIndex].coordinates.length * (i+1), trails[thisTrailIndex].stroke[1] / trails[thisTrailIndex].coordinates.length * (i+1), trails[thisTrailIndex].stroke[2] / trails[thisTrailIndex].coordinates.length * (i+1)])
                    stroke([trails[thisTrailIndex].stroke[0] / trails[thisTrailIndex].coordinates.length * (i+1), trails[thisTrailIndex].stroke[1] / trails[thisTrailIndex].coordinates.length * (i+1), trails[thisTrailIndex].stroke[2] / trails[thisTrailIndex].coordinates.length * (i+1)])
                
                    line((trails[thisTrailIndex].coordinates[i][0] + shift.x)*scale + canvasWidth/2, (trails[thisTrailIndex].coordinates[i][1] + shift.y)*scale + canvasHeight/2, (trails[thisTrailIndex].coordinates[i+1][0] + shift.x)*scale + canvasWidth/2, (trails[thisTrailIndex].coordinates[i+1][1] + shift.y)*scale + canvasHeight/2)
                    
                }
                pop()
            }
        }
    
        

        for (let i = 0; i < gameObjects.length; i++) {
            gameObjects[i].show(scale, shift, canvasWidth, canvasHeight)
            if(showVectors) {
                gameObjects[i].showVectors(scale, shift, canvasWidth, canvasHeight, vecSizeMultiplier)
            }
            let f, m1, m2, rX, rY, r, gravityForceValue, fromThisBodyToOtherVector
            for(let j = 0; j < gameObjects.length; j++) {
                if(gameObjects[j] != gameObjects[i] & !stopped) {
                    m1 = gameObjects[i].mass
                    m2 = gameObjects[j].mass
                    rX = gameObjects[j].pos.x - gameObjects[i].pos.x
                    rY = gameObjects[j].pos.y - gameObjects[i].pos.y
                    r = dist(gameObjects[j].pos.x, gameObjects[j].pos.y, gameObjects[i].pos.x, gameObjects[i].pos.y)
                    
                        
                    
                        /*if(abs(rX) < gameObjects[j].radius + gameObjects[i].radius) {
                            rX = (gameObjects[j].radius + gameObjects[i].radius) * (rX / abs(rX))
                        }
                        if(abs(rY) < gameObjects[j].radius + gameObjects[i].radius) {
                            rY = (gameObjects[j].radius + gameObjects[i].radius) * (rY / abs(rY))
                        }*/

                        gravityForceValue = G * ( (m1*m2) / (r*r) )

                        fromThisBodyToOtherVector = createVector(rX, rY)
                        fromThisBodyToOtherVector.normalize()
                        fromThisBodyToOtherVector.mult(gravityForceValue)
                        f = fromThisBodyToOtherVector

                        
                        if(p5.Vector.mag(f) > maxLengthOfGravityVector) {
                            f.normalize().mult(maxLengthOfGravityVector)
                        }
                        
                        gameObjects[i].acc.add(p5.Vector.mult(f, 1/m1))
                        gameObjects[j].acc.add(p5.Vector.mult(f, -1/m2))

                        gameObjects[i].acc.mult(timeStep/2)
                        gameObjects[j].acc.mult(timeStep/2)
                        gameObjects[i].vel.add(p5.Vector.mult(gameObjects[i].acc, 1))
                        gameObjects[j].vel.add(p5.Vector.mult(gameObjects[j].acc, 1))

                        gameObjects[i].acc = createVector(0, 0);
                        gameObjects[j].acc = createVector(0, 0);

                        push()
                        fill('red')
                        strokeWeight(10)
                        stroke('red')
                        
                        pop()
                    
                    
                    
                }
                
            }
            if(!stopped) {
                //gameObjects[pIndex].vel.x *= 0.997
                //gameObjects[pIndex].vel.y *= 0.997
                if(trails[i] == undefined) {
                    trails[i] = {
                        stroke: [gameObjects[i].fill[0], gameObjects[i].fill[1], gameObjects[i].fill[2]],
                        strokeWeight: 1,
                        coordinates: []
                    }
                }
                if(maxNumberOfCoordinatesSavedInTrails) {
                    trails[i].coordinates.push([gameObjects[i].pos.x, gameObjects[i].pos.y])
                } else {
                    trails[i].coordinates = []
                }
            }

            push()
            if(selectMode && dist(mouseX, mouseY, canvasWidth/2 + (gameObjects[i].pos.x + shift.x)*scale, canvasHeight/2 + (gameObjects[i].pos.y + shift.y)*scale) < gameObjects[i].radius*scale) {
                stroke('red')
                strokeWeight(2)
                
            }
            gameObjects[i].show(scale, shift, canvasWidth, canvasHeight)
            pop()
            
            
        }

        

        for(let i = 0; i < gameObjects.length; i++) {
            if(!stopped) {
                gameObjects[i].move(timeStep)
            }
        }
        

        let boundary = new Rectangle(0, 0, canvasWidth*10, canvasWidth*10)
        let qt = new QuadTree(boundary, 4)

        for(let pIndex = 0; pIndex < particles.length; pIndex++) {
            

            let p = particles[pIndex]

            let po = new Point(p.pos.x, p.pos.y, p)
            qt.insert(po)


            let range = new Circle(p.pos.x, p.pos.y, p.radius * 6)
            //console.log(range)
            let points = qt.query(range)
            //console.log(points)


            


            noStroke()
            
            //p.showVectors()


            //if(!stopped) {
                //gameObjects[pIndex].vel.x *= 0.997
                //gameObjects[pIndex].vel.y *= 0.997
                //gameObjects[pIndex].move()
            //}

            for (let pointIndex = 0; pointIndex < points.length; pointIndex++) {
                let otherOne = points[pointIndex].userData
                
                if(otherOne != p) {
                    
                    
                    // attraction between particles
                    /*
                    if(!stopped) {
                        let xAttrForce = (otherOne.pos.x - p.pos.x)
                        let yAttrForce = (otherOne.pos.y - p.pos.y)
                        let attractionVector = createVector(xAttrForce, yAttrForce).mult(0.000000005)
                        gameObjects[pIndex].vel.add(attractionVector)
                    }*/

                    // COLLISION
                    
                    if(collisions && dist(p.pos.x, p.pos.y, otherOne.pos.x, otherOne.pos.y) < (p.radius + otherOne.radius)) {
                        // Penetration Resolution
                        try {
                            gameObjects[pIndex].penetrationResolution(otherOne)
                            
                            // Collision Resolution
                            gameObjects[pIndex].collisionResolution(otherOne, bounce)
                        } catch {}
                        /*
                        if(p.radius > otherOne.radius) {
                            p.radius += otherOne.radius
                            p.mass += otherOne.mass
                            otherOne.mass=0
                            otherOne.radius = 0
                        } else {
                            otherOne.radius += p.radius
                            otherOne.mass += p.mass
                            gameObjects[pIndex].mass=0
                            gameObjects[pIndex].radius = 0
                        }
                        */
                    }
                    
                    
                    
                    
                }
                try {
                    //gameObjects[pIndex].borders(boundary, bounce)
                } catch {}
                
            }
            
            
        }

    
    if(stopped && !pauseMode) {
        push()
        fill(color('rgba(0, 0, 0, 0)'))
        stroke('red');
        strokeWeight(1*scale);

        //ellipse(mouseX, mouseY, 10)
        let posX = (mouseX - shift.x * scale - canvasWidth/2) / scale
        let posY = (mouseY - shift.y * scale - canvasHeight/2) / scale
        ellipse(canvasWidth/2 + (posX + shift.x)*scale, canvasHeight/2 + (posY + shift.y)*scale, 5*2*scale)
        pop()
    }
    
        
    
}

function mouseDragged() {
    //gameObjects[0].vel.x -= 0.00001 * (gameObjects[0].pos.x - mouseX);
    //gameObjects[0].vel.y -= 0.00001 * (gameObjects[0].pos.y - mouseY);
    
    //let b = new Player({pos: createVector(mouseX*scale - canvasWidth/2, mouseY*scale - canvasHeight/2), shape: 'ellipse', fill: [73,15,209], radius: particlesRadius, mass: 5})
    //particles.push(b)
}

var hexToRgb = hex =>
  hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i
             ,(m, r, g, b) => '#' + r + r + g + g + b + b)
    .substring(1).match(/.{2}/g)
    .map(x => parseInt(x, 16))

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function mousePressed() {
    
    if(selectMode) {
        for(let i = 0; i < gameObjects.length; i++) {
            if(dist(mouseX, mouseY, canvasWidth/2 + (gameObjects[i].pos.x + shift.x)*scale, canvasHeight/2 + (gameObjects[i].pos.y + shift.y)*scale) < gameObjects[i].radius*scale) {
                document.getElementById("parametersBox").style.display = "block"
                document.getElementById("parametersBox-index").value = i
                document.getElementById("parametersBox-name").value = gameObjects[i].name
                document.getElementById("parametersBox-posX").value = gameObjects[i].pos.x
                document.getElementById("parametersBox-posY").value = gameObjects[i].pos.y
                document.getElementById("parametersBox-velX").value = gameObjects[i].vel.x
                document.getElementById("parametersBox-velY").value = gameObjects[i].vel.y
                document.getElementById("parametersBox-radius").value = gameObjects[i].radius
                document.getElementById("parametersBox-mass").value = gameObjects[i].mass
                document.getElementById("parametersBox-color").value = rgbToHex(gameObjects[i].fill[0], gameObjects[i].fill[1], gameObjects[i].fill[2])
                document.getElementById("parametersBox-fixed").checked = gameObjects[document.getElementById('parametersBox-index').value].fixed
                if(indexOfObjectCameraIsFixedTo === document.getElementById('parametersBox-index').value) {
                    document.getElementById("parametersBox-cameraIsFixed").checked = true
                } else {
                    document.getElementById("parametersBox-cameraIsFixed").checked = false
                }
                
                
                
            }
        }
    } else {
        
        document.getElementById("parametersBox").style.display = "none"

    }
    

    if(cancelCreatingNewParicle || !stopped || pauseMode) {
        
        return
    }

    


    if(!creatingVectorOfANewParticle) {
        //(mouseX - shift.x * scale - canvasWidth/2) / scale
        //(mouseY - shift.y * scale - canvasHeight/2) / scale
        let b = new Player({pos: createVector((mouseX - shift.x * scale - canvasWidth/2) / scale, (mouseY - shift.y * scale - canvasHeight/2) / scale), shape: 'ellipse', fill: [0,255,255], radius: particlesRadius, mass: 5})
        particles.push(b)
    } else {
        particles[particles.length-1].vel = createVector(mouseX - ((particles[particles.length - 1].pos.x + shift.x)*scale + canvasWidth/2), mouseY - ((particles[particles.length - 1].pos.y + shift.y)*scale + canvasHeight/2)).mult(1/vecSizeMultiplier / scale)
    }
    creatingVectorOfANewParticle = !creatingVectorOfANewParticle;
    
    if(!stopped) {
        stopped = true;
    }
    
    
    
}

function addSolarSystem() {
    // clear the scene
    gameObjects = []; trails = []
    scale = 0.4;
    //indexOfObjectCameraIsFixedTo = 1;
    // The Sun
    particles.push(new Player({pos: createVector(0, 0), name: 'Солнце', shape: 'ellipse', fill: random([[255, 211, 119], /*[73,15,209], [247, 37, 133], [76, 201, 240]*/]), radius: 6.96*radiusScale*systemSizesmultiplier, mass: 200*systemMassesmultiplier, fixed: true}))
    
    // The Earth
    let thisOneMass = 0.000598*systemMassesmultiplier
    let thisOneX = -1496*systemSizesmultiplier
    let distToSun = abs(thisOneX)
    particles.push(new Player({pos: createVector(thisOneX, 0), name: 'Земля', shape: 'ellipse', vel: createVector(0, -sqrt(G * ((gameObjects[0].mass * thisOneMass) / distToSun) * 1/thisOneMass)), fill: random([[0, 75, 255], /*[247, 37, 133], [76, 201, 240]*/]), radius: 0.063713*radiusScale*systemSizesmultiplier, mass: thisOneMass, fixed: false}))
    
    // The Moon
    thisOneMass = 0.0000073477*systemMassesmultiplier
    thisOneX = (-1496 - 3.84467)*systemSizesmultiplier
    distToSun = abs(thisOneX)
    particles.push(new Player({pos: createVector(thisOneX, 0), name: 'Луна', shape: 'ellipse', vel: createVector(0, -sqrt(G * ((gameObjects[0].mass * thisOneMass) / distToSun) * 1/thisOneMass) - sqrt(G * ((gameObjects[1].mass * thisOneMass) / (3.84467*systemSizesmultiplier)) * 1/thisOneMass)), fill: random([[255, 255, 255], /*[247, 37, 133], [76, 201, 240]*/]), radius: 0.017371*systemSizesmultiplier, mass: thisOneMass, fixed: false}))
    

    // The Mercury
    // mass counts in 10^28 kg
    // distance to the Sun counts in millions of kilometers * 10
    // radius in kilometers / 100000
    thisOneMass = 0.0000333022*systemMassesmultiplier
    thisOneX = -579*systemSizesmultiplier
    distToSun = abs(thisOneX)
    particles.push(new Player({pos: createVector(thisOneX, 0), name: 'Меркурий', shape: 'ellipse', vel: createVector(0, -sqrt(G * ((gameObjects[0].mass * thisOneMass) / distToSun) * 1/thisOneMass)), fill: random([[207, 186, 134], /*[247, 37, 133], [76, 201, 240]*/]), radius: 0.024397*radiusScale*systemSizesmultiplier, mass: thisOneMass, fixed: false}))
    
    // The Venus
    thisOneMass = 0.00048866*systemMassesmultiplier
    thisOneX = -1082*systemSizesmultiplier
    distToSun = abs(thisOneX)
    particles.push(new Player({pos: createVector(thisOneX, 0), name: 'Венера', shape: 'ellipse', vel: createVector(0, -sqrt(G * ((gameObjects[0].mass * thisOneMass) / distToSun) * 1/thisOneMass)), fill: random([[184, 113, 26], /*[247, 37, 133], [76, 201, 240]*/]), radius: 0.060518*radiusScale*systemSizesmultiplier, mass: thisOneMass, fixed: false}))
    
    // The Mars
    thisOneMass = 0.0000642*systemMassesmultiplier
    thisOneX = -2280*systemSizesmultiplier
    distToSun = abs(thisOneX)
    particles.push(new Player({pos: createVector(thisOneX, 0), name: 'Марс', shape: 'ellipse', vel: createVector(0, -sqrt(G * ((gameObjects[0].mass * thisOneMass) / distToSun) * 1/thisOneMass)), fill: random([[210, 81, 47], /*[247, 37, 133], [76, 201, 240]*/]), radius: 0.033895*radiusScale*systemSizesmultiplier, mass: thisOneMass, fixed: false}))
    

    // The Jupiter
    thisOneMass = 0.18986*systemMassesmultiplier
    thisOneX = -7780*systemSizesmultiplier
    distToSun = abs(thisOneX)
    particles.push(new Player({pos: createVector(thisOneX, 0), name: 'Юпитер', shape: 'ellipse', vel: createVector(0, -sqrt(G * ((gameObjects[0].mass * thisOneMass) / distToSun) * 1/thisOneMass)), fill: random([[210, 81, 47], /*[247, 37, 133], [76, 201, 240]*/]), radius: 0.714*radiusScale*systemSizesmultiplier, mass: thisOneMass, fixed: false}))

    // Io - satellite of the Jupiter
    thisOneMass = 0.0000089319*systemMassesmultiplier
    thisOneX = (-7780 - 4.21700)*systemSizesmultiplier
    distToSun = abs(thisOneX)
    particles.push(new Player({pos: createVector(thisOneX, 0), name: 'Ио', shape: 'ellipse', vel: createVector(0, -sqrt(G * ((gameObjects[0].mass * thisOneMass) / distToSun) * 1/thisOneMass) - sqrt(G * ((0.18986*systemMassesmultiplier * thisOneMass) / (4.21700*systemSizesmultiplier)) * 1/thisOneMass)), fill: random([[210, 81, 47], /*[247, 37, 133], [76, 201, 240]*/]), radius: 0.018213*radiusScale*systemSizesmultiplier, mass: thisOneMass, fixed: false}))

    // Callisto - satellite of the Jupiter
    thisOneMass = 0.00001075938*systemMassesmultiplier
    thisOneX = (-7780 - 18.82000)*systemSizesmultiplier
    distToSun = abs(thisOneX)
    particles.push(new Player({pos: createVector(thisOneX, 0), name: 'Каллисто', shape: 'ellipse', vel: createVector(0, -sqrt(G * ((gameObjects[0].mass * thisOneMass) / distToSun) * 1/thisOneMass) - sqrt(G * ((0.18986*systemMassesmultiplier * thisOneMass) / (18.82000*systemSizesmultiplier)) * 1/thisOneMass)), fill: random([[210, 81, 47], /*[247, 37, 133], [76, 201, 240]*/]), radius: 0.024103*radiusScale*systemSizesmultiplier, mass: thisOneMass, fixed: false}))

    // Ganimed - Jupiter's satellite
    thisOneMass = 0.000014819*systemMassesmultiplier
    thisOneX = (-7780 - 10.7)*systemSizesmultiplier
    distToSun = abs(thisOneX)
    particles.push(new Player({pos: createVector(thisOneX, 0), name: 'Ганимед', shape: 'ellipse', vel: createVector(0, -sqrt(G * ((gameObjects[0].mass * thisOneMass) / distToSun) * 1/thisOneMass) - sqrt(G * ((0.18986*systemMassesmultiplier * thisOneMass) / (10.7*systemSizesmultiplier)) * 1/thisOneMass)), fill: random([[210, 81, 47], /*[247, 37, 133], [76, 201, 240]*/]), radius: 0.026341*radiusScale*systemSizesmultiplier, mass: thisOneMass, fixed: false}))

    // Europe - Jupiter's satellite
    thisOneMass = 0.0000048017*systemMassesmultiplier
    thisOneX = (-7780 - 6.70900)*systemSizesmultiplier
    distToSun = abs(thisOneX)
    particles.push(new Player({pos: createVector(thisOneX, 0), name: 'Европа', shape: 'ellipse', vel: createVector(0, -sqrt(G * ((gameObjects[0].mass * thisOneMass) / distToSun) * 1/thisOneMass) - sqrt(G * ((0.18986*systemMassesmultiplier * thisOneMass) / (6.70900*systemSizesmultiplier)) * 1/thisOneMass)), fill: random([[210, 81, 47], /*[247, 37, 133], [76, 201, 240]*/]), radius: 0.015608*radiusScale*systemSizesmultiplier, mass: thisOneMass, fixed: false}))


    // The Saturn
    let saturnMass = 0.0568*systemMassesmultiplier
    thisOneMass = saturnMass
    thisOneX = -14334.49370*systemSizesmultiplier
    distToSun = abs(thisOneX)
    particles.push(new Player({pos: createVector(thisOneX, 0), name: 'Сатурн', shape: 'ellipse', vel: createVector(0, -sqrt(G * ((gameObjects[0].mass * thisOneMass) / distToSun) * 1/thisOneMass)), fill: random([[210, 81, 47], /*[247, 37, 133], [76, 201, 240]*/]), radius: 0.58232*radiusScale*systemSizesmultiplier, mass: thisOneMass, fixed: false}))

    // Titan - Saturn's satellite
    thisOneMass = 0.000014*systemMassesmultiplier
    thisOneX = (-14334.49370 - 12.21830)*systemSizesmultiplier
    distToSun = abs(thisOneX)
    particles.push(new Player({pos: createVector(thisOneX, 0), name: 'Титан', shape: 'ellipse', vel: createVector(0, -sqrt(G * ((gameObjects[0].mass * thisOneMass) / distToSun) * 1/thisOneMass) - sqrt(G * ((saturnMass * thisOneMass) / 12.21830*systemSizesmultiplier) * 1/thisOneMass)), fill: random([[210, 81, 47], /*[247, 37, 133], [76, 201, 240]*/]), radius: 0.02576*radiusScale*systemSizesmultiplier, mass: thisOneMass, fixed: false}))

    // Reya - Saturn's satellite
    thisOneMass = 0.00000023*systemMassesmultiplier
    thisOneX = (-14334.49370 - 5.27107)*systemSizesmultiplier
    distToSun = abs(thisOneX)
    particles.push(new Player({pos: createVector(thisOneX, 0), name: 'Рея', shape: 'ellipse', vel: createVector(0, -sqrt(G * ((gameObjects[0].mass * thisOneMass) / distToSun) * 1/thisOneMass) - sqrt(G * ((saturnMass * thisOneMass) / 5.27107*systemSizesmultiplier) * 1/thisOneMass)), fill: random([[210, 81, 47], /*[247, 37, 133], [76, 201, 240]*/]), radius: 0.007643*radiusScale*systemSizesmultiplier, mass: thisOneMass, fixed: false}))

    // Yapet - Saturn's satellite
    thisOneMass = 0.00000018*systemMassesmultiplier
    thisOneX = (-14334.49370 - 35.61300)*systemSizesmultiplier
    distToSun = abs(thisOneX)
    particles.push(new Player({pos: createVector(thisOneX, 0), name: 'Япет', shape: 'ellipse', vel: createVector(0, -sqrt(G * ((gameObjects[0].mass * thisOneMass) / distToSun) * 1/thisOneMass) - sqrt(G * ((saturnMass * thisOneMass) / 35.61300*systemSizesmultiplier) * 1/thisOneMass)), fill: random([[210, 81, 47], /*[247, 37, 133], [76, 201, 240]*/]), radius: 0.007345*radiusScale*systemSizesmultiplier, mass: thisOneMass, fixed: false}))


    


    // The Uranus
    let uranusMass = 0.00868*systemMassesmultiplier
    thisOneMass = uranusMass
    thisOneX = -28000*systemSizesmultiplier
    distToSun = abs(thisOneX)
    particles.push(new Player({pos: createVector(thisOneX, 0), name: 'Уран', shape: 'ellipse', vel: createVector(0, -sqrt(G * ((gameObjects[0].mass * thisOneMass) / distToSun) * 1/thisOneMass)), fill: random([[0, 199, 222], /*[247, 37, 133], [76, 201, 240]*/]), radius: 0.25560*radiusScale*systemSizesmultiplier, mass: thisOneMass, fixed: false}))

    // Titania - Uranus' satellite
    thisOneMass = 0.0000003527*systemMassesmultiplier
    thisOneX = (-28000 - 4.36000)*systemSizesmultiplier
    distToSun = abs(thisOneX)
    particles.push(new Player({pos: createVector(thisOneX, 0), name: 'Титания', shape: 'ellipse', vel: createVector(0, -sqrt(G * ((gameObjects[0].mass * thisOneMass) / distToSun) * 1/thisOneMass) - sqrt(G * ((uranusMass * thisOneMass) / 4.36000*systemSizesmultiplier) * 1/thisOneMass)), fill: random([[210, 81, 47], /*[247, 37, 133], [76, 201, 240]*/]), radius: 0.007884*radiusScale*systemSizesmultiplier, mass: thisOneMass, fixed: false}))

    // Oberon - Uranus' satellite
    thisOneMass = 0.0000003014*systemMassesmultiplier
    thisOneX = (-28000 - 5.84000)*systemSizesmultiplier
    distToSun = abs(thisOneX)
    particles.push(new Player({pos: createVector(thisOneX, 0), name: 'Оберон', shape: 'ellipse', vel: createVector(0, -sqrt(G * ((gameObjects[0].mass * thisOneMass) / distToSun) * 1/thisOneMass) - sqrt(G * ((uranusMass * thisOneMass) / 5.84000*systemSizesmultiplier) * 1/thisOneMass)), fill: random([[210, 81, 47], /*[247, 37, 133], [76, 201, 240]*/]), radius: 0.007614*radiusScale*systemSizesmultiplier, mass: thisOneMass, fixed: false}))

    // Umbriel - Uranus' satellite
    thisOneMass = 0.0000001172*systemMassesmultiplier
    thisOneX = (-28000 - 2.65998)*systemSizesmultiplier
    distToSun = abs(thisOneX)
    particles.push(new Player({pos: createVector(thisOneX, 0), name: 'Умбриэль', shape: 'ellipse', vel: createVector(0, -sqrt(G * ((gameObjects[0].mass * thisOneMass) / distToSun) * 1/thisOneMass) - sqrt(G * ((uranusMass * thisOneMass) / 2.65998*systemSizesmultiplier) * 1/thisOneMass)), fill: random([[210, 81, 47], /*[247, 37, 133], [76, 201, 240]*/]), radius: 0.005847*radiusScale*systemSizesmultiplier, mass: thisOneMass, fixed: false}))


    // The Neptune
    
    thisOneMass = 0.0102*systemMassesmultiplier
    thisOneX = -45000*systemSizesmultiplier
    distToSun = abs(thisOneX)
    particles.push(new Player({pos: createVector(thisOneX, 0), name: 'Нептун', shape: 'ellipse', vel: createVector(0, -sqrt(G * ((gameObjects[0].mass * thisOneMass) / distToSun) * 1/thisOneMass)), fill: random([[210, 81, 47], /*[247, 37, 133], [76, 201, 240]*/]), radius: 0.24622*radiusScale*systemSizesmultiplier, mass: thisOneMass, fixed: false}))

}

function addImaginarySystem1() {
    // clear the scene
    gameObjects = []; trails = []

    particles.push(new Player({pos: createVector(100, 100), shape: 'ellipse', vel: createVector(0.6,0), fill: random([[100, 0, 150], /*[73,15,209], [247, 37, 133], [76, 201, 240]*/]), radius: 20*systemSizesmultiplier, mass: 150*systemMassesmultiplier, fixed: true}))
    particles.push(new Player({pos: createVector(100, -50), shape: 'ellipse', vel: createVector(-5,0), fill: random([[38, 25, 225], /*[73,15,209], [247, 37, 133], [76, 201, 240]*/]), radius: 3*systemSizesmultiplier, mass: 0.02*systemMassesmultiplier, fixed: false}))
    particles.push(new Player({pos: createVector(100, -60), shape: 'ellipse', vel: createVector(-5,0), fill: random([[38, 25, 225], /*[73,15,209], [247, 37, 133], [76, 201, 240]*/]), radius: 3*systemSizesmultiplier, mass: 0.02*systemMassesmultiplier, fixed: false}))
    particles.push(new Player({pos: createVector(100, -70), shape: 'ellipse', vel: createVector(-5,0), fill: random([[38, 25, 225], /*[73,15,209], [247, 37, 133], [76, 201, 240]*/]), radius: 3*systemSizesmultiplier, mass: 0.02*systemMassesmultiplier, fixed: false}))
    particles.push(new Player({pos: createVector(100, -80), shape: 'ellipse', vel: createVector(-5,0), fill: random([[38, 25, 225], /*[73,15,209], [247, 37, 133], [76, 201, 240]*/]), radius: 3*systemSizesmultiplier, mass: 0.02*systemMassesmultiplier, fixed: false}))
    particles.push(new Player({pos: createVector(100, -90), shape: 'ellipse', vel: createVector(-5,0), fill: random([[38, 25, 225], /*[73,15,209], [247, 37, 133], [76, 201, 240]*/]), radius: 3*systemSizesmultiplier, mass: 0.02*systemMassesmultiplier, fixed: false}))
    particles.push(new Player({pos: createVector(100, 190), shape: 'ellipse', vel: createVector(-5,5), fill: random([[255, 0, 0], /*[73,15,209], [247, 37, 133], [76, 201, 240]*/]), radius: 3*systemSizesmultiplier, mass: 0.02*systemMassesmultiplier, fixed: false}))

}

function rotateObjects() {
    for(let thisObj of gameObjects) {
        let thisObjCoords = [thisObj.pos.x, thisObj.pos.y]
        thisObj.pos.x = thisObjCoords[1]
        thisObj.pos.y = thisObjCoords[0]
    }
}


var canvas, ctx, video, videoStream, mediaRecorder, chunks, blob, videoURL
function startRecording() {
    cancelCreatingNewParicle = !cancelCreatingNewParicle

    canvas = document.querySelector("canvas");
    ctx = canvas.getContext("2d");
    
    video = document.querySelector("video");
    videoStream = canvas.captureStream(30);
    mediaRecorder = new MediaRecorder(videoStream);
    
    chunks = [];
    mediaRecorder.ondataavailable = function(e) {
    chunks.push(e.data);
    };
    
    mediaRecorder.onstop = function(e) {
    blob = new Blob(chunks, { 'type' : 'video/mp4' });
    chunks = [];
    videoURL = URL.createObjectURL(blob);
    video.src = videoURL;
    };
    mediaRecorder.ondataavailable = function(e) {
    chunks.push(e.data);
    };
    
    mediaRecorder.start();
    setInterval(draw, 300);
}

function stopRecording() {
    mediaRecorder.stop();
    videoBox.style.display = 'inline-block';
}

function stopToggle() {
    background(0)
    stopped = !stopped;
    cancelCreatingNewParicle = true
}
