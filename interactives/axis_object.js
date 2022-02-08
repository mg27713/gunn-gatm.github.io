import {MeshPhongMaterial, Vector3} from "../external/three.module.js"
import {generateArrow} from "./symmetries.js"
import {VisObject} from "./vis_object.js"
import { nullGeometry} from "./null.js"

const axisMaterial = new MeshPhongMaterial({ color: 0xff00dd })

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

export { AxisObject }
