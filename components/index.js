/*!
 * Credential Curator components module.
 *
 * Copyright (c) 2015-2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

import angular from 'angular';
import CredentialManagerComponent from './credential-manager-component.js';
import CredentialRequestComponent from './credential-request-component.js';
import CredentialStoreComponent from './credential-store-component.js';

// TODO: need widgets for:
// viewing claimed credentials
// managing ACL for pre-authorized access to credentials
// screen with pluggable credential displayer? would be nice to
//   make it replaceable so a better displayer can be used
// viewing notifications of unclaimed credentials or done as part of another
// module?

const module = angular.module(
  'bedrock.credential-curator', [
    'bedrock.alert', 'bedrock.credential', 'bedrock.identity-composer'
  ]);

module.component('brCredentialManager', CredentialManagerComponent);
module.component('brCredentialRequest', CredentialRequestComponent);
module.component('brCredentialStore', CredentialStoreComponent);
