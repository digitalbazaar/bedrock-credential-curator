/*
 * Bedrock Credential Curator module.
 *
 * Copyright (c) 2015 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var bodyParser = require('body-parser');
var brPassport = require('bedrock-passport');
var brPermission = require('bedrock-permission');
var jsigs = require('jsonld-signatures')({
  inject: {jsonld: bedrock.jsonld}
});
var acceptableContent = require('bedrock-express').middleware.acceptableContent;
var ensureAuthenticated = brPassport.ensureAuthenticated;
var relaxedAuthenticate = brPassport.createAuthenticator(
  {allowUrlEncoded: true, allowHosts: '*'});
var getDefaultViewVars = require('bedrock-views').getDefaultViewVars;

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
  // parse application/x-www-form-urlencoded
  var parseForm = bodyParser.urlencoded({extended: false});

  // parse JSON in form data
  function parseJsonData(req, res, next) {
    try {
      req.body = JSON.parse(req.body.jsonPostData);
    } catch(e) {
      return next(new BedrockError('Invalid JSON.', 'JSONParseError', {
        httpStatusCode: 400,
        public: true
      }));
    }
    return next();
  }

  app.post(
    '/tasks/credentials/compose-identity',
    relaxedAuthenticate, acceptableContent('urlencoded'),
    parseForm, parseJsonData, function(req, res, next) {
    async.auto({
      compose: function(callback) {
        api.compose(null, req.user.identity.id, req.body, callback);
      },
      display: ['compose', function(callback, results) {
        getDefaultViewVars(req, function(err, vars) {
          if(err) {
            return next(err);
          }
          vars.curator = {identity: results.compose};
          vars.request = {
            credentialCallbackUrl: req.query.credentialCallback
          };
          res.render('main.html', vars);
          callback(null);
        });
      }]
    }, function(err) {
      if(err) {
        return next(err);
      }
    });
  });

  app.post(
    '/tasks/credentials/sign-identity',
    ensureAuthenticated, acceptableContent('json', '+json'),
    function(req, res, next) {
    async.auto({
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
      sign: ['getKey', function(callback, results) {
        // sign the identity for transport
        jsigs.sign(req.body, {
          privateKeyPem: results.getKey.privateKey.privateKeyPem,
          creator: results.getKey.id
        }, callback);
      }]
    }, function(err, results) {
      if(err) {
        return next(err);
      }
      // TODO: ld+json instead?
      res.json(results.sign);
    });
  });

  app.post(
    '/tasks/credentials/request-credential-storage',
    relaxedAuthenticate, acceptableContent('urlencoded'),
    parseForm, parseJsonData, function(req, res, next) {
    getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }
      vars.curator = {};
      // TODO: credentials must be wrapped by @graph
      vars.curator.credential = req.body;
      vars.request = {storageCallback: req.query.storageCallback};
      res.render('main.html', vars);
    });
  });

  app.post(
    '/tasks/credentials/store-credentials',
    ensureAuthenticated, acceptableContent('json', '+json'),
    function(req, res, next) {
    async.auto({
      store: function(callback) {
        // TODO: store creds
        // curator.store()
        callback();
      }
    }, function(err) {
      if(err) {
        return next(err);
      }
      res.sendStatus(200);
    });
  });
});
