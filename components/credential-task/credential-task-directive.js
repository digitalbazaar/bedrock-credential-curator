/*!
 * Credential Task Directive.
 *
 * Copyright (c) 2015 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 * @author Matt Collier
 */
define(['underscore', 'angular', 'jsonld'], function(_, angular, jsonld) {

'use strict';

/* @ngInject */
function brCredentialTaskDirective() {
  /* @ngInject */
  function Ctrl(
    $http, $scope, brAlertService, brAuthenticationService, brSessionService,
    config) {
    var self = this;
    self.identity = null;
    self.loading = true;
    var aio = {
      baseUri: config.data['authorization-io'].baseUri
    };
    var CRYPTO_KEY_REQUEST = {
      '@context': 'https://w3id.org/identity/v1',
      id: '',
      publicKey: ''
    };

    var operation;

    navigator.credentials.getPendingOperation({
      agentUrl: aio.baseUri + '/agent'
    }).then(function(op) {
      operation = op;
      return brSessionService.get();
    }).then(function(session) {
      // session does not exist
      if(!session.identity) {
        return self.createSession({identity: operation.options.identity});
      }

      // force logout; session authenticated for wrong identity
      if(session.identity.id !== operation.options.identity.id) {
        // FIXME: logout listeners should handle this cleanup
        if(config.data.idp && 'identity' in config.data.idp.session) {
          delete config.data.idp.session.identity;
        }
        return brAuthenticationService.logout().then(function() {
          return self.createSession({identity: operation.options.identity});
        });
      }
    }).then(function() {
      // handle operation, proper session created
      if(operation.name === 'get') {
        self.query = operation.options.query;
        // do not show `get` view for crypto key requests because they are
        // auto-handled
        if(!_isCryptoKeyRequest(self.query)) {
          self.view = 'get';
        }
        return _getIdentity(operation.options);
      } else {
        self.view = 'store';
        return Promise.resolve(operation.options.store);
      }
    }).then(function(identity) {
      // if op is `get` and query is a public key query, complete using the
      // identity w/the public key credential (which should, by now, be signed
      // by the IdP)
      if(operation.name === 'get' && _isCryptoKeyRequest(self.query)) {
        return self.complete(identity);
      }
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
      var url = '/tasks/credentials/compose-identity';
      var data = {
        query: options.query,
        identity: options.identity,
        // FIXME: remove (only here for backwards compatibility)
        publicKey: options.publicKey
      };
      if(options.registerKey) {
        data.registerKey = true;
      }
      return Promise.resolve($http.post(url, data)).then(function(response) {
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

    function _isCryptoKeyRequest(query) {
      // query may have `id` set -- this doesn't affect whether or not it is
      // a crypto key request
      query = _.extend({}, query);
      if('id' in query) {
        query.id = '';
      }
      return _.isEqual(query, CRYPTO_KEY_REQUEST);
    }
  }

  return {
    restrict: 'E',
    scope: {'createSession': '&brCreateSession'},
    controller: Ctrl,
    controllerAs: 'model',
    bindToController: true,
    templateUrl: requirejs.toUrl(
      'bedrock-credential-curator/components/credential-task/' +
      'credential-task.html')
  };
}

return {brCredentialTask: brCredentialTaskDirective};

});
