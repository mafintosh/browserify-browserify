var levelfs = require('level-filesystem')
var leveljs = require('level-js')
var levelup = require('levelup')

module.exports = levelfs(levelup('bigdata', {db:leveljs}))