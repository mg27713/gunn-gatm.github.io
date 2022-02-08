import {Mesh, MeshLambertMaterial} from "../external/three.module.js"

class VisObject extends Mesh {
  constructor(params={}) {
    super(params.geometry, params.material ?? new MeshLambertMaterial({color: 0xdfdfdf}))

    this.clickable = !!params.clickable
    this.position.set(0,0,0)
    this.domain = null

    this.visEventListeners = {}
  }

  addVisEventListener (name, listener) {
    if (!(this.visEventListeners[name] ?? (this.visEventListeners[name] = [])).includes(listener))
      this.clickEventListeners.push(listener)
  }

  removeVisEventListener (name, listener) {
    this.clickEventListeners = this.clickEventListeners.filter(l => l !== listener)
  }

  triggerEvent (evt) {
    this.clickEventListeners[evt]?.forEach(l => l(evt, this))
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

    this.clickable = !!d && this.clickable
  }

  add (...args) {
    super.add(...args)
    args.forEach(a => a.setDomain?.(this.domain))
  }

  remove (...args) {
    super.remove(...args)
    this.setDomain(null)
  }

  dispose () {
    super.dispose()
    this.clickable = false
    this.setDomain(null)
  }
}

export { VisObject }
