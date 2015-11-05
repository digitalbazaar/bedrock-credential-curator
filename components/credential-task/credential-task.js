/*!
 * Credential Task module.
 *
 * Copyright (c) 2015 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './credential-task-directive'
], function(
  angular,
  credentialTaskDirective) {

'use strict';

var module = angular.module(
  'bedrock-credential-curator.credential-task',
  ['bedrock-identity-composer', 'bedrock.alert']);

module.directive(credentialTaskDirective);

return module.name;

});
