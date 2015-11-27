(function() {
	var ThreeVRCameraPlugin = E2.plugins.three_vr_camera = function(core) {
		Plugin.apply(this, arguments)

		this.desc = 'THREE.js VR Camera'
		
		this.defaultFOV = 90

		// try to find out default fov from the device
		if (window.HMDVRDevice && window.HMDVRDevice.getEyeParameters) {
			var eyeParams = window.HMDVRDevice.getEyeParameters()

			if (eyeParams.recommendedFieldOfView) {
				this.defaultFOV = eyeParams.recommendedFieldOfView
			}
			else if (eyeParams.leftDegrees && eyeParams.rightDegrees) {
				this.defaultFOV = eyeParams.leftDegrees + eyeParams.rightDegrees
			}
		}

		this.input_slots = [
			{ name: 'position', dt: core.datatypes.VECTOR },
			{ name: 'rotation', dt: core.datatypes.VECTOR },
			{ name: 'fov', dt: core.datatypes.FLOAT, def: this.defaultFOV },
			{ name: 'aspectRatio', dt: core.datatypes.FLOAT, def: 1.0},
			{ name: 'near', dt: core.datatypes.FLOAT, def: 0.001 },
			{ name: 'far', dt: core.datatypes.FLOAT, def: 1000.0 }
		]

		this.output_slots = [
			{name: 'camera',	dt: core.datatypes.CAMERA},
			{name: 'position',	dt: core.datatypes.VECTOR},
			{name: 'rotation',	dt: core.datatypes.VECTOR}
		]

		this.always_update = true
		this.dirty = false

		this.state = {
			position: {x: 0, y: 0, z:0},

			// names with underscores have to match with THREE.Quaternion
			// member variable names because of to/from json serialisation
			quaternion: {_x: 0, _y: 0, _z:0, _w:1}
		}

		this.rotationFromGraph = new THREE.Euler()
		this.positionFromGraph = new THREE.Vector3()

		this.perspectiveCameraRotationEuler = new THREE.Euler()
	}

	ThreeVRCameraPlugin.prototype = Object.create(Plugin.prototype)

	ThreeVRCameraPlugin.prototype.reset = function() {
		Plugin.prototype.reset.apply(this, arguments)

		this.domElement = E2.dom.webgl_canvas[0]

		if (!this.perspectiveCamera) {
			this.perspectiveCamera = new THREE.PerspectiveCamera(
					this.defaultFOV,
					this.domElement.clientWidth / this.domElement.clientHeight,
					0.001,
					1000)

			this.perspectiveCamera.channels.enable(1)
		}

		// create a object3d reference so that the world editor sees the camera
		// as an object3d
		this.object3d = this.perspectiveCamera

		this.perspectiveCamera.backReference = this

		if (!this.controls) {
			this.controls = new THREE.VRControls(this.perspectiveCamera)
		}

		this.perspectiveCamera.position.set(this.state.position.x, this.state.position.y, this.state.position.z)
		this.perspectiveCamera.quaternion.set(this.state.quaternion._x, this.state.quaternion._y, this.state.quaternion._z, this.state.quaternion._w)
	}

	ThreeVRCameraPlugin.prototype.play = function() {
		this.resize()
	}

	ThreeVRCameraPlugin.prototype.resize = function() {
		var isFullscreen = !!(document.mozFullScreenElement || document.webkitFullscreenElement);
		var wh = { width: window.innerWidth, height: window.innerHeight }

		if (!isFullscreen) {
			wh.width = this.domElement.clientWidth
			wh.height = this.domElement.clientHeight

			if (typeof(E2.app.calculateCanvasArea) !== 'undefined')
				wh = E2.app.calculateCanvasArea()
		}

		this.perspectiveCamera.aspect = wh.width / wh.height
		this.perspectiveCamera.updateProjectionMatrix()
	}

	ThreeVRCameraPlugin.prototype.update_state = function() {
		this.perspectiveCamera.position.set(
			this.positionFromGraph.x + this.state.position.x,
			this.positionFromGraph.y + this.state.position.y,
			this.positionFromGraph.z + this.state.position.z)

		this.perspectiveCamera.quaternion.setFromEuler(this.rotationFromGraph)
		this.perspectiveCamera.quaternion.multiply(this.state.quaternion)

		if (this.dirty)
			this.perspectiveCamera.updateProjectionMatrix()

		this.perspectiveCamera.updateMatrixWorld()

		this.controls.update(this.perspectiveCamera.position.clone(), this.perspectiveCamera.quaternion.clone())

		this.updated = true
	}

	ThreeVRCameraPlugin.prototype.update_input = function(slot, data) {
		if (!this.perspectiveCamera) {
			return
		}

		switch(slot.index) {
		case 0: // position
			this.positionFromGraph.copy(data)
			this.dirty = true
			break
		case 1: // rotation
			this.rotationFromGraph.set(data.x, data.y, data.z)
			this.dirty = true
			break
		case 2: // fov
			this.perspectiveCamera.fov = data
			this.dirty = true
			break
		case 3: // aspect ratio
			this.perspectiveCamera.aspectRatio = data
			this.dirty = true
			break
		case 4: // near
			this.perspectiveCamera.near = data
			this.dirty = true
			break
		case 5: // far
			this.perspectiveCamera.far = data
			this.dirty = true
			break
		default:
			break
		}
	}

	ThreeVRCameraPlugin.prototype.update_output = function(slot) {
		if (slot.index === 0) { // camera
			return this.perspectiveCamera
		}
		else if (slot.index === 1) { // position
			return this.perspectiveCamera.position
		}
		else if (slot.index === 2) { // rotation
			this.perspectiveCameraRotationEuler.setFromQuaternion(this.perspectiveCamera.quaternion)
			return this.perspectiveCameraRotationEuler
		}
	}

	ThreeVRCameraPlugin.prototype.state_changed = function(ui) {
		if (!ui) {
			E2.core.on('resize', this.resize.bind(this))
		}
	}

})()

