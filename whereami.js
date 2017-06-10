var EventEmitter = require('events').EventEmitter
module.exports = Whereami

function Whereami (opts) {
  if (!(this instanceof Whereami)) return new Whereami(opts)
  if (!opts) opts = {}
  EventEmitter.call(this)
  this._getpos = opts.getCurrentPosition
    || function () {
      return window.navigator.geolocation.getCurrentPosition
        .apply(window.navigator.geolocation, arguments)
    }
  this._scanInterval = opts.scanInterval || 1000
  this._scanning = false
}
Whereami.prototype = Object.create(EventEmitter.prototype)

Whereami.prototype.start = function () {
  var self = this
  self._scanning = true
  scan()
  function scan () {
    if (self._scanning) self._getpos(success, error)
  }
  function success (pos) {
    if (!self._scanning) return
    self.emit('position', {
      longitude: pos.coords.longitude,
      latitude: pos.coords.latitude,
      altitude: pos.coords.altitude
    })
    self._timeout = setTimeout(scan, self._scanInterval)
  }
  function error (err) {
    if (!self._scanning) return
    self.emit('error', err)
    self._timeout = setTimeout(scan, self._scanInterval)
  }
}

Whereami.prototype.stop = function () {
  self._scanning = false
  if (self._timeout) clearTimeout(self._timeout)
}
