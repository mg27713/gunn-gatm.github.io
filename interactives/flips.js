// Identity is [ 0, 1, 2 ], etc.
let textbookNaming = {
    'I': [ 0, 1, 2 ],
    'A': [ 0, 2, 1 ],
    'B': [ 2, 1, 0 ],
    'C': [ 1, 0, 2 ],
    'D': [ 2, 0, 1 ],
    'E': [ 1, 2, 0 ]
}

// Convert an element to its name
function elementToName(e) {
    outer: for (let [name, values] of Object.entries(textbookNaming)) {
        for (let i = 0; i < values.length; ++i) {
            if (values[i] !== e[i]) continue outer;
        }

        return name
    }

    return null
}

function nameToElement(name) {
    return textbookNaming[name]
}

function toElement(o) {
    if (typeof o === "string") {
        return nameToElement(o)
    } else if (Array.isArray(o)) {
        return o;
    }

    throw new TypeError("What the fuck")
}

function toName(o) {
    if (typeof o === "string") {
        return o
    } else if (Array.isArray(o)) {
        return elementToName(o);
    }
    throw new TypeError("What the fuck # 2")
}

function composeTwoElements(e1, e2) {
    // e1 o e2
    e1 = toElement(e1)
    e2 = toElement(e2)
    let arr = []

    for (let i = 0; i < e2.length; ++i) {
        arr[i] = e1[e2[i]]
    }

    return arr
}

function composeElements(elems) {
    return elems.reduceRight(composeTwoElements)
}

function invertElement(e) {
    let len = e.length
    let ret = []
    for (let i = 0; i < len; ++i) ret[e[i]] = i

    return ret
}

class Vector2 {
    constructor(x, y) {
        this.x = x
        this.y = y
    }

    eq(v) {
        return v && (this.x === v.x && this.y === v.y)
    }

    clone() {
        return new Vector2(this.x, this.y)
    }

    // Try to convert anything to a vec2
    static fromObj(o) {
        let x = 0, y = 0
        if (Array.isArray(o)) {
            x = o[0]
            y = o[1]
        } else if (o.x !== undefined) {
            x = o.x
            y = o.y
        }

        return new Vector2(+x, +y)
    }
    
    scale(factor) {
        return new Vector2(factor*this.x, factor*this.y);
    }
    
    translate(direction) {
        return new Vector2(this.x+direction.x, this.y+direction.y);
    }
    
    fromVector(other) {
        return this.translate(other.scale(-1));
    }
}

// Returns a string between -2 billion and 2 billion
function getUUID() {
    return ((Math.random() * (2 ** 32)) | 0) + ""
}

class VisComponent {
    constructor() {
        this.domElement = null
        this.id = getUUID()

        this.init()
        this.setDOMID()
    }

    init() {

    }

    setDOMID() {
        if (this.domElement)
            this.domElement.id = this.id
    }

    update() {
        this._update()
    }

    _update() {

    }
}

class CircleComponent extends VisComponent {
  constructor () {
    super()

    this.x = 50
    this.y = 50
    this.r = 40
    // Unused
    this.fill = "red"
    this.stroke = "black"
    this.strokeWidth = 3
  }

  init () {
    this.domElement = document.createElementNS("http://www.w3.org/2000/svg", "circle")
  }

  _update () {
    this.domElement.setAttribute("cx", this.x)
    this.domElement.setAttribute("cy", this.y)
    this.domElement.setAttribute("r", this.r)

    this.domElement.classList.add("snap-post")

    // this.domElement.setAttribute("fill", this.fill)
    // this.domElement.setAttribute("stroke", this.stroke)
    // this.domElement.setAttribute("stroke-width",  this.strokeWidth)
  }
}

// Whether to do a boing at all :(
let doBoing = true

const DEFAULT_HEIGHT = 100

class VisGroup extends VisComponent {
    constructor() {
        super()

        this.children = []
    }

    addChild(child) {
        if (!(child instanceof VisComponent))
            throw new TypeError("Child must be a VisComponent")
        this.removeChild(child)

        this.children.push(child)
    }

    update() {
        this._update()

        for (let child of this.children) {
            child.update()
        }
    }

    removeChild(child) {
        let index = this.children.indexOf(child)
        if (index === -1) return
        this.children.splice(index, 1)
    }

    getFlattenedComponents() {
        let components = []

        for (let child of this.children) {
            if (child instanceof VisGroup) {
                components = components.concat(child.getFlattenedComponents())
            } else {
                components.push(child)
            }
        }

        return components
    }

    removeChildren() {
        this.children = []
    }
}

function removeDuplicateVertices(v) {
    if (v.length === 0) return v

    let ret = []
    for (let i = 0; i < v.length; ++i) {
        if (!v[i].eq(v[i - 1])) {
            ret.push(v[i].clone())
        }
    }

    return ret
}

function distBetween(v1, v2) {
    return Math.hypot(v1.x - v2.x, v1.y - v2.y)
}

function vertexChainLength(vertices) {
    if (vertices.length <= 1) return 0

    let len = 0
    for (let i = 0; i < vertices.length - 1; ++i) {
        let v = vertices[i]
        let nextV = vertices[i + 1]

        len += distBetween(v, nextV)
    }

    return len
}

// Get values between [0, 1] of the vertices in a chain
function getVertexProportions(vertices) {
    if (vertices.length === 0) return []
    if (vertices.length === 1) return [0]

    let props = []

    let len = 0
    for (let i = 0; i < vertices.length - 1; ++i) {
        let v = vertices[i]
        let nextV = vertices[i + 1]

        props.push(len)

        let dist = distBetween(v, nextV)
        len += dist
    }

    props.push(len)
    for (let i = 0; i < props.length; ++i) {
        props[i] /= len
    }

    return props
}

// Sample chain at positions between 0 and 1
function sampleChain(vertices, proportions = [], knownLen = -1) {
    if (vertices.length === 0) return []
    if (vertices.length === 1) {
        let ret = []
        for (let i = 0; i < proportions.length; ++i) ret.push(vertices[0].clone())

        return ret
    }

    let totalLen = (knownLen < 0) ? vertexChainLength(vertices) : knownLen
    let lenTraversed = 0
    let sampleIndex = 0

    let samples = []

    // Step along by deltaLen
    segments: for (let i = 0; i < vertices.length - 1; ++i) {
        let startV = vertices[i]
        let endV = vertices[i + 1]

        let len = distBetween(endV, startV)

        // Check whether this sample lies in this segment
        for (; ;) {
            let prop = proportions[sampleIndex]
            let lenNeeded = prop * totalLen

            if (prop === 1) break segments // Reached end

            if (lenNeeded <= lenTraversed) {
                samples.push(vertices[i].clone())
            } else if (lenNeeded <= lenTraversed + len) {
                let segmentProp = (lenNeeded - lenTraversed) / len
                samples.push(new Vector2(startV.x + (endV.x - startV.x) * segmentProp, startV.y + (endV.y - startV.y) * segmentProp))
            } else {
                break
            }

            sampleIndex++
            if (sampleIndex === proportions.length) return samples
        }

        lenTraversed += len
    }

    for (; sampleIndex < proportions.length; ++sampleIndex) {
        let lastVertex = vertices[vertices.length - 1]

        samples.push(lastVertex.clone())
    }

    return samples
}

function arange(start, end, count) {
    // Inclusive

    if (count === 0) return []
    else if (count === 1) return [start]

    let ret = []
    for (let i = 0; i < count - 1; ++i) {
        ret.push(start + (end - start) * i / (count - 1))
    }
    ret.push(end)

    return ret
}

// A complete state is as follows:
// currentVertices: Vector2[s]
// currentVertexVelocities: Vector2[s]
// originalFixedVertices: Vector2[m]
// fixedMovementProportion: number -> between 0 and 1, how much the movement has finished
// fixedVertices: Vector2[m]
// fixedIndices: int[m] -> indices of fixedVertices within currentVertices
// targetFixedVertices: Vector2[m] -> W


function interpolateVertices(original, target, prop) {
    if (prop === 0 || prop === 1) {
        let toClone = (prop === 0) ? original : target
        return toClone.map(v => v.clone())
    }

    let ret = []
    for (let i = 0; i < original.length; ++i) {
        let o = original[i], t = target[i]

        ret.push(new Vector2(o.x + (t.x - o.x) * prop, o.y + (t.y - o.y) * prop))
    }

    return ret
}

// How many physics ticks to run per second (independent of frame rate)
let PHYSICS_TPS = 1000

// Max physics ticks per frame (to avoid lag)
const MAX_TICKS_PER_FRAME = 1000

let TRIANGLE_SPEED = 30;

class VisTriangle extends VisComponent {
    init() {
        this.domElement = this.domElement = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        this.moving = false;
    }
    
    _update() {
        if (!this.moving)
            return;
        
        this.place(this.v1.translate(this.s1), this.v2.translate(this.s2), this.v3.translate(this.s3));
    }
    
    place(v1, v2, v3) {
        this.v1 = v1;
        this.v2 = v2;
        this.v3 = v3;
        
        this.domElement.points = v1.x + "," + v1.y + " "
                               + v2.x + "," + v2.y + " "
                               + v3.x + "," + v3.y
    }
    
    moveTo(v1, v2, v3) {
        this.moving = true;
        this.s1 = v1.fromVector(this.v1).scale(1/TRIANGLE_SPEED);
        this.s2 = v2.fromVector(this.v2).scale(1/TRIANGLE_SPEED);
        this.s3 = v3.fromVector(this.v3).scale(1/TRIANGLE_SPEED);
    }
}

class FlipVisualization extends VisGroup {
    constructor() {
        super()

        // Create svg element
        this.domElement = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    }

    resize() {
        this.setDims(window.innerWidth, window.innerHeight)
    }

    setDims(width, height) {
        // Set svg dimensions
        this.domElement.setAttribute("width", width)
        this.domElement.setAttribute("height", height)
    }

    render() {
        this.update()

        let foundIDs = []
        let components = this.getFlattenedComponents()

        for (let component of components) {
            if (!this.domElement.getElementById(component.id)) {
                this.domElement.appendChild(component.domElement)
            }

            foundIDs.push(component.id)
        }

        for (let node of Array.from(this.domElement.childNodes)) {
            let id = node.getAttribute("id")
            if (!foundIDs.includes(id)) {
                this.domElement.removeChild(node)
            }
        }
    }
}

// Attach boing slider
const boingSpeedSlider = document.getElementById("boing-speed");
const boingTPSSlider = document.getElementById("boing-tps")
const boingCheckbox = document.getElementById("do-boing")

function setBoingSpeed(r) {
    r = Math.min(Math.max(r, 8), 1000) | 0
    boingSpeedSlider.value = r
    TRIANGLE_SPEED = r
}

function setTPS(t) {
    t = Math.min(Math.max(t, 60), 1000000)
    boingTPSSlider.value = Math.sqrt(t) | 0
    PHYSICS_TPS = t
}

setTPS(1000)

boingSlider.addEventListener("input", () => {
    setBoingFactor(boingSlider.value / 1000)
})

boingResSlider.addEventListener("input", () => {
    setBoingRes(boingResSlider.value)
})
boingTPSSlider.addEventListener('input', () => {
    setTPS(boingTPSSlider.value ** 2)
})
boingCheckbox.addEventListener("input", () => {
    doBoing = !!boingCheckbox.checked
})

let mainTriangle = new VisTriangle();
mainTriangle.place(new Vector2(60, 60), new Vector2(120, 60), new Vector2(90, 120));

function addItems() {
    let items = document.getElementById("items")
    let squishCancel = -1

    let MUST_ADD_AFTER_SQUISH = []

    for (let elem of Object.keys(textbookNaming)) {
        let wrapper = document.createElement("button")
        wrapper.classList.add("item-wrapper")

        wrapper.innerHTML = `<p>${elem}</p>`
        let vis = new FlipVisualization()
        let chain = new FlipChain()

        vis.setDims(10 + 30 * 2 + 10, 70)
        chain.displayOpts.width = 30
        chain.displayOpts.height = 50
        chain.setPosition(10, 10)
        chain.setSnapElements([elem])
        vis.addChild(chain)
        vis.render()

        wrapper.appendChild(vis.domElement)
        vis.domElement.classList.add("item-preview")
        items.appendChild(wrapper)

        wrapper.onclick = () => {
            if (mainChain.displayOpts.height !== DEFAULT_HEIGHT) {
                // squish down
                let orig = mainChain.displayOpts.height
                let delta = (orig - DEFAULT_HEIGHT) / 60 // squish down in 60 frames

                // Allows for multiple elements to be added after a squish
                MUST_ADD_AFTER_SQUISH.push(elem)

                clearInterval(squishCancel)
                squishCancel = setInterval(() => {
                    mainChain.forceSnap = true

                    if ((mainChain.displayOpts.height -= delta) < DEFAULT_HEIGHT) {
                        mainChain.displayOpts.height = DEFAULT_HEIGHT
                        clearInterval(squishCancel)

                        setTimeout(() => {
                            mainChain.forceSnap = true
                            MUST_ADD_AFTER_SQUISH.forEach(e => mainChain.addElement(e))
                            MUST_ADD_AFTER_SQUISH = []
                            mainChain.needsRestringing = true
                        }, 100) // subtle timeout
                    }

                    mainChain.needsRestringing = true
                }, 1 / 60)

            } else {
                mainChain.forceSnap = true
                mainChain.addElement(elem)
            }
        }

        wrapper.onmousedown = () => {
            // TODO
            console.log("creating " + elem)
            selectedElem = elem
        }
    }
}

function dropItem() {
    if (selectedElem) {
        console.log("dropping " + selectedElem)
    }
}

document.body.onmouseup = dropItem

addItems()

const vis = new SnapVisualization()
document.getElementById("drawing-surface").appendChild(vis.domElement)

let mainChain = new SnapChain()
vis.addChild(mainChain)

document.getElementById("giant-button").onclick = () => {
    mainChain.snap()
}

function render() {
    vis.resize()
    vis.render()

    window.requestAnimationFrame(render)
}

render()

// Switches the current color theme.
function switchTheme() {
    if (document.body.classList.contains('dark'))
        document.body.classList.remove('dark');
    else document.body.classList.add('dark');
}
