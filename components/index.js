/*!
 * Credential Curator components module.
 *
 * Copyright (c) 2015-2017 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
import angular from 'angular';
import CredentialManagerComponent from './credential-manager-component.js';
import CredentialTaskComponent from './credential-task-component.js';

// TODO: need widgets for:
// viewing claimed credentials
// managing ACL for pre-authorized access to credentials
// screen with pluggable credential displayer? would be nice to
//   make it replaceable so a better displayer can be used
// viewing notifications of unclaimed credentials or done as part of another
// module?

var module = angular.module(
  'bedrock.credential-curator', [
    'bedrock.alert', 'bedrock.credential', 'bedrock.identity-composer'
  ]);

module.component('brCredentialManager', CredentialManagerComponent);
module.component('brCredentialTask', CredentialTaskComponent);
