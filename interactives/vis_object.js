import {Mesh, MeshLambertMaterial} from "../external/three.module.js"
import {nullGeometry} from "./null.js"

class VisObject extends Mesh {
  constructor(params={}) {
    super(params.geometry, params.material ?? new MeshLambertMaterial({color: 0xdfdfdf}))

    this.clickable = !!params.clickable
    this.position.set(0,0,0)
    this.domain = null

    this.visEventListeners = {}
  }

  addVisEventListener (name, listener) {
    let l = this.visEventListeners[name]
    if (!l) l = this.visEventListeners[name] = []

    if (!l.includes(listener))
      l.push(listener)
  }

  removeVisEventListener (name, listener) {
    let l = this.visEventListeners[name]
    if (l) this.visEventListeners[name] = l.filter(l => l !== listener)
  }

  triggerEvent (name, evt) {
    this.visEventListeners[name]?.forEach(l => l(evt, this))
    this.parent?.triggerEvent?.(name, evt)
  }

  castrate () {
    this.visEventListeners = {}
    this.clickable = false
  }

  // Whether we can interact
  get clickable () {
    return this._clickable
  }

  set clickable(v) {
    if (typeof v !== "boolean") throw new TypeError("????? 西瓜瓤")
    this._clickable = v

    if (!this.domain) return
    let clickableObjects = this.domain.clickableObjects

    if (v && !clickableObjects.includes(this)) {
      clickableObjects.push(this)
    } else if (clickableObjects.includes(this)) {
      let i = clickableObjects.indexOf(this)
      if (~i) clickableObjects.splice(i, 1) // rm this
    }
  }

  setDomain (d) {
    this.domain = d
    this.children.forEach(c => c.setDomain?.(d))

    this.clickable = this.clickable
  }

  add (...args) {
    super.add(...args)
    args.forEach(a => a.setDomain?.(this.domain))
  }

  remove (...args) {
    super.remove(...args)
    args.forEach(a => a && (a.clickable = false))
  }

  dispose () {
    this.geometry !== nullGeometry ? this.geometry.dispose() : '空'
    this.children.forEach(c => c.dispose())

    this.clickable = false
  }
}

export { VisObject }
