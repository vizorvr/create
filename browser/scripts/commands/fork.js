(function() {

function getForkName(path) {
	var p = path.split('-').join('/').split('/')
	var name = p[0]
	
	if (p.length > 1)
		name = p[0] + '-' + p[1]

	name = name + '-' + E2.uid()

	return name;
}


function ForkCommand() {}

ForkCommand.prototype.fork = function() {
	var oldPlayerState = E2.app.player.current_state

	E2.app.player.stop()

	// dispatch the old graph as a snapshot in the log
	E2.app.channel.snapshot()

	var oldName = E2.app.path
	var forkName = getForkName(E2.app.path)

	history.pushState({}, null, '/' + forkName)
	E2.app.path = forkName

	return E2.app.setupEditorChannel()
		.then(function() {
			E2.track({
				event: 'forked',
				fromName: oldName,
				forkName: forkName 
			})

			if (oldPlayerState === E2.app.player.state.PLAYING)
				E2.app.player.play()
		})
}

if (typeof(exports) !== 'undefined')
	exports.ForkCommand = ForkCommand
else
	window.ForkCommand = ForkCommand

})();

