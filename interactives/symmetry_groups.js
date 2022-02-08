import { VisDomain } from "./vis_domain.js"
import {Color, GridHelper, Vector3} from "../external/three.module.js"

import * as THREE from "../external/three.module.js"
import {VisText} from "./text_elem.js"
import {SymmetricObject} from "./symmetric_object.js"
import { SHAPES } from "./symmetries.js"

Object.assign(window, { THREE })

// Styling info for y'all
// You can just set the value in styles and it will automatically update
let styles = {
  //triangleColor: { default: 0x8f8f1f, handler: setColor(() => triangleMaterial) },
  gridColor: { default: 0x888888, handler: v => mainGrid.colorCenterLine = mainGrid.colorGrid = new Color(v) },
  backgroundColor: { default: 0xf0f0f0, handler: v => (mainDomain.setBG(v), miniatureDomain.setBG(v)) },
  //selectedTriangleColor: { default: 0x3f3f3f, handler: setColor(() => selectedTriangleMaterial)},
  allow3DRotation: { default: false, handler: v => (mainDomain.allow3DRotation(v), DOM.allow3DRotation.checked = v) }
}

Object.assign(window, { styles })

// Note, if you change this you will have to change some other stuff
const SIZE = 15 // width of the entire grid
const gridDivisions = 15

// Overall scaling factor used for units
const SCALE = SIZE / gridDivisions
const gridSize = SIZE

let DOM = {} // mapping from id -> element
let DOMList = {
  mainSurface: "main-surface",
  groupSelectors: "group-selectors",
  items: "items",
  allow3DRotation: "allow-3d",
  miniature: "miniature"
}

// Retrieve elements
for (let [ name, id ] of Object.entries(DOMList))
  if (!(DOM[name] = document.getElementById(id))) throw new Error(`Id ${id} doesn't exist`)

function setColor(target) {
  return v => target().color = new Color(v)
}

// Set all styles to their default values
function setStyleDefaults () {
  for (let o of Object.values(styles)) {
    (o.setDefault = () => o.handler(o.value = o.default))()
  }
}

DOM.allow3DRotation.addEventListener("input", () => {
  mainDomain.allow3DRotation(DOM.allow3DRotation.checked)
})

const mainDomain = new VisDomain({ defaultCameraPosition: new Vector3(0, SIZE / 2, 0) })
mainDomain.attachToElement(DOM.mainSurface)

const mainGrid = new GridHelper(gridSize, gridDivisions)
mainDomain.scene.add(mainGrid)

let text = new VisText({ text: "300", position: new Vector3(0.5, 0, 0) })
mainDomain.scene.add(text)

const miniatureDomain = new VisDomain( { defaultCameraPosition: new Vector3(1, 1.1, 1) })
miniatureDomain.attachToElement(DOM.miniature)
miniatureDomain.setDefaultCamera()

function render () {
    mainDomain.tick()
  miniatureDomain.tick()
  requestAnimationFrame(render)
}

let symObject = new SymmetricObject({ shape: SHAPES.cube })
miniatureDomain.scene.add(symObject)

setStyleDefaults()
render()

Object.assign(window, { mainDomain, miniatureDomain, symObject })
