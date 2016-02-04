// -> create -> (reset: -> detach) -> select -> init -> render -> attach -> done

var UIObjectProperties = function UIObjectProperties(domElement) {

	// mesh slots found within this list will trigger update of entire panel
	this.slotsThatTriggerUpdate = ['lock transform']

	UIAbstractProperties.apply(this, arguments)

	this.template = E2.views.partials.editor.objectProperties

	domElement = domElement || document.getElementById('obj3dPropertiesPane')

	this.dom = {	// elements
		container: $(domElement),
		position: {},
		rotation: {},
		scale: {},
		scaleLinked : {}
	}

	this.controls = {}

	// the world editor does not emit its own events
	E2.ui.on('worldEditor:selectionSet', this.onObjectPicked.bind(this))

	this.emit('created')
	this.render()
}

UIObjectProperties.prototype = Object.create(UIAbstractProperties.prototype)
UIObjectProperties.prototype.constructor = UIObjectProperties


UIObjectProperties.prototype.getAdapter = function() {
	var that = this
	var rad2deg = 180 / 3.14159265358

	// threeObject3Dplugin
	var meshPlugin = this.selectedEditorObjectMeshPlugin

	var adapter = {
		selectedIsCamera: that.selectedIsCamera,
		scale: {
			eventName: 'pluginStateChanged',
			dt: E2.core.datatypes.VECTOR,
			label: 'Scale',
			linked : true,
			get canEdit() {
				return meshPlugin && meshPlugin.canEditScale && meshPlugin.canEditScale()
			},
			get value() {
				if (that.selectedIsCamera) return {x:1.0, y:1.0, z:1.0}
				var s = meshPlugin.state
				return (s) ? s.scale : null
			},
			set value(v) {
				meshPlugin.transientSetState('scale', v)
				return v
			},

		},
		position: {
			eventName: 'pluginStateChanged',
			dt: E2.core.datatypes.VECTOR,
			label: 'Position',
			linked : false,
			get canEdit() {
				return meshPlugin && meshPlugin.canEditPosition && meshPlugin.canEditPosition()
			},
			get value() {
				var s = meshPlugin.state
				return (s) ? s.position : null
			},
			set value(v) {
				meshPlugin.transientSetState('position', v)
				return v
			}
		},
		rotation: {	// internally wired to return xyz degree vector (for UI)
			eventName: 'pluginStateChanged',
			dt: E2.core.datatypes.VECTOR,
			label: 'Rotation',
			linked : false,
			get canEdit() {
				return meshPlugin && meshPlugin.canEditQuaternion && meshPlugin.canEditQuaternion()
			},
			get _value() {
				var s = meshPlugin.state
				if (!s) return null
				return new THREE.Quaternion(s.quaternion._x, s.quaternion._y, s.quaternion._z, s.quaternion._w)
			},
			set _value(q) {
				meshPlugin.transientSetState('quaternion', q)
			},
			get value() {
				return this.makeVec3(this._value)
			},
			set value(v) {
				this._value = this.makeQuaternion(v)
				return v
			},
			makeQuaternion : function(vec3) {	// take vec3, return quaternion
				return new THREE.Quaternion().setFromEuler(
					new THREE.Euler(vec3.x / rad2deg , vec3.y / rad2deg , vec3.z / rad2deg, "YZX"))
			},
			makeVec3 : function(quaternion) {	// t
				var vec3 = new THREE.Euler().setFromQuaternion(quaternion, "YZX").toVector3()
				vec3.x = vec3.x * rad2deg
				vec3.y = vec3.y * rad2deg
				vec3.z = vec3.z * rad2deg
				return vec3
			}
		},
		get quaternion() {
			return this.rotation
		},
		common : {
			get enabled() {
				return that.isValidObjectSelection
			}
		}
	}

	if (meshPlugin && !this.selectedIsCamera) {
		adapter.meshProps = meshPlugin.parentNode.getInspectorSlotProps(['castShadow', 'receiveShadow', 'lock transform'])
	} else {
		adapter.meshProps = null
	}

	return adapter
}

UIObjectProperties.prototype.render = function() {
	return UIAbstractProperties.prototype.render.call(this, arguments)
}

UIObjectProperties.prototype.onObjectPicked = function() {
	var o = E2.app.worldEditor.getSelectedObjectPlugin()
	if (o)
		this.selected = [o]
	else
		this.selected = []
	this.render()
}

UIObjectProperties.prototype.onAttach = function() {
	var that = this

	if (!this.isValidObjectSelection) {
		this.dom.container.toggleClass('noSelection', true)
		return
	}
	this.dom.container.toggleClass('noSelection', false)

	this.dom.position.reset = document.getElementById('propertiesResetPosition')
	this.dom.scale.reset = document.getElementById('propertiesResetScale')
	this.dom.scale.linked = document.getElementById('propertiesLinkScale')
	this.dom.rotation.reset = document.getElementById('propertiesResetRotation')

	this.controls.scaleLinked = new UIToggleButton(this.adapter.scale, 'linked', this.dom.scale.linked)

	var plugin = this.selectedEditorObjectMeshPlugin

	if (plugin) {
		this.watchConnectionUpdates(plugin.parentNode)
	}
	// writing to the adapter .value results in a transientSetState, effectively an onChange
	// the endchange listener commits the new state via undoManager
	var addListeners = function(control, propName, makeValue) {
		var el = control.element
		var endchange = function(e){
			if (e.detail) {
				var newValue = (makeValue) ? makeValue(e.detail.value) : e.detail.value
				var oldSourceValue = (makeValue) ? makeValue(e.detail.oldValue) : e.detail.oldValue
				if (!control.isEqualValue(e.detail.value, e.detail.oldValue))
					plugin.undoableSetState(propName, newValue, oldSourceValue)
			}
		}
		el.addEventListener('endchange', endchange)
		that.detachQueue.push(function(){
			el.removeEventListener('endchange', endchange)
		})
	}

	// the reset handler will set prop to whatever getResetValue() returns.
	// getResetValue is optional
	var makeResetHandler = function(prop, getResetValue) {
		if (!prop) {
			console.error('no property name for reset button')
			return null
		}
		getResetValue = getResetValue || function(){return {x:0,y:0,z:0}}
		return function(e) {		// normal dom event
			e.preventDefault()
			e.stopPropagation()
			if (!that.adapter[prop].canEdit) return
			var s = plugin.state
			if (!s) return
			var undo = _.cloneDeep(s[prop])
			var rv = getResetValue(s[prop])
			plugin.undoableSetState(prop, rv, undo)
			return false
		}
	}

	if (this.controls.position) {
		addListeners(this.controls.position.control, 'position')
		$(this.dom.position.reset).on('click.uiProperties',
			makeResetHandler('position', function(){
				if (!that.selectedIsCamera)
					return {x:0.0, y:2.0, z:0.0}
				else
					return {x:0.0, y:0.8, z:2.0}
			})
		)
	}

	if (this.controls.scale) {
		addListeners(this.controls.scale.control, 'scale')
		$(this.dom.scale.reset).on('click.uiProperties',
			makeResetHandler('scale', function(){
				return {x: 1.0, y:1.0, z:1.0}
			})
		)
	}

	if (this.controls.rotation) {
		addListeners(this.controls.rotation.control, 'quaternion', this.adapter.rotation.makeQuaternion)
		$(this.dom.rotation.reset).on('click.uiProperties',
			makeResetHandler('quaternion', function(){
				return that.adapter.rotation.makeQuaternion({x:0.0,y:0.0,z:0.0})
			})
		)
	}

	this.update()
}


UIObjectProperties.prototype.onDetach = function() {

	var updateControls = function(controlProps, adapterProps) {
		Object.keys(controlProps).forEach(function (key) {
			var control = controlProps[key].control
			control.onSourceChange()
			if (adapterProps[key].canEdit)
				control.enable()
			else
				control.disable()
		})
	}

	// manage our own proxy controls

	if (this.controls.scaleLinked) {
		this.controls.scaleLinked.destroy()
		this.controls.scaleLinked = null
	}

	if (this.controls.position) {
		this.controls.position.control.destroy()
		this.controls.position.control = null
	}

	if (this.controls.scale) {
		this.controls.scale.control.destroy()
		this.controls.scale.control = null
	}

	if (this.controls.rotation) {
		this.controls.rotation.control.destroy()
		this.controls.rotation.control = null
	}

	if (this.controls.meshProps)
		updateControls(this.controls.meshProps, this.adapter.stateProps)

	// one-shot buttons (e.g. reset) are wired directly via .uiProperties events
	// such listeners will be detached by the abstract base

}

UIObjectProperties.prototype.getControls = function() {

	var that = this,
		adapter = this.adapter,
		controls = {}

	var meshPlugin = this.selectedEditorObjectMeshPlugin		// obj3d/mesh plugin

	function make3dProp(propName, opts) {
		var meshNode = meshPlugin.parentNode
		var c = that._makeControl(meshNode, adapter, propName, function(e){
			// this = c (the control)
			if (!(e && e.detail)) return

			var value 			= e.detail.value,
				previousValue 	= e.detail.previousValue,
				xyz 			= e.detail.part

			var linked = adapter[propName].linked

			if (linked) {
				// the value has been changed already but if the controls are linked the other parts need changing too
				// we use the opportunity to modify the uiValue before sourceValue is set to it

				var v = value[xyz]
				var ov = previousValue[xyz]
				var dv = v - ov
				if (xyz !== 'x') {
					// avoid zero scale when linked
					value.x += dv * value.x / ( ov === 0 ? 1 : ov)
				}
				if (xyz !== 'y') {
					value.y += dv * value.y / ( ov === 0 ? 1 : ov)
				}
				if (xyz !== 'z') {
					value.z += dv * value.z / ( ov === 0 ? 1 : ov)
				}
				if ( ! value.x) value.x = 0.0001
				if ( ! value.y) value.y = 0.0001
				if ( ! value.z) value.z = 0.0001

				this.adapter.uiValue = value
			}
		}, opts)

		if (!adapter[propName].canEdit) c.disable()

		return {
			control:c,
			dtName: c.dt.name,
			label: 	c.label
		}
	}

	if (meshPlugin) {
		controls.position = make3dProp('position')
		controls.rotation = make3dProp('quaternion', {
			min: -36000.0,
			max: 36000.0,
			size: 72000	// 1px per deg
		})

		if (!this.selectedIsCamera) {

			controls.scale = make3dProp('scale')

			controls.meshProps = {}

			var meshProps = adapter.meshProps
			var meshNode = meshPlugin.parentNode
			var makeControl = this._makeControl

			Object.keys(meshProps).forEach(function (key) {
				that.uifySlotProxy(meshNode, key, meshProps[key])
				var c = makeControl(meshNode, meshProps, key)
				if (!c) {
					console.error('could not make control for ' + key)
					return
				}
				that.detachQueue.push(c.destroy.bind(c))

				if (that.slotsThatTriggerUpdate.indexOf(key) !== -1) {
					c._onSourceChange = c.onSourceChange
					c.onSourceChange = function(){
						c._onSourceChange.call(this, arguments)
						that.queueUpdate()
					}
				}

				controls.meshProps[key] = {
					dtName: c.dt.name,
					label: c.label,
					control: c
				}

			})
		}
	}

	return controls
}


UIObjectProperties.prototype.update = function() {	// soft updates the template already in place

	var that = this, adapter = this.adapter

	var canUpdate = this.isValidNodeSelection || this.isValidObjectSelection
	if (!canUpdate)
		return

	if (this.isValidObjectSelection) {
		;
		['position', 'rotation', 'scale'].forEach(function (propName) {
			var prop = that.controls[propName]
			if (!prop) return
			prop.control.onEnabledChange(that.adapter[propName].canEdit)
		})
	}

	// these only exist as dom elements
	var pos = this.dom.position, rot = this.dom.rotation, scl = this.dom.scale
	if (pos && pos.reset) {
		pos.reset.disabled = this.isValidObjectSelection && !adapter.position.canEdit
	}
	if (scl && scl.reset) {
		scl.reset.disabled = this.isValidObjectSelection && !adapter.scale.canEdit
		scl.linked.disabled = this.isValidObjectSelection && !adapter.scale.canEdit
	}
	if (rot && rot.reset) {
		rot.reset.disabled = this.isValidObjectSelection && !adapter.rotation.canEdit
	}

}

