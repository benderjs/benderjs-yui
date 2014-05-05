(function (window, bender) {

    window.YUI({ useBrowserConsole: false, debug: false }).use('test', function (Y) {
        var runner = Y.Test.Runner,
            result = {
                success: true,
                errors: []
            };

        function handleResult(data) {
            if (data.type === runner.TEST_FAIL_EVENT) {
                result.success = false;
                result.errors.push(data.error.getMessage());
            }

            bender.result({
                module: data.testCase.name,
                name: data.testName,
                success: result.success,
                errors: result.errors.length ? result.errors : undefined
            });

            result.success = true;
            result.errors = [];
        }
        
        function start() {
            runner.subscribe(runner.TEST_FAIL_EVENT, handleResult);
            runner.subscribe(runner.TEST_PASS_EVENT, handleResult);
            runner.subscribe(runner.TEST_IGNORE_EVENT, handleResult);
            
            runner.subscribe(runner.COMPLETE_EVENT, function (data) {
                bender.next(data.results);
            });
        }

        function test(tests) {
            runner.add(new Y.Test.Case(tests));
            runner.run();
        }

        bender.Y = Y;
        bender.assert = Y.Assert;
        bender.arrayAssert = Y.ArrayAssert;
        
        bender.runner = runner;
        
        bender.start = start;
        
        bender.test = test;

    });

})(window, bender);
