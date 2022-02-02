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



/**
 * User interface
 */
let DOMList = {
  groupSelectors: "group-selectors",
  items: "items"
}

const DOM = {}
for (let [ name, id ] of DOMList)
  if (!(DOM[name] = document.getElementById(id))) throw new Error(`Id ${id} no exist`)

