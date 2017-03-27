(function() {

function ImageLoader(url) {
	E2.Loader.apply(this, arguments)
	var that = this

	function loadImage(data) {
		var dfd = when.defer()

		var xhr = new XMLHttpRequest()
		xhr.open('GET', url, true)
		xhr.crossOrigin = 'Anonymous'
		xhr.responseType = 'arraybuffer'

		xhr.onerror = function() {
			that.errorHandler(new Error(this.status))
		}

		xhr.onload = function() {
			console.time('Parse image')

			if (this.status >= 400) {
				return dfd.reject( xhr.onerror())
			}

			var blob = new Blob([this.response])
			var img = new Image()
			img.src = window.URL.createObjectURL(blob)
			img.onload = function () {
				console.timeEnd('Parse image')
				data.img = img
				return dfd.resolve(data)
			}
		}

		xhr.onprogress = function(evt) {
			if (evt.total)
				that.emit('progress', evt.loaded / evt.total)
		}

		xhr.send()

		return dfd.promise
	}

	function loadMetadata(data) {
		var dfd = when.defer()

		var metaUrl = '/meta' + url.replace(AssetLoader.getCDNRoot(), '')

		var xhr = new XMLHttpRequest()
		xhr.open('GET', metaUrl, true)
		xhr.crossOrigin = 'Anonymous'
		xhr.responseType = 'text'

		xhr.onerror = function() {
			dfd.reject(that.errorHandler(new Error(this.status)))
		}

		xhr.onload = function() {
			var result = {}

			if (this.status < 400 && this.responseText) {
				result = JSON.parse(this.responseText)
			}

			data.metadata = result
			dfd.resolve(data)
		}

		xhr.send()

		return dfd.promise
	}

	var data = {}

	loadImage(data).then(function(data) {
		return loadMetadata(data)
	}).then(function(data) {
		return that.onImageLoaded(data.img, data.metadata)
	})
}

ImageLoader.prototype = Object.create(E2.Loader.prototype)
ImageLoader.prototype.onImageLoaded = function(img) {
	this.emit('loaded', img)
}

E2.Loaders.ImageLoader = ImageLoader

if (typeof(module) !== 'undefined') {
	module.exports.ImageLoader = ImageLoader
}

})()
