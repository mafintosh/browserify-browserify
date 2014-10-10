var shim = require('./shim')
var xhr = require('xhr')
var tar = require('tar-fs')
var zlib = require('zlib')
var path = require('path')
var fs = require('fs')
var browser = require('file-browser-widget')
var semver = require('semver')
var shasum = require('shasum')
var browserify = require('browserify')
var detective = require('detective')

var noop = function() {}

var update = function() {}

var show = function() {
  var br = browser()

  br.on('directory', function(cwd) {
    window.location.hash = '/d'+cwd
  })

  br.on('file', function(cwd) {
    window.location.hash = '/f'+cwd
  })

  window.onhashchange = update = function() {
    var hash = window.location.hash.slice(2) || 'd'
    var file = hash[0] !== 'd'
    var cwd = hash.slice(1) || '/'

    if (file) {
      fs.readFile(cwd, 'utf-8', function(err, data) {
        if (err) throw err
        br.file(cwd, data)
      })
      return
    }

    fs.readdir(cwd, function(err, files) {
      if (err) throw err

      var dir = []
      var loop = function() {
        if (dir.length === files.length) return br.directory(cwd, dir)

        var p = path.join(cwd, files[dir.length])

        fs.stat(p, function(err, stat) {
          if (err) throw err
          dir.push({
            path: p,
            mtime: stat.mtime,
            size: stat.size,
            type: stat.isDirectory() ? 'directory' : 'file'
          })

          loop()
        })
      }

      loop()
    })
  }

  br.appendTo(document.getElementById('browser'))
  window.onhashchange()
}

var install = function(name, opts, cb) {
  if (typeof opts === 'function') return install(name, null, opts)
  if (!opts) opts = {}
  if (!cb) cb = noop

  if (process.binding('native')[name] && name !== 'stream_decoderc') return cb()

  var cwd = path.join('/', opts.cwd || '.', 'node_modules', name)

  var map = function(entry) {
    entry.name = path.join(cwd, entry.name)
    return entry
  }

  var fetch = function(url, cb) {
    console.log('Fetching and extracting %s', url)
    xhr({
      method: 'GET',
      url: 'http://cors.maxogden.com/'+encodeURI(url),
      responseType: 'arraybuffer'
    }, function(err, result) {
      if (err) return cb(err)
      zlib.gunzip(new Buffer(new Uint8Array(result.response)), function(err, buf) {
        if (err) return cb(err)
        tar.extract('.', {map:map, strip:1}).end(buf, cb)
      })
    })
  }

  var v = opts.version || '*'

  console.log('Installing %s (%s) to %s', name, v, cwd)

  xhr({
    method: 'GET',
    json: true,
    url: 'http://cors.maxogden.com/'+encodeURI('http://registry.npmjs.org/'+name)
  }, function(err, response) {
    if (err) return cb(err)

    var versions = Object.keys(response.body.versions)
    var best = versions
      .filter(function(version) {
        return semver.satisfies(version, v)
      })
      .reduce(function(a, b) {
        return semver.gt(a, b) ? a : b
      })

    var url = response.body.versions[best].dist.tarball

    fetch(url, function() {
      update()

      fs.readFile(path.join(cwd, 'package.json'), 'utf-8', function(err, data) {
        if (err) return cb(err)

        var deps = JSON.parse(data).dependencies || {}
        var names = Object.keys(deps)

        var loop = function(err) {
          if (err) return cb(err)
          if (!names.length) return cb()
          var name = names.shift()
          install(name, {cwd:cwd, version:deps[name]}, loop)
        }

        loop()
      })
    })
  })
}

var run = function() {
  var b = browserify()
  b.add('/index.js')
  b.bundle().pipe(fs.createWriteStream('/bundle.js')).on('finish', function() {
    fs.readFile('/bundle.js', 'utf-8', function(err, src) {
      eval(src)
    })
  })
}

var ready = function() {
  show()

  var $run = document.getElementById('run')
  var $src = document.getElementById('src')

  fs.readFile('/index.js', 'utf-8', function(err, val) {
    $src.value = val || ''

    $run.onclick = function() {
      var val = $src.value
      fs.writeFile('/index.js', val, function() {
        update()

        var deps = detective(val)
        var loop = function() {
          if (!deps.length) return run()
          var m = deps.shift()
          fs.exists('/node_modules/'+m, function(cached) {
            install(m, loop)
          })
        }

        loop()
      })
    }
  })
}

fs.exists('/node_modules/.done', function(exists) {
  if (exists) return ready()
  install('browserify', function() {
    console.log('browserify installed succesful')
    fs.writeFile('/.done', 'ok', ready)
  })
})