/*!
 * Credential Task module.
 *
 * Copyright (c) 2015 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([
  'angular',
  './credential-task-controller'
], function(
  angular,
  credentialTaskController) {

'use strict';

var module = angular.module(
  'bedrock-credential-curator.credential-task',
  ['bedrock-identity-composer', 'bedrock.alert']);

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider
    .when('/credential-task', {
      title: 'Credential Task',
      // TODO: if session is invalid, we'd need to queue the request for
      // handling after login -- we should make session authentication optional
      // here and handle authentication from the page instead (use some
      // login directives, etc.)
      session: 'required',
      templateUrl: requirejs.toUrl(
        'bedrock-credential-curator/components' +
        '/credential-task/credential-task.html')
    });
});

module.controller(credentialTaskController);

return module.name;

});
