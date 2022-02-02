import * as THREE_UNEXTENDED from 'https://cdn.jsdelivr.net/npm/three@0.128/build/three.module.js';
import {OrbitControls, DragControls, ConvexGeometry} from "./orbit_controls.js"
import {deepEquals} from "./common.js"

// Major props to https://github.com/learnthreejs/three-js-boilerplate for getting me started!

const THREE = Object.freeze({... THREE_UNEXTENDED, OrbitControls, DragControls, ConvexGeometry })

// Styling info for y'all
// You can just set the value in styles and it will automatically update
let styles = {
  triangleColor: { default: 0x8f8f1f, handler: setColor(() => triangleMaterial) },
  gridColor: { default: 0x888888, handler: v => grid.colorCenterLine = grid.colorGrid = new THREE.Color(v) },
  backgroundColor: { default: 0xf0f0f0, handler: v => scene.background = new THREE.Color(v) },
  selectedTriangleColor: { default: 0x3f3f3f, handler: setColor(() => selectedTriangleMaterial)},
  allow2DRotation: { default: false, handler: allow2DRotation }, // if false, then you can basically just drag around in 2D
  allow3DRotation: { default: false, handler: allow3DRotation }  // if this is true, then allow2DRotation is set to true
}

// Note, if you change this you will have to change some other stuff
const SIZE = 2500
const gridDivisions = 15;
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, SIZE / 2, 0) // points toward (0, 0, 0)

const paperThickness = 6;

const SCALE = SIZE / gridDivisions
const gridSize = SIZE

function setColor(target) {
  return v => target().color = new THREE.Color(v)
}

function setStyleDefaults () {
  for (let o of Object.values(styles)) {
    (o.setDefault = () => o.handler(o.value = o.default))()
  }
}

styles = new Proxy(styles, {
  get: (target, prop, receiver) => {
    let style = target[prop]
    console.log("hi")

    setTimeout(() => {
      // After they've set the value, call the handler
      style.handler(style.value ?? style.default)
    }, 0)

    return style
  }
})

window.styles = styles

let triangleMaterial = new THREE.MeshLambertMaterial()
let selectedTriangleMaterial = new THREE.MeshLambertMaterial()

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 70, 0, 10, 10000 );
var clickableObjects = [];

let grid = new THREE.GridHelper(gridSize, gridDivisions);
grid.position.y = 0
scene.add(grid)

window.grid = grid

let DOMList = {
  drawingSurface: "drawing-surface",
  groupSelectors: "group-selectors",
  items: "items"
}

function allow2DRotation (v) {
  if (typeof v !== "boolean") {
    throw new Error("allow2DRotation must be a boolean")
  }

  if (!v) {
    // We no longer use OrbitControls, look from the bottom down, and default to being able to translate
    setDefaultCamera()

  }
}

function allow3DRotation (v) {
  if (typeof v !== "boolean") {
    throw new Error("allow3DRotation must be a boolean")
  }
}

const DOM = {}
for (let [ name, id ] of Object.entries(DOMList))
  if (!(DOM[name] = document.getElementById(id))) throw new Error(`Id ${id} no exist`)

var renderer = new THREE.WebGLRenderer();
window.onload = resizeRenderer

Object.assign(window, { THREE, DOM, renderer })

var textSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg")
textSVG.classList.add("text-svg")

// Credit to https://developer.mozilla.org/en-US/docs/Web/SVG/Element/marker
textSVG.innerHTML = `<defs>
    <marker id="x-arrow" viewBox="0 0 10 10" refX="5" refY="5"
        markerWidth="6" markerHeight="6"
        orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="red" />
    </marker>
    <marker id="y-arrow" viewBox="0 0 10 10" refX="5" refY="5"
        markerWidth="6" markerHeight="6"
        orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="green" />
    </marker>`

new ResizeObserver(resizeRenderer).observe(DOM.drawingSurface)
DOM.drawingSurface.appendChild( renderer.domElement );
DOM.drawingSurface.appendChild(textSVG)

// Text elements currently displayed (constantly rewritten when rendering)
let displayedTextElems = []

// Takes in something like { text: ..., x, y, classes: [], noShadow: false/true }
function drawTextElements(elems) {
  if (!Array.isArray(elems)) throw TypeError()
  let currentElems = Array.from(textSVG.children).filter(elem => elem.nodeName === "text")
  let currentCount = currentElems.length

  let n = []
  // Add shadows for text readability
  for (const elem of elems) {
    if (!elems.noShadow) {
      n.push({ ...elem, classes: [ "text-shadow" ].concat(elem.classes) })
    }

    n.push(elem)
  }
  elems = n

  for (let i = 0; i < elems.length; ++i) {
    let e = elems[i]
    let dom = (i < currentCount) ? currentElems[i] : textSVG.appendChild(
      document.createElementNS("http://www.w3.org/2000/svg", "text"))

    let classes = ["text-label"].concat([ e.classes ]).flat().filter(s => !!s)

    // Update classes
    window.de = deepEquals
    if (!deepEquals(Array.from(dom.classList).sort(), classes.sort())) {
      dom.setAttributeNS(null, "class", "")
      for (let c of classes) if (c) dom.classList.add(c)
    }

    dom.textContent = e.text
    dom.setAttributeNS(null, "x", +e.x)
    dom.setAttributeNS(null, "y", +e.y)
  }

  // Remove unused text elements
  for (let i = elems.length; i < currentCount; ++i) {
    currentElems[i].remove()
  }
}

let orientatorGroup // { g: <g>, xLabel: <text>, yLabel: <text>, xArrow: <polyline>, yArrow: <polyline> }

function getOrientatorGroup () {
  if (orientatorGroup) return orientatorGroup

  let o = document.createElementNS("http://www.w3.org/2000/svg", "g")
  let [ xLabel, yLabel ] = [ 'x-label', 'y-label' ].map(c => {
    let e = document.createElementNS("http://www.w3.org/2000/svg", "text")
    e.classList.add(c, 'widget-label')

    return e
  })

  let [ xArrow, yArrow ] = [ 'x-arrow', 'y-arrow' ].map(c => {
    let e = document.createElementNS("http://www.w3.org/2000/svg", "polyline")
    e.classList.add(c, 'widget-arrow')

    return e
  })

  ;[xLabel, yLabel, xArrow, yArrow].forEach(e => o.appendChild(e))
  textSVG.appendChild(o)

  return orientatorGroup = { g: o, xLabel, yLabel, xArrow, yArrow }
}

function drawSVGOrientator () {
  // A little widget in the bottom left that shows which direction is x and y

  let SPACING = 60
  let ARROW_LENGTH = 40
  let TEXT_SPACING = 10 + ARROW_LENGTH

  let size = DOM.drawingSurface.getBoundingClientRect()

  let corner = new THREE.Vector2(SPACING, size.height - SPACING)

  let xDisp = new THREE.Vector2(1, 0)
  let yDisp = new THREE.Vector2(0, 1)

  xDisp = xDisp.normalize().multiplyScalar(ARROW_LENGTH)
  yDisp = yDisp.normalize().multiplyScalar(ARROW_LENGTH)

  function toPolylineV (v1, v2) {
    return `${v1.x},${v1.y} ${v2.x},${v2.y}`
  }

  let g = getOrientatorGroup()
  g.xArrow.setAttributeNS(null, "points", toPolylineV(corner, corner.clone().add(xDisp)))
  g.yArrow.setAttributeNS(null, "points", toPolylineV(corner, corner.clone().add(yDisp)))
}

function resizeRenderer () {
  let s = DOM.drawingSurface.getBoundingClientRect()
  window.DOM = DOM

  renderer.setSize(s.width, s.height);
  camera.aspect = s.width / s.height
  camera.updateProjectionMatrix()

  textSVG.setAttribute("width", s.width)
  textSVG.setAttribute("height", s.height)
}

const raycaster = new THREE.Raycaster();
const mousePos = new THREE.Vector2();

let isMouseDown = false

renderer.domElement.addEventListener("mousemove", (event) => {
  mousePos.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  mousePos.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
})

// We LOVE self-documenting functions
function disableOrbitIfMouseDownOnObject () {
  if (!isMouseDown) return

    raycaster.setFromCamera(mousePos, camera);
    const intersects = raycaster.intersectObjects(clickableObjects);

    orbitControls.enabled = (intersects.length === 0)
}

var orbitControls = new THREE.OrbitControls(camera, renderer.domElement)
var controls = new THREE.DragControls( clickableObjects, camera, renderer.domElement );
controls.addEventListener( 'dragstart', dragStartCallback );
controls.addEventListener( 'dragend', dragendCallback );

function setDefaultCamera() {
  camera.position.copy(DEFAULT_CAMERA_POSITION)
  camera.lookAt(0, 0, 0)
}

setDefaultCamera()
var startColor;

const nullGeometry = new THREE.BufferGeometry()
const nullMaterial = new THREE.MeshLambertMaterial()

class VisText extends THREE.Mesh {
  constructor(params={}) {
    super(nullGeometry, nullMaterial)

    this.text = params.text

    // Adjust text position, in pixels
    this.adjust = new THREE.Vector2(0, 0)

    this.position.copy(params.position ?? new THREE.Vector3(0,0,0))

    this.onAfterRender = () => {
      camera.updateMatrixWorld()
      this.updateMatrixWorld()

      let v = new THREE.Vector3()
      v.setFromMatrixPosition(this.matrixWorld)
      v.project(camera)

      window.camera = camera

      let size = renderer.getSize(new THREE.Vector2())

      v.x = (v.x * size.x / 2) + size.x / 2
      v.y = -(v.y * size.y / 2) + size.y / 2

      // ASSUMES CANVAS IS ALIGNED TO TOP LEFT OF SCREEN
      let adjust = this.adjust

      let x = v.x + adjust.x
      let y = v.y + adjust.y

      if (-100 < x && x < 4000 && -100 < y && y < 4000) {
        displayedTextElems.push({ text: this.text, x: v.x + adjust.x, y: v.y + adjust.y })
      }
    }
  }
}

class VisObject extends THREE.Mesh {
  constructor(params={}) {
    super(params.geometry, params.material ?? new THREE.MeshLambertMaterial({color: 0xdfdfdf}))

    this.position.set(params.position)
    this.clickable = !!params.clickable

    this.visEventListeners = {}
  }

  addVisEventListener (name, listener) {
    if (!(this.visEventListeners[name] ?? (this.visEventListeners[name] = [])).includes(listener))
      this.clickEventListeners.push(listener)
  }

  removeVisEventListener (name, listener) {
    this.clickEventListeners = this.clickEventListeners.filter(l => l !== listener)
  }

  triggerEvent (evt) {
    this.clickEventListeners[evt]?.forEach(l => l(evt, this))
  }

  // Whether we can interact
  get clickable () {
    return this._clickable
  }

  set clickable(v) {
    if (typeof v !== "boolean") throw new TypeError("????? 西瓜瓤")
    this._clickable = v

    if (v && !clickableObjects.includes(this)) {
      clickableObjects.push(this)
    } else if (clickableObjects.includes(this)) {
      clickableObjects = clickableObjects.filter(o => o !== this)
    }
  }
}

// Centered on (0,0,0), vertex pointing in the x direction, positive thickness
function generateRegularPolygon(n=3, circumradius=SCALE, thickness = paperThickness) {
  let points = []
  let midriff = []

  for (let i = 0; i < n; ++i) {
    let x = Math.cos(i / n * 2 * Math.PI) * circumradius
    let z = Math.sin(i / n * 2 * Math.PI) * circumradius
    points.push(new THREE.Vector3(x, thickness / 2, z))
    points.push(new THREE.Vector3(x, -thickness / 2, z))
    midriff.push(new THREE.Vector3(x, 0, z))
  }
  return { g: new THREE.ConvexGeometry(points), midriff }
}

let paperTriangle = generateRegularPolygon(3)
window.g = paperTriangle

class TriangleObject extends VisObject {
  constructor (params={}) {
    super({ geometry: paperTriangle.g, clickable: true, material: triangleMaterial })

    this.position.set(0, 0, 0)

    this.labels = paperTriangle.midriff.map((v, i) => {
      v = v.clone().multiplyScalar(1.1)
      return new VisText({ text: (i+1)+'', position: v })
    })

    this.labels.forEach(l => this.add(l))

    this.unselectedMaterial = triangleMaterial
    this.selectedMaterial = selectedTriangleMaterial
  }
}

function init() {
  console.log("init")
  scene.add( new THREE.AmbientLight( 0xbbbbbb ) );

  var light = new THREE.SpotLight( 0xffffff, 1.5 );
  light.position.set( 0, 500, 2000 );

  scene.add(light);

  let triangle = new TriangleObject()
  scene.add(triangle);
}

function dragStartCallback(event) {
  orbitControls.enabled = false // controls clash with each other
  if (event.object.selectedMaterial)
    event.object.material = event.object.selectedMaterial
}

function dragendCallback(event) {
  if (event.object.selectedMaterial)
    event.object.material = event.object.unselectedMaterial
  orbitControls.enabled = true
}

function animate() {
  requestAnimationFrame( animate );

  disableOrbitIfMouseDownOnObject()
  orbitControls.update()

  displayedTextElems = []
  camera.updateProjectionMatrix()

  renderer.render(scene, camera);
  drawTextElements(displayedTextElems)
  drawSVGOrientator()
}

setStyleDefaults()

init();
animate();
