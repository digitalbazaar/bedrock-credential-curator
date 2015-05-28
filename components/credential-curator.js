/*!
 * Credential Curator components module.
 *
 * Copyright (c) 2015 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './credential-manager/credential-manager'
], function(angular) {

'use strict';

var modulePath = requirejs.toUrl('bedrock-credential-curator/components/');

var module = angular.module(
  'bedrock-credential-curator', Array.prototype.slice.call(arguments, 1));

return module.name;

});
