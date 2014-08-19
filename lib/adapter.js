/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 */

( function( window, bender ) {

	'use strict';

	window.YUI( {
		useBrowserConsole: false,
		debug: false
	} ).use( 'test', function( Y ) {
		var runner = Y.Test.Runner;

		// remove elements and styles added by YUI3
		function cleanUp() {
			var trash = document.getElementById( 'yui3-css-stamp' ),
				doc = document.documentElement;

			if ( trash ) {
				trash.parentElement.removeChild( trash );
			}

			doc.className = doc.className.replace( 'yui3-js-enabled', '' );
		}

		// build a readable error message
		function getMessage( error ) {
			return error.message +
				'\nExpected: ' + error.expected + ' (' + typeof error.expected + ')' +
				'\nActual:   ' + error.actual + ' (' + typeof error.actual + ')';
		}

		function handleResult( event ) {
			var data = {
				module: event.testCase.name || bender.testData.id,
				name: event.testName,
				fullName: ( event.testCase.name || bender.testData.id ) + ' - ' + event.testName,
				success: true,
				error: null
			};

			if ( event.type === runner.TEST_FAIL_EVENT ) {
				data.success = false;
				data.error = getMessage( event.error );
			}

			if ( event.type === runner.TEST_IGNORE_EVENT ) {
				data.ignored = true;
				data.name = data.name.indexOf( 'ignore:' ) === 0 ? data.name.slice( 7 ) : data.name;
			}

			bender.result( data );
		}

		function handleRegressions( tc ) {
			var condition,
				name;

			for ( name in tc ) {
				if ( typeof tc[ name ] == 'function' &&
					( name.indexOf( 'test' ) === 0 || name.indexOf( ' ' ) > -1 ) &&
					( condition = bender.regressions[ bender.testData.id + '#' + name ] ) &&
					eval( condition ) ) {
					if ( !tc._should ) {
						tc._should = {};
					}

					if ( !tc._should.ignore ) {
						tc._should.ignore = {};
					}

					tc._should.ignore[ name ] = true;
				}
			}
		}

		function handleSingleTest( tc ) {
			var id = decodeURIComponent( window.location.hash.substr( 1 ) ),
				name;

			id = id.replace( bender.testData.id + ' - ', '' );

			if ( tc.name ) {
				id = id.replace( bender.testData.name + ' - ', '' );
			}

			if ( !tc[ id ] ) {
				return;
			}

			for ( name in tc ) {
				if ( name !== id &&
					( name.indexOf( 'test' ) === 0 || name.indexOf( ' ' ) > -1 ) ) {
					delete tc[ name ];
				}
			}
		}

		function test( tests ) {
			if ( bender.regressions ) {
				handleRegressions( tests );
			}

			if ( window.location.hash ) {
				handleSingleTest( tests );
			}

			bender.testCase = new Y.Test.Case( tests );

			runner.add( bender.testCase );
			runner.run();
		}

		function start() {
			runner.subscribe( runner.TEST_FAIL_EVENT, handleResult );
			runner.subscribe( runner.TEST_PASS_EVENT, handleResult );
			runner.subscribe( runner.TEST_IGNORE_EVENT, handleResult );

			runner.subscribe( runner.ERROR_EVENT, function( event ) {
				bender.error( event );
			} );

			runner.subscribe( runner.COMPLETE_EVENT, function( event ) {
				event.results.coverage = window.__coverage__;
				bender.next( event.results );
			} );
		}

		function stopRunner() {
			bender.runner.clear();
			bender.runner._cur = null;
		}

		cleanUp();

		bender.Y = Y;
		bender.assert = Y.Assert;
		bender.arrayAssert = Y.ArrayAssert;
		bender.objectAssert = Y.ObjectAssert;
		bender.runner = runner;
		bender.runner._ignoreEmpty = false;

		bender.start = start;
		bender.test = test;
		bender.stopRunner = stopRunner;

	} );

} )( window, bender );
