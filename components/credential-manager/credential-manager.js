/*!
 * Credential Manager module.
 *
 * Copyright (c) 2015 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './credential-manager-directive'
], function(angular, credentialManager) {

'use strict';

var module = angular.module('bedrock-credential-curator.manager', []);

module.directive(credentialManager);

return module.name;

});
