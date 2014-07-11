benderjs-yui
============

Adapter for [YUI3](http://yuilibrary.com/yui/docs/test/) testing framework for [Bender.js](https://github.com/benderjs/benderjs).

Installation
------------

```
npm install benderjs-yui
```

Usage
-----

Add `benderjs-yui` to the plugins array in the `bender.js` configuration file:

```javascript
var config = {
    applications: {...}
        
    browsers: [...],
    
    plugins: ['benderjs-yui'], // load the plugin
        
    tests: {...}
};
    
module.exports = config;
```

Set `yui` as a `framework` for entire project or a specific tests group:

```javascript
var config = {
    applications: {...}
        
    browsers: [...],
        
    framework: 'yui', // use for entire project
    
    plugins: ['benderjs-yui'],
        
    tests: {
        Foo: {
            basePath: '',
            framework: 'yui' // use for a specific tests group
            paths: [...]
        }
    }
};

module.exports = config;
```

API
---

To run a test case use `bender.test` API:

```javascript
bender.test({

    'test foo': function () {
        bender.assert.areEqual(5, 5);
        bender.assert.areNotEqual(5, 6);
    },
    
    'test bar': function () {...}
    
});
```

Some of `YUI` namespaces were exposed in `bender` namespace, at the moment you can use:

- `bender.Y` -> `Y`
- `bender.assert` -> `Y.Assert`
- `bender.objectAssert` -> `Y.ObjectAssert`
- `bender.arrayAssert` -> `Y.ArrayAssert`

Features
--------
- regressions handling
- single test execution

License
-------

MIT, for license details see: [LICENSE.md](https://github.com/benderjs/benderjs-yui/blob/master/LICENSE.md).
