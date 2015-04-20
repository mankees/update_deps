#!/usr/bin/env node
'use strict';

var fs = require('fs');

var async = require('async');
var request = require('request');


if(require.main === module) {
    execute();
}
else {
    module.exports = execute;
}

function execute() {
    console.log('Read dependencies');

    var packageData = JSON.parse(fs.readFileSync('package.json'));

    async.parallel([
        fetchVersions(packageData, 'dependencies'),
        fetchVersions(packageData, 'devDependencies')
    ], function(err, data) {
        if(err) {
            return console.error(err);
        }

        data.forEach(function(v) {
            if(v.name in packageData) {
                packageData[v.name] = v.data;
            }
        });

        console.log('Update dependencies');

        fs.writeFileSync('package.json', JSON.stringify(packageData, null, 2));
    });
}

function fetchVersions(packageData, key) {
    return function(finalCb) {
        async.map(key in packageData ? Object.keys(packageData[key]) : [],
            function(name, cb) {
                request.get({
                    url: 'http://registry.npmjs.org/' + name + '/latest',
                    json: true
                }, function(err, req, data) {
                    if(err) {
                        return cb(err);
                    }

                    cb(null, {name: name, version: data.version});
                });
        }, function(err, data) {
            finalCb(err, {
                name: key,
                data: toObj(data)
            });
        });
    };

    function toObj(d) {
        var ret = {};

        d.forEach(function(v) {
            ret[v.name] = '^' + v.version;
        });

        return ret;
    }
}
