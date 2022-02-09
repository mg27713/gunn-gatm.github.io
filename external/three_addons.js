// annoy

import {
  EventDispatcher,
  MOUSE,
  Quaternion,
  Spherical,
  TOUCH,
  Vector2,
  Vector3,
  Matrix4,
  Plane,
  Raycaster,
  BufferGeometry,
  Float32BufferAttribute,
  Line3,
  Triangle
} from "../external/three.module.js";

/**
 * Ported from: https://github.com/maurizzzio/quickhull3d/ by Mauricio Poppe (https://github.com/maurizzzio)
 */

const Visible = 0;
const Deleted = 1;

export const ConvexGeometry = (() => {
  const _v1 = new Vector3();
  const _line3 = new Line3();
  const _plane = new Plane();
  const _closestPoint = new Vector3();
  const _triangle = new Triangle();

  class ConvexHull {

    constructor() {

      this.tolerance = -1;

      this.faces = []; // the generated faces of the convex hull
      this.newFaces = []; // this array holds the faces that are generated within a single iteration

      // the vertex lists work as follows:
      //
      // let 'a' and 'b' be 'Face' instances
      // let 'v' be points wrapped as instance of 'Vertex'
      //
      //     [v, v, ..., v, v, v, ...]
      //      ^             ^
      //      |             |
      //  a.outside     b.outside
      //
      this.assigned = new VertexList();
      this.unassigned = new VertexList();

      this.vertices = []; 	// vertices of the hull (internal representation of given geometry data)

    }

    setFromPoints(points) {

      // The algorithm needs at least four points.

      if (points.length >= 4) {

        this.makeEmpty();

        for (let i = 0, l = points.length; i < l; i++) {

          this.vertices.push(new VertexNode(points[i]));

        }

        this.compute();

      }

      return this;

    }

    setFromObject(object) {

      const points = [];

      object.updateMatrixWorld(true);

      object.traverse(function (node) {

        const geometry = node.geometry;

        if (geometry !== undefined) {

          if (geometry.isGeometry) {

            console.error('THREE.ConvexHull no longer supports Geometry. Use THREE.BufferGeometry instead.');
            return;

          } else if (geometry.isBufferGeometry) {

            const attribute = geometry.attributes.position;

            if (attribute !== undefined) {

              for (let i = 0, l = attribute.count; i < l; i++) {

                const point = new Vector3();

                point.fromBufferAttribute(attribute, i).applyMatrix4(node.matrixWorld);

                points.push(point);

              }

            }

          }

        }

      });

      return this.setFromPoints(points);

    }

    containsPoint(point) {

      const faces = this.faces;

      for (let i = 0, l = faces.length; i < l; i++) {

        const face = faces[i];

        // compute signed distance and check on what half space the point lies

        if (face.distanceToPoint(point) > this.tolerance) return false;

      }

      return true;

    }

    intersectRay(ray, target) {

      // based on "Fast Ray-Convex Polyhedron Intersection"  by Eric Haines, GRAPHICS GEMS II

      const faces = this.faces;

      let tNear = -Infinity;
      let tFar = Infinity;

      for (let i = 0, l = faces.length; i < l; i++) {

        const face = faces[i];

        // interpret faces as planes for the further computation

        const vN = face.distanceToPoint(ray.origin);
        const vD = face.normal.dot(ray.direction);

        // if the origin is on the positive side of a plane (so the plane can "see" the origin) and
        // the ray is turned away or parallel to the plane, there is no intersection

        if (vN > 0 && vD >= 0) return null;

        // compute the distance from the ray’s origin to the intersection with the plane

        const t = (vD !== 0) ? (-vN / vD) : 0;

        // only proceed if the distance is positive. a negative distance means the intersection point
        // lies "behind" the origin

        if (t <= 0) continue;

        // now categorized plane as front-facing or back-facing

        if (vD > 0) {

          //  plane faces away from the ray, so this plane is a back-face

          tFar = Math.min(t, tFar);

        } else {

          // front-face

          tNear = Math.max(t, tNear);

        }

        if (tNear > tFar) {

          // if tNear ever is greater than tFar, the ray must miss the convex hull

          return null;

        }

      }

      // evaluate intersection point

      // always try tNear first since its the closer intersection point

      if (tNear !== -Infinity) {

        ray.at(tNear, target);

      } else {

        ray.at(tFar, target);

      }

      return target;

    }

    intersectsRay(ray) {

      return this.intersectRay(ray, _v1) !== null;

    }

    makeEmpty() {

      this.faces = [];
      this.vertices = [];

      return this;

    }

    // Adds a vertex to the 'assigned' list of vertices and assigns it to the given face

    addVertexToFace(vertex, face) {

      vertex.face = face;

      if (face.outside === null) {

        this.assigned.append(vertex);

      } else {

        this.assigned.insertBefore(face.outside, vertex);

      }

      face.outside = vertex;

      return this;

    }

    // Removes a vertex from the 'assigned' list of vertices and from the given face

    removeVertexFromFace(vertex, face) {

      if (vertex === face.outside) {

        // fix face.outside link

        if (vertex.next !== null && vertex.next.face === face) {

          // face has at least 2 outside vertices, move the 'outside' reference

          face.outside = vertex.next;

        } else {

          // vertex was the only outside vertex that face had

          face.outside = null;

        }

      }

      this.assigned.remove(vertex);

      return this;

    }

    // Removes all the visible vertices that a given face is able to see which are stored in the 'assigned' vertext list

    removeAllVerticesFromFace(face) {

      if (face.outside !== null) {

        // reference to the first and last vertex of this face

        const start = face.outside;
        let end = face.outside;

        while (end.next !== null && end.next.face === face) {

          end = end.next;

        }

        this.assigned.removeSubList(start, end);

        // fix references

        start.prev = end.next = null;
        face.outside = null;

        return start;

      }

    }

    // Removes all the visible vertices that 'face' is able to see

    deleteFaceVertices(face, absorbingFace) {

      const faceVertices = this.removeAllVerticesFromFace(face);

      if (faceVertices !== undefined) {

        if (absorbingFace === undefined) {

          // mark the vertices to be reassigned to some other face

          this.unassigned.appendChain(faceVertices);


        } else {

          // if there's an absorbing face try to assign as many vertices as possible to it

          let vertex = faceVertices;

          do {

            // we need to buffer the subsequent vertex at this point because the 'vertex.next' reference
            // will be changed by upcoming method calls

            const nextVertex = vertex.next;

            const distance = absorbingFace.distanceToPoint(vertex.point);

            // check if 'vertex' is able to see 'absorbingFace'

            if (distance > this.tolerance) {

              this.addVertexToFace(vertex, absorbingFace);

            } else {

              this.unassigned.append(vertex);

            }

            // now assign next vertex

            vertex = nextVertex;

          } while (vertex !== null);

        }

      }

      return this;

    }

    // Reassigns as many vertices as possible from the unassigned list to the new faces

    resolveUnassignedPoints(newFaces) {

      if (this.unassigned.isEmpty() === false) {

        let vertex = this.unassigned.first();

        do {

          // buffer 'next' reference, see .deleteFaceVertices()

          const nextVertex = vertex.next;

          let maxDistance = this.tolerance;

          let maxFace = null;

          for (let i = 0; i < newFaces.length; i++) {

            const face = newFaces[i];

            if (face.mark === Visible) {

              const distance = face.distanceToPoint(vertex.point);

              if (distance > maxDistance) {

                maxDistance = distance;
                maxFace = face;

              }

              if (maxDistance > 1000 * this.tolerance) break;

            }

          }

          // 'maxFace' can be null e.g. if there are identical vertices

          if (maxFace !== null) {

            this.addVertexToFace(vertex, maxFace);

          }

          vertex = nextVertex;

        } while (vertex !== null);

      }

      return this;

    }

    // Computes the extremes of a simplex which will be the initial hull

    computeExtremes() {

      const min = new Vector3();
      const max = new Vector3();

      const minVertices = [];
      const maxVertices = [];

      // initially assume that the first vertex is the min/max

      for (let i = 0; i < 3; i++) {

        minVertices[i] = maxVertices[i] = this.vertices[0];

      }

      min.copy(this.vertices[0].point);
      max.copy(this.vertices[0].point);

      // compute the min/max vertex on all six directions

      for (let i = 0, l = this.vertices.length; i < l; i++) {

        const vertex = this.vertices[i];
        const point = vertex.point;

        // update the min coordinates

        for (let j = 0; j < 3; j++) {

          if (point.getComponent(j) < min.getComponent(j)) {

            min.setComponent(j, point.getComponent(j));
            minVertices[j] = vertex;

          }

        }

        // update the max coordinates

        for (let j = 0; j < 3; j++) {

          if (point.getComponent(j) > max.getComponent(j)) {

            max.setComponent(j, point.getComponent(j));
            maxVertices[j] = vertex;

          }

        }

      }

      // use min/max vectors to compute an optimal epsilon

      this.tolerance = 3 * Number.EPSILON * (
        Math.max(Math.abs(min.x), Math.abs(max.x)) +
        Math.max(Math.abs(min.y), Math.abs(max.y)) +
        Math.max(Math.abs(min.z), Math.abs(max.z))
      );

      return {min: minVertices, max: maxVertices};

    }

    // Computes the initial simplex assigning to its faces all the points
    // that are candidates to form part of the hull

    computeInitialHull() {

      const vertices = this.vertices;
      const extremes = this.computeExtremes();
      const min = extremes.min;
      const max = extremes.max;

      // 1. Find the two vertices 'v0' and 'v1' with the greatest 1d separation
      // (max.x - min.x)
      // (max.y - min.y)
      // (max.z - min.z)

      let maxDistance = 0;
      let index = 0;

      for (let i = 0; i < 3; i++) {

        const distance = max[i].point.getComponent(i) - min[i].point.getComponent(i);

        if (distance > maxDistance) {

          maxDistance = distance;
          index = i;

        }

      }

      const v0 = min[index];
      const v1 = max[index];
      let v2;
      let v3;

      // 2. The next vertex 'v2' is the one farthest to the line formed by 'v0' and 'v1'

      maxDistance = 0;
      _line3.set(v0.point, v1.point);

      for (let i = 0, l = this.vertices.length; i < l; i++) {

        const vertex = vertices[i];

        if (vertex !== v0 && vertex !== v1) {

          _line3.closestPointToPoint(vertex.point, true, _closestPoint);

          const distance = _closestPoint.distanceToSquared(vertex.point);

          if (distance > maxDistance) {

            maxDistance = distance;
            v2 = vertex;

          }

        }

      }

      // 3. The next vertex 'v3' is the one farthest to the plane 'v0', 'v1', 'v2'

      maxDistance = -1;
      _plane.setFromCoplanarPoints(v0.point, v1.point, v2.point);

      for (let i = 0, l = this.vertices.length; i < l; i++) {

        const vertex = vertices[i];

        if (vertex !== v0 && vertex !== v1 && vertex !== v2) {

          const distance = Math.abs(_plane.distanceToPoint(vertex.point));

          if (distance > maxDistance) {

            maxDistance = distance;
            v3 = vertex;

          }

        }

      }

      const faces = [];

      if (_plane.distanceToPoint(v3.point) < 0) {

        // the face is not able to see the point so 'plane.normal' is pointing outside the tetrahedron

        faces.push(
          Face.create(v0, v1, v2),
          Face.create(v3, v1, v0),
          Face.create(v3, v2, v1),
          Face.create(v3, v0, v2)
        );

        // set the twin edge

        for (let i = 0; i < 3; i++) {

          const j = (i + 1) % 3;

          // join face[ i ] i > 0, with the first face

          faces[i + 1].getEdge(2).setTwin(faces[0].getEdge(j));

          // join face[ i ] with face[ i + 1 ], 1 <= i <= 3

          faces[i + 1].getEdge(1).setTwin(faces[j + 1].getEdge(0));

        }

      } else {

        // the face is able to see the point so 'plane.normal' is pointing inside the tetrahedron

        faces.push(
          Face.create(v0, v2, v1),
          Face.create(v3, v0, v1),
          Face.create(v3, v1, v2),
          Face.create(v3, v2, v0)
        );

        // set the twin edge

        for (let i = 0; i < 3; i++) {

          const j = (i + 1) % 3;

          // join face[ i ] i > 0, with the first face

          faces[i + 1].getEdge(2).setTwin(faces[0].getEdge((3 - i) % 3));

          // join face[ i ] with face[ i + 1 ]

          faces[i + 1].getEdge(0).setTwin(faces[j + 1].getEdge(1));

        }

      }

      // the initial hull is the tetrahedron

      for (let i = 0; i < 4; i++) {

        this.faces.push(faces[i]);

      }

      // initial assignment of vertices to the faces of the tetrahedron

      for (let i = 0, l = vertices.length; i < l; i++) {

        const vertex = vertices[i];

        if (vertex !== v0 && vertex !== v1 && vertex !== v2 && vertex !== v3) {

          maxDistance = this.tolerance;
          let maxFace = null;

          for (let j = 0; j < 4; j++) {

            const distance = this.faces[j].distanceToPoint(vertex.point);

            if (distance > maxDistance) {

              maxDistance = distance;
              maxFace = this.faces[j];

            }

          }

          if (maxFace !== null) {

            this.addVertexToFace(vertex, maxFace);

          }

        }

      }

      return this;

    }

    // Removes inactive faces

    reindexFaces() {

      const activeFaces = [];

      for (let i = 0; i < this.faces.length; i++) {

        const face = this.faces[i];

        if (face.mark === Visible) {

          activeFaces.push(face);

        }

      }

      this.faces = activeFaces;

      return this;

    }

    // Finds the next vertex to create faces with the current hull

    nextVertexToAdd() {

      // if the 'assigned' list of vertices is empty, no vertices are left. return with 'undefined'

      if (this.assigned.isEmpty() === false) {

        let eyeVertex, maxDistance = 0;

        // grap the first available face and start with the first visible vertex of that face

        const eyeFace = this.assigned.first().face;
        let vertex = eyeFace.outside;

        // now calculate the farthest vertex that face can see

        do {

          const distance = eyeFace.distanceToPoint(vertex.point);

          if (distance > maxDistance) {

            maxDistance = distance;
            eyeVertex = vertex;

          }

          vertex = vertex.next;

        } while (vertex !== null && vertex.face === eyeFace);

        return eyeVertex;

      }

    }

    // Computes a chain of half edges in CCW order called the 'horizon'.
    // For an edge to be part of the horizon it must join a face that can see
    // 'eyePoint' and a face that cannot see 'eyePoint'.

    computeHorizon(eyePoint, crossEdge, face, horizon) {

      // moves face's vertices to the 'unassigned' vertex list

      this.deleteFaceVertices(face);

      face.mark = Deleted;

      let edge;

      if (crossEdge === null) {

        edge = crossEdge = face.getEdge(0);

      } else {

        // start from the next edge since 'crossEdge' was already analyzed
        // (actually 'crossEdge.twin' was the edge who called this method recursively)

        edge = crossEdge.next;

      }

      do {

        const twinEdge = edge.twin;
        const oppositeFace = twinEdge.face;

        if (oppositeFace.mark === Visible) {

          if (oppositeFace.distanceToPoint(eyePoint) > this.tolerance) {

            // the opposite face can see the vertex, so proceed with next edge

            this.computeHorizon(eyePoint, twinEdge, oppositeFace, horizon);

          } else {

            // the opposite face can't see the vertex, so this edge is part of the horizon

            horizon.push(edge);

          }

        }

        edge = edge.next;

      } while (edge !== crossEdge);

      return this;

    }

    // Creates a face with the vertices 'eyeVertex.point', 'horizonEdge.tail' and 'horizonEdge.head' in CCW order

    addAdjoiningFace(eyeVertex, horizonEdge) {

      // all the half edges are created in ccw order thus the face is always pointing outside the hull

      const face = Face.create(eyeVertex, horizonEdge.tail(), horizonEdge.head());

      this.faces.push(face);

      // join face.getEdge( - 1 ) with the horizon's opposite edge face.getEdge( - 1 ) = face.getEdge( 2 )

      face.getEdge(-1).setTwin(horizonEdge.twin);

      return face.getEdge(0); // the half edge whose vertex is the eyeVertex


    }

    //  Adds 'horizon.length' faces to the hull, each face will be linked with the
    //  horizon opposite face and the face on the left/right

    addNewFaces(eyeVertex, horizon) {

      this.newFaces = [];

      let firstSideEdge = null;
      let previousSideEdge = null;

      for (let i = 0; i < horizon.length; i++) {

        const horizonEdge = horizon[i];

        // returns the right side edge

        const sideEdge = this.addAdjoiningFace(eyeVertex, horizonEdge);

        if (firstSideEdge === null) {

          firstSideEdge = sideEdge;

        } else {

          // joins face.getEdge( 1 ) with previousFace.getEdge( 0 )

          sideEdge.next.setTwin(previousSideEdge);

        }

        this.newFaces.push(sideEdge.face);
        previousSideEdge = sideEdge;

      }

      // perform final join of new faces

      firstSideEdge.next.setTwin(previousSideEdge);

      return this;

    }

    // Adds a vertex to the hull

    addVertexToHull(eyeVertex) {

      const horizon = [];

      this.unassigned.clear();

      // remove 'eyeVertex' from 'eyeVertex.face' so that it can't be added to the 'unassigned' vertex list

      this.removeVertexFromFace(eyeVertex, eyeVertex.face);

      this.computeHorizon(eyeVertex.point, null, eyeVertex.face, horizon);

      this.addNewFaces(eyeVertex, horizon);

      // reassign 'unassigned' vertices to the new faces

      this.resolveUnassignedPoints(this.newFaces);

      return this;

    }

    cleanup() {

      this.assigned.clear();
      this.unassigned.clear();
      this.newFaces = [];

      return this;

    }

    compute() {

      let vertex;

      this.computeInitialHull();

      // add all available vertices gradually to the hull

      while ((vertex = this.nextVertexToAdd()) !== undefined) {

        this.addVertexToHull(vertex);

      }

      this.reindexFaces();

      this.cleanup();

      return this;

    }

  }

//

  class Face {

    constructor() {

      this.normal = new Vector3();
      this.midpoint = new Vector3();
      this.area = 0;

      this.constant = 0; // signed distance from face to the origin
      this.outside = null; // reference to a vertex in a vertex list this face can see
      this.mark = Visible;
      this.edge = null;

    }

    static create(a, b, c) {

      const face = new Face();

      const e0 = new HalfEdge(a, face);
      const e1 = new HalfEdge(b, face);
      const e2 = new HalfEdge(c, face);

      // join edges

      e0.next = e2.prev = e1;
      e1.next = e0.prev = e2;
      e2.next = e1.prev = e0;

      // main half edge reference

      face.edge = e0;

      return face.compute();

    }

    getEdge(i) {

      let edge = this.edge;

      while (i > 0) {

        edge = edge.next;
        i--;

      }

      while (i < 0) {

        edge = edge.prev;
        i++;

      }

      return edge;

    }

    compute() {

      const a = this.edge.tail();
      const b = this.edge.head();
      const c = this.edge.next.head();

      _triangle.set(a.point, b.point, c.point);

      _triangle.getNormal(this.normal);
      _triangle.getMidpoint(this.midpoint);
      this.area = _triangle.getArea();

      this.constant = this.normal.dot(this.midpoint);

      return this;

    }

    distanceToPoint(point) {

      return this.normal.dot(point) - this.constant;

    }

  }

// Entity for a Doubly-Connected Edge List (DCEL).

  class HalfEdge {


    constructor(vertex, face) {

      this.vertex = vertex;
      this.prev = null;
      this.next = null;
      this.twin = null;
      this.face = face;

    }

    head() {

      return this.vertex;

    }

    tail() {

      return this.prev ? this.prev.vertex : null;

    }

    length() {

      const head = this.head();
      const tail = this.tail();

      if (tail !== null) {

        return tail.point.distanceTo(head.point);

      }

      return -1;

    }

    lengthSquared() {

      const head = this.head();
      const tail = this.tail();

      if (tail !== null) {

        return tail.point.distanceToSquared(head.point);

      }

      return -1;

    }

    setTwin(edge) {

      this.twin = edge;
      edge.twin = this;

      return this;

    }

  }

// A vertex as a double linked list node.

  class VertexNode {

    constructor(point) {

      this.point = point;
      this.prev = null;
      this.next = null;
      this.face = null; // the face that is able to see this vertex

    }

  }

// A double linked list that contains vertex nodes.

  class VertexList {

    constructor() {

      this.head = null;
      this.tail = null;

    }

    first() {

      return this.head;

    }

    last() {

      return this.tail;

    }

    clear() {

      this.head = this.tail = null;

      return this;

    }

    // Inserts a vertex before the target vertex

    insertBefore(target, vertex) {

      vertex.prev = target.prev;
      vertex.next = target;

      if (vertex.prev === null) {

        this.head = vertex;

      } else {

        vertex.prev.next = vertex;

      }

      target.prev = vertex;

      return this;

    }

    // Inserts a vertex after the target vertex

    insertAfter(target, vertex) {

      vertex.prev = target;
      vertex.next = target.next;

      if (vertex.next === null) {

        this.tail = vertex;

      } else {

        vertex.next.prev = vertex;

      }

      target.next = vertex;

      return this;

    }

    // Appends a vertex to the end of the linked list

    append(vertex) {

      if (this.head === null) {

        this.head = vertex;

      } else {

        this.tail.next = vertex;

      }

      vertex.prev = this.tail;
      vertex.next = null; // the tail has no subsequent vertex

      this.tail = vertex;

      return this;

    }

    // Appends a chain of vertices where 'vertex' is the head.

    appendChain(vertex) {

      if (this.head === null) {

        this.head = vertex;

      } else {

        this.tail.next = vertex;

      }

      vertex.prev = this.tail;

      // ensure that the 'tail' reference points to the last vertex of the chain

      while (vertex.next !== null) {

        vertex = vertex.next;

      }

      this.tail = vertex;

      return this;

    }

    // Removes a vertex from the linked list

    remove(vertex) {

      if (vertex.prev === null) {

        this.head = vertex.next;

      } else {

        vertex.prev.next = vertex.next;

      }

      if (vertex.next === null) {

        this.tail = vertex.prev;

      } else {

        vertex.next.prev = vertex.prev;

      }

      return this;

    }

    // Removes a list of vertices whose 'head' is 'a' and whose 'tail' is b

    removeSubList(a, b) {

      if (a.prev === null) {

        this.head = b.next;

      } else {

        a.prev.next = b.next;

      }

      if (b.next === null) {

        this.tail = a.prev;

      } else {

        b.next.prev = a.prev;

      }

      return this;

    }

    isEmpty() {

      return this.head === null;

    }

  }

  class ConvexGeometry extends BufferGeometry {

    constructor(points = []) {

      super();

      // buffers

      const vertices = [];
      const normals = [];

      if (ConvexHull === undefined) {

        console.error('THREE.ConvexBufferGeometry: ConvexBufferGeometry relies on ConvexHull');

      }

      const convexHull = new ConvexHull().setFromPoints(points);

      // generate vertices and normals

      const faces = convexHull.faces;

      for (let i = 0; i < faces.length; i++) {

        const face = faces[i];
        let edge = face.edge;

        // we move along a doubly-connected edge list to access all face points (see HalfEdge docs)

        do {

          const point = edge.head().point;

          vertices.push(point.x, point.y, point.z);
          normals.push(face.normal.x, face.normal.y, face.normal.z);

          edge = edge.next;

        } while (edge !== face.edge);

      }

      // build geometry

      this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
      this.setAttribute('normal', new Float32BufferAttribute(normals, 3));

    }

  }

  return ConvexGeometry
})();

let _plane = new Plane(new Vector3(0, 1, 0))
const _raycaster = new Raycaster();

const _mouse = new Vector2();
const _offset = new Vector3();
const _intersection = new Vector3();
const _worldPosition = new Vector3();
const _inverseMatrix = new Matrix4();

class DragControls extends EventDispatcher {

  constructor( _objects, _camera, _domElement ) {

    super();

    let _selected = null, _hovered = null;

    const _intersections = [];

    //

    const scope = this;

    function activate() {

      _domElement.addEventListener( 'pointermove', onPointerMove );
      _domElement.addEventListener( 'pointerdown', onPointerDown );
      _domElement.addEventListener( 'pointerup', onPointerCancel );
      _domElement.addEventListener( 'pointerleave', onPointerCancel );
      _domElement.addEventListener( 'touchmove', onTouchMove, { passive: false } );
      _domElement.addEventListener( 'touchstart', onTouchStart, { passive: false } );
      _domElement.addEventListener( 'touchend', onTouchEnd );

    }

    function deactivate() {

      _domElement.removeEventListener( 'pointermove', onPointerMove );
      _domElement.removeEventListener( 'pointerdown', onPointerDown );
      _domElement.removeEventListener( 'pointerup', onPointerCancel );
      _domElement.removeEventListener( 'pointerleave', onPointerCancel );
      _domElement.removeEventListener( 'touchmove', onTouchMove );
      _domElement.removeEventListener( 'touchstart', onTouchStart );
      _domElement.removeEventListener( 'touchend', onTouchEnd );

      _domElement.style.cursor = '';

    }

    function dispose() {

      deactivate();

    }

    function getObjects() {

      return _objects;

    }

    function onPointerMove( event ) {

      event.preventDefault();

      switch ( event.pointerType ) {

        case 'mouse':
        case 'pen':
          onMouseMove( event );
          break;

        // TODO touch

      }

    }

    function onMouseMove( event ) {

      const rect = _domElement.getBoundingClientRect();

      _mouse.x = ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1;
      _mouse.y = - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1;

      _raycaster.setFromCamera( _mouse, _camera );

      if ( _selected && scope.enabled ) {

        if ( _raycaster.ray.intersectPlane( _plane, _intersection ) ) {

          let intendedPos = _intersection.sub( _offset ).applyMatrix4( _inverseMatrix )

          // We constrain the next pos to be in the playground, i.e., |x|, |z| < 1250
          if (Math.abs(intendedPos.x) < 1250 && Math.abs(intendedPos.z) < 1250) {
            _selected.position.copy(intendedPos);
          }

        }

        scope.dispatchEvent( { type: 'drag', object: _selected } );

        return;

      }

      _intersections.length = 0;

      _raycaster.setFromCamera( _mouse, _camera );
      _raycaster.intersectObjects( _objects, true, _intersections );

      if ( _intersections.length > 0 ) {

        const object = _intersections[ 0 ].object;

        //_plane.setFromNormalAndCoplanarPoint( _camera.getWorldDirection( _plane.normal ), _worldPosition.setFromMatrixPosition( object.matrixWorld ) );

        if ( _hovered !== object && _hovered !== null ) {

          scope.dispatchEvent( { type: 'hoveroff', object: _hovered } );

          _domElement.style.cursor = 'auto';
          _hovered = null;

        }

        if ( _hovered !== object ) {

          scope.dispatchEvent( { type: 'hoveron', object: object } );

          _domElement.style.cursor = 'pointer';
          _hovered = object;

        }

      } else {

        if ( _hovered !== null ) {

          scope.dispatchEvent( { type: 'hoveroff', object: _hovered } );

          _domElement.style.cursor = 'auto';
          _hovered = null;

        }

      }

    }

    function onPointerDown( event ) {

      event.preventDefault();

      switch ( event.pointerType ) {

        case 'mouse':
        case 'pen':
          onMouseDown( event );
          break;

        // TODO touch

      }

    }

    function onMouseDown( event ) {

      event.preventDefault();

      _intersections.length = 0;

      _raycaster.setFromCamera( _mouse, _camera );
      _raycaster.intersectObjects( _objects, true, _intersections );

      if ( _intersections.length > 0 ) {

        _selected = ( scope.transformGroup === true ) ? _objects[ 0 ] : _intersections[ 0 ].object;

        if ( _raycaster.ray.intersectPlane( _plane, _intersection ) ) {

          _inverseMatrix.copy( _selected.parent.matrixWorld ).invert();
          _offset.copy( _intersection ).sub( _worldPosition.setFromMatrixPosition( _selected.matrixWorld ) );

        }

        _domElement.style.cursor = 'move';

        scope.dispatchEvent( { type: 'dragstart', object: _selected } );

      }


    }

    function onPointerCancel( event ) {

      event.preventDefault();

      switch ( event.pointerType ) {

        case 'mouse':
        case 'pen':
          onMouseCancel( event );
          break;

        // TODO touch

      }

    }

    function onMouseCancel( event ) {

      event.preventDefault();

      if ( _selected ) {

        scope.dispatchEvent( { type: 'dragend', object: _selected } );

        _selected = null;

      }

      _domElement.style.cursor = _hovered ? 'pointer' : 'auto';

    }

    function onTouchMove( event ) {

      event.preventDefault();
      event = event.changedTouches[ 0 ];

      const rect = _domElement.getBoundingClientRect();

      _mouse.x = ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1;
      _mouse.y = - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1;

      _raycaster.setFromCamera( _mouse, _camera );

      if ( _selected && scope.enabled ) {

        if ( _raycaster.ray.intersectPlane( _plane, _intersection ) ) {

          _selected.position.copy( _intersection.sub( _offset ).applyMatrix4( _inverseMatrix ) );

        }

        scope.dispatchEvent( { type: 'drag', object: _selected } );

        return;

      }

    }

    function onTouchStart( event ) {

      event.preventDefault();
      event = event.changedTouches[ 0 ];

      const rect = _domElement.getBoundingClientRect();

      _mouse.x = ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1;
      _mouse.y = - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1;

      _intersections.length = 0;

      _raycaster.setFromCamera( _mouse, _camera );
      _raycaster.intersectObjects( _objects, true, _intersections );

      if ( _intersections.length > 0 ) {

        _selected = ( scope.transformGroup === true ) ? _objects[ 0 ] : _intersections[ 0 ].object;

        //_plane.setFromNormalAndCoplanarPoint( _camera.getWorldDirection( _plane.normal ), _worldPosition.setFromMatrixPosition( _selected.matrixWorld ) );

        if ( _raycaster.ray.intersectPlane( _plane, _intersection ) ) {

          _inverseMatrix.copy( _selected.parent.matrixWorld ).invert();
          _offset.copy( _intersection ).sub( _worldPosition.setFromMatrixPosition( _selected.matrixWorld ) );

        }

        _domElement.style.cursor = 'move';

        scope.dispatchEvent( { type: 'dragstart', object: _selected } );

      }


    }

    function onTouchEnd( event ) {

      event.preventDefault();

      if ( _selected ) {

        scope.dispatchEvent( { type: 'dragend', object: _selected } );

        _selected = null;

      }

      _domElement.style.cursor = 'auto';

    }

    activate();

    // API

    this.enabled = true;
    this.transformGroup = false;

    this.activate = activate;
    this.deactivate = deactivate;
    this.dispose = dispose;
    this.getObjects = getObjects;

  }

}

export { DragControls };

// This set of controls performs orbiting, dollying (zooming), and panning.
// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
//
//    Orbit - left mouse / touch: one-finger move
//    Zoom - middle mouse, or mousewheel / touch: two-finger spread or squish
//    Pan - right mouse, or left mouse + ctrl/meta/shiftKey, or arrow keys / touch: two-finger move

var OrbitControls = function ( object, domElement ) {

  if ( domElement === undefined ) console.warn( 'THREE.OrbitControls: The second parameter "domElement" is now mandatory.' );
  if ( domElement === document ) console.error( 'THREE.OrbitControls: "document" should not be used as the target "domElement". Please use "renderer.domElement" instead.' );

  this.object = object;
  this.domElement = domElement;

  // Set to false to disable this control
  this.enabled = true;

  // "target" sets the location of focus, where the object orbits around
  this.target = new Vector3();

  // How far you can dolly in and out ( PerspectiveCamera only )
  this.minDistance = 0;
  this.maxDistance = Infinity;

  // How far you can zoom in and out ( OrthographicCamera only )
  this.minZoom = 0;
  this.maxZoom = Infinity;

  // How far you can orbit vertically, upper and lower limits.
  // Range is 0 to Math.PI radians.
  this.minPolarAngle = 0; // radians
  this.maxPolarAngle = Math.PI; // radians

  // How far you can orbit horizontally, upper and lower limits.
  // If set, the interval [ min, max ] must be a sub-interval of [ - 2 PI, 2 PI ], with ( max - min < 2 PI )
  this.minAzimuthAngle = - Infinity; // radians
  this.maxAzimuthAngle = Infinity; // radians

  // Set to true to enable damping (inertia)
  // If damping is enabled, you must call controls.update() in your animation loop
  this.enableDamping = false;
  this.dampingFactor = 0.05;

  // This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
  // Set to false to disable zooming
  this.enableZoom = true;
  this.zoomSpeed = 1.0;

  // Set to false to disable rotating
  this.enableRotate = true;
  this.rotateSpeed = 1.0;

  // Set to false to disable panning
  this.enablePan = true;
  this.panSpeed = 1.0;
  this.screenSpacePanning = true; // if false, pan orthogonal to world-space direction camera.up
  this.keyPanSpeed = 7.0;	// pixels moved per arrow key push

  // Set to true to automatically rotate around the target
  // If auto-rotate is enabled, you must call controls.update() in your animation loop
  this.autoRotate = false;
  this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

  // Set to false to disable use of the keys
  this.enableKeys = true;

  // The four arrow keys
  this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

  // Mouse buttons
  this.mouseButtons = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN };

  // Touch fingers
  this.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN };

  // for reset
  this.target0 = this.target.clone();
  this.position0 = this.object.position.clone();
  this.zoom0 = this.object.zoom;

  //
  // public methods
  //

  this.getPolarAngle = function () {

    return spherical.phi;

  };

  this.getAzimuthalAngle = function () {

    return spherical.theta;

  };

  this.saveState = function () {

    scope.target0.copy( scope.target );
    scope.position0.copy( scope.object.position );
    scope.zoom0 = scope.object.zoom;

  };

  this.reset = function () {

    scope.target.copy( scope.target0 );
    scope.object.position.copy( scope.position0 );
    scope.object.zoom = scope.zoom0;

    scope.object.updateProjectionMatrix();
    scope.dispatchEvent( changeEvent );

    scope.update();

    state = STATE.NONE;

  };

  // this method is exposed, but perhaps it would be better if we can make it private...
  this.update = function () {
    var offset = new Vector3();

    // so camera.up is the orbit axis
    var quat = new Quaternion().setFromUnitVectors( object.up, new Vector3( 0, 1, 0 ) );
    var quatInverse = quat.clone().inverse();

    var lastPosition = new Vector3();
    var lastQuaternion = new Quaternion();

    var twoPI = 2 * Math.PI;

    return function update() {

      var position = scope.object.position;

      offset.copy( position ).sub( scope.target );

      // rotate offset to "y-axis-is-up" space
      offset.applyQuaternion( quat );

      // angle from z-axis around y-axis
      spherical.setFromVector3( offset );

      if ( scope.autoRotate && state === STATE.NONE ) {

        rotateLeft( getAutoRotationAngle() );

      }

      if ( scope.enableDamping ) {

        spherical.theta += sphericalDelta.theta * scope.dampingFactor;
        spherical.phi += sphericalDelta.phi * scope.dampingFactor;

      } else {

        spherical.theta += sphericalDelta.theta;
        spherical.phi += sphericalDelta.phi;

      }

      // restrict theta to be between desired limits

      var min = scope.minAzimuthAngle;
      var max = scope.maxAzimuthAngle;

      if ( isFinite( min ) && isFinite( max ) ) {

        if ( min < - Math.PI ) min += twoPI; else if ( min > Math.PI ) min -= twoPI;

        if ( max < - Math.PI ) max += twoPI; else if ( max > Math.PI ) max -= twoPI;

        if ( min < max ) {

          spherical.theta = Math.max( min, Math.min( max, spherical.theta ) );

        } else {

          spherical.theta = ( spherical.theta > ( min + max ) / 2 ) ?
            Math.max( min, spherical.theta ) :
            Math.min( max, spherical.theta );

        }

      }

      // restrict phi to be between desired limits
      spherical.phi = Math.max( scope.minPolarAngle, Math.min( scope.maxPolarAngle, spherical.phi ) );

      spherical.makeSafe();


      spherical.radius *= scale;

      // restrict radius to be between desired limits
      spherical.radius = Math.max( scope.minDistance, Math.min( scope.maxDistance, spherical.radius ) );

      // move target to panned location

      if ( scope.enableDamping === true ) {

        scope.target.addScaledVector( panOffset, scope.dampingFactor );

      } else {

        scope.target.add( panOffset );

      }

      offset.setFromSpherical( spherical );

      // rotate offset back to "camera-up-vector-is-up" space
      offset.applyQuaternion( quatInverse );

      position.copy( scope.target ).add( offset );

      scope.object.lookAt( scope.target );

      if ( scope.enableDamping === true ) {

        sphericalDelta.theta *= ( 1 - scope.dampingFactor );
        sphericalDelta.phi *= ( 1 - scope.dampingFactor );

        panOffset.multiplyScalar( 1 - scope.dampingFactor );

      } else {

        sphericalDelta.set( 0, 0, 0 );

        panOffset.set( 0, 0, 0 );

      }

      scale = 1;

      // update condition is:
      // min(camera displacement, camera rotation in radians)^2 > EPS
      // using small-angle approximation cos(x/2) = 1 - x^2 / 8

      if ( zoomChanged ||
        lastPosition.distanceToSquared( scope.object.position ) > EPS ||
        8 * ( 1 - lastQuaternion.dot( scope.object.quaternion ) ) > EPS ) {

        scope.dispatchEvent( changeEvent );

        lastPosition.copy( scope.object.position );
        lastQuaternion.copy( scope.object.quaternion );
        zoomChanged = false;

        return true;

      }

      return false;

    };

  }();

  this.dispose = function () {

    scope.domElement.removeEventListener( 'contextmenu', onContextMenu, false );

    scope.domElement.removeEventListener( 'pointerdown', onPointerDown, false );
    scope.domElement.removeEventListener( 'wheel', onMouseWheel, false );

    scope.domElement.removeEventListener( 'touchstart', onTouchStart, false );
    scope.domElement.removeEventListener( 'touchend', onTouchEnd, false );
    scope.domElement.removeEventListener( 'touchmove', onTouchMove, false );

    scope.domElement.ownerDocument.removeEventListener( 'pointermove', onPointerMove, false );
    scope.domElement.ownerDocument.removeEventListener( 'pointerup', onPointerUp, false );

    scope.domElement.removeEventListener( 'keydown', onKeyDown, false );

    //scope.dispatchEvent( { type: 'dispose' } ); // should this be added here?

  };

  //
  // internals
  //

  var scope = this;

  var changeEvent = { type: 'change' };
  var startEvent = { type: 'start' };
  var endEvent = { type: 'end' };

  var STATE = {
    NONE: - 1,
    ROTATE: 0,
    DOLLY: 1,
    PAN: 2,
    TOUCH_ROTATE: 3,
    TOUCH_PAN: 4,
    TOUCH_DOLLY_PAN: 5,
    TOUCH_DOLLY_ROTATE: 6
  };

  var state = STATE.NONE;

  var EPS = 0.000001;

  // current position in spherical coordinates
  var spherical = new Spherical();
  var sphericalDelta = new Spherical();

  var scale = 1;
  var panOffset = new Vector3();
  var zoomChanged = false;

  var rotateStart = new Vector2();
  var rotateEnd = new Vector2();
  var rotateDelta = new Vector2();

  var panStart = new Vector2();
  var panEnd = new Vector2();
  var panDelta = new Vector2();

  var dollyStart = new Vector2();
  var dollyEnd = new Vector2();
  var dollyDelta = new Vector2();

  function getAutoRotationAngle() {

    return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

  }

  function getZoomScale() {

    return Math.pow( 0.95, scope.zoomSpeed );

  }

  function rotateLeft( angle ) {

    sphericalDelta.theta -= angle;

  }

  function rotateUp( angle ) {

    sphericalDelta.phi -= angle;

  }

  var panLeft = function () {

    var v = new Vector3();

    return function panLeft( distance, objectMatrix ) {

      v.setFromMatrixColumn( objectMatrix, 0 ); // get X column of objectMatrix
      v.multiplyScalar( - distance );

      panOffset.add( v );

    };

  }();

  var panUp = function () {

    var v = new Vector3();

    return function panUp( distance, objectMatrix ) {

      if ( scope.screenSpacePanning === true ) {

        v.setFromMatrixColumn( objectMatrix, 1 );

      } else {

        v.setFromMatrixColumn( objectMatrix, 0 );
        v.crossVectors( scope.object.up, v );

      }

      v.multiplyScalar( distance );

      panOffset.add( v );

    };

  }();

  // deltaX and deltaY are in pixels; right and down are positive
  var pan = function () {

    var offset = new Vector3();

    return function pan( deltaX, deltaY ) {

      var element = scope.domElement;

      if ( scope.object.isPerspectiveCamera ) {

        // perspective
        var position = scope.object.position;
        offset.copy( position ).sub( scope.target );
        var targetDistance = offset.length();

        // half of the fov is center to top of screen
        targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

        // we use only clientHeight here so aspect ratio does not distort speed
        panLeft( 2 * deltaX * targetDistance / element.clientHeight, scope.object.matrix );
        panUp( 2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix );

      } else if ( scope.object.isOrthographicCamera ) {

        // orthographic
        panLeft( deltaX * ( scope.object.right - scope.object.left ) / scope.object.zoom / element.clientWidth, scope.object.matrix );
        panUp( deltaY * ( scope.object.top - scope.object.bottom ) / scope.object.zoom / element.clientHeight, scope.object.matrix );

      } else {

        // camera neither orthographic nor perspective
        console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.' );
        scope.enablePan = false;

      }

    };

  }();

  function dollyOut( dollyScale ) {

    if ( scope.object.isPerspectiveCamera ) {

      scale /= dollyScale;

    } else if ( scope.object.isOrthographicCamera ) {

      scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom * dollyScale ) );
      scope.object.updateProjectionMatrix();
      zoomChanged = true;

    } else {

      console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );
      scope.enableZoom = false;

    }

  }

  function dollyIn( dollyScale ) {

    if ( scope.object.isPerspectiveCamera ) {

      scale *= dollyScale;

    } else if ( scope.object.isOrthographicCamera ) {

      scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom / dollyScale ) );
      scope.object.updateProjectionMatrix();
      zoomChanged = true;

    } else {

      console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );
      scope.enableZoom = false;

    }

  }

  //
  // event callbacks - update the object state
  //

  function handleMouseDownRotate( event ) {

    rotateStart.set( event.clientX, event.clientY );

  }

  function handleMouseDownDolly( event ) {

    dollyStart.set( event.clientX, event.clientY );

  }

  function handleMouseDownPan( event ) {

    panStart.set( event.clientX, event.clientY );

  }

  function handleMouseMoveRotate( event ) {

    rotateEnd.set( event.clientX, event.clientY );

    rotateDelta.subVectors( rotateEnd, rotateStart ).multiplyScalar( scope.rotateSpeed );

    var element = scope.domElement;

    rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientHeight ); // yes, height

    rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight );

    rotateStart.copy( rotateEnd );

    scope.update();

  }

  function handleMouseMoveDolly( event ) {

    dollyEnd.set( event.clientX, event.clientY );

    dollyDelta.subVectors( dollyEnd, dollyStart );

    if ( dollyDelta.y > 0 ) {

      dollyOut( getZoomScale() );

    } else if ( dollyDelta.y < 0 ) {

      dollyIn( getZoomScale() );

    }

    dollyStart.copy( dollyEnd );

    scope.update();

  }

  function handleMouseMovePan( event ) {

    panEnd.set( event.clientX, event.clientY );

    panDelta.subVectors( panEnd, panStart ).multiplyScalar( scope.panSpeed );

    pan( panDelta.x, panDelta.y );

    panStart.copy( panEnd );

    scope.update();

  }

  function handleMouseUp( /*event*/ ) {

    // no-op

  }

  function handleMouseWheel( event ) {

    if ( event.deltaY < 0 ) {

      dollyIn( getZoomScale() );

    } else if ( event.deltaY > 0 ) {

      dollyOut( getZoomScale() );

    }

    scope.update();

  }

  function handleKeyDown( event ) {

    var needsUpdate = false;

    switch ( event.keyCode ) {

      case scope.keys.UP:
        pan( 0, scope.keyPanSpeed );
        needsUpdate = true;
        break;

      case scope.keys.BOTTOM:
        pan( 0, - scope.keyPanSpeed );
        needsUpdate = true;
        break;

      case scope.keys.LEFT:
        pan( scope.keyPanSpeed, 0 );
        needsUpdate = true;
        break;

      case scope.keys.RIGHT:
        pan( - scope.keyPanSpeed, 0 );
        needsUpdate = true;
        break;

    }

    if ( needsUpdate ) {

      // prevent the browser from scrolling on cursor keys
      event.preventDefault();

      scope.update();

    }


  }

  function handleTouchStartRotate( event ) {

    if ( event.touches.length == 1 ) {

      rotateStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

    } else {

      var x = 0.5 * ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX );
      var y = 0.5 * ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY );

      rotateStart.set( x, y );

    }

  }

  function handleTouchStartPan( event ) {

    if ( event.touches.length == 1 ) {

      panStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

    } else {

      var x = 0.5 * ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX );
      var y = 0.5 * ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY );

      panStart.set( x, y );

    }

  }

  function handleTouchStartDolly( event ) {

    var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
    var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;

    var distance = Math.sqrt( dx * dx + dy * dy );

    dollyStart.set( 0, distance );

  }

  function handleTouchStartDollyPan( event ) {

    if ( scope.enableZoom ) handleTouchStartDolly( event );

    if ( scope.enablePan ) handleTouchStartPan( event );

  }

  function handleTouchStartDollyRotate( event ) {

    if ( scope.enableZoom ) handleTouchStartDolly( event );

    if ( scope.enableRotate ) handleTouchStartRotate( event );

  }

  function handleTouchMoveRotate( event ) {

    if ( event.touches.length == 1 ) {

      rotateEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

    } else {

      var x = 0.5 * ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX );
      var y = 0.5 * ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY );

      rotateEnd.set( x, y );

    }

    rotateDelta.subVectors( rotateEnd, rotateStart ).multiplyScalar( scope.rotateSpeed );

    var element = scope.domElement;

    rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientHeight ); // yes, height

    rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight );

    rotateStart.copy( rotateEnd );

  }

  function handleTouchMovePan( event ) {

    if ( event.touches.length == 1 ) {

      panEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

    } else {

      var x = 0.5 * ( event.touches[ 0 ].pageX + event.touches[ 1 ].pageX );
      var y = 0.5 * ( event.touches[ 0 ].pageY + event.touches[ 1 ].pageY );

      panEnd.set( x, y );

    }

    panDelta.subVectors( panEnd, panStart ).multiplyScalar( scope.panSpeed );

    pan( panDelta.x, panDelta.y );

    panStart.copy( panEnd );

  }

  function handleTouchMoveDolly( event ) {

    var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
    var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;

    var distance = Math.sqrt( dx * dx + dy * dy );

    dollyEnd.set( 0, distance );

    dollyDelta.set( 0, Math.pow( dollyEnd.y / dollyStart.y, scope.zoomSpeed ) );

    dollyOut( dollyDelta.y );

    dollyStart.copy( dollyEnd );

  }

  function handleTouchMoveDollyPan( event ) {

    if ( scope.enableZoom ) handleTouchMoveDolly( event );

    if ( scope.enablePan ) handleTouchMovePan( event );

  }

  function handleTouchMoveDollyRotate( event ) {

    if ( scope.enableZoom ) handleTouchMoveDolly( event );

    if ( scope.enableRotate ) handleTouchMoveRotate( event );

  }

  function handleTouchEnd( /*event*/ ) {

    // no-op

  }

  //
  // event handlers - FSM: listen for events and reset state
  //

  function onPointerDown( event ) {

    if ( scope.enabled === false ) return;

    switch ( event.pointerType ) {

      case 'mouse':
      case 'pen':
        onMouseDown( event );
        break;

      // TODO touch

    }

  }

  function onPointerMove( event ) {

    if ( scope.enabled === false ) return;

    switch ( event.pointerType ) {

      case 'mouse':
      case 'pen':
        onMouseMove( event );
        break;

      // TODO touch

    }

  }

  function onPointerUp( event ) {

    if ( scope.enabled === false ) return;

    switch ( event.pointerType ) {

      case 'mouse':
      case 'pen':
        onMouseUp( event );
        break;

      // TODO touch

    }

  }

  function onMouseDown( event ) {

    // Prevent the browser from scrolling.
    //event.preventDefault();

    // Manually set the focus since calling preventDefault above
    // prevents the browser from setting it automatically.

    scope.domElement.focus ? scope.domElement.focus() : window.focus();

    var mouseAction;

    switch ( event.button ) {

      case 0:

        mouseAction = scope.mouseButtons.LEFT;
        break;

      case 1:

        mouseAction = scope.mouseButtons.MIDDLE;
        break;

      case 2:

        mouseAction = scope.mouseButtons.RIGHT;
        break;

      default:

        mouseAction = - 1;

    }

    switch ( mouseAction ) {

      case MOUSE.DOLLY:

        if ( scope.enableZoom === false ) return;

        handleMouseDownDolly( event );

        state = STATE.DOLLY;

        break;

      case MOUSE.ROTATE:

        if ( event.ctrlKey || event.metaKey || event.shiftKey ) {

          if ( scope.enablePan === false ) return;

          handleMouseDownPan( event );

          state = STATE.PAN;

        } else {

          if ( scope.enableRotate === false ) return;

          handleMouseDownRotate( event );

          state = STATE.ROTATE;

        }

        break;

      case MOUSE.PAN:

        if ( event.ctrlKey || event.metaKey || event.shiftKey ) {

          if ( scope.enableRotate === false ) return;

          handleMouseDownRotate( event );

          state = STATE.ROTATE;

        } else {

          if ( scope.enablePan === false ) return;

          handleMouseDownPan( event );

          state = STATE.PAN;

        }

        break;

      default:

        state = STATE.NONE;

    }

    if ( state !== STATE.NONE ) {

      scope.domElement.ownerDocument.addEventListener( 'pointermove', onPointerMove, false );
      scope.domElement.ownerDocument.addEventListener( 'pointerup', onPointerUp, false );

      scope.dispatchEvent( startEvent );

    }

  }

  function onMouseMove( event ) {

    if ( scope.enabled === false ) return;

    //event.preventDefault();

    switch ( state ) {

      case STATE.ROTATE:

        if ( scope.enableRotate === false ) return;

        handleMouseMoveRotate( event );

        break;

      case STATE.DOLLY:

        if ( scope.enableZoom === false ) return;

        handleMouseMoveDolly( event );

        break;

      case STATE.PAN:

        if ( scope.enablePan === false ) return;

        handleMouseMovePan( event );

        break;

    }

  }

  function onMouseUp( event ) {

    if ( scope.enabled === false ) return;

    handleMouseUp( event );

    scope.domElement.ownerDocument.removeEventListener( 'pointermove', onPointerMove, false );
    scope.domElement.ownerDocument.removeEventListener( 'pointerup', onPointerUp, false );

    scope.dispatchEvent( endEvent );

    state = STATE.NONE;

  }

  function onMouseWheel( event ) {

    if ( scope.enabled === false || scope.enableZoom === false || ( state !== STATE.NONE && state !== STATE.ROTATE ) ) return;

    event.preventDefault();
    event.stopPropagation();

    scope.dispatchEvent( startEvent );

    handleMouseWheel( event );

    scope.dispatchEvent( endEvent );

  }

  function onKeyDown( event ) {

    if ( scope.enabled === false || scope.enableKeys === false || scope.enablePan === false ) return;

    handleKeyDown( event );

  }

  function onTouchStart( event ) {

    if ( scope.enabled === false ) return;

    event.preventDefault(); // prevent scrolling

    switch ( event.touches.length ) {

      case 1:

        switch ( scope.touches.ONE ) {

          case TOUCH.ROTATE:

            if ( scope.enableRotate === false ) return;

            handleTouchStartRotate( event );

            state = STATE.TOUCH_ROTATE;

            break;

          case TOUCH.PAN:

            if ( scope.enablePan === false ) return;

            handleTouchStartPan( event );

            state = STATE.TOUCH_PAN;

            break;

          default:

            state = STATE.NONE;

        }

        break;

      case 2:

        switch ( scope.touches.TWO ) {

          case TOUCH.DOLLY_PAN:

            if ( scope.enableZoom === false && scope.enablePan === false ) return;

            handleTouchStartDollyPan( event );

            state = STATE.TOUCH_DOLLY_PAN;

            break;

          case TOUCH.DOLLY_ROTATE:

            if ( scope.enableZoom === false && scope.enableRotate === false ) return;

            handleTouchStartDollyRotate( event );

            state = STATE.TOUCH_DOLLY_ROTATE;

            break;

          default:

            state = STATE.NONE;

        }

        break;

      default:

        state = STATE.NONE;

    }

    if ( state !== STATE.NONE ) {

      scope.dispatchEvent( startEvent );

    }

  }

  function onTouchMove( event ) {

    if ( scope.enabled === false ) return;

    event.preventDefault(); // prevent scrolling
    event.stopPropagation();

    switch ( state ) {

      case STATE.TOUCH_ROTATE:

        if ( scope.enableRotate === false ) return;

        handleTouchMoveRotate( event );

        scope.update();

        break;

      case STATE.TOUCH_PAN:

        if ( scope.enablePan === false ) return;

        handleTouchMovePan( event );

        scope.update();

        break;

      case STATE.TOUCH_DOLLY_PAN:

        if ( scope.enableZoom === false && scope.enablePan === false ) return;

        handleTouchMoveDollyPan( event );

        scope.update();

        break;

      case STATE.TOUCH_DOLLY_ROTATE:

        if ( scope.enableZoom === false && scope.enableRotate === false ) return;

        handleTouchMoveDollyRotate( event );

        scope.update();

        break;

      default:

        state = STATE.NONE;

    }

  }

  function onTouchEnd( event ) {

    if ( scope.enabled === false ) return;

    handleTouchEnd( event );

    scope.dispatchEvent( endEvent );

    state = STATE.NONE;

  }

  function onContextMenu( event ) {

    if ( scope.enabled === false ) return;

    event.preventDefault();

  }

  scope.domElement.addEventListener( 'contextmenu', onContextMenu, false );

  scope.domElement.addEventListener( 'pointerdown', onPointerDown, false );
  scope.domElement.addEventListener( 'wheel', onMouseWheel, false );

  scope.domElement.addEventListener( 'touchstart', onTouchStart, false );
  scope.domElement.addEventListener( 'touchend', onTouchEnd, false );
  scope.domElement.addEventListener( 'touchmove', onTouchMove, false );

  scope.domElement.addEventListener( 'keydown', onKeyDown, false );

  // make sure element can receive keys.

  if ( scope.domElement.tabIndex === - 1 ) {

    scope.domElement.tabIndex = 0;

  }

  // force an update at start

  this.update();

};

OrbitControls.prototype = Object.create( EventDispatcher.prototype );
OrbitControls.prototype.constructor = OrbitControls;


// This set of controls performs orbiting, dollying (zooming), and panning.
// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
// This is very similar to OrbitControls, another set of touch behavior
//
//    Orbit - right mouse, or left mouse + ctrl/meta/shiftKey / touch: two-finger rotate
//    Zoom - middle mouse, or mousewheel / touch: two-finger spread or squish
//    Pan - left mouse, or arrow keys / touch: one-finger move

var MapControls = function ( object, domElement ) {

  OrbitControls.call( this, object, domElement );

  this.screenSpacePanning = false; // pan orthogonal to world-space direction camera.up

  this.mouseButtons.LEFT = MOUSE.PAN;
  this.mouseButtons.RIGHT = MOUSE.ROTATE;

  this.touches.ONE = TOUCH.PAN;
  this.touches.TWO = TOUCH.DOLLY_ROTATE;
};

MapControls.prototype = Object.create( EventDispatcher.prototype );
MapControls.prototype.constructor = MapControls;

export { OrbitControls, MapControls };
