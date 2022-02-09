import {BufferGeometry, Mesh, MeshLambertMaterial, Vector2, Vector3} from "../external/three.module.js"
import {deepEquals} from "./common.js"
import {VisObject} from "./vis_object.js"
import { nullGeometry, nullMaterial } from "./null.js"

let displayedTextElems = [] // used as an intermediate step

class VisText extends VisObject {
  constructor(params={}) {
    super({ geometry: nullGeometry, material: nullMaterial }) // don't draw anything

    this.text = params.text ?? "text"

    // Adjust text position, in pixels
    this.adjust = new Vector2(0, 0)

    this.position.copy(params.position ?? new Vector3(0,0,0))
    this.frustumCulled = false

    this.onAfterRender = () => {
      if (!this.domain) return

      let camera = this.domain.camera

      camera.updateMatrixWorld()
      this.updateMatrixWorld()

      let v = new Vector3()
      v.setFromMatrixPosition(this.matrixWorld)
      v.project(camera)

      v = this.domain.drawToDOMCoords(v)
      let adjust = this.adjust

      let x = v.x + adjust.x
      let y = v.y + adjust.y

      if (-100 < x && x < 4000 && -100 < y && y < 4000) {
        displayedTextElems.push({ text: this.text, x, y })
      }
    }
  }
}

export function clearTextElements () {
  displayedTextElems = []
}

// Takes in something like { text: ..., x, y, classes: [], noShadow: false/true }
export function drawTextElements(textSVG, elems=displayedTextElems) {
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

function setElemProps (textElem, dict) {
  for (let [ name, val ] of Object.entries(dict)) {
    if (name === "text") {
      textElem.textContent = val
    } else
      textElem.setAttributeNS(null, name, val)
  }
}

export { VisText }
