var wswarm = require('webrtc-swarm')
var to = require('to2')
var onend = require('end-of-stream')
var split = require('split2')
var signalhub = require('signalhub')
var randombytes = require('randombytes')

var swarm = wswarm(signalhub('geoswarm-demo',
  [ 'https://signalhub.mafintosh.com' ]))
var app = require('choo')()
var html = require('choo/html')

var devid = randombytes(6).toString('hex')

app.route('*', function (state, emit) {
  return html`<body>
    <h1>geoswarm</h1>
    <h3>${state.ownPosition.longitude},
      ${state.ownPosition.latitude}</h3>
    <table>
      <tr>
        <th>device</th>
        <th>position</th>
      </tr>
      ${Object.keys(state.devices).map(function (id) {
        return html`<tr>
          <td>${id}</td>
          <td>${state.devices[id].longitude},
            ${state.devices[id].latitude}</td>
        </tr>`
      })}
    </table>
  </body>`
})

app.use(function (state, emitter) {
  state.devices = {}
  state.seen = {}
  state.peers = []
  state.ownPosition = { longitude: '---', latitude: '---' }
  swarm.on('peer', function (peer) {
    console.log('CONNECT')
    onend(peer, function () {
      console.log('DISCONNECT')
      var ix = state.peers.indexOf(peer)
      state.peers.splice(ix,1)
    })
    state.peers.push(peer)
    peer.pipe(split()).pipe(to(function (buf, enc, next) {
      try { var data = JSON.parse(buf.toString()) }
      catch (err) { return next() }
      var xdevid = data[0]
      var msgid = data[1]
      if (state.seen[msgid]) return next()
      state.seen[msgid] = true
      state.devices[xdevid] = data[2]
      emitter.emit('render')
      next()
    }))
  })
})

var whereami = require('./whereami.js')()
app.use(function (state, emitter) {
  whereami.on('position', function (pos) {
    state.ownPosition = pos
    state.peers.forEach(function (peer) {
      var msgid = randombytes(6).toString('hex')
      var data = [devid,msgid,pos]
      peer.write(JSON.stringify(data) + '\n')
    })
    emitter.emit('render')
  })
  whereami.on('error', function (err) {
    console.error(err)
  })
  whereami.start()
})

app.mount('body')
