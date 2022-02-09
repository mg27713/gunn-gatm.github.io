import {MeshPhongMaterial, Vector3} from "../external/three.module.js"
import {generateArrow, getCylinderBasis} from "./symmetries.js"
import {VisObject} from "./vis_object.js"
import { nullGeometry} from "./null.js"

const axisMaterial = new MeshPhongMaterial({ color: 0xff00dd })
const axisIrrelevantMaterial = new MeshPhongMaterial({ color: 0xdd0066, transparent: true, opacity: 0.3 })
const axisHoverMaterial = new MeshPhongMaterial({ color: 0xdd0066 })

class AxisObject extends VisObject {
  constructor (params={}) {
    super({ geometry: nullGeometry, material: axisMaterial, ...params })

    this.normal = params.normal ?? new Vector3()
    this.axisLen = params.axisLen ?? 1
    this.girth = params.girth ?? 0.04

    this.littleGirth = params.littleGirth ?? 0.02
    this.subtends = params.subtends ?? 0 //Math.PI / 2
    this.subtendsShift = params.subtendsShift ?? 0.1
    this.subtendsRadius = params.subtendsRadius ?? 0.5

    this.computeChildren()
    this.addVisEventListener("hover", () => {
      this.parent.restoreMaterials()
    })

    this.addVisEventListener("hover_off", () => {
      this.parent.restoreMaterials()
    })

    this.addVisEventListener("click", () => {
      this.parent.selectSym(this)
    })

    this.ssGeometry = null
  }

  isSymIndicator () {

  }

  /**
   *
   * @param m {string} "default", "selected", "hover", "irrelevant", "hidden"
   */
  setMaterial (m) {
    let mat = null, vis = true

    switch (m) {
      case "default":
        mat = axisMaterial
        break
      case "selected":
        mat = axisMaterial
        break
      case "hover":
        mat = axisHoverMaterial
        break
      case "irrelevant":
        mat = axisIrrelevantMaterial
        break
      case "hidden":
        mat = axisMaterial
        vis = false
        break
      default:
        throw new Error(m)
    }

    this.visible = vis
    this.material = mat
    if (this.ssGeometry) {
      this.ssGeometry.material = mat
    }
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
    let axisGeometry = generateArrow([ b, e ], {
      shaftGirth: this.girth, coneGirth: this.girth * 2,
      coneLen: this.girth * 3 })
    axisGeometry.computeVertexNormals()

    this.geometry = axisGeometry

    if (this.subtends) {
      let s = this.subtends, ss = this.subtendsShift /* from tip */, al = this.axisLen, girth = this.littleGirth, r = this.subtendsRadius

      let m = e.clone().add(this.normal.normalize().multiplyScalar(-ss)) // center of the subtends thingy
      let [ bp, bq ] = getCylinderBasis(n, r)

      if (s < 0) {
        s = s + 2 * Math.PI
      }

      let verts = []
      let res = Math.ceil(s / Math.PI * 48)

      for (let i = 0; i < res; ++i) {
        let f = i / res * s

        verts.push(m.clone().add(bp.clone().multiplyScalar(Math.cos(f)).add(bq.clone().multiplyScalar(Math.sin(f)))))
      }

      let ssGeometry = generateArrow(verts, {
        shaftGirth: girth,
        coneGirth: girth * 2,
        coneLen: girth * 3
      })

      this.ssGeometry = ssGeometry
      this.add(new VisObject({ geometry: ssGeometry, material: this.material } ))
    }
  }

  castratedClone () {
    return this.visible ? new AxisObject(this) : null
  }
}

export { AxisObject }
