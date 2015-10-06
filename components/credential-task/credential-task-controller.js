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
    // TODO: get full url from config
    agentUrl: aio.baseUri + '/agent?route=params'
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
      promise = _signIdentity(identity);
    } else {
      promise = _storeCredentials(identity);
    }
    promise.then(function() {
      // TODO: get auth.io full URL from config
      return operation.complete(identity, {
        agentUrl: aio.baseUri +'/agent?op=' + operation.name + '&route=result'
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
    return Promise.resolve($http.post('/tasks/credentials/compose-identity', {
      query: options.query,
      publicKey: options.publicKey
    })).then(function(response) {
      // TODO: implement more comprehensive error handling
      if(response.status !== 200) {
        throw response;
      }
      return response.data;
    });
  }

  function _signIdentity(identity) {
    return Promise.resolve(
      $http.post('/tasks/credentials/sign-identity', identity))
      .then(function(response) {
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
