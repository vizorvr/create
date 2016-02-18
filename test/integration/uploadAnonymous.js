var testId = rand()
process.env.MONGODB = 'mongodb://localhost:27017/upload'+testId
process.env.RETHINKDB_NAME = 'upload' + testId

var request = require('supertest');
var fs = require('fs');
var fsPath = require('path');
var mongo = require('mongodb');
var expect = require('chai').expect;

function rand()
{
	return Math.floor(Math.random() * 100000);
}

var app = require('../../app.js');

describe('Upload', function() {
	var username = 'v'
	var deets = {
		name: 'Foo bar',
		username: username,
		email: username+'@test.foo',
		password: 'abcd1234',
		confirmPassword: 'abcd1234'
	};
	
	function makePath(model, name) {
		return '/' + fsPath.join(deets.username, 'assets', model, name)
	}

	var agent = request.agent(app);
	var db;

	before(function(done) {
		var that = this;

		db = new mongo.Db('upload'+testId,
			new mongo.Server('localhost', 27017),
			{ safe: true }
		)

		db.open(done);
	})

	after(function() {
		db.dropDatabase();
	})

	/*
	before(function(done) {
		agent
		.post('/signup')
		.send(deets)
		.expect(302)
		.end(done);
	});
	*/

	describe('Image', function()
	{
		it('should upload correctly', function(done) {
			var original = makePath('image', testId+'.png')
			var thumb = makePath('image', testId+'-thumb.png')
			var scaled = makePath('image', testId+'-scaled.png')
			var scaledThumb = makePath('image', testId+'-scaled-thumb.png')
			var stream = fs.createReadStream(__dirname+'/../fixtures/te-2rb.jpg');
			stream.path = original

			agent
			.post('/uploadAnonymous/image')
			.attach('file', stream, original)
			.expect(200)
			.end(function(err, res) {
				if (err) return done(err);
				var json = res.body;
				delete json._creator;
				delete json._id;
				delete json.createdAt;
				delete json.updatedAt;
				delete json.original.bytes;
				delete json.scaledThumbnail.bytes;
				delete json.scaled.bytes;
				delete json.thumbnail.bytes;

				expect(json.url.length).to.equal(56);
				expect(json.original.url.length).to.equal(56);
				expect(json.scaled.url.length).to.equal(56);
				expect(json.scaledThumbnail.url.length).to.equal(56);
				expect(json.thumbnail.url.length).to.equal(56);

				delete json.url; delete json.scaled.url; delete json.original.url; delete json.scaledThumbnail.url; delete json.thumbnail.url; 

				expect({__v:0,path:original,
					tags:['texture'],
					scaledThumbnail:{mimetype:'image/png',width:128,height:128,path:scaledThumb},
					scaled:{mimetype:'image/png',width:1024,height:1024,path:scaled},
					thumbnail:{mimetype:'image/png',width:128,height:72,path:thumb},
					original:{mimetype:'image/png',width:1920,height:1080,path:original}
					})
					.to.deep.equal(json);
				done(err);
			});
		});
	});

	/*
	describe('Scene', function() {
		it('should upload correctly', function(done) {
			var scene = makePath('scene', ''+testId);
			var original = scene+'.zip';
			var stream = fs.createReadStream(__dirname+'/../fixtures/scene.zip');
			stream.path = original

			agent
			.post('/upload/scene')
			.attach('file', stream, original)
			.expect(200)
			.end(function(err, res) {
				if (err) return done(err);
				var json = res.body;
				delete json._creator;
				delete json._id;
				delete json.createdAt;
				delete json.updatedAt;
				json.files = json.files.sort()

				files = [
					scene+'/scene.json',
					scene+'/scene_Cube_n0.png',
					scene+'/scene_Cube_t00.png',
					scene+'/scene_Cube_v0.png',
					scene+'/skybox_1.jpg',
					scene+'/skybox_2.jpg',
					scene+'/skybox_3.jpg',
					scene+'/skybox_not.jpg'
					].sort()

				expect({"__v":0,"path":scene,"url":'/data'+scene+'/scene.json',"tags":[],
					files: files
				}).to.deep.equal(json);
				done(err);
			});
		});
	});

	describe('Audio', function() {
		it('should upload correctly', function(done) {
			var audio = makePath('audio', testId+'.ogg');
			var stream = fs.createReadStream(__dirname+'/../../browser/data/audio/inedible_candy.ogg');
			stream.path = audio

			agent
			.post('/upload/audio')
			.attach('file', stream, audio)
			.expect(200)
			.end(function(err, res) {
				if (err) return done(err);
				var json = res.body;
				delete json._creator;
				delete json._id;
				delete json.createdAt;
				delete json.updatedAt;
				console.log(json)

				expect({"__v":0,
					"path":audio,
					"url":"/data/audio/84a9746d5ac7d62fae337f2e3d878d8e949d71a3.ogg",
					"tags":[]}).to.deep.equal(json);
				done(err);
			});
		});
	});

	describe('JSON', function()
	{
		it('should upload correctly', function(done) {
			var jsonFile = makePath('json', testId+'.json');
			var stream = fs.createReadStream(__dirname+'/../fixtures/graph.json');
			stream.path = jsonFile

			agent
			.post('/upload/json')
			.attach('file', stream, jsonFile)
			.expect(200)
			.end(function(err, res) {
				if (err) return done(err);
				var json = res.body;
				delete json._creator;
				delete json._id;
				delete json.createdAt;
				delete json.updatedAt;

				expect({"__v":0,"path":jsonFile,
					"url":"/data/json/7389a96cf704f2914453a54b34c9f16fa3b89a69.json","tags":[]})
				.to.deep.equal(json);

				done(err);
			});
		});
	});
*/
});

