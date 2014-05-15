(function (window, bender) {

    window.YUI({ useBrowserConsole: false, debug: false }).use('test', function (Y) {
        var runner = Y.Test.Runner;

        // remove elements and styles added by YUI3
        function cleanUp() {
            var trash = document.getElementById('yui3-css-stamp'),
                doc = document.documentElement;

            if (trash) trash.parentElement.removeChild(trash);

            doc.className = doc.className.replace('yui3-js-enabled', '');
        }

        function handleResult(event) {
            var data = {
                    module: event.testCase.name,
                    name: event.testName,
                    success: true,
                    error: null
                };

            if (event.type === runner.TEST_FAIL_EVENT) {
                data.success = false;
                data.error = event.error.getMessage();
            }

            if (event.type === runner.TEST_IGNORE_EVENT) {
                data.ignored = true;
                data.name = data.name.indexOf('ignore:') === 0 ? data.name.slice(7) : data.name;
            }

            bender.result(data);
        }
        
        function start() {
            runner.subscribe(runner.TEST_FAIL_EVENT, handleResult);
            runner.subscribe(runner.TEST_PASS_EVENT, handleResult);
            runner.subscribe(runner.TEST_IGNORE_EVENT, handleResult);
            
            runner.subscribe(runner.COMPLETE_EVENT, function (event) {
                bender.next(event.results);
            });
        }

        function test(tests) {
            runner.add(new Y.Test.Case(tests));
            runner.run();
        }

        cleanUp();

        bender.Y = Y;
        bender.assert = Y.Assert;
        bender.arrayAssert = Y.ArrayAssert;
        bender.objectAssert = Y.ObjectAssert;
        bender.runner = runner;
        bender.start = start;
        bender.test = test;

    });

})(window, bender);
