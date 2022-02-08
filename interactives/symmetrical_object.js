import * as THREE from "../external/three.module.js"
import {Color, Float32BufferAttribute, MeshLambertMaterial} from "../external/three.module.js"
import {AxisObject} from "./axis_object.js"

const generalMaterial = new THREE.MeshBasicMaterial ({ vertexColors: true })
const triangleMaterial = new MeshLambertMaterial()

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
