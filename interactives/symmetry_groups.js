import * as THREE_UNEXTENDED from 'https://cdn.jsdelivr.net/npm/three@0.128/build/three.module.js';
import {OrbitControls, DragControls} from "./orbit_controls.js"
import {deepEquals} from "./common.js"

// Major props to https://github.com/learnthreejs/three-js-boilerplate for getting me started!

const THREE = {... THREE_UNEXTENDED, OrbitControls, DragControls }

// Units: SCALE is one grid spacing
const SCALE = 50

var scene = new THREE.Scene();
scene.background = new THREE.Color( 0xf0f0f0 );
var camera = new THREE.PerspectiveCamera( 70, 0, 4, 10000 );
var clickableObjects = [];

const gridDivisions = 50;
const gridSize = gridDivisions * SCALE;

let grid = new THREE.GridHelper( gridSize, gridDivisions );
showGrid()

function showGrid() {
  scene.add(grid)
}

function hideGrid() {
  scene.remove(grid)
}

let DOMList = {
  drawingSurface: "drawing-surface",
  groupSelectors: "group-selectors",
  items: "items"
}

const DOM = {}
for (let [ name, id ] of Object.entries(DOMList))
  if (!(DOM[name] = document.getElementById(id))) throw new Error(`Id ${id} no exist`)


var renderer = new THREE.WebGLRenderer();
window.onload = resizeRenderer

Object.assign(window, { THREE, DOM, renderer })

var textSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg")
textSVG.classList.add("text-svg")

new ResizeObserver(resizeRenderer).observe(DOM.drawingSurface)
DOM.drawingSurface.appendChild( renderer.domElement );
DOM.drawingSurface.appendChild(textSVG)

// Text elements currently displayed (constantly rewritten when rendering)
let displayedTextElems = []

// Takes in something like { text: ..., x, y, classes: [], noShadow: false/true }
function drawTextElements(elems) {
  if (!Array.isArray(elems)) throw TypeError()
  let currentElems = Array.from(textSVG.children)
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
  camera.position.z = 300;
  camera.position.x = 300;
  camera.position.y = 300;
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

    this.onAfterRender = () => {
      let v = new THREE.Vector3()

      this.updateMatrixWorld()
      v.setFromMatrixPosition(this.matrixWorld)
      v.project(camera)

      let size = renderer.getSize(new THREE.Vector2())

      v.x *= size.x / 2
      v.y *= size.y / 2

      // ASSUMES CANVAS IS ALIGNED TO TOP LEFT OF SCREEN
      let adjust = this.adjust

      displayedTextElems.push({ text: this.text, x: v.x + adjust.x, y: v.y + adjust.y })
    }
  }
}

class VisObject extends THREE.Mesh {
  constructor(params={}) {
    super(params.geometry, params.material ?? new THREE.MeshLambertMaterial({color: 0xdfdfdf}))

    this.position.set(params.position)
    this.clickable = !!params.clickable

    this.clickEventListeners = []
  }

  addClickEventListener (listener) {
    if (!this.clickEventListeners.includes(listener))
      this.clickEventListeners.push(listener)
  }

  removeClickEventListener (listener) {
    this.clickEventListeners = this.clickEventListeners.filter(l => l !== listener)
  }

  triggerClickEvent (evt) {
    this.clickEventListeners.forEach(l => l(evt, this))
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

function init() {
  console.log("init")
  scene.add( new THREE.AmbientLight( 0xbbbbbb ) );

  var light = new THREE.SpotLight( 0xffffff, 1.5 );
  light.position.set( 0, 500, 2000 );

  scene.add(light);

  var geometry = new THREE.BoxGeometry( SCALE, SCALE, SCALE );
  var object = new VisObject({ geometry, clickable: true })

  let text = new VisText({ text: "cow" })

  object.position.x = Math.random() * 10 - 50;
  object.position.y = Math.random() * 60 - 30;
  object.position.z = Math.random() * 80 - 40;

  scene.add( object );
  scene.add(text)
}

function dragStartCallback(event) {
  startColor = event.object.material.color.getHex();
  event.object.material.color.setHex(0x000000);
  orbitControls.enabled = false
}

function dragendCallback(event) {
  event.object.material.color.setHex(startColor);
  orbitControls.enabled = true
}

function animate() {
  requestAnimationFrame( animate );

  disableOrbitIfMouseDownOnObject()
  orbitControls.update()

  displayedTextElems = []

  renderer.render(scene, camera);
  drawTextElements(displayedTextElems)
}

init();
animate();
