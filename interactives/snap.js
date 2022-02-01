
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
function elementToName (e) {
  outer: for (let [ name, values ] of Object.entries(textbookNaming)) {
    for (let i = 0; i < values.length; ++i) {
      if (values[i] !== e[i]) continue outer;
    }

    return name
  }

  return null
}

function nameToElement (name) {
  return textbookNaming[name]
}

function toElement (o) {
  if (typeof o === "string") {
    return nameToElement(o)
  } else if (Array.isArray(o)) {
    return o;
  }

  throw new TypeError("What the fuck")
}

function toName (o) {
  if (typeof o === "string") {
    return o
  } else if (Array.isArray(o)) {
    return elementToName(o);
  }
  throw new TypeError("What the fuck # 2")
}

function composeTwoElements (e1, e2) {
  // e1 o e2
  e1 = toElement(e1)
  e2 = toElement(e2)
  let arr = []

  for (let i = 0; i < e2.length; ++i) {
    arr[i] = e1[e2[i]]
  }

  return arr
}

function composeElements (elems) {
  return elems.reduceRight(composeTwoElements)
}

function invertElement (e) {
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
  static fromObj (o) {
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
  constructor () {
    this.domElement = null
    this.id = getUUID()

    this.init()
    this.setDOMID()
  }

  init () {

  }

  setDOMID () {
    if (this.domElement)
      this.domElement.id = this.id
  }

  update () {
    this._update()
  }

  _update () {

  }
}

class CircleComponent extends VisComponent {
  constructor () {
    super()

    this.x = 50
    this.y = 50
    this.r = 40
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
    this.domElement.setAttribute("fill", this.fill)
    this.domElement.setAttribute("stroke", this.stroke)
    this.domElement.setAttribute("stroke-width",  this.strokeWidth)
  }
}

// Adjusts velocity dampening (0 is not much boing, 1 is lots of boing)
let boingFactor = 1
// How many pieces to simulate the string as
let stringRes = 20
// Whether to do a boing at all :(
let doBoing = true

const DEFAULT_HEIGHT = 100

class VisGroup extends VisComponent {
  constructor () {
    super()

    this.children = []
  }

  addChild (child) {
    if (!(child instanceof VisComponent))
      throw new TypeError("Child must be a VisComponent")
    this.removeChild(child)

    this.children.push(child)
  }

  update () {
    this._update()

    for (let child of this.children) {
      child.update()
    }
  }

  removeChild (child) {
    let index = this.children.indexOf(child)
    if (index === -1) return
    this.children.splice(index, 1)
  }

  getFlattenedComponents () {
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

  removeChildren () {
    this.children = []
  }
}

function removeDuplicateVertices (v) {
  if (v.length === 0) return v

  let ret = []
  for (let i = 0; i < v.length; ++i) {
    if (!v[i].eq(v[i-1])) {
      ret.push(v[i].clone())
    }
  }

  return ret
}

function distBetween (v1, v2) {
  return Math.hypot(v1.x - v2.x, v1.y - v2.y)
}

function vertexChainLength (vertices) {
  if (vertices.length <= 1) return 0

  let len = 0
  for (let i = 0; i < vertices.length - 1; ++i) {
    let v = vertices[i]
    let nextV = vertices[i+1]

    len += distBetween(v, nextV)
  }

  return len
}

// Get values between [0, 1] of the vertices in a chain
function getVertexProportions (vertices) {
  if (vertices.length === 0) return []
  if (vertices.length === 1) return [0]

  let props = []

  let len = 0
  for (let i = 0; i < vertices.length - 1; ++i) {
    let v = vertices[i]
    let nextV = vertices[i+1]

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
function sampleChain (vertices, proportions=[], knownLen=-1) {
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
    let endV = vertices[i+1]

    let len = distBetween(endV, startV)

    // Check whether this sample lies in this segment
    for (;;) {
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

function arange (start, end, count) {
  // Inclusive

  if (count === 0) return []
  else if (count === 1) return [start]

  let ret = []
  for (let i = 0; i < count - 1; ++i) {
    ret.push(start + (end-start) * i / (count - 1))
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


function interpolateVertices (original, target, prop) {
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

// To transition between chains, we do the following:
// Let a starting chain be V = [ v0, v1, ..., vn ] and a target chain be W = [ w0, w1, ..., wm]. Let our sample count be s.
// m,n > 1.
// We sample V at s equidistant points, say e0 through es. Let len(V) = L_V and len(W) = L_W. Let [ vs0, vs1, ..., vsm ] be samples in V
// corresponding to the length ratios in W, and therefore the target points in W. We (effectively) interleave e0 ... es and vs0 ... vsm,
// continuously move [ vs0 ... vsm ] to [ wo ... vm ] (with no elasticity) and simulate the rest of the points as having
// an initial velocity vector and acceleration being determined by their neighboring points, the magnitude of the acceleration
// proportional to the string length.

// How many physics ticks to run per second (independent of frame rate)
let PHYSICS_TPS = 1000

// Max physics ticks per frame (to avoid lag)
const MAX_TICKS_PER_FRAME = 1000

class StringComponent extends VisComponent {
  constructor () {
    super()

    // Actual vertices to draw to SVG (copied from currentVertices)
    this.drawVertices = []

    // Whether to do any physics at all
    this.inMotion = false
    // Whether to do a boing
    this.doBoing = true
    // Last time at which a tick was run; used to calculate how many ticks to do per frame
    this.lastTick = performance.now()

    // Current simulated vertices (list of vectors)
    this.currentVertices = []
    // Velocities of above vertices
    this.currentVertexVelocities = []
    // Where the fixed vertices will be put, when fixedMovementProportion = 1
    this.targetFixedVertices = []
    // Where the fixed vertices start, when fixedMovementProportion = 0 (currently effectively unused)
    this.originalFixedVertices = []
    // What proportion of the interpolation between original and targetFixedVertices is completed (effectively unused)
    this.fixedMovementProportion = 0
    // Where the fixed vertices currently are
    this.fixedVertices = []
    // Indices of the fixed vertices within currentVertices
    this.fixedIndices = []

    // Target vertices given by snapToNewVertices
    this.givenTarget = []
  }

  // Initialize the movement from the current position to targetFixedVertices (which determines the resulting position)
  initSimulation () {
    // How many pieces to subdivide the string into
    const SIMULATION_PT_COUNT = stringRes
    this.lastTick = performance.now()

    if (this.currentVertices.length < 2 || this.givenTarget.length < 2) {
      // Nothing to interpolate from if there aren't two vertices, so force snap and return immediately
      this.snapToNewVertices(this.givenTarget, true)
      return
    }

    let doBoing = this.doBoing

    if (!doBoing) {
      let currentProportions = getVertexProportions(this.currentVertices)
      let targetProportions = getVertexProportions(this.targetFixedVertices)

      let allProportions = currentProportions.concat(targetProportions).sort((a, b) => a - b)

      // Linearly move all fixed vertices to their destination
      this.targetFixedVertices = sampleChain(this.givenTarget, allProportions)
      this.originalFixedVertices = sampleChain(this.currentVertices, allProportions)
      this.fixedMovementProportion = 0

      return
    }

    // Get proportions of each vertex along the target path. In the boing case, the target fixed vertices are also the
    // given vertices
    let target = this.targetFixedVertices = this.givenTarget
    let targetCount = target.length
    let targetProportions = getVertexProportions(target)

    // Sample the current vertices with those proportions
    this.originalFixedVertices = sampleChain(this.currentVertices, targetProportions)

    // Proportions of intermediate points
    let equi = arange(0, 1, SIMULATION_PT_COUNT)
    // Final sampling proportions that will be used
    let sampleProportions = []

    // Indices in the sampling after which the fixed vertices are
    let fixedIndices = []
    // Current index in the (eventual) list of samples
    let currentIndex = 0
    for (let i = 0; i < targetCount; ++i) {
      // Step forward until the equidistant samples have reached the target sample in question
      while (targetProportions[i] > equi[currentIndex] && currentIndex < SIMULATION_PT_COUNT) {
        // Push equidistant sample (samples subject to simulation)
        sampleProportions.push(equi[currentIndex])
        currentIndex++
      }

      // We offset by fixedIndices.length, because sampleProportions is changing in length as well and we want
      // fixedIndices to be relative to the final samples array
      fixedIndices.push(currentIndex + fixedIndices.length)
      // Push fixed sample (sample not subject to simulation)
      sampleProportions.push(targetProportions[i])
    }

    // Sample with the new proportions
    let sampling = sampleChain(this.currentVertices, sampleProportions)

    this.currentVertices = sampling
    this.fixedIndices = fixedIndices

    // We do the "inverse" operation of simpleChain because it helps with the quantization of the pieces
    this.sampleProportions = getVertexProportions(sampling)

    // Initialize all velocities to <0, 0>
    let vVel = this.currentVertexVelocities = []
    for (let i = 0; i < this.currentVertices.length; ++i) vVel.push(new Vector2(0, 0))
  }

  // Snap the string to new vertices; force determines whether the snap is instant or subject to simulation
  snapToNewVertices (vertices, force=true) {
    vertices = removeDuplicateVertices(vertices)

    this.inMotion = !force
    if (force) {
      // Immediately copy over the vertices
      this.currentVertices = this.drawVertices = vertices
    } else {
      this.givenTarget = vertices
      this.doBoing = doBoing
      this.initSimulation()

      // Immediately move fixed points to target for now
      if (doBoing) this.fixedMovementProportion = 1
    }
  }

  init () {
    this.domElement = document.createElementNS("http://www.w3.org/2000/svg", "polyline")
  }

  // One "tick" of the rubber band movement. Returns the number of simulated seconds completed
  physicsTick () {
    this.drawVertices = this.currentVertices
    if (!this.inMotion) return Infinity

    if (!this.doBoing) {
      // Boring handler
      this.fixedMovementProportion += 0.01
      this.fixedVertices = this.currentVertices = interpolateVertices(this.originalFixedVertices, this.targetFixedVertices, this.fixedMovementProportion)

      if (this.fixedMovementProportion >= 1) {
        this.snapToNewVertices(this.givenTarget, true)
        return Infinity
      }

      this.lastTick = performance.now()
      return 1 / 60
    }

    // Factor by which the stored velocity is scaled DOWN to actually add to the position vector
    const VEL_SLOWDOWN_FACTOR = 5

    // Factor by which the stored velocity is dampened every tick (loss of energy)
    const VEL_DAMPENING_FACTOR = 1 / (1.001 + (1 - boingFactor) * 0.03)

    // Clamp acceleration to below this value
    const MAX_ACCEL = 0.3

    // "Fixed" vertices, i.e., the ones the physics cannot change
    let fixed = this.fixedVertices = interpolateVertices(this.originalFixedVertices, this.targetFixedVertices, this.fixedMovementProportion)
    // Indices in current vertices which are fixed
    let fixedIndices = this.fixedIndices

    // Current vertices, total length of the chain, proportions along the original chain at which they were sampled,
    // their respective velocities. Velocities of "fixed" vertices are never used
    let current = this.currentVertices
    let currentLen = vertexChainLength(current)
    let proportions = this.sampleProportions
    let velocities = this.currentVertexVelocities

    // Whether the physics are dead, i.e., whenever every velocity is below MIN_VEL in magnitude
    let isDead = true
    const MIN_VEL = 0.1 / currentLen

    // Move the fixed points to their intended location
    for (let i = 0; i < fixedIndices.length; ++i)
      current[fixedIndices[i]] = fixed[i]

    let newVertices = []
    for (let i = 0; i < current.length; ++i) {
      let thisVertex = current[i]

      if (fixedIndices.includes(i)) {
        // Fixed points are copied over immediately
        newVertices.push(thisVertex)

        continue
      }

      let prevVertex = current[i-1]
      let nextVertex = current[i+1]

      if (prevVertex && nextVertex) {
        // Get the distances and sampling proportions to the neighboring vertices. The difference between consecutive
        // proportions tells us how much "band material" is in that section, and thus the magnitude of the force it
        // exerts.
        let prevProp = proportions[i - 1]
        let thisProp = proportions[i]
        let nextProp = proportions[i + 1]

        // Compute differences
        prevProp -= thisProp
        nextProp -= thisProp

        // Super small proportions will cause numerical errors. These occur when the original chain is sampled very
        // close (or on top of) a vertex. In this case, we treat the vertex as essentially the same as the vertex it
        // is extremely close to.
        if (Math.abs(prevProp) < 0.00001) {
          newVertices.push(prevVertex)
          continue
        } else if (Math.abs(nextProp) < 0.00001) {
          newVertices.push(nextVertex)
          continue
        }

        // Compute accelerations; one toward each neighboring vertex
        let accelX = (thisVertex.x - prevVertex.x) / prevProp + (nextVertex.x - thisVertex.x) / nextProp
        let accelY = (thisVertex.y - prevVertex.y) / prevProp + (nextVertex.y - thisVertex.y) / nextProp

        // Tension is proportional to length, so we have to scale it
        accelX /= currentLen
        accelY /= currentLen

        // Clamp to [-MAX_ACCEL, MAX_ACCEL]
        if (Math.abs(accelX) > MAX_ACCEL) accelX = Math.sign(accelX) * MAX_ACCEL
        if (Math.abs(accelY) > MAX_ACCEL) accelY = Math.sign(accelY) * MAX_ACCEL

        // Apply acceleration and dampen velocity
        let vel = velocities[i]
        vel.x += accelX
        vel.y += accelY

        vel.x *= VEL_DAMPENING_FACTOR
        vel.y *= VEL_DAMPENING_FACTOR

        // If the velocity is larger than MIN_VEL in any component, the simulation is not yet dead
        if (Math.abs(vel.x) > MIN_VEL || Math.abs(vel.y) > MIN_VEL)
          isDead = false

        // Compute next position
        newVertices.push(new Vector2(thisVertex.x + velocities[i].x / VEL_SLOWDOWN_FACTOR,
          thisVertex.y + velocities[i].y / VEL_SLOWDOWN_FACTOR))
      } else {
        // Reached if prevVertex or nextVertex do not exist--shouldn't happen, but in case, treat as a fixed point
        newVertices.push(thisVertex)
      }
    }

    if (isDead) {
      // When the physics are dead, do a force snap (no simulation), which also sets inMotion to false
      this.snapToNewVertices(this.givenTarget, true)
    } else {
      // Copy over new vertices
      this.currentVertices = newVertices
    }

    this.lastTick = performance.now()
    return 20 / (PHYSICS_TPS * stringRes)
  }

  _update () {
    // Note that performance.now() returns a timestamp in milliseconds (to roughly 0.1 ms in Chrome, lower in FF)
    let timeSince = (performance.now() - this.lastTick) / 1000
    let accumTime = 0, ticks = 0

    for (; ticks < MAX_TICKS_PER_FRAME && accumTime < timeSince; accumTime += this.physicsTick(), ++ticks);

    // Convert to SVG property string
    let vertices = this.drawVertices.map(v => `${v.x},${v.y}`).join(" ")

    this.domElement.setAttribute("points", vertices)
    this.domElement.setAttribute("fill", "none")

    this.domElement.setAttribute("stroke", "black")
    this.domElement.setAttribute("stroke-width", 3)
  }
}

function isTypedArray (arr) {
  return ArrayBuffer.isView(arr) && !(arr instanceof DataView)
}

// copied from grapheme
/**
 * Deep clone an object, not checking for circularity or other weirdness, optionally cloning arrays
 * @param object
 * @param opts
 */
function deepClone (object, opts = {}) {
  opts.cloneArrays = opts.cloneArrays ?? true

  return deepCloneInternal(object, opts)
}

function deepCloneInternal (object, opts = {}) {
  if (typeof object !== 'object') return object

  if (Array.isArray(object)) {
    return opts.cloneArrays
      ? object.map(val => deepCloneInternal(val, opts))
      : object
  } else if (isTypedArray(object)) {
    return opts.cloneArrays ? new object.constructor(object) : object
  }

  let ret = {}
  for (let key in object) {
    if (object.hasOwnProperty(key)) {
      ret[key] = deepClone(object[key], opts)
    }
  }

  return ret
}

class SnapChain extends VisGroup {
  constructor () {
    super()

    // List of elements
    this.snapElements = []
    this.snapWidth = 3

    this.stringComponents = []

    this.displayOpts = {}
    this.needsRestringing = false

    this.forceSnap = false

    this.reset()
  }

  getState () {
    return { snapElements: this.snapElements.slice(), displayOpts: { ...this.displayOpts } }
  }

  setState (state, addToHistory=true) {
    this.snapElements = state.snapElements.slice()
    this.displayOpts = deepClone(state.displayOpts)

    if (addToHistory) this.history.push(deepClone(state))
    this.needsRestringing = true
  }

  pushState () {
    this.setState({ snapElements: this.snapElements, displayOpts: this.displayOpts })
  }

  reset () {
    this.history = []
    this.setState({
      snapElements: [],
      displayOpts: { width: 100, height: DEFAULT_HEIGHT, offsetX: 100, offsetY: 100, postStyle: { radius: 5, stroke: "black", strokeWidth: 3, fill: "red" } }
    }, true)
  }

  undo () {
    if (this.history.length === 1) {
      this.setState(this.history[0], false)
      return
    } else if (!this.history.length) {
      this.reset()
      return
    }

    let state = this.history.pop()
    this.setState(state, false)

    console.log(state)
  }

  setSnapElements (elements) {
    this.snapElements = elements.map(toElement)
    this.snapWidth = this.snapElements[0].length
    this.needsRestringing = true
  }

  createStrings () {
    let sc = this.stringComponents
    if (sc.length !== this.snapWidth) {
      this.stringComponents = sc = []
      for (let i = 0; i < this.snapWidth; ++i) {
        sc.push(new StringComponent())
      }
    }

    for (let i = 0; i < this.snapWidth; ++i) {
      this.addChild(sc[i])
    }
  }

  addElement (e, addToHistory=true) {
    if (addToHistory) this.pushState()

    this.snapElements.push(toElement(e))
    this.needsRestringing = true
  }

  snap (addToHistory=true) {
    // change width and height, snapElements accordingly to look like a snap
    let elems = this.snapElements
    if (!elems.length) return

    if (addToHistory) this.pushState()

    let opts = this.displayOpts
    let totalHeight = elems.length * opts.height

    opts.height = totalHeight
    this.snapElements = [ composeElements(elems) ]

    console.log(opts)

    this.needsRestringing = true
  }

  setPosition (x, y) {
    this.displayOpts.offsetX = x
    this.displayOpts.offsetY = y

    this.needsRestringing = true
  }

  buildStringComponents () {
    let opts = this.displayOpts
    let { offsetX, offsetY } = opts
    // Constantly reordered so that index 0 is the string connected to the bottom left
    let stringVertices = []

    let snapWidth = this.snapWidth

    for (let i = 0; i < snapWidth; ++i) {
      let stringComponent = []
      stringVertices.push(stringComponent)
    }

    for (let i = 0; i < this.snapElements.length; ++i) {
      let snapElement = this.snapElements[i]

      for (let j = 0; j < snapWidth; ++j) {
        let verts = stringVertices[j]

        verts.push(new Vector2(offsetX + (j * opts.width), offsetY + i * opts.height))
        verts.push(new Vector2(offsetX + (snapElement[j] * opts.width), offsetY + (i + 1) * opts.height))
      }

      let reordered = []

      for (let j = 0; j < snapWidth; ++j) {
        reordered[snapElement[j]] = stringVertices[j]
      }

      stringVertices = reordered
    }

    // Reorder so strings are left to right, starting from the top
    if (stringVertices[0].length) {
      stringVertices.sort((vs1, vs2) => vs1[0].x - vs2[0].x)
    }

    // Setting to empty clears the string
      for (let i = 0; i < stringVertices.length; ++i) {
        this.stringComponents[i].snapToNewVertices(stringVertices[i], this.forceSnap)
      }

      // one-time use
      this.forceSnap = false

    this.needsRestringing = false
  }

  _update () {
    if (this.needsRestringing) {
      this.removeChildren()
      this.createStrings()

      this.buildStringComponents()

      let opts = this.displayOpts
      let { offsetX, offsetY } = opts

      for (let i = 0; i <= this.snapElements.length; ++i) {
        for (let j = 0; j < this.snapWidth; ++j) {
          let element = new CircleComponent()

          element.x = offsetX + opts.width * j
          element.y = offsetY + opts.height * i
          element.r = opts.postStyle.radius
          element.stroke = opts.postStyle.stroke
          element.strokeWidth = opts.postStyle.strokeWidth
          element.fill = opts.postStyle.fill

          this.addChild(element)
        }
      }
    }
  }
}

class SnapVisualization extends VisGroup {
  constructor () {
    super()

    // Create svg element
    this.domElement = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  }

  resize () {
    this.setDims(window.innerWidth, window.innerHeight)
  }

  setDims (width, height) {
    // Set svg dimensions
    this.domElement.setAttribute("width", width)
    this.domElement.setAttribute("height", height)
  }

  render () {
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
const boingSlider = document.getElementById("boing-slider")
const boingResSlider = document.getElementById("boing-res")
const boingTPSSlider = document.getElementById("boing-tps")
const boingCheckbox = document.getElementById("do-boing")

function setBoingFactor (f) {
  boingSlider.value = (f * 1000) | 0
  boingFactor = f
}

function setBoingRes (r) {
  r = Math.min(Math.max(r, 20), 100) | 0
  boingResSlider.value = r
  stringRes = r
}

function setTPS (t) {
  t = Math.min(Math.max(t, 60), 1000000)
  boingTPSSlider.value = Math.sqrt(t) | 0
  PHYSICS_TPS = t
}

setBoingFactor(0.1)
setBoingRes(20)
setTPS(1000)

boingSlider.addEventListener("input", () => {
  setBoingFactor(boingSlider.value / 1000)
})

boingResSlider.addEventListener("input", () => { setBoingRes(boingResSlider.value) })
boingTPSSlider.addEventListener('input', () => { setTPS(boingTPSSlider.value ** 2)})
boingCheckbox.addEventListener("input", () => { doBoing = !!boingCheckbox.checked })

let selectedElem = '' // 'I', '', etc.
let draggingElem = null // SnapChain currently being dragged around

function addItems () {
  let items = document.getElementById("items")
  let squishCancel = -1

  let MUST_ADD_AFTER_SQUISH = []

  for (let elem of Object.keys(textbookNaming)) {
    let wrapper = document.createElement("button")
    wrapper.classList.add("item-wrapper")

    wrapper.innerHTML = `<p>${elem}</p>`
    let vis = new SnapVisualization()
    let chain = new SnapChain()

    vis.setDims(10 + 30 * 2 + 10, 70)
    chain.displayOpts.width = 30
    chain.displayOpts.height = 50
    chain.setPosition(10, 10)
    chain.setSnapElements([ elem ])
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

function render () {
  vis.resize()
  vis.render()

  window.requestAnimationFrame(render)
}

render()
