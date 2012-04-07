E2.plugins["colored_quad_emitter"] = function(core, node) {
	var self = this;
	var gl = core.renderer.context;
	
	this.input_slots = [ 
		{ name: 'shader', dt: core.datatypes.SHADER }
	];
	
	this.output_slots = [];
	this.vertices = null;
	

	self.vertices = gl.createBuffer();

	gl.bindBuffer(gl.ARRAY_BUFFER, self.vertices);

	var v_data = [
		 1.0,  1.0,  0.0,
		-1.0,  1.0,  0.0,
		 1.0, -1.0,  0.0,
		-1.0, -1.0,  0.0
       	];

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v_data), gl.STATIC_DRAW);

	this.reset = function()
	{
		self.shader = null;
	};
	
	this.connection_changed = function(on, conn, slot)
	{
		if(!on)
			self.shader = null;
	};
	
	this.update_input = function(slot, data)
	{
		self.shader = data;
	};

	this.update_state = function(delta_t)
	{
        	var s = self.shader;
        	
        	if(s !== null)
        	{
        		s.enable();
			s.bind_array(VertexBuffer.vertex_type.VERTEX, self.vertices, 3); 
               		s.apply_uniforms();
	        	
	        	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	        }
	};
};
