/*
 * Bedrock Credential Curator module.
 *
 * Copyright (c) 2015 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var brPermission = require('bedrock-permission');
var jsigs = require('jsonld-signatures')({
  inject: {jsonld: bedrock.jsonld}
});
var BedrockError = bedrock.util.BedrockError;

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

  async.auto({
    checkPermission: function(callback) {
      brPermission.checkPermission(
        actor, PERMISSIONS.CREDENTIAL_CLAIM, {resource: options.recipient},
        callback);
    },
    verify: ['checkPermission', function(callback, results) {
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

api.compose = function(template, options, callback) {
  if(!api.store) {
    return callback(new BedrockError(
      'Credential store not found.', 'CredentialStoreNotFound'));
  }

  // TODO: process template to determine which credentials to fetch
  // TODO: filter potential credentials via options (options can be used
  // to restrict the types of credentials to retrieve to help optimize)
  // TODO: fetch them with .getAll() ... or do we require a different
  //   abstraction on credential stores (perhaps one that will get credentials
  //   that match the filter and let the store be the thing that handles it)
  // TODO: pass back set of credentials that can populate some part of the
  // template
};
