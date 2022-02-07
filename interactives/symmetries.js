import { Vector2, Vector3, Matrix4, Matrix3 } from "../external/three.module.js"

// Helper stuffs for symmetries, etc.

// We describe our shape in question as a set of vertices centered around its centroid, (0,0,0). All of its symmetries
// are thus isometries which preserve the centroid and permute the vertices in some way. We index the vertices 0 ... n-1,
// where n is the vertex count, and a movement is therefore some valid permutation of the vertices. A permutation is
// valid if, in 3-dimensional space, each vertex is mapped to a distinct destination vertex, and the distances between
// each pair of vertices is preserved.

// Assumed to be convex
class SymmetricShape {
  constructor (params={}) {
    this.name = params.name
    this.dimensions = params.dimensions // should be 2 or 3
    this.vertices = params.vertices // vertices centered around (0, 0, 0)

    this.normalizeVertexDimensions()
  }

  normalizeVertexDimensions() {
    let v = this.vertices

    if (v[0] instanceof Vector2) {
      this.vertices = this.vertices.map(v => new Vector3(v.x, 0, v.z))
    }
  }
}

function closeEnough (d1, d2) {
  return Math.abs(d1 / d2 - 1) < 1e-6
}

function isIsometry (shape, motion) {
  let v = shape.vertices
  let m = motion.permutation

  if (v.length !== m.length) return false
  let count = v.length

  // Check every pair of points and see if their distances are close
  for (let i = 0; i < count - 1; ++i) {
    for (let j = i + 1; j < count; ++j) {
      if (!closeEnough(v[i].distanceTo(v[j]), v[m[i]].distanceTo(v[m[j]])))
        return false
    }
  }

  return true
}

// Returns a Mat4 from a valid isometry
function matrixFromIsometry (shape, motion) {
  if (!isIsometry(shape, motion)) return null

  // [ a b c ] [ v1x v2x v3x ]   [ w1x w2x w3x ]
  // | d e f ] [ v1y v2y v3y ] = [ w1y w2y w3y ]
  // [ g h i ] [ v1z v2z v3z ]   [ w1z w2z w2z ]
  //     T           V                  W

  // T = WV^-1

  // get first three vertex pairs
  let [ v1, v2, v3 ] = shape.vertices
  let [ w1, w2, w3 ] = shape.vertices.map((_, i) => shape.vertices[motion.permutation[i]])

  let m = new Matrix3()
}

class Motion {
  constructor () {
    this.permutation = [] // [0, 1 ... n] is identity
  }

  eq (m) {
    return this.permutation.every((p, i) => m.permutation[i] === p)
  }
}

class SymmetryGroup {
  constructor (params={}) {
    this.shape = params.shape
    this.elements = [] // array of motions
  }
}

/**
 * The vertices of a (2-dimensional) regular polygon, with the first vertex at (1, 0)
 * @param n {number} Vertex count
 * @param circumradius {number}
 * @returns {Vector2[]}
 */
function generateRegularPolygon (n=3, circumradius=1) {
  let points = []

  for (let i = 0; i < n; ++i) {
    let x = Math.cos(i / n * 2 * Math.PI) * circumradius
    let z = Math.sin(i / n * 2 * Math.PI) * circumradius
    points.push(Vector2(x, z))
  }

  return points
}

/**
 * Fatten a polygon in the y direction (recall the three.js convention that y is upwards, while the xz-plane is the
 * "ground")
 * @param vertices {Vector2[]}
 * @param thickness {number}
 * @returns {Vector3[]}
 */
function fattenPolygon (vertices, thickness=0.5) {
  thickness /= 2
  return vertices.flatMap(v => [ new Vector3(v.x, -thickness, v.y), new Vector3(v.x, thickness, v.y) ])
}

const equilateralTriangle = new SymmetricShape({ name: "equilateral triangle", dimensions: 2, vertices: generateRegularPolygon() })
