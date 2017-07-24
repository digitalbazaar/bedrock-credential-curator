/*
 * Copyright (c) 2015-2017 Digital Bazaar, Inc. All rights reserved.
 */
var bedrock = require('bedrock');
var config = bedrock.config;
var path = require('path');

require('bedrock-express');
require('bedrock-views');
var curator = require('bedrock-credential-curator');
curator.store = require('bedrock-credentials-mongodb').provider;

// add pseudo package
var rootPath = path.join(__dirname, '..');
config.views.system.packages.push({
  path: path.join(rootPath, 'components'),
  manifest: path.join(rootPath, 'package.json')
});

require('bedrock-test');
bedrock.start();
