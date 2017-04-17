/*!
 * Credential Task Directive.
 *
 * Copyright (c) 2015-2017 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 * @author Matt Collier
 */
define(['lodash', 'angular', 'jsonld'], function(_, angular, jsonld) {

'use strict';

function register(module) {
  module.component('brCredentialTask', {
    bindings: {
      createSession: '&brCreateSession'
    },
    controller: Ctrl,
    templateUrl: requirejs.toUrl(
      'bedrock-credential-curator/components/credential-task-component.html')
  });
}

/* @ngInject */
function Ctrl(
  $http, $q, brAlertService, brCredentialService, brSessionService, config) {
  var self = this;
  self.identity = null;
  self.loading = true;
  self.publicAccess = {
    requested: false
  };
  var aio = {
    baseUri: config.data['authorization-io'].baseUri
  };
  var CRYPTO_KEY_REQUEST = {
    '@context': 'https://w3id.org/identity/v1',
    id: '',
    publicKey: ''
  };

  var operation;

  $q.resolve(navigator.credentials.getPendingOperation({
    agentUrl: aio.baseUri + '/agent'
  })).then(function(op) {
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
      return brSessionService.logout().then(function() {
        return self.createSession({identity: operation.options.identity});
      });
    }
  }).then(function() {
    // handle operation, proper session created
    if(operation.name === 'get') {
      self.query = operation.options.query;
      // TODO: Consider changing "cred:requestPublicAccess" to
      // "cred:requestPersistentAccess" with a value of "publicAccess" so we
      // can support consumers providing their ID as a value as well
      if(jsonld.hasProperty(self.query, 'cred:requestPublicAccess')) {
        self.publicAccess.requested = true;
      }
      // do not show `get` view for crypto key requests because they are
      // auto-handled
      if(!_isCryptoKeyRequest(self.query)) {
        self.view = 'get';
      }
      return _getIdentity(operation.options);
    } else {
      self.view = 'store';
      return $q.resolve(operation.options.store);
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
  });

  self.complete = function(identity) {
    var promise;
    if(operation.name === 'get') {
      if(self.publicAccess.requested) {
        promise = $q.all(_makePublic(identity));
      } else {
        promise = $q.resolve(identity);
      }
    } else {
      promise = _storeCredentials(identity);
    }
    return promise.then(function() {
      return operation.complete(identity, {
        agentUrl: aio.baseUri + '/agent'
      });
    }).catch(function(err) {
      if(operation.name === 'store' && err.type === 'DuplicateCredential') {
        // the credential has already been stored successfully, return success
        return operation.complete(identity, {
          agentUrl: aio.baseUri + '/agent'
        });
      } else {
        console.error('Failed to ' + operation.name + ' credential', err);
        brAlertService.add(
          'error', 'Failed to ' + operation.name + ' the credential.');
      }
    });
  };

  function _compareHost(url) {
    return url.indexOf(config.data.baseUri) === 0;
  }

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
    return $http.post(url, data).then(function(response) {
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
    return $http.post('/tasks/credentials/store-credentials', identity)
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

  function _makePublic(identity) {
    var updatePromises = [];
    identity.credential.forEach(function(c) {
      var credential = c['@graph'];
      var update = {
        '@context': credential['@context'],
        id: credential.id,
        sysPublic: ['*']
      };
      var options = {};
      // FIXME: comparing the host and then modifying the URL on that basis
      // is a hack that requires special knowledge
      if(!_compareHost(credential.id)) {
        options.url = brCredentialService.credentialsBasePath +
          '?id=' + credential.id;
      }
      updatePromises.push(
        $q.resolve(brCredentialService.collection.update(update, options)));
    });
    return updatePromises;
  }
}

return register;

});
