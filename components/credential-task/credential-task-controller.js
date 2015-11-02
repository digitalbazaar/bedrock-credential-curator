/*!
 * Credential Task Controller.
 *
 * Copyright (c) 2015 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 * @author Matt Collier
 */
define(['angular', 'jsonld'], function(angular, jsonld) {

'use strict';

/* @ngInject */
function factory($http, $scope, brAlertService, config) {
  var self = this;
  self.identity = null;
  self.loading = true;
  var aio = {
    baseUri: config.data['authorization-io'].baseUri
  };

  var operation;

  navigator.credentials.getPendingOperation({
    agentUrl: aio.baseUri + '/agent'
  }).then(function(op) {
    operation = op;
    if(op.name === 'get') {
      self.view = 'get';
      self.query = op.options.query;
      return _getIdentity(op.options);
    } else {
      self.view = 'store';
      return Promise.resolve(op.credential);
    }
  }).then(function(identity) {
    self.identity = identity;
    self.credentials = jsonld.getValues(
      self.identity, 'credential').map(function(credential) {
      return credential['@graph'];
    });
    self.choices = self.credentials.slice();
  }).catch(function(err) {
    brAlertService.add('error', err);
  }).then(function() {
    self.loading = false;
    $scope.$apply();
  });

  self.complete = function(identity) {
    var promise;
    if(operation.name === 'get') {
      // TODO: if present, public key credential must be both verified
      // as self-signed and then signed by IdP... the query may also include
      // a request for the IdP to permanently store the public key and
      // include its new identifier in the public key credential
      promise = Promise.resolve(identity);
    } else {
      promise = _storeCredentials(identity);
    }
    promise.then(function() {
      return operation.complete(identity, {
        agentUrl: aio.baseUri +'/agent'
      });
    }).catch(function(err) {
      console.error('Failed to ' + operation.name + ' credential', err);
      if(operation.name === 'store' && err.type === 'DuplicateCredential') {
        brAlertService.add('error', 'Duplicate credential.');
      } else {
        brAlertService.add(
          'error', 'Failed to ' + operation.name + ' the credential.');
      }
    }).then(function() {
      $scope.$apply();
    });
  };

  // gets credentials for the identity composer
  function _getIdentity(options) {
    // TODO: POSTing `credential` only necessary when its present
    return Promise.resolve($http.post('/tasks/credentials/compose-identity', {
      query: options.query,
      credential: options.credential,
      // FIXME: remove (only here for backwards compatibility)
      publicKey: options.publicKey
    })).then(function(response) {
      // TODO: implement more comprehensive error handling
      if(response.status !== 200) {
        throw response;
      }
      return response.data;
    });
  }

  // stores credentials
  function _storeCredentials(identity) {
    identity = angular.extend(
      {}, identity, {
        credential: self.choices.map(function(credential) {
          return {'@graph': credential};
        })
      });
    return Promise.resolve($http.post(
      '/tasks/credentials/store-credentials', identity))
      .then(function(response) {
        if(response.status !== 200) {
          throw response;
        }
      });
  }
}

return {brCredentialTaskController: factory};

});
