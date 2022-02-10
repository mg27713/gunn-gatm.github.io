import * as THREE from "../external/three.module.js"
import {
  Color,
  Float32BufferAttribute,
  Group,
  Matrix4,
  MeshLambertMaterial,
  Quaternion,
  Vector3
} from "../external/three.module.js"
import {AxisObject} from "./axis_object.js"
import {VisObject} from "./vis_object.js"
import {ReflectivePlaneObject} from "./reflective_plane_object.js"
import {nullGeometry, nullMaterial} from "./null.js"
import {VisText} from "./text_elem.js"
import {explainMatrix, Motion, motionFromMatrix, SymmetricShape} from "./symmetries.js"

import * as TWEEN from "../external/tween.esm.js"

const generalMaterial = new THREE.MeshBasicMaterial ({ vertexColors: true })
const triangleMaterial = new MeshLambertMaterial({ color: 0x55ff22})

export class SymmetricObject extends VisObject {
  constructor (params={}) {
    super({ geometry: nullGeometry, clickable: false, material: nullMaterial })

    this.position.copy(params.position ?? new Vector3(0, 0, 0))

    this.showVertexLabels = params.showVertexLabels ?? true

    let shape = this.shape = params.shape
    if (!(shape instanceof SymmetricShape)) throw new Error("why")

    this.inMotion = false

    this.displayed = null
    this.motionIndicator = null

    // Removes invisible stuff
    this.axisObjects = params.axisObjects?.map(a => a.castratedClone()).filter(a => !!a) ?? []
    this.planeObjects = params.planeObjects?.map(a => a.castratedClone()).filter(a => !!a) ?? []

    this.currentMotion = shape.fullSymmetryGroup.elements[0]
    this.currentTransform = params.currentTransform?.clone() ?? this.currentMotion.toMatrix(this.shape)
    this.targetMotion = params.targetMotion ?? shape.fullSymmetryGroup.elements[0]

    this.computeDisplayed()
    this.updateMatrixCow()
  }

  getMotion () {
    return this.targetMotion
  }

  setElement (m) {
    this.currentMotion = m
  }

  performMotion (m, time=0) {
    if (!m || !(m instanceof Motion)) return null

    // Resultant motion
    let res = this.targetMotion.compose(m)

    if (time === 0) {
      this.currentMotion = this.targetMotion = res
      this.currentTransform = res.toMatrix(this.shape)

      if (this.displayed) {
        this.displayed.matrix.copy(this.currentTransform)
        console.log(this.displayed.matrix)
      }

      this.inMotion = false
      return null
    } else {
      let expl = explainMatrix(m.toMatrix(this.shape))

      if (expl.length === 1) {
        expl = expl[0]
        if (expl.type === "identity") {
          // Nothing
          this.removeIndicator()
          setTimeout(() => {
            this.inMotion = true
          }, time)
        } else if (expl.type === "reflection") {
          let tweenlmao = new TWEEN.Tween(this.currentTransform)
            .to(res.toMatrix(this.shape), time)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate(() => this.updateMatrixCow())
            .start()

          this.showPlaneIndicator(expl.normal)
          this.targetMotion = res

          return tweenlmao
        } else {
          // plain rotation
          let proportion = { p: 0 }
          let orig = this.targetMotion.toMatrix(this.shape).clone()

          let tweenlmao = new TWEEN.Tween(proportion)
            .to({ p: 1 }, time)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate(() => {
              let rot = new Matrix4().makeRotationFromQuaternion(
                new Quaternion().setFromAxisAngle(expl.axis, expl.theta * proportion.p))

              this.currentTransform.multiplyMatrices(rot, orig)
              this.updateMatrixCow()
            }).start()

          this.showAxisIndicator(expl.axis, expl.theta)
          this.targetMotion = res

          return tweenlmao
        }
      } else {
        // rotoreflection
        return this.performMotion(motionFromMatrix(this.shape, expl[0].m), time / 2)
          .onComplete(() => this.performMotion(motionFromMatrix(this.shape, expl[1].m), time / 2))
      }
    }
  }

  updateMatrixCow () {
    this.displayed.matrix.copy(this.currentTransform)
    if (this.motionIndicator) {
      this.motionIndicator.position.copy(this.position)
      this.motionIndicator.updateMatrix()
    }
  }

  computeDisplayed () {
    let shape = this.shape

    let geometry = shape.geometry.clone()
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

    this.displayed?.dispose()
    this.remove(this.displayed)

    this.displayed = new VisObject() // just a group
    this.displayed.matrixAutoUpdate = false // do it ourselves

    this.displayed.add(new VisObject({ // the geometry itself
      geometry, material, clickable: true /* we don't have handlers, but we need its corpulent mass */
    }))

    if (this.showVertexLabels) {
      let v = shape.vertices
      let vL = shape.vertexNames

      vL.forEach((t, i) => this.displayed.add(new VisText({ text: t, position: v[i] })))
    }

    this.add(this.displayed)
  }

  removeIndicator () {
    if (this.motionIndicator) {
      this.motionIndicator.dispose()
      this.remove(this.motionIndicator) // DIE DIE DIE
      this.motionIndicator = null
    }
  }

  showPlaneIndicator (normal) {
    this.removeIndicator()
    let indicator = this.motionIndicator = new ReflectivePlaneObject({
      normal: normal,
      clickable: false
    })

    this.children.push(indicator)
    this.updateMatrixCow()
  }

  showAxisIndicator (axis, theta) {
    this.removeIndicator()
    let indicator = this.motionIndicator = new AxisObject({
      normal: axis,
      subtends: theta,
      showCone: false
    })

    this.children.push(indicator)
    this.updateMatrixCow()
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
    else {
      window.dispatchEvent(new CustomEvent("on deselected"))
    }
  }

  selectSym (o) {
    let domain = this.domain

    if (!domain.selected?.visible) {
      // uh oh
      domain.selected = null
      window.dispatchEvent(new CustomEvent("on deselected"))
    }

    if (o.isSymIndicator) {
      // Selected axis/plane
      if (domain.selected) {
        // Unselect
        domain.selected = null
        window.dispatchEvent(new CustomEvent("on deselected"))
      } else {
        domain.selected = o

        if (o instanceof ReflectivePlaneObject) {
          window.dispatchEvent(new CustomEvent("on plane selected", { detail: o }))
        } else if (o instanceof AxisObject) {
          let opts = this.shape.getRotationOptions(o.normal)

          window.dispatchEvent(new CustomEvent("on axis selected", { detail: opts }))
        }
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
    else {
      window.dispatchEvent(new CustomEvent("on deselected"))
    }
  }
}
