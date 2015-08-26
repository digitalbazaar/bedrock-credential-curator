/*!
 * Credential Tasks module.
 *
 * Copyright (c) 2015 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './compose-identity-controller',
  './routes'
], function(
  angular,
  composeIdentityController,
  routes
) {

'use strict';

var module = angular.module('bedrock-credential-curator.tasks', [
  'bedrock-identity-composer'
]);

/* @ngInject */
module.config(function($routeProvider) {
  angular.forEach(routes, function(route) {
    $routeProvider.when(route.path, route.options);
  });
});

module.controller(composeIdentityController);

return module.name;

});
