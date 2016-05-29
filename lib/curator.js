/*
 * Bedrock Credential Curator module.
 *
 * Copyright (c) 2015-2016 Digital Bazaar, Inc. All rights reserved.
 */
/* jshint node:true */
'use strict';

var async = require('async');
var bedrock = require('bedrock');
var config = bedrock.config;
var brPassport = require('bedrock-passport');
var brPermission = require('bedrock-permission');
var config = bedrock.config;
var jsonld = bedrock.jsonld;
var jsigs = require('jsonld-signatures');
var didio = require('did-io');
var request = require('request');
var acceptableContent = require('bedrock-express').middleware.acceptableContent;
var ensureAuthenticated = brPassport.ensureAuthenticated;
var store = require('bedrock-credentials-mongodb').provider;
var database = require('bedrock-credentials-mongodb').database;
var uuid = require('node-uuid');
var BigNumber = require('bignumber.js');
var URL = require('url');

var BedrockError = bedrock.util.BedrockError;
require('bedrock-credentials-rest');

// load config defaults
require('./config');

bedrock.events.on('bedrock.test.configure', function() {
  // load test config
  require('./test.config');
});

// module permissions
var PERMISSIONS = config.permission.permissions;

// module API
var api = {};
module.exports = api;

// storage layer, must be configured
api.store = null;

var logger = bedrock.loggers.get('app');

bedrock.events.on('bedrock.init', function() {
  // get configured lib instances
  jsonld = jsonld();
  didio = didio();
  didio.use('jsonld', jsonld);
  jsonld.documentLoader = didio.createDocumentLoader({
    wrap: function(url, callback) {
      return bedrock.jsonld.documentLoader(url, callback);
    },
    baseUrl: config['credential-curator']['authorization-io'].baseUrl
  });
  jsigs = jsigs();
  jsigs.use('jsonld', jsonld);
});

/**
 * Verifies and claims a Credential, inserting it into storage.
 *
 * @param actor the actor performing the action.
 * @param credential the Credential containing the minimum required data.
 * @param [options] the options to use.
 * @param callback(err, credential) called once the operation completes.
 */
api.claim = function(actor, credential, options, callback) {
  if(!api.store) {
    return callback(new BedrockError(
      'Credential store not found.', 'CredentialStoreNotFound'));
  }
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  async.auto({
    checkPermission: function(callback) {
      brPermission.checkPermission(
        actor, PERMISSIONS.CREDENTIAL_CLAIM, {resource: options.recipient},
        callback);
    },
    verify: ['checkPermission', function(callback) {
      // TODO: include options.checkKeyOwner in options if given
      jsigs.verify(credential, {}, function(err, verified) {
        if(!verified) {
          return callback(err || new BedrockError(
            'Could not claim credential; its digital signature could ' +
            'not be verified.', 'InvalidSignature'));
        }
        callback();
      });
    }],
    insert: ['verify', function(callback) {
      api.store.insert(actor, credential, callback);
    }]
  }, function(err, results) {
    callback(err, err ? null : results.insert.credential);
  });
};

/**
 * Gets a Credential.
 *
 * @param actor the actor performing the action.
 * @param id the ID of the Credential to retrieve.
 * @param callback(err, credential) called once the operation completes.
 */
api.get = function(actor, id, callback) {
  if(!api.store) {
    return callback(new BedrockError(
      'Credential store not found.', 'CredentialStoreNotFound'));
  }
  api.store.get(actor, id, function(err, credential) {
    callback(err, credential);
  });
};

/**
 * Composes a view of an identity based on the given template and the
 * credentials associated with it.
 *
 * @param actor the actor performing the action.
 * @param recipient the ID of the recipient of the credentials to use.
 * @param template the identity template.
 * @param [options] the options to use.
 * @param callback(err, identity) called once the operation completes.
 */
api.compose = function(actor, recipient, template, options, callback) {
  if(!api.store) {
    return callback(new BedrockError(
      'Credential store not found.', 'CredentialStoreNotFound'));
  }
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  api.store.compose(actor, recipient, template, options, callback);
};

// tasks HTTP API

// add routes
bedrock.events.on('bedrock-express.configure.routes', function(app) {
  // TODO: add validation
  app.post(
    config['credential-curator'].endpoints.composeIdentity,
    ensureAuthenticated, acceptableContent('json', '+json'),
    _composeIdentity);

  // TODO: add validation
  app.post(
    config['credential-curator'].endpoints.storeCredentials,
    ensureAuthenticated, acceptableContent('json', '+json'),
    _storeCredentials);
});

function _composeIdentity(req, res, next) {
  var credentialQuery = req.body.query;

  // TODO: publicKey credential is only required to be present for ephemeral
  // and non-DID based keys

  // TODO: support @graph-based framing for identity and contained public key
  var identity = req.body.identity;
  var credential;
  var publicKey;
  if(identity) {
    credential = identity.credential['@graph'];
    if(!jsonld.hasValue(credential, 'type', 'CryptographicKeyCredential')) {
      return next(new BedrockError(
        'Invalid credential in query. Public key must be presented ' +
        'in a CryptographicKeyCredential.', 'InvalidCredential', {
        httpStatusCode: 400,
        public: true
      }));
    }
    publicKey = credential.claim.publicKey;
  } else {
    return next(new BedrockError(
      'Invalid identity in query. Identity must be presented with a public ' +
      'key in a CryptographicKeyCredential.', 'InvalidIdentity', {
      httpStatusCode: 400,
      public: true
    }));
  }
  // publicKey has the following properties: `id`, `publicKeyPem`, and `type`
  // `type` contains 'CryptographicKey' and may also have
  // ‘EphemeralCryptographicKey’
  if(publicKey.owner !== req.user.identity.id) {
    return next(new BedrockError(
      'Authentication mismatch. Public key owner does not match the ' +
      'authenticated user.', 'AuthenticationMismatch', {
      httpStatusCode: 409,
      public: true
    }));
  }
  async.auto({
    compose: function(callback) {
      api.compose(req.user, req.user.identity.id, credentialQuery, callback);
    },
    getKey: function(callback) {
      // TODO: perform signature via SSM/HSM
      callback(null, {
        id: config['credential-curator'].credentialSigningPublicKey.id,
        privateKey: {
          privateKeyPem:
            config['credential-curator'].credentialSigningPrivateKey
        }
      });
    },
    verifyKeyCredential: function(callback) {
      if(!credential) {
        // FIXME: security hole -- remove this; for temporary backwards
        // compatibility only
        return callback();
      }
      var options = {
        checkTimestamp: true,
        publicKey: publicKey,
        checkDomain: _checkDomain
      };
      // for non-URL keys, vouch for public key owner
      if(_isNonUrlKey(publicKey)) {
        // FIXME: check for specific `urn:rsa:key-fingerprint` ID and verify
        // fingerprint?
        options.publicKeyOwner = {
          '@context': 'https://w3id.org/identity/v1',
          id: publicKey.owner,
          publicKey: publicKey
        };
      }

      // verify CryptographicKeyCredential
      jsigs.verify(credential, options, function(err, verified) {
        if(verified) {
          return callback();
        }
        callback(new BedrockError(
          'Could not verify public key credential; its digital signature ' +
          'could not be verified.', 'InvalidSignature', {
            httpStatusCode: 400,
            public: true
          }, err));
      });
    },
    emit: ['compose', 'verifyKeyCredential', function(callback, results) {
      // TODO: handle case where holder != credential subject
      var resources =
        (results.compose.credential || []).map(function(credential) {
        return credential['@graph'].id;
      });
      bedrock.events.emit(
        'bedrock-credential-curator.credential.CredentialQuery', {
          type: 'CredentialQuery',
          date: new Date().toJSON(),
          subject: identity.id,
          resource: resources,
          actor: req.user.identity.id
        }, callback);
    }],
    registerKeyCredential: [
      'compose', 'getKey', 'verifyKeyCredential',
      function(callback, results) {
      if(!req.body.registerKey) {
        return callback(null, publicKey);
      }

      // try to register key
      _registerKey({
        identity: identity,
        publicKey: publicKey,
        signingKey: results.getKey
      }, function(err, result) {
        if(err) {
          // ignore error, do not register key
          return callback(null, publicKey);
        }
        callback(null, result);
      });
    }],
    addKeyCredential: ['registerKeyCredential', function(callback, results) {
      var identity = results.compose;
      // generate new public key credential
      var publicKeyCredential = {
        '@context': [
          'https://w3id.org/identity/v1',
          'https://w3id.org/credentials/v1'
        ],
        id: 'urn:uuid:' + uuid.v4(),
        type: [
          'Credential',
          'CryptographicKeyCredential'
        ],
        claim: {
          id: identity.id,
          publicKey: results.registerKeyCredential
        }
      };
      jsigs.sign(publicKeyCredential, {
        algorithm: 'LinkedDataSignature2015',
        privateKeyPem: results.getKey.privateKey.privateKeyPem,
        creator: results.getKey.id
      }, function(err, signed) {
        if(err) {
          return callback(err);
        }
        jsonld.addValue(
          identity, 'credential', {'@graph': signed},
          {propertyIsArray: true});
        callback(null, identity);
      });
    }]
  }, function(err, results) {
    if(err) {
      return next(err);
    }
    // TODO: ld+json instead?
    res.status(200).json(results.addKeyCredential);
  });
}

function _registerKey(options, done) {
  // TODO: consider adding some portion of this to did-io

  var curatorConfig = config['credential-curator'];
  var aioBaseUrl = curatorConfig['authorization-io'].baseUrl;

  // if key registration results in a 409 Conflict, retry a number of times
  if(!('attempts' in options)) {
    options.attempts = 0;
  } else if(options.attempts > curatorConfig.maxRegisterDidKeyAttempts) {
    return done(new BedrockError(
      'Could not register public key; maximum key registration attempts ' +
      'exceeded.', 'MaximumKeyRegistrationAttemptsExceeded'));
  }

  async.auto({
    getCurrent: function(callback) {
      didio.get(options.identity.id, {baseUrl: aioBaseUrl}, callback);
    },
    update: ['getCurrent', function(callback, results) {
      // advance update counter
      var doc = results.getCurrent;
      var updateCounter = doc['urn:webdht:updateCounter'] || '0';
      doc['urn:webdht:updateCounter'] = new BigNumber(
        updateCounter).plus(1).toString(10);

      // generate a unique DID-based key ID
      var keys = jsonld.getValues(doc, 'publicKey');
      var id;
      while(!id) {
        id = options.identity.id + '/keys/' + uuid.v4();
        for(var i = 0; i < keys.length; ++i) {
          if(keys[i].id === id) {
            id = null;
            break;
          }
        }
      }

      // add public key to doc
      var publicKey = bedrock.util.extend({}, options.publicKey, {id: id});
      jsonld.addValue(doc, 'publicKey', publicKey);

      // sign the document
      async.auto({
        sign: function(callback) {
          delete doc.signature;
          jsigs.sign(doc, {
            algorithm: 'LinkedDataSignature2015',
            privateKeyPem: options.signingKey.privateKey.privateKeyPem,
            creator: options.signingKey.id
          }, callback);
        },
        post: ['sign', function(callback, results) {
          request.post({
            url: aioBaseUrl + doc.id,
            headers: {
              'Accept': 'application/ld+json, application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(results.sign),
            strictSSL: config.jsonld.strictSSL
          }, function(err, response) {
            if(err) {
              return callback(err);
            }
            if(response.statusCode === 409) {
              // TODO: conflict, retry registration
              return process.nextTick(function() {
                options.attempts = options.attempts + 1;
                _registerKey(options, done);
              });
            }
            if(response.statusCode >= 400) {
              return callback(new BedrockError(
                'Could not register public key.',
                'KeyRegistrationError', {
                  httpStatusCode: response.statusCode,
                  public: true
                }));
            }
            callback();
          });
        }]
      }, function(err) {
        callback(err, publicKey);
      });
    }]
  }, function(err, results) {
    done(err, err ? null : results.update);
  });
}

function _storeCredentials(req, res, next) {
  // FIXME: don't just store first credential (there may be more
  // than one)
  var credential = req.body.credential[0]['@graph'];
  async.auto({
    store: function(callback) {
      if(config['credential-curator'].tasks.storeCredential.claimCredential) {
        credential.sysState = 'claimed';
      } else {
        credential.sysState = 'unclaimed';
      }
      store.insert(req.user, credential, function(err, record) {
        callback(err, record ? record.credential : null);
      });
    },
    emit: ['store', function(callback) {
      bedrock.events.emit(
        'bedrock-credential-curator.credential.CredentialStore', {
        type: 'CredentialStore',
        date: new Date().toJSON(),
        subject: credential.claim.id,
        resource: [credential.id],
        actor: req.user.identity.id
      }, callback);
    }]
  }, function(err) {
    if(err) {
      if(database.isDuplicateError(err)) {
        return next(new BedrockError('Duplicate credential.',
          'DuplicateCredential', {
          httpStatusCode: 409,
          public: true
        }));
      }
      return next(err);
    }
    // TODO: should send what was stored
    res.sendStatus(200);
  });
}

function _checkDomain(domain, options, callback) {
  var parsed = URL.parse(config.server.baseUri);
  callback(null, domain === parsed.host);
}

function _isNonUrlKey(publicKey) {
  // FIXME: better ensure `publicKey.id` is non-URL? force specific ID
  // scheme like a fingerprint?
  return (publicKey.id.indexOf('did') !== 0 &&
    publicKey.id.indexOf('http') !== 0);
}
