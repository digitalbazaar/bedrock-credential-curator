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
], function(
  angular,
  credentialManager
) {

'use strict';

var module = angular.module('bedrock-credential-curator.manager', [
  'bedrock.credential'
]);

// TODO: need widgets for:
// viewing claimed credentials
// managing ACL for pre-authorized access to credentials
// screen with pluggable credential displayer? would be nice to
//   make it replaceable so a better displayer can be used
// viewing notifications of unclaimed credentials or done as part of another
// module?

module.directive(credentialManager);

return module.name;

});
