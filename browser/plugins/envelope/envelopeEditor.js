(function() {

function EnvelopeEditor() {
	EventEmitter.call(this)

	this._data = [ [0, 0.5], [1, 0.5] ]
	this._width = 300
	this._height = 150

	this._id = Math.floor(Math.random() * 10000)

	this._dataToPoints()
}

EnvelopeEditor.prototype = Object.create(EventEmitter.prototype)

EnvelopeEditor.prototype._dataToPoints = function() {
	this._points = this._data.map(function(point) {
		return [
			Math.floor(point[0] * this._width),
			this._height - Math.floor(point[1] * this._height)
		]
	}.bind(this))
}

EnvelopeEditor.prototype._pointsToData = function() {
	this._data = this._points.map(function(point) {
		return [
			point[0] / this._width,
			(this._height - point[1]) / this._height
		]
	}.bind(this))
}

EnvelopeEditor.prototype.data = function(d) {
	this._data = d
	this._dataToPoints()
	return this
}

EnvelopeEditor.prototype.onChanged = function() {
	this._pointsToData()
	this.emit('changed', this._data)
}

EnvelopeEditor.prototype.destroy = function() {
	this._$el.empty().remove()
}

EnvelopeEditor.prototype.render = function($out) {
	var that = this
	var width = this._width, height = this._height
	var dragged = null
	var deleting = false

	this._$el = $out

	var line = d3.svg.line()

	var svg = d3.select($out[0]).append('svg')
		.attr('width', width)
		.attr('height', height)
		.attr('tabindex', 1)

	svg.append('rect')
		.attr('width', width)
		.attr('height', height)
		.on('mousedown', svgMouseDown)

	var $path = svg.append('path')

	function redraw() {
		$path
			.datum(that._points)
			.attr('class', 'line')

		if (svg.node().focus)
			svg.node().focus()

		svg.select('path').attr('d', line)

		var circle = svg.selectAll('circle')
		.data(that._points, function(d) {
			return d
		})

		circle.enter().append('circle')
		.attr('r', 1e-6)
		.on('mousedown', function(d) {
			trackMouseMovement()
			dragged = d
			deleting = true
			redraw()
		})
		.transition()
		.duration(750)
		.ease('elastic')
		.attr('r', 6.5)

		circle
		.attr('cx', function(d) { return d[0] })
		.attr('cy', function(d) { return d[1] })

		circle.exit().remove()

		if (d3.event) {
			d3.event.preventDefault()
			d3.event.stopPropagation()
		}
	}

	function trackMouseMovement() {
		d3.select(window)
			.on('mousemove.'+that._id, mousemove)
			.on('mouseup.'+that._id, mouseup)
	}

	function svgMouseDown() {
		trackMouseMovement()
		var x = d3.mouse(svg.node())[0]
		var prevCircle

		that._points.forEach(function(cxy, i) {
			if (cxy[0] < x)
				prevCircle = i
		})

		that._points.splice(prevCircle+1, 0, dragged = d3.mouse(svg.node()))

		redraw()
	}

	function allowed(direction) {
		var x = dragged[0]
		var ci = that._points.indexOf(dragged)
		var limit = 0

		if (ci === 0 || ci === (that._points.length- 1 ))
			return false

		if (direction > 0)
			limit = width

		if (that._points[ci + direction])
			limit = that._points[ci + direction][0]

		return (direction === 1 && x < limit) ||
			(direction === -1 && x > limit)
	}

	function sign(i) {
		return i > 0 ? 1 : - 1
	}

	function mousemove() {
		if (!dragged)
			return

		var m = d3.mouse(svg.node())

		deleting = false

		var direction = sign(m[0] - dragged[0])

		if (direction !== 0 && !allowed(direction))
			m[0] = dragged[0]

		dragged[0] = Math.max(0, Math.min(width, m[0]))
		dragged[1] = Math.max(0, Math.min(height, m[1]))

		redraw()
	}

	function mouseup() {
		d3.select(window)
			.on('mousemove.'+that._id, null)
			.on('mouseup.'+that._id, null)

		if (!dragged)
			return

		if (deleting) {
			that._points = that._points.filter(function(pt) {
				return pt[0] !== dragged[0] &&
					pt[1] !== dragged[1]
			})

			deleting = false
		}

		that.onChanged()

		dragged = null
	}

	this.redraw = redraw

	redraw()

	return this
}

E2.EnvelopeEditor = EnvelopeEditor

if (typeof(module) !== 'undefined')
	module.exports = EnvelopeEditor

})()
