/**
 * GET /threesixty
 * Threesixty site
 */
exports.index = function(req, res) {
	// get show frontpage graph URL
	res.render('graph/show', {
		layout: 'threesixty',
		graphSrc: '/threesixty/featured',
		graphMinUrl: '/threesixty/featured',
		autoplay: true,
		hideEditButton: false,
		hideShareButton: false,
		hidePlayButton: true,
		meta : {
			bodyclass : 'bThreesixty b360'
		},
		noHeader: false,
		graph: {
			hasAudio: false
		},
		startMode : 1
	});
}

exports.featured = function(req,res) {
	var featuredGraph = '/data/graph/eesn/flamingofront.json'
	switch (process.env.FQDN) {
		case '360.vizor.io':
		case 'rc.vizor.io':
		case 'vizor.io':
		case '360vr.io':
			featuredGraph = '/data/graph/v/hrpfbjje86s5.json'
			break;
	}
	res.redirect(featuredGraph)
}