var request = require('supertest')
var app = require('../../app.js')

var jpeg = __dirname+'/../fixtures/te-2rb.jpg'
var assert = require('assert')

describe('Headers', function() {
	var db
	var agent = request.agent(app)
	var testId = process.hrtime().join('')
	var username = 'test'+testId
	var deets = {
		name: 'Test User'+testId,
		username: username,
		email: username+'@test.foo',
		password: 'abcd1234',
		confirmPassword: 'abcd1234'
	}

	before(function(done) {
		app.events.on('ready', function() {
			agent
			.post('/signup')
			.send(deets)
			.expect(302)
			.end(done)
		})
	})

	it('sets user header', function(done) {
		agent.post('/account/profile/header')
		.attach('file', jpeg, 'my.jpeg')
		.expect(200)
		.end(function(err, res) {
			agent.get('/account')
			.set('X-Requested-With', 'XMLHttpRequest')
			.expect(200)
			.end(function(err, res) {
				if (err) return done(err)
				assert.equal('/data/'+username+'/profile/header/te-2rb-scaled.jpg',
					res.body.data.header)
				done()
			})
		})
	})

	it('scales header correctly', function(done) {
		agent.post('/account/profile/header')
		.attach('file', jpeg, 'my.jpeg')
		.expect(200)
		.end(function(err, res) {
			if (err) return done(err)
			assert.equal(1440, res.body.data.uploaded.scaled.width)
			assert.equal(340, res.body.data.uploaded.scaled.height)
			done()
		})
	})

})

