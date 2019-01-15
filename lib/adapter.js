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

		function appendDiff( expected, actual, diffContainer ) {
			try {
				var wrapper = document.createElement( 'div' ),
					fragment = document.createElement( 'pre' ),
					description = document.createElement( 'p' ),
					diff;

				wrapper.style.background = 'rgba(255, 255, 255, 0.3)';

				description.innerHTML = 'Find the diff attached below:<br>' +
					'<ins style="background-color:rgb(17, 115, 17);color:#f9f9f9;text-decoration:none">expected</ins><br>' +
					'<del style="background-color:#b51c1c;color:#f9f9f9;text-decoration:none">actual</del>' ;
				description.style.fontSize = '1.5em';
				description.style.paddingTop = '1em';
				description.style.marginBottom = '3em';

				diff = JsDiff.diffLines( actual, expected  );
				diff.forEach( function( part ) {
					var color = null,
						tagName = 'span',
						changePart = part.added || part.removed,
						// displayed text might get modified down the road
						displayedText = part.value,
						el;

					if ( part.added ) {
						color = 'rgb(17, 115, 17)';
						tagName = 'ins';
					} else if ( part.removed ) {
						color = '#b51c1c';
						tagName = 'del';
					}

					el = document.createElement( tagName );
					if ( color ) {
						el.style.backgroundColor = color;
						el.style.color = '#f9f9f9';
						el.style.textDecoration = 'none';
					}

					if ( changePart && part.value.match( /^[\n\r\s]+$/g ) ) {
						displayedText = displayedText.replace( /\n/g, '\n[LF]' ).replace( /\r/g, '\r[CR]' );
					}

					el.appendChild( document.createTextNode( displayedText ) );

					fragment.appendChild( el );
				} );

				fragment.style.tabSize = 4;

				wrapper.appendChild( description );
				wrapper.appendChild( fragment );
				diffContainer.appendChild( wrapper );
			} catch ( e ) {
				// diff tends to throw exceptions
				if ( console && console.warn ) {
					console.warn( 'benderjs-yui: diff has thrown an exception and can not be rendered.' );
				}
			}
		}

		// build a result object and send it to Bender
		function handleResult( event ) {
			var data = {
				module: event.testCase.module ? event.testCase.module : '',
				name: event.testName,
				fullName: event.testCase.fullName ? ( event.testCase.fullName + ' ' + event.testName ) : event.testName,
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

			// apply diff in case of error
			if ( event.type === runner.TEST_FAIL_EVENT ) {
				var errorResults = document.querySelectorAll( '.result.fail pre' ),
					lastRes = errorResults[ errorResults.length - 1 ];

				if ( lastRes ) {
					appendDiff( event.error.expected, event.error.actual, lastRes.parentNode );
				}
			}
		}

		function deleteTests( tc, hash ) {
			for ( var name in tc ) {
				if ( tc[ name ] ) {
					if ( isTestOrSuite( name, tc[ name ] ) == isTestOrSuite.SUITE ) {
						var tcName = tc[ name ].name ? tc[ name ].name : name;

						if ( hash.indexOf( tcName ) === 0 ) {
							deleteTests( tc[ name ], hash.substr( tcName.length + 1 ) );
						} else {
							delete tc[ name ];
						}
					} else if ( isTestOrSuite( name, tc[ name ] ) == isTestOrSuite.TEST ) {
						if ( hash != name && name != 'setUp' && name != 'tearDown' ) {
							delete tc[ name ];
						}
					}
				}
			}
		}

		// remove all the tests except the one that matches id in the location.hash
		function handleSingleTest( tc ) {
			var id = decodeURIComponent( window.location.hash.substr( 1 ) );
			var tcName = tc.name ? tc.name : bender.testData.id;

			if ( id.indexOf( tcName ) === 0 ) {
				deleteTests( tc, id.substr( tcName.length + 1 ) );
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

		// Checks wheter given member (variable) is a test/suite or a "special member"
		function isTestOrSuite ( name, value ) {
			if ( !value ) {
				// Value is falsy -- this is not a function or object so it can't be a test or suite.
				return isTestOrSuite.SPECIAL;
			} else if ( ( name.indexOf( 'test' ) === 0 || name.indexOf( ' ' ) > -1 ) && typeof value == 'function' ) {
				// Member name starts from test or contains a space -- if this is a function, it is a test.
				return isTestOrSuite.TEST;
			} else if ( typeof value == 'object' && value.suite ) {
				// Member is an object with property suite that is truthy -- this is a suite.
				return isTestOrSuite.SUITE;
			}

			// If it didn't fit, it is a "special member", that is neither test nor suite.
			return isTestOrSuite.SPECIAL;
		}
		isTestOrSuite.TEST = 1;
		isTestOrSuite.SUITE = 2;
		isTestOrSuite.SPECIAL = 0;

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
					if ( isTestOrSuite( i, tests[ i ] ) == isTestOrSuite.SPECIAL ) {
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

					if ( isTestOrSuite( i, tests[ i ] ) == isTestOrSuite.SUITE ) {
						// Close currently open artificial test suite.
						lvlOneId = null;
						// Store the information that the test suite contains other test suites.
						isTestCase = false;

						// Propagate test name with parent names.
						var testName = tests[ i ].name || i;
						tests[ i ].name = testName;
						tests[ i ].fullName = tests.fullName + ' ' + testName;
						tests[ i ].module = tests.module + ' / ' + testName;

						// Copy test suite to processedTests object.
						processedTests[ i ] = tests[ i ];
					} else if ( isTestOrSuite( i, tests[ i ] ) == isTestOrSuite.TEST ) {
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
				suite = new Y.Test.Suite();

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

			tests.name = tests.name ? tests.name : bender.testData.id;
			tests.fullName = tests.name;
			tests.module = tests.name;

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
