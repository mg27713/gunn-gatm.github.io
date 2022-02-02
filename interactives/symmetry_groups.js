import * as THREE_UNEXTENDED from 'https://cdn.jsdelivr.net/npm/three@0.128/build/three.module.js';
import {OrbitControls, DragControls} from "./orbit_controls.js"
import {deepEquals} from "./common.js"

const THREE = {... THREE_UNEXTENDED, OrbitControls, DragControls }

var scene = new THREE.Scene();
scene.background = new THREE.Color( 0xf0f0f0 );
var camera = new THREE.PerspectiveCamera( 70, 0, 700, 10000 );
var objects = [];

const size = 100;
const divisions = 10;

const gridHelper = new THREE.GridHelper( size, divisions );
scene.add( gridHelper );

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
    const intersects = raycaster.intersectObjects(objects);

    orbitControls.enabled = (intersects.length === 0)
}

var orbitControls = new THREE.OrbitControls(camera, renderer.domElement)
var controls = new THREE.DragControls( objects, camera, renderer.domElement );
controls.addEventListener( 'dragstart', dragStartCallback );
controls.addEventListener( 'dragend', dragendCallback );

camera.position.z = 1000;

var startColor;

function init() {
  console.log("init")
  scene.add( new THREE.AmbientLight( 0x0f0f0f ) );

  var light = new THREE.SpotLight( 0xffffff, 1.5 );
  light.position.set( 0, 500, 2000 );

  scene.add(light);

  var geometry = new THREE.BoxGeometry( 40, 40, 40 );
  var geometry = new THREE.SphereGeometry( 40, 40, 40 );

  for (var i = 0; i < 100; i++) {
    var object = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );

    object.position.x = Math.random() * 1000 - 500;
    object.position.y = Math.random() * 600 - 300;
    object.position.z = Math.random() * 800 - 400;

    object.castShadow = true;
    object.receiveShadow = true;

    scene.add( object );

    objects.push( object );
  }
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
  renderer.render(scene, camera);
  drawTextElements([{ text: "hello", x: 300, y: 300}])
}

init();
animate();
