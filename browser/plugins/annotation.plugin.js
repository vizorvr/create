(function(){

var Annotation = E2.plugins.annotation = function() {
	Plugin.apply(this, arguments)
	this.desc = 'Add textual hints to the graph.'
	
	this.input_slots = []
	
	this.output_slots = []
	
	this.state = { text: '', width: 0, height: 0 }
}

Annotation.prototype = Object.create(Plugin.prototype)

Annotation.prototype.create_ui = function() {
	var that = this
	var inp = $('<textarea placeholder="Type text here" />')
	inp.css({
		'resize': true
	})
	
	inp.on('change', function() {
		that.undoableSetState('text', inp.val(), that.state.text)
	})
	
	// Chrome doesn't handle resize properly for anything but the window object,
	// so we store the potentially altered size of the textarea on mouseup.
	inp.mouseup(function() {
		var ta = $(this)

		that.state.width = ta.width()
		that.state.height = ta.height()
	})

	this.node.on('pluginStateChanged', this.updateUi.bind(this))
	
	this.ui = inp

	return this.ui
}

Annotation.prototype.state_changed = function() {
	this.updateUi()
}

Annotation.prototype.updateUi = function() {
	if (!this.ui)
		return

	var s = this.state
	
	if(!s.text)
		return

	this.ui.val(s.text)
		
	if(s.width > 0)
		this.ui.css('width', s.width)
		
	if(s.height > 0)
		this.ui.css('height', s.height)
}

})()
