var path = require('path');

module.exports = {
    name : 'bender-assertion-yui',
    files: [
        // path.resolve(__dirname, '../vendor/yui-3.16.0-test.debug.js'),
        path.resolve(__dirname, '../vendor/yui-3.16.0-test.min.js'),
        __dirname + '/adapter.js'
    ]
};
