/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 */

var path = require( 'path' );

module.exports = {
	name: 'bender-assertion-yui',
	files: [
		// path.resolve( __dirname, '../vendor/yui-3.16.0-test.debug.js' ),
		path.resolve( __dirname, '../vendor/yui-3.16.0-test.min.js' ),
		path.join( __dirname, '/adapter.js' )
	]
};
