/*
 * Copyright (c) 2015 Digital Bazaar, Inc. All rights reserved.
 */
var bedrock = require('bedrock');
var config = bedrock.config;
var fs = require('fs');
var path = require('path');

require('bedrock-express');
require('bedrock-views');
var curator = require('../lib/curator');
curator.store = require('bedrock-credentials-mongodb').provider;

var rootPath = path.join(__dirname, '..');
// add bedrock-angular-credential bower package
config.requirejs.bower.packages.push({
  path: path.join(rootPath, 'components'),
  manifest: path.join(rootPath, 'bower.json')
});

// mocha tests
config.mocha.tests.push(path.join(__dirname, '..', 'tests', 'mocha'));

bedrock.start();
