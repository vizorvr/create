var request = require('supertest')
var when = require('when')
var fs = require('fs')
var fsPath = require('path')
var assert = require('assert')
var expect = require('chai').expect
var urlParse = require('url').parse

var argv = require('minimist')(process.argv.slice(2))

if (argv._.length < 1) {
	console.log(`
	usage:

		$ pull [-up] owner/graph-name [local-name]
			-u local username
			-p password 

			pulls the 'owner/graph-name' from the remote to local
			- remote can be full url to the editor, 'user/graph', ...
			- remote defaults to vizor.io

			$ pull fthr/tunnel

			pulls fthr/tunnel from vizor.io to local username/tunnel
	`)

	process.exit(1)
}

var username = argv['u']
var deets = {
	email: username,
	password: argv['p']
}

var parsed = urlParse(argv._[0])
var hn = (parsed.hostname || 'vizor.io') 
	+ ':' + (parsed.port || 80)

var userAndGraph = parsed.path
	.split('.')[0] // remove extensions
	.split('/')

if (userAndGraph[userAndGraph.length-1] === 'edit')
	userAndGraph.pop()

userAndGraph = userAndGraph.slice(-2) // last two parts

var localName = argv._[1] || userAndGraph[1]

userAndGraph = userAndGraph.join('/')

var url = '/data/graph/' + userAndGraph +'.json'

var localHttp = 'http://127.0.0.1:8000'
var remoteHttp = 'http://'+hn
if (localHttp === remoteHttp) {
	console.error('Not writing to source', localHttp, remoteHttp)
	process.exit(1)
}

var remote = request.agent(remoteHttp)
var local = request.agent(localHttp)

function sendGraph(path, graphData, cb) {
	return local.post('/graph').send({
		path: path,
		graph: JSON.stringify(graphData)
	})
	.expect(200)
	.end(cb)
}

function error(err) {
	console.error(err)
}

// --------

function Step1() {
	local.post('/login.json').send(deets).expect(200)
	.end(function(err, res) {
		console.log('Login:', res ? res.status : res)
		if (err) return error(err)
		Step2()
	})
}

function Step2() {
	console.log('Retrieving:', hn, url)
	remote.get(url).expect(200).end(function(err, res) {
		if (err) return error(err)
		sendGraph(localName, res.body, function(err) {
			if (err)
				return error(err)

			var username = deets.email.split('@')[0]
			console.log('Pulled as: ', localHttp+'/'+username+'/'+localName)

		})
	})
}

Step1()

