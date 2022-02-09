import {
  Vector2,
  Vector3,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  Scene,
  WebGLRenderer,
  PerspectiveCamera,
  Plane,
  GridHelper,
  Raycaster,
  BufferGeometry,
  Color,
  AmbientLight,
  SpotLight,
  CylinderGeometry, BufferAttribute, Float32BufferAttribute, VertexColors, DoubleSide, MeshBasicMaterial
} from '../external/three.module.js'
import {OrbitControls, DragControls, ConvexGeometry} from "./three_addons.js"
import {deepEquals} from "./common.js"

// Major props to https://github.com/learnthreejs/three-js-boilerplate for getting me started!

// Styling info for y'all
// You can just set the value in styles and it will automatically update
let styles = {
  triangleColor: { default: 0x8f8f1f, handler: setColor(() => triangleMaterial) },
  gridColor: { default: 0x888888, handler: v => grid.colorCenterLine = grid.colorGrid = new Color(v) },
  backgroundColor: { default: 0xf0f0f0, handler: v => miniatureScene.background = scene.background = new Color(v) },
  selectedTriangleColor: { default: 0x3f3f3f, handler: setColor(() => selectedTriangleMaterial)},
  allow3DRotation: { default: false, handler: allow3DRotation }
}

// Note, if you change this you will have to change some other stuff
const SIZE = 15
const gridDivisions = 15;
const DEFAULT_CAMERA_POSITION = new Vector3(0, SIZE / 2, 0) // points toward (0, 0, 0)
const DEFAULT_MINIATURE_CAMERA_POSITION = new Vector3(1.2, 1.2, 1)

const paperThickness = 0.01;

const SCALE = SIZE / gridDivisions
const gridSize = SIZE

function setColor(target) {
  return v => target().color = new Color(v)
}

function setStyleDefaults () {
  for (let o of Object.values(styles)) {
    (o.setDefault = () => o.handler(o.value = o.default))()
  }
}

styles = new Proxy(styles, {
  get: (target, prop, receiver) => {
    let style = target[prop]
    console.log("Updating property " + prop)

    setTimeout(() => {
      // After they've set the value, call the handler
      style.handler(style.value ?? style.default)
    }, 0)

    return style
  }
})

window.styles = styles

let triangleMaterial = new MeshLambertMaterial()
let selectedTriangleMaterial = new MeshLambertMaterial()

var scene = new Scene();
var camera = new PerspectiveCamera( 70, 0, 0.0001, 1000 );
var clickableObjects = [];

// Plane of the grid
let workingPlane = new Plane(new Vector3(0, 1, 0))

let grid = new GridHelper(gridSize, gridDivisions);
scene.add(grid)

let DOMList = {
  drawingSurface: "drawing-surface",
  groupSelectors: "group-selectors",
  items: "items",
  allow3DRotation: "allow-3d",
  miniature: "miniature"
}

let useTranslationControls = true

function allow3DRotation (v) {
  if (typeof v !== "boolean") {
    throw new Error("allow3DRotation must be a boolean") // thanks copilot
  }

  DOM.allow3DRotation.checked = v

  if (!v) {
    setDefaultCamera()
    useTranslationControls = true
    orbitControls.enabled = false
  } else {
    useTranslationControls = false
    orbitControls.maxPolarAngle = Math.PI / 2 - 0.1 // prevent from going under the grid
    orbitControls.enabled = true
  }
}

const DOM = {}
for (let [ name, id ] of Object.entries(DOMList))
  if (!(DOM[name] = document.getElementById(id))) throw new Error(`Id ${id} no exist`)

var renderer = new WebGLRenderer();
window.onload = resizeRenderer

import * as THREE from '../external/three.module.js';

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

DOM.allow3DRotation.addEventListener("input", () => {
  allow3DRotation(DOM.allow3DRotation.checked)
})

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
    if (!deepEquals(Array.from(dom.classList).sort(), classes.sort())) {
      dom.setAttributeNS(null, "class", "")
      for (let c of classes) if (c) dom.classList.add(c)
    }

    dom.textContent = e.text
    setElemProps(dom, { x: e.x, y: e.y })
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

function setElemProps (textElem, dict) {
  for (let [ name, val ] of Object.entries(dict)) {
    if (name === "text") {
      textElem.textContent = val
    } else
    textElem.setAttributeNS(null, name, val)
  }
}

let orientatorRaycaster = new Raycaster()

function drawSVGOrientator () {
  // A little widget in the bottom left that shows which direction is x and y

  let SPACING = 60
  let ARROW_LENGTH = 40
  let TEXT_SPACING = 10 + ARROW_LENGTH

  let size = DOM.drawingSurface.getBoundingClientRect()

  let V2 = Vector2
  let V3 = Vector3

  let samplingCorner = new V2(size.height / 2, size.height / 2)
  let corner = new V2(SPACING, size.height - SPACING)

  // Compute where the corner lies on the plane. Janky, but whatever
  orientatorRaycaster.setFromCamera(domToDrawCoords(samplingCorner), camera)
  let intersects = new V3()

  orientatorRaycaster.ray.intersectPlane(workingPlane, intersects)

  let xDisp = drawToDOMCoords(intersects.clone().add(new V3(1, 0, 0)).project(camera)).sub(samplingCorner)
  let yDisp = drawToDOMCoords(intersects.clone().add(new V3(0, 0, 1)).project(camera)).sub(samplingCorner)

  xDisp = xDisp.normalize().multiplyScalar(ARROW_LENGTH)
  yDisp = yDisp.normalize().multiplyScalar(-ARROW_LENGTH)

  function toPolylineV (v1, v2) {
    return `${v1.x},${v1.y} ${v2.x},${v2.y}`
  }

  if (![xDisp.x, yDisp.x, xDisp.y, yDisp.y].every(isFinite)) return

  let g = getOrientatorGroup()
  setElemProps(g.xArrow, { points: toPolylineV(corner, corner.clone().add(xDisp)) })
  setElemProps(g.yArrow, { points: toPolylineV(corner, corner.clone().add(yDisp)) })

  setElemProps(g.xLabel, { text: "+x", ...corner.clone().add(xDisp.normalize().multiplyScalar(TEXT_SPACING)) })
  setElemProps(g.yLabel, { text: "+y", ...corner.clone().add(yDisp.normalize().multiplyScalar(TEXT_SPACING)) })
}

const MINIATURE_HEIGHT = 350

function resizeRenderer () {
  let s = DOM.drawingSurface.getBoundingClientRect()

  renderer.setSize(s.width, s.height);
  camera.aspect = s.width / s.height
  camera.updateProjectionMatrix()

  renderer.setPixelRatio(window.devicePixelRatio)
  miniatureRenderer.setPixelRatio(window.devicePixelRatio)

  textSVG.setAttribute("width", s.width)
  textSVG.setAttribute("height", s.height)

  let m = DOM.items.getBoundingClientRect()
  let mrw, mrh

  miniatureRenderer.setSize(mrw = m.width - 50, mrh = MINIATURE_HEIGHT)
  miniatureCamera.aspect = mrw / mrh
  miniatureCamera.updateProjectionMatrix()
}

const raycaster = new Raycaster();
const mousePos = new Vector2();

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

var orbitControls = new OrbitControls(camera, renderer.domElement)

var controls = new DragControls( clickableObjects, camera, renderer.domElement );
controls.addEventListener( 'dragstart', dragStartCallback );
controls.addEventListener( 'dragend', dragendCallback );

let 西瓜 = false

function setDefaultCamera() {
  camera.position.copy(DEFAULT_CAMERA_POSITION)
  camera.lookAt(0, 0, 0)
  西瓜 ? orbitControls.saveState() : orbitControls.reset()
  orbitControls.saveState()

  西瓜 = true
}

let 西瓜2 = false

function setDefaultMiniatureCamera() {
  miniatureCamera.position.copy(DEFAULT_MINIATURE_CAMERA_POSITION)
  miniatureCamera.lookAt(0, 0, 0)
  西瓜 ? orbitControls.saveState() : orbitControls.reset()
  orbitControls.saveState()

  西瓜2 = true
}

setDefaultCamera()

var startColor;

const nullGeometry = new BufferGeometry()
const nullMaterial = new MeshLambertMaterial()

function drawToDOMCoords (v) {
  let size = renderer.getSize(new Vector2())
  v = new Vector2(v.x, v.y)

  v.x = (v.x * size.x / 2) + size.x / 2
  v.y = -(v.y * size.y / 2) + size.y / 2

  return v
}

function domToDrawCoords (v) {
  let size = renderer.getSize(new Vector2())
  v = v.clone()

  v.x = (v.x - size.x / 2) * 2 / size.x
  v.y = (v.y - size.y / 2) * -2 / size.y

  return v
}

class VisText extends Mesh {
  constructor(params={}) {
    super(nullGeometry, nullMaterial)

    this.text = params.text

    // Adjust text position, in pixels
    this.adjust = new Vector2(0, 0)

    this.position.copy(params.position ?? new Vector3(0,0,0))

    this.onAfterRender = () => {
      camera.updateMatrixWorld()
      this.updateMatrixWorld()

      let v = new Vector3()
      v.setFromMatrixPosition(this.matrixWorld)
      v.project(camera)

      window.camera = camera
      v = drawToDOMCoords(v)

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

class VisObject extends Mesh {
  constructor(params={}) {
    super(params.geometry, params.material ?? new MeshLambertMaterial({color: 0xdfdfdf}))

    this.clickable = !!params.clickable
    this.position.set(0,0,0)
    this.domain = null

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

  setDomain (d) {
    this.domain = d
    this.children.forEach(c => c?.setDomain(d))
  }

  add (o) {
    super.add(o)
    o.setDomain(this.domain)
  }
}

// We represent a movement as a permutation of vertices. Not all permutations of vertices are valid for certain shapes!
// But it is a nice generic form

class Motion {
  constructor (vertexCount, vertices) {
    this.originalVertices = []
  }
}

let axisMaterial = new MeshBasicMaterial({ color: 0xff33dd })

class AxisObject extends VisObject {
  constructor (params={}) {
    super({ geometry: nullGeometry, material: axisMaterial })

    this.normal = params.normal ?? new Vector3()
    this.axisLen = 1
    this.girth = 0.04

    this.littleGirth = 0.02
    this.subtends = Math.PI / 4
    this.subtendsShift = 0.1

    this.computeChildren()
  }

  computeChildren () {
    // Set this geometry based on current stuff
    this.children.forEach(child => child.dispose())
    if (this.geometry !== nullGeometry) this.geometry.dispose()

    let n = this.normal
    if (n.length() < 0.2) {
      this.geometry = nullGeometry
      return
    }

    n.normalize().multiplyScalar(this.axisLen)

    let b = n.clone().multiplyScalar(-1)
    let e = n

    // b --> e axis
    let axisGeometry = generateArrow([ b, e ], { shaftGirth: this.girth, coneGirth: this.girth * 2, coneLen: this.girth * 3 })
    axisGeometry.computeVertexNormals()

    this.geometry = axisGeometry
  }
}

const generalMaterial = new THREE.MeshBasicMaterial ({ vertexColors: true })

class SymmetricalObject extends VisObject {
  constructor (params={}) {
    let shape = params.shape
    if (!shape) throw new Error("fuck you")

    let geometry = shape.geometry
    let faceColors = shape.faceColors

    let material = triangleMaterial

    if (faceColors) {
      geometry.setAttribute("color",
        new Float32BufferAttribute(faceColors
          .map(c => new Color(c).toArray())
          .map(c => c).flat(Infinity), 3))

      material = generalMaterial
    }

    geometry.computeVertexNormals()
    super({ geometry, clickable: false, material })

    this.position.set(0, 0, 0)

    this.inMotion = false
    this.shape = params.shape
    this.currentMotion =

    this.onAfterRender = () => {
      if (this.inMotion) {

      }
    }

    this.axisObjects = []
    this.planeObjects = []

    this.showAxisObjects(true)
  }

  showAxisObjects (show=true) {
    this.axisObjects.forEach(a => {
      this.remove(a)
      a.geometry.dispose()
    })

    if (show) {
      let o = this.axisObjects = []

      for (let axis of this.shape.axes) {
        o.push(new AxisObject({
          normal: axis
        }))
      }

      this.axisObjects.forEach(o => this.add(o))
    }
  }
}

class ReflectivePlaneObject extends VisObject {
  constructor (params={}) {
    super()
  }
}


function init() {
  console.log("init")
  scene.add( new AmbientLight( 0xbbbbbb ) );

  var light = new SpotLight( 0xffffff, 1.5 );
  light.position.set( 0, 500, 2000 );

  scene.add(light);

  miniatureScene.add(new SpotLight( 0xffffff, 1.5 ))
  miniatureScene.add(new AmbientLight( 0xeeeeee ) );

  miniatureScene.add(new SymmetricalObject({ shape: SHAPES.triangularPrism }))
}

function dragStartCallback(event) {
  controlControls(false)
  if (event.object.selectedMaterial)
    event.object.material = event.object.selectedMaterial
}

function dragendCallback(event) {
  if (event.object.selectedMaterial)
    event.object.material = event.object.unselectedMaterial

  controlControls(true)
}

function controlControls (enabled) {
  if (useTranslationControls) {

  } else {
    orbitControls.enabled = enabled
  }
}

import {generateArrow, SHAPES} from "./symmetries.js"
Object.assign(window, { SHAPES })

function animate() {
  requestAnimationFrame( animate );

  disableOrbitIfMouseDownOnObject()
  orbitControls.update()
  miniatureControls.update()

  displayedTextElems = []
  camera.updateProjectionMatrix()

  renderer.render(scene, camera);
  drawTextElements(displayedTextElems)
  drawSVGOrientator()

  displayedTextElems = []

  miniatureCamera.updateProjectionMatrix()
  miniatureRenderer.render(miniatureScene, miniatureCamera)
  //drawTextElements(displayedTextElems, miniatureSceneSVG)
}

let miniatureCamera = new PerspectiveCamera( 70, 0, 0.0001, 1000 )
let miniatureScene = new Scene()
let miniatureRenderer = new WebGLRenderer()
let miniatureControls = new OrbitControls(miniatureCamera, miniatureRenderer.domElement)

miniatureControls.enableKeys = false
setDefaultMiniatureCamera()

DOM.miniature.appendChild(miniatureRenderer.domElement)
new ResizeObserver(resizeRenderer).observe(DOM.items)

setStyleDefaults()

init();
animate();
