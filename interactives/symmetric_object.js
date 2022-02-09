import * as THREE from "../external/three.module.js"
import {Color, Float32BufferAttribute, Group, MeshLambertMaterial, Vector3} from "../external/three.module.js"
import {AxisObject} from "./axis_object.js"
import {VisObject} from "./vis_object.js"
import {ReflectivePlaneObject} from "./reflective_plane_object.js"
import {nullGeometry, nullMaterial} from "./null.js"
import {VisText} from "./text_elem.js"

const generalMaterial = new THREE.MeshBasicMaterial ({ vertexColors: true })
const triangleMaterial = new MeshLambertMaterial()

export class SymmetricObject extends VisObject {
  constructor (params={}) {
    super({ geometry: nullGeometry, clickable: false, material: nullMaterial })

    this.position.copy(params.position ?? new Vector3(0, 0, 0))

    this.inMotion = false
    this.showVertexLabels = params.showVertexLabels ?? true

    let shape = this.shape = params.shape
    if (!shape) throw new Error("fuck you")

    this.currentMotion =

      this.onAfterRender = () => {
        if (this.inMotion) {

        }
      }

    this.displayed = null
    this.computeDisplayed()

    // Removes invisible stuff
    this.axisObjects = params.axisObjects?.map(a => a.castratedClone()).filter(a => !!a) ?? []
    this.planeObjects = params.planeObjects?.map(a => a.castratedClone()).filter(a => !!a) ?? []
  }

  computeDisplayed () {
    let shape = this.shape

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
    this.displayed = new VisObject() // just a group

    this.displayed.add(new VisObject({ // the geometry itself
      geometry, material, clickable: true /* we don't have handlers, but we need its corpulent mass */
    }))

    if (this.showVertexLabels) {
      console.log("computing vertex labels")
      let v = shape.vertices
      let vL = shape.vertexNames

      v.forEach((p, i) => this.displayed.add(new VisText({ text: vL[i], position: p })))
    }

    this.add(this.displayed)
  }

  showAxisObjects (show=true) {
    this.axisObjects.forEach(a => {
      this.remove(a)
      a.geometry.dispose()
    })

    this.axisObjects = []

    if (show) {
      let o = this.axisObjects = []

      for (let axis of this.shape.axes) {
        o.push(new AxisObject({
          normal: axis,
          clickable: true
        }))
      }

      this.axisObjects.forEach(o => this.add(o))
    }
  }

  selectSym (o) {
    let domain = this.domain

    if (!domain.selected?.visible) {
      // uh oh
      domain.selected = null
    }

    if (o.isSymIndicator) {
      // Selected axis/plane
      if (domain.selected) {
        // Unselect
        domain.selected = null
      } else {
        domain.selected = o
      }
    }

    this.restoreMaterials()
  }

  castratedClone () {
    return new SymmetricObject(this)
  }

  restoreMaterials () {
    let domain = this.domain
    for (let c of this.children) {
      let m
      if (domain.selected) {
        m = c === domain.selected ? "selected" : "hidden"
      } else if (domain.hovering?.isSymIndicator) {
        m = c === domain.hovering ? "hover" : "irrelevant"
      } else {
        m = "default"
      }

      c.setMaterial?.(m)
    }

    this.hovering = domain.hovering
    this.selected = domain.selected
  }

  showPlaneObjects (show=true) {
    this.planeObjects.forEach(a => {
      this.remove(a)
      a.geometry.dispose()
    })

    if (show) {
      let o = this.planeObjects = []

      for (let n of this.shape.reflectiveNormals) {
        o.push(new ReflectivePlaneObject({
          normal: n,
          clickable: true
        }))
      }

      this.planeObjects.forEach(o => this.add(o))
    }
  }
}
