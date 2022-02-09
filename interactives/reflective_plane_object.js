import {Color, MeshBasicMaterial, Vector3} from "../external/three.module.js"
import {generateArrow, getCylinderBasis} from "./symmetries.js"
import {nullGeometry} from "./null.js"
import {ConvexGeometry} from "../external/three_addons.js"
import {VisObject} from "./vis_object.js"

let planeMaterial = new MeshBasicMaterial({
  transparent: true,
  opacity: 0.5,
  color: new Color(0.5, 0.5, 0.5)
})

let planeHoverMaterial = new MeshBasicMaterial({
  transparent: true,
  opacity: 0.8,
  color: new Color(0.5, 0.5, 0.5)
})

let planeIrrelevantMaterial = new MeshBasicMaterial({
  transparent: true,
  opacity: 0.1,
  color: new Color(0.5, 0.5, 0.5)
})


class ReflectivePlaneObject extends VisObject {
  constructor (params={}) {
    super({ geometry: nullGeometry, material: planeMaterial, ...params })

    this.normal = params.normal ?? new Vector3()
    this.thickness = 0.01
    this.width = this.height = 1.5

    this.setNormal()

    this.addVisEventListener("hover", () => {
      this.parent.restoreMaterials()
    })

    this.addVisEventListener("hover_off", () => {
      this.parent.restoreMaterials()
    })

    this.addVisEventListener("click", () => {
      this.parent.selectSym(this)
    })
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
        mat = planeMaterial
        break
      case "selected":
        mat = planeMaterial
        break
      case "hover":
        mat = planeHoverMaterial
        break
      case "irrelevant":
        mat = planeIrrelevantMaterial
        break
      case "hidden":
        mat = planeMaterial
        vis = false
        break
      default:
        throw new Error(m)
    }

    this.visible = vis
    this.material = mat
  }

  setNormal () {
    // Compute an appropriate planar geometry

    let w2 = this.width / 2, h2 = this.height / 2, t2 = this.thickness / 2, n = this.normal.clone()
    if (n.length() < 0.2) return

    let [ p, q ] = getCylinderBasis(n, 1, true)
    let d1 = p.multiplyScalar(w2)
    let d2 = q.multiplyScalar(h2)

    let verts = [-1,1]
      .flatMap(a => [[a, -1], [a, 1]]
      .flatMap(([a,b]) => [[a, b, -1], [a, b, 1]])
        .flatMap(([a, b, c]) => new Vector3(
          d1.x * a + d2.x * b + t2 * c,
          d1.y * a + d2.y * b + t2 * c,
          d1.z * a + d2.z * b + t2 * c
        )))

    this.geometry !== nullGeometry ? this.geometry.dispose : "空"
    this.geometry = new ConvexGeometry(verts)
  }

  castratedClone () {
    return this.visible ? new ReflectivePlaneObject(this) : null
  }
}

export { ReflectivePlaneObject }
