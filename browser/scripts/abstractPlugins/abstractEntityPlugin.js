(function() {

function AbstractEntityPlugin() {
	AbstractGraphPlugin.apply(this, arguments)
}

AbstractEntityPlugin.prototype = Object.create(AbstractGraphPlugin.prototype)

AbstractEntityPlugin.prototype.getObjectNode = function() {
	return this.graph.findNodeByPlugin('three_mesh')
}

AbstractEntityPlugin.prototype.getObject3D = function() {
	var meshNode = this.getObjectNode()

	if (!meshNode)
		return

	return meshNode.plugin.getObject3D()
}

window.AbstractEntityPlugin = AbstractEntityPlugin

if (typeof(module) !== 'undefined')
	module.exports = AbstractEntityPlugin

})()
