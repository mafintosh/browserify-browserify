var Stream = require('stream')
var mod = require('module')
var path = require('path')

Function.prototype.resolve = function(name) {
  if (name === './_empty' || name === './_empty.js') return '/node_modules/browserify/lib/_empty.js'
  if (name === 'process/browser') return '/node_modules/browserify/node_modules/process/browser.js'
  if (name === 'events' || name === 'events/') return '/node_modules/browserify/node_modules/events/events.js'
  if (name === 'util/util.js') return '/node_modules/browserify/node_modules/util/util.js'
  return path.join('/node_modules/browserify/node_modules', name, 'index.js')
}

process.umask = process.umask || function() {
  return 0
}

process.binding = function() { // haxx
  return {
    _debugger: true,
    _linklist: true,
    assert: true,
    buffer: true,
    child_process: true,
    console: true,
    constants: true,
    crypto: true,
    cluster: true,
    dgram: true,
    dns: true,
    domain: true,
    events: true,
    freelist: true,
    fs: true,
    http: true,
    https: true,
    module: true,
    net: true,
    os: true,
    path: true,
    punycode: true,
    querystring: true,
    readline: true,
    repl: true,
    stream: true,
    _stream_readable: true,
    _stream_writable: true,
    _stream_duplex: true,
    _stream_transform: true,
    _stream_passthrough: true,
    string_decoder: true,
    sys: true,
    timers: true,
    tls: true,
    tty: true,
    url: true,
    util: true,
    vm: true,
    zlib: true
  }
}

mod.Module = mod
mod._nodeModulePaths = function (from) {
  // guarantee that 'from' is absolute.
  from = path.resolve(from);

  // note: this approach *only* works when the path is guaranteed
  // to be absolute.  Doing a fully-edge-case-correct path.split
  // that works on both Windows and Posix is non-trivial.
  var splitRe = process.platform === 'win32' ? /[\/\\]/ : /\//;
  // yes, '/' works on both, but let's be a little canonical.
  var joiner = process.platform === 'win32' ? '\\' : '/';
  var paths = [];
  var parts = from.split(splitRe);

  for (var tip = parts.length - 1; tip >= 0; tip--) {
    // don't search in .../node_modules/node_modules
    if (parts[tip] === 'node_modules') continue;
    var dir = parts.slice(0, tip + 1).concat('node_modules').join(joiner);
    paths.push(dir);
  }

  return paths;
}