/*
 * Bedrock Credential Curator module.
 *
 * Copyright (c) 2015 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var brPassport = require('bedrock-passport');
var brPermission = require('bedrock-permission');
var jsigs = require('jsonld-signatures')({
  inject: {jsonld: bedrock.jsonld}
});
var acceptableContent = require('bedrock-express').middleware.acceptableContent;
var ensureAuthenticated = brPassport.ensureAuthenticated;
var store = require('bedrock-credentials-mongodb').provider;
var database = require('bedrock-credentials-mongodb').database;
var uuid = require('node-uuid');

var BedrockError = bedrock.util.BedrockError;
require('bedrock-credentials-rest');

// load config defaults
require('./config');

// module permissions
var PERMISSIONS = bedrock.config.permission.permissions;

// module API
var api = {};
module.exports = api;

// storage layer, must be configured
api.store = null;

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

// tasks REST API

// add routes
bedrock.events.on('bedrock-express.configure.routes', function(app) {
  // TODO: add validation
  app.post(
    '/tasks/credentials/compose-identity',
    ensureAuthenticated, acceptableContent('json', '+json'),
    function(req, res, next) {
    var credentialQuery = req.body.query;

    // TODO: publicKey credential is only required to be present for ephemeral
    // and non-DID based keys

    // publicKey has the following properties: `id`, `publicKeyPem`, and `type`
    // `type` contains 'CryptographicKey' and may also have
    // ‘EphemeralCryptographicKey’
    // TODO: framing the public key may be necessary, it's TBD
    var publicKey = req.body.publicKey;
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
        // TODO: change `null` to actor, fix permissions
        api.compose(null, req.user.identity.id, credentialQuery, callback);
      },
      getKey: function(callback) {
        // TODO: fetch signing key via owner ID (brIdentity.getPublicKey())
        // or more specific signing key API if necessary
        callback(null, {
          id: bedrock.config.server.baseUri + '/idp/keys/1',
          privateKey: {
            privateKeyPem: bedrock.config.idp.credentialSigningPrivateKey
          }
        });
      },
      addPublicKeyCredential: [
        'compose', 'getKey', function(callback, results) {
        var identity = results.compose;
        // TODO: security hole -- don't sign public key until it is
        // authenticated
        // TODO: add CryptographicKeyCredential for the public key... but
        // first ensure that it belongs to the key owner (probably requires
        // the public key to be digitally signed or already wrapped as
        // a credential and then checked here and resigned/counter-signed)

        // generate public key credential
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
            publicKey: publicKey
          }
        };
        jsigs.sign(publicKeyCredential, {
          privateKeyPem: results.getKey.privateKey.privateKeyPem,
          creator: results.getKey.id
        }, function(err, signed) {
          if(err) {
            return callback(err);
          }
          bedrock.jsonld.addValue(
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
      res.status(200).json(results.addPublicKeyCredential);
    });
  });

  // TODO: add validation
  app.post(
    '/tasks/credentials/store-credentials',
    ensureAuthenticated, acceptableContent('json', '+json'),
    function(req, res, next) {
      async.auto({
        store: function(callback) {
          // FIXME: don't just store first credential (there may be more
          // than one)
          var credential = req.body.credential[0]['@graph'];
          credential.sysState = 'claimed';
          store.insert(null, credential, function(err, record) {
            callback(err, record ? record.credential : null);
          });
        }
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
    });
});
