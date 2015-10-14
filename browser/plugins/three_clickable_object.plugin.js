(function() {
	var ThreeClickableObject = E2.plugins.three_clickable_object = function(core) {
		this.desc = 'Clickable object. When gaze clicking on this object' +
		            '\'objectClicked\' events are sent. objectClicked events' +
		             'can be caught using the \'On Runtime Event\' plugin.'
		Plugin.apply(this, arguments)

		this.input_slots = [
			{name: 'object3d', dt: core.datatypes.OBJECT3D},
		]

		this.output_slots = [
			{name: 'object3d', dt: core.datatypes.OBJECT3D}
		]
	}

	ThreeClickableObject.prototype.reset = function() {
		this.meshDirty = false
	}

	ThreeClickableObject.prototype.update_input = function(slot, data) {
		switch(slot.index) {
		case 0: // object3d
			this.object3d = data
			this.meshDirty = true
			break
		default:
			break
		}
	}

	ThreeClickableObject.prototype.update_output = function(slot) {
		return this.object3d
	}

	ThreeClickableObject.prototype.on_click = function() {
		E2.core.runtimeEvents.emit('objectClicked', this)
	}

	ThreeClickableObject.prototype.update_state = function() {
		if (!this.meshDirty) {
			return
		}

		if (this.object3d && this.object3d.onClick === undefined) {
			var clickFun = this.on_click.bind(this.object3d)
			this.object3d.onClick = clickFun
		}

		this.meshDirty = false
	}
})()