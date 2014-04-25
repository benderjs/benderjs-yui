var path = require('path');

module.exports = {
    name : 'YUI',
    type: 'assertion',
    files: [
        path.resolve(__dirname, '../vendor/yui-3.16.0-test.min.js'),
        __dirname + '/adapter.js'
    ]
};
