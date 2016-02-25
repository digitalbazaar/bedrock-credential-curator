/*
 * Copyright (c) 2015-2016 Digital Bazaar, Inc. All rights reserved.
 */
var path = require('path');

module.exports = function(bedrock) {
  if(bedrock.config.protractor) {
    var config = bedrock.config.protractor.config;
    // add protractor tests
    config.suites['bedrock-credential-curator'] =
      path.join(__dirname, './tests/**/*.js');
    //config.params.config.onPrepare.push();
  }
};
