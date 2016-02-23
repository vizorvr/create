
var vizor360 = new function() {

	var that = this
	var $body = {},
		$progress = {}	// progressbar element

	this.minProgress = 0	// allow half+half progress bar

	function updateProgressBar(percent) {
		$progress.val(percent)
		that.minProgress = percent
	}

	function clearBodyClass() {
		$body.removeClass('dragentered dragover dragover-dropzone uploading error')
	}

	/* lastTarget is set first on dragenter, then
	   compared with during dragleave. */
	var lastDragTarget = null;


	/* ERROR HANDLING */
	this.displayError = function(message, details, heading) {
		if (!(message || details)) return
		heading = heading || 'Error'

		//playerUI.selectStage('errorStage')
		var html = E2.views.partials.error({
			message: message,
			code: details
		})

		console.error(message, details)

		window.Vizor.disableHeaderClick = true

		var bb = VizorUI.modalOpen(html, heading, 'error doselect_all', true, {
			callback: function() {
			}
		})
	}

	var cancelledUploading = function() {
		clearBodyClass()
		playerUI.selectStage('stage')
		E2.app.player.play()
		window.Vizor.disableHeaderClick = false
		return false
	}

	var err = function(message, details){
		cancelledUploading()
		that.displayError(message, details)
	}


	// STEP 4
	this.loadGraphAndPlay = function(asset, data) {
		if (!asset) {
			return;
		}

		// Load from the JSON url in the asset
		clearBodyClass()
		playerUI.selectStage('stage')

		E2.core.once('player:stateChanged', function(s){
			if (s === E2.app.player.state.PLAYING) {
				$body.removeClass('firsttime')
				that.minProgress = 0
				playerUI.headerFadeOut()
				playerUI.amendVRManagerInstructions()
				return true
			}
			return false
		})

		var host = window.location.hostname
		if (window.location.port) {
			host = host + (window.location.port === 80) ? '' : (':' + window.location.port)
		}
		
		var baseUrl = 'http://' + host
		playerUI.data.shareURL = baseUrl + asset.path
		playerUI.data.embedSrc = baseUrl + 'embed/' + asset.path
		playerUI.headerEnableAutoFadeout()
		history.pushState({}, '', asset.path)
		E2.app.player.loadAndPlay(asset.url, true);
	}

	// STEP 3
	// POST graph to the server
	this.uploadGraph = function(graphData, callback) {
		var p = when.defer()

		clearBodyClass()
		$body.addClass('uploading')

		$.ajax({
			url: '/graph/v',
			type: 'POST',
			data: graphData,
			dataType: 'json',
			success: function(response) {
				callback(response)
				p.resolve()
			},
			error: function(err) {
				var errMsg = err.responseJSON ? err.responseJSON.message : err.status;
				alert('Sorry, an error occurred while uploading the file.')
				p.reject('Could not post file', errMsg)
			}
		})

		return p.promise
	}

	// STEP 2
	// Fetch the 360 template from our server and publish a graph with
	// image url from passed in url
	this.publishTemplateWithUrl = function(imageUrl) {
		console.log("publishing stereo template with imageUrl = " + imageUrl);

		var dfd = when.defer()

		var templateUrl = "/presets/_template-360-photo.json";

		$.ajax({
			url: templateUrl,
			type: 'GET',
			dataType: 'json',

			success: function(graph) {
				var urlReplaced = false;

				// Go through the graph 'nodes' field and find the URL
				// for the 360 template we are replacing
				var nodes = graph.root.nodes;
				for (var i=0; i<nodes.length; i++) {
					var node = nodes[i];

					// Check if we have the correct node, the 360 graph
					// has this node generating the texture
					if (node.plugin === 'url_texture_generator') {
						node.state.url = imageUrl;
						urlReplaced = true;
					}
				}

				// Found the url, generate the graph data and upload
				if (urlReplaced === true) {
					var name = 'n/a'
					var data = {
						'path': name,
						'graph': JSON.stringify(graph)
					};

					that.uploadGraph(data, function(asset) {
						updateProgressBar(55)
						dfd.resolve(asset, data)
					});
				}
			},

			error: function(err) {
				var errMsg = err.responseJSON ? err.responseJSON.message : err.status;
				dfd.reject('Could not load data', errMsg)
			}
		})

		return dfd.promise
	}

	this.beforeUpload = function() {
		E2.app.player.pause()
		window.Vizor.disableHeaderClick = true
		$body.removeClass('firsttime')
	}

	this.beforeGraphPublish = function() {
		window.Vizor.disableHeaderClick = false
	}

	this.beforePlay = function() {
		playerUI.selectStage('stage')
	}


	// STEP 1
	this.uploadFile = function(file, modelName) {
		this.beforeUpload()
		var dfd = when.defer()

		var fnl = file.name.toLowerCase()
		var extname = fnl.substring(fnl.lastIndexOf('.'))

		var formData = new FormData();
		formData.append('filename', file.name);
		formData.append('file', file);

		var fakeMin = 30
		var fakeMax = 50
		var fakeInc = (fakeMax - fakeMin) / 1000
		var fakeInterval = 1000/60

		function fakeProgressBar() {
			var currVal = $progress.val()
			if (currVal < fakeMax) {
				updateProgressBar(currVal + fakeInc)
				setTimeout(fakeProgressBar, fakeInterval)
			}
		}
		
		$.ajax({
			url: '/uploadAnonymous/' + modelName,
			type: 'POST',
			data: formData,
			cache: false,
			contentType: false,
			processData: false,
			dataType: 'json',

			xhr: function() {
				var xhr = $.ajaxSettings.xhr()
					xhr.upload.addEventListener('loadstart', function(evt) {
						clearBodyClass()
						$body.addClass('uploading')
						console.log("load started");
					}, false);

					xhr.upload.addEventListener('progress', function(evt) {
						if (evt.lengthComputable) {
							// Limit this to fakeMin, we continue with the player core progress
							// from there
							var percent = Math.floor(evt.loaded/evt.total * 100) * (fakeMin / 100)
							updateProgressBar(percent)

							// we've gone over 100 already on the upload, start the fake progress
							if (percent >= fakeMin) {
								setTimeout(fakeProgressBar, fakeInterval)
							}
						}
					}, false);

					xhr.upload.addEventListener('load', function(evt) {
						console.log("load finished");
						updateProgressBar(50);
					}, false);

				return xhr;
			},

			success: function(uploadedFile) {
				dfd.resolve(uploadedFile)
			},

			error: function(err) {
				var errMsg = err.responseJSON ? err.responseJSON.message : err.status
				dfd.reject('Could not upload file', errMsg)
			}
		})
		
		return dfd.promise
	}




	this.fileUploadErrorWrongType = function() {
		err("File type does not match", "Accepted file types are .jpg and .jpeg")
		return false
	}


	this.fileSelectHandler = function(e) {
		e.stopPropagation();
		e.preventDefault();

		console.log("fileSelectHandler");

		// Either read from the dataTransfer (when drag and dropped)
		// or from the target.files (when file browsed)

		console.log(e)

		var file_path = (e.dataTransfer) ? e.dataTransfer.files : e.target.files
		if (! file_path && (file_path.length>0)) return
		file_path = file_path[0]

		console.log(file_path)

		if (file_path && file_path.type.match('image.*') === null) {
			cancelledUploading()
			return that.fileUploadErrorWrongType()
		}


		that
			.uploadFile(file_path, "image")
			.then(function(uploadedFile) {
				if (uploadedFile) {
					that.beforeGraphPublish()
					// Get the scaled version of the original image
					var imageUrl = uploadedFile.scaled.url;
					return that.publishTemplateWithUrl(imageUrl);
				}
				else {
					return when.reject()
				}
			})
			.then(that.loadGraphAndPlay)
			.catch(err)


		return false
	}

	this.dragEnterHandler = function(e) {

		$body.addClass('dragentered')

		console.log('360 dragenter', e.target)
		playerUI.headerFadeOut(100)

		e.stopPropagation();
		e.preventDefault();

		lastDragTarget = e.target;
		return false;
	}

	this.dragLeaveHandler = function(e) {
		console.log('360 dragleave', e.target)

		e.stopPropagation();
		e.preventDefault();
		if(e.target === lastDragTarget) {
			$body.removeClass('dragentered')
		}
		return false;
	}

	this.attach = function () {
		var fileSelectHandler = that.fileSelectHandler
		var dragEnterHandler = that.dragEnterHandler
		var dragLeaveHandler = that.dragLeaveHandler

		// File drop handler
		var drop_zone = document.getElementById('drop-zone');
		drop_zone.addEventListener("drop", fileSelectHandler);

		// Needs to be defined also for the 'drop' event handler to work
		drop_zone.addEventListener("dragover", function(evt) {
			evt.stopPropagation();
			evt.preventDefault();
		});

		// File input picker
		var file_input = document.getElementById('threesixty-image-input');
		file_input.addEventListener("change", fileSelectHandler);

		// Show the overlay
		window.addEventListener("dragenter", dragEnterHandler);

		// Hide the overlay
		window.addEventListener("dragleave", dragLeaveHandler);

		console.log('360 attached')


	}

	this.addUploadButton = function() {
		var svg = document.createElement('svg'),
			span = document.createElement('span'),
			button = document.createElement('button')

		button.appendChild(svg)
		button.appendChild(span)
		button.dataset.svgref = 'vr360-upload-image'
		button.className = 'svg'
		span.innerText = 'Upload'

		var controlsDiv = document.getElementById('topbar').getElementsByTagName('div')[0]
		controlsDiv.appendChild(button)

		var handler = function(e) {
			e.preventDefault()
			$('#threesixty-image-input').focus().trigger('click')
			return false
		}
		button.addEventListener('click', handler)

		VizorUI.replaceSVGButtons($(controlsDiv))
	}


	this.addCancelButton = function() {
		// <button class="round-transparent" id="btn-cancel" type="button">Cancel</button>
		var ls = document.getElementById('loadingStage')
		if (!ls) return

		var b = document.createElement('button')
		b.id = 'btn-cancel'
		b.className = 'round-transparent'
		b.innerHTML = 'Cancel'
		ls.appendChild(b)
	}

	this.init = function() {
		// scoped above
		playerUI.headerDefaultFadeoutTimeMs = 3500

		var $header = $('header')
		var $container360 = $('#container360')
		$container360.remove()
		$header.append($container360)

		$body = $('body')
		$progress = $('#progressbar')

		$body.addClass('firsttime')

		that.addUploadButton()
		that.addCancelButton()
		that.attach()

		window.Vizor = {
			hideVRbutton : true,
			autoplay: true
		}
		
		window.Vizor.onProgress = function(pct) {
			var factor = 100 / (100 - that.minProgress)
			var ret = that.minProgress + pct / factor;
			console.log('relative progress ' + pct + ' = ' + ret)
			playerUI.onProgress(ret)
		}

		window.onpopstate = function(event) {
			if (event.state && event.state.initial) 
				window.location = window.location
		}

		history.replaceState({
			initial: true
		}, null)

		playerUI.data.shareURL = null
		playerUI.headerDisableAutoFadeout()
	}
}

jQuery('document').ready(vizor360.init)
