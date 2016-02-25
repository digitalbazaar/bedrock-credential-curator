/*!
 * Credential Manager.
 *
 * Copyright (c) 2015-2016 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function brCredentialManager() {
  return {
    restrict: 'E',
    scope: {},
    templateUrl: requirejs.toUrl(
      'bedrock-credential-curator/components/credential-manager/' +
      'credential-manager.html')
  };
}

return {brCredentialManager: brCredentialManager};

});
