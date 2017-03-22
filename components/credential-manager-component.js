/*!
 * Credential Manager.
 *
 * Copyright (c) 2015-2016 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

function register(module) {
  module.component('brCredentialManager', {
    bindings: {
      identity: '<brIdentity'
    },
    templateUrl: requirejs.toUrl(
      'bedrock-credential-curator/components/credential-manager-component.html')
  });
}

return register;

});
