/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
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

		// build a result object and send it to Bender
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

		// remove all the tests except the one that matches id in the location.hash
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

		// flag saying if the tests should start immediately after being added, this happens in situations where
		// the start() function is executed before adding any tests (e.g. asynchronous tests)
		var startImmediately = false,
			tests;

		// save tests to be executed when started
		function test( data ) {
			tests = data;

			if ( startImmediately ) {
				start();
			}
		}

		// takes declared tests and builds a proper tests suite using YUI classes and structures
		function buildSuite( tests ) {
			var suite, i, j,
				lvlOneCount = 0,
				lvlOneId = null,
				isTestCase = true,
				processedTests = {},
				// Those members are "special" - not tests functions or suites.
				specialMembers = {};

			for ( i in tests ) {
				if ( tests.hasOwnProperty( i ) ) {
					if ( !tests[ i ] || ( typeof tests[ i ] != 'object' || !tests[ i ].suite ) && typeof tests[ i ] != 'function' ) {
						specialMembers[ i ] = tests[ i ];
					}
				}
			}

			// First we pre-process tests. We are interested in tests that are placed next to test suites.
			// Those tests are encapsulated in artificial test suites created on-the-fly.
			// At the end of the loop we have a processedTests where all children are test suites.
			// This accomplishes two things: tests order is maintained and further processing is easier.
			for ( i in tests ) {
				if ( tests.hasOwnProperty( i ) ) {
					if ( i in specialMembers ) {
						continue;
					}

					// If a member is an object it means that it is a test suite.
					if ( typeof tests[ i ] == 'object' ) {

						// Close currently open artificial test suite.
						lvlOneId = null;
						// Store the information that the test suite contains other test suites.
						isTestCase = false;
						// Copy test suite to processedTests object.
						processedTests[ i ] = tests[ i ];

						// Propagate test name with parent names.
						var testName = tests[ i ].name || i;
						processedTests[ i ].name = tests.name + ' / ' + testName;

					} else if ( typeof tests[ i ] == 'function' ) {

						// If we are here it means that we are processing a test function.

						// If lvlOneId is not defined it means that we do not have an open artificial test suite.
						if ( !lvlOneId ) {
							// Create unique id.
							lvlOneId = '__lv_one_ts_' + lvlOneCount;
							lvlOneCount++;

							// Open new artificial test suite.
							processedTests[ lvlOneId ] = {};

							// Copy special members of this test suite into artificial test suite.
							for ( j in specialMembers ) {
								if ( specialMembers.hasOwnProperty( j ) ) {
									processedTests[ lvlOneId ][ j ] = specialMembers[ j ];
								}
							}
						}

						// Add this test function to the open artificial test suite.
						processedTests[ lvlOneId ][ i ] = tests[ i ];

					}
				}
			}

			if ( isTestCase ) {
				// This test suite is actually a test case when there were no other test suites in it.
				// If this is true, just create a test case.
				// Note that if we have a test case, all test functions are in the first artificial test suite.
				suite = new Y.Test.Case( processedTests[ lvlOneId ] );
			} else {
				// If we found test suites we need to store it in test suite.
				suite = new Y.Test.Suite(  );

				// Add all child test suites into this test suites after processing and building them.
				for ( i in processedTests ) {
					if ( processedTests.hasOwnProperty( i ) ) {
						suite.add( buildSuite( processedTests[ i ] ) );
					}
				}
			}

			return suite;
		}

		// create a test case and start the runner
		function start() {
			if ( !tests ) {
				startImmediately = true;
				return;
			}

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

			// handle a single test run
			if ( window.location.hash ) {
				handleSingleTest( tests );
			}

			bender.testCase = buildSuite( tests );

			runner.add( bender.testCase );
			runner.run();
		}

		// stop the runner
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

		bender.test = test;
		bender.start = start;
		bender.stopRunner = stopRunner;

	} );

} )( window, bender );
