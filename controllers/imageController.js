var Image = require('../models/image')
var AssetController = require('./assetController')
var ImageProcessor = require('../lib/imageProcessor')
var User = require('../models/user')
var fs = require('fs')
var helper = require('./controllerHelpers')

function ImageController() {
	var args = Array.prototype.slice.apply(arguments)
	args.unshift(Image)
	AssetController.apply(this, args)
}

ImageController.prototype = Object.create(AssetController.prototype)

ImageController.prototype.upload = function(req, res, next) {
	var that = this

	var file = req.files.file
	var folder = '/' + req.user.username + '/assets/image'

	new ImageProcessor(this._fs)
		.handleUpload(file, folder)
		.then(function(info) {
			fs.unlink(file.path, function() {})

			info.path = info.original.path
			info.url = info.original.url

			return that._service.save(info, req.user)
			.then(function(asset) {
				res.json(asset)
			})
		})
		.catch(next)
}

ImageController.prototype.getMetadata = function(req, res, next) {
	var path = req.path.replace(/^\/meta/, '/data')

	this._service.findOne({'scaled.url' : path}).then(function(item) {
		if (!item) {
			return next()
		}

		res.header('Cache-Control', 'public')

		res.json({
			width: item.scaled.width,
			height: item.scaled.height,
			pitch: item.scaled.pitch,
			heading: item.scaled.heading,
			roll: item.scaled.roll
		})
	})
	.catch(next)
}

// called by setUserAvatar and setUserHeader
ImageController.prototype._setUserProfileImage = function(req, res, next, imageProcessor, folder, profileFields) {
	var that = this

	var file = req.files.file
	if (!(file && file.path))
		return res.status(400).send('Please upload a file')


	User.findById(req.user.id, function(err, user) {

		if (err || !user)
			return next(err)

		imageProcessor(file, folder)
			.then(function(info) {
				fs.unlink(file.path, function() {})
				user.profile[profileFields.original] = info.original.url
				user.profile[profileFields.scaled] = info.scaled.url
	 			user.save(function(err) {
	 				if (err)
	 					return next(err)

	 				res.json(helper.responseStatusSuccess(
	 					'OK', {
	 						uploaded: info,
	 						user: user.toJSON()
	 					})
	 				)
	 			})
			})
			.catch(next)
	})
}


ImageController.prototype.setUserAvatar = function(req, res, next) {
	var processor = new ImageProcessor(this._fs)
	return this._setUserProfileImage(req, res, next,
		processor.handleUserAvatarUpload.bind(processor),
		'/' + req.user.username + '/profile/avatar',
		{original: 'avatarOriginal', scaled: 'avatarScaled'}
	)
}

ImageController.prototype.setUserHeader = function(req, res, next) {
	var processor = new ImageProcessor(this._fs)
	return this._setUserProfileImage(req, res, next,
		processor.handleUserHeaderUpload.bind(processor),
		'/' + req.user.username + '/profile/header',
		{original: 'headerOriginal', scaled: 'headerScaled'}
	)
}


ImageController.prototype.uploadAnonymous = function(req, res, next) {
	var that = this

	var file = req.files.file
	var folder = '/v/assets/image'

	new ImageProcessor(this._fs)
		.handleUpload(file, folder)
		.then(function(info) {
			fs.unlink(file.path, function() {})

			info.path = info.original.path
			info.url = info.original.url

			return that._service.save(info, req.user)
			.then(function(asset) {
				res.json(asset)
			})
		})
		.catch(next)
}

module.exports = ImageController
