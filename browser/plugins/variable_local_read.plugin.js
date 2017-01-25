(function() {
var VariableLocalRead = E2.plugins.variable_local_read = function(core, node) {
	this.desc = 'Read from a local variable using the name of the node.'
	
	this.input_slots = []
	this.output_slots = []
	
	this.core = core
	this.node = node
	this.data = null
	
	if (!node.title)
		this.old_title = node.title = 'Variable ' + (node.parent_graph.variables.count() + 1)
	else
		this.old_title = node.title
}

VariableLocalRead.prototype.reset = function() {
	this.updated = true
}

VariableLocalRead.prototype.destroy = function() {
	this.variables.unlock(this, this.node.title)
}

VariableLocalRead.prototype.renamed = function() {
	this.variables.unlock(this, this.old_title)
	this.target_reg(this.node.title)
}

VariableLocalRead.prototype.variable_dt_changed = function(dt, arrayness) {
	this.dt = dt
	this.node.change_slot_datatype(E2.slot_type.output, this.slotId, dt, arrayness)
}

VariableLocalRead.prototype.variable_updated = function(value) {
	this.updated = true
	this.node.queued_update = 1 // Update next frame too...
	this.data = value
}

VariableLocalRead.prototype.connection_changed = function(on, conn) {
	this.variables.connection_changed(this.node.title, on)
	
	if (this.dt.id === E2.dt.ANY.id)
		this.variables.set_datatype(this.node.title, conn.dst_slot.dt, conn.dst_slot.array)
}

VariableLocalRead.prototype.update_output = function() {
	return this.data
}

VariableLocalRead.prototype.target_reg = function(id) {
	this.variables.lock(this, id, this.node.outputs.length)
	
	var r = this.variables.variables[id]

	this.dt = r.dt

	if (r.dt.id !== E2.dt.ANY.id) {
		this.variable_dt_changed(r.dt, r.array)
		this.data = this.variables.variables[id].value
	}
}

VariableLocalRead.prototype.state_changed = function(ui) {
	if (!ui) {
		var outputs = this.node.getDynamicOutputSlots()
		this.variables = this.node.parent_graph.variables

		if (!outputs.length) {
			this.node.add_slot(E2.slot_type.output, {
				name: 'value',
				dt: this.core.datatypes.ANY,
				desc: ''
			})
	
			outputs = this.node.getDynamicOutputSlots()
		}

		this.dt = outputs[0].dt
		this.slotId = outputs[0].uid
		this.target_reg(this.node.title)
	
		if (this.dt.id !== E2.dt.ANY.id)
			this.variables.set_datatype(this.node.title, this.dt, outputs[0].array)
	}
}

})()