/*
 * Copyright (c) 2015-2016 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

var async = require('async');
var bedrock = require('bedrock');
var config = bedrock.config;
var database = require('bedrock-mongodb');
var mockData = require('./mock.data');
var brIdentity = require('bedrock-identity');
var brKey = require('bedrock-key');
var jsonld = bedrock.jsonld;
var jsigs = require('jsonld-signatures');
jsigs.use('jsonld', jsonld);
var store = require('bedrock-credentials-mongodb').provider;
var uuid = require('node-uuid');
var URL = require('url');

// module API
var api = {};
module.exports = api;

api.createCrytographicIdentity = function(sourceIdentity, callback) {
  var publicKey = {
    '@context': 'https://w3id.org/identity/v1',
    id: sourceIdentity.keys.publicKey.id,
    type: 'CryptographicKey',
    owner: sourceIdentity.identity.id,
    publicKeyPem: sourceIdentity.keys.publicKey.publicKeyPem
  };
  var credential = {
    '@context': 'https://w3id.org/identity/v1',
    id: 'urn:ephemeral:' + uuid.v4(),
    type: ['Credential', 'CryptographicKeyCredential'],
    claim: {
      id: sourceIdentity.identity.id,
      publicKey: publicKey
    }
  };
  jsigs.sign(
    credential, {
      privateKeyPem:
        sourceIdentity.keys.privateKey.privateKeyPem,
      creator: sourceIdentity.keys.publicKey.id,
      domain: URL.parse(config.server.baseUri).host,
      algorithm: 'LinkedDataSignature2015'
    }, function(err, signedCredential) {
      if(err) {
        callback(err);
      }
      var targetIdentity = {
        '@context': 'https://w3id.org/identity/v1',
        id: sourceIdentity.identity.id,
        type: 'Identity',
        credential: {'@graph': signedCredential}
      };
      callback(null, targetIdentity);
    });
};

api.createHttpSignature = function(sourceIdentity) {
  var httpSignature = {
    key: sourceIdentity.keys.privateKey.privateKeyPem,
    keyId: sourceIdentity.keys.publicKey.id,
    headers: ['date', 'host', 'request-line']
  };
  return httpSignature;
};

api.createIdentity = function(identity) {
  var newIdentity = {
    '@context': 'https://w3id.org/identity/v1',
    type: 'Identity',
    id: identity.identity.id,
    credential: [{'@graph': identity.credentials[0]}]
  };
  return newIdentity;
};

api.validateEvent = function(eventType, record, identity) {
  switch(eventType) {
    case 'CredentialQuery':
      should.exist(record.typeSpecific);
      record.typeSpecific.should.be.a('string');
      record.typeSpecific.should
        .equal(database.hash(identity.identity.id));
      should.exist(record.event);
      record.event.should.be.an('object');
      var event = record.event;
      should.exist(event.type);
      event.type.should.be.a('string');
      event.type.should.equal('CredentialQuery');
      should.exist(event.date);
      should.exist(event.subject);
      event.subject.should.be.a('string');
      event.subject.should.equal(identity.identity.id);
      should.exist(event.resource);
      event.resource.should.be.an('array');
      event.resource.should.have.length(1);
      event.resource[0].should.be.a('string');
      event.resource[0].should
        .equal(identity.credentials[0].id);
      should.exist(event.actor);
      event.actor.should.be.a('string');
      event.actor.should.equal(identity.identity.id);
      should.exist(event.id);
      event.id.should.be.a('string');
      break;
    case 'CredentialStore':
      should.exist(record.typeSpecific);
      record.typeSpecific.should.be.a('string');
      record.typeSpecific.should
        .equal(database.hash(identity.identity.id));
      should.exist(record.event);
      record.event.should.be.an('object');
      var event = record.event;
      should.exist(event.type);
      event.type.should.be.a('string');
      event.type.should.equal('CredentialStore');
      should.exist(event.date);
      should.exist(event.subject);
      event.subject.should.be.a('string');
      event.subject.should.equal(identity.identity.id);
      should.exist(event.resource);
      event.resource.should.be.an('array');
      event.resource.should.have.length(1);
      event.resource[0].should.be.a('string');
      event.resource[0].should.equal(identity.credentials[0].id);
      should.exist(event.actor);
      event.actor.should.be.a('string');
      event.actor.should.equal(identity.identity.id);
      should.exist(event.id);
      event.id.should.be.a('string');
      break;
  }
};

api.removeCollections = function(callback) {
  var collectionNames = [
    'credentialProvider', 'identity', 'publicKey', 'eventLog'];
  database.openCollections(collectionNames, function(err) {
    async.each(collectionNames, function(collectionName, callback) {
      database.collections[collectionName].remove({}, callback);
    }, function(err) {
      callback(err);
    });
  });
};

api.prepareDatabase = function(options, callback) {
  async.series([
    function(callback) {
      api.removeCollections(callback);
    },
    function(callback) {
      api.insertTestData(options, callback);
    }
  ], function(err) {
    callback(err);
  });
};

// Insert identities and public keys used for testing into database
api.insertTestData = function(options, callback) {
  async.forEachOf(mockData.identities, function(identity, key, callback) {
    async.parallel([
      function(callback) {
        brIdentity.insert(null, identity.identity, callback);
      },
      function(callback) {
        brKey.addPublicKey(null, identity.keys.publicKey, callback);
      },
      function(callback) {
        if(!options.credentials.insert) {
          return callback();
        }
        async.each(identity.credentials, function(credential, callback) {
          if(options.credentials.claimed) {
            credential.sysState = 'claimed';
          }
          credential.sysState = 'unclaimed';
          store.insert(null, credential, callback);
        }, callback);
      }
    ], callback);
  }, function(err) {
    if(err) {
      if(!database.isDuplicateError(err)) {
        // duplicate error means test data is already loaded
        return callback(err);
      }
    }
    callback();
    // revoke one credential for test
    // brIdentity.revokePublicKey(null,
    //   identities.rsa1024Revoked.keys.publicKey.id,
    //     function(err, publicKey) {
    //       if(err) {
    //         if(err.name !== 'NotFound') {
    //           // NotFound error occurs if key has already been revoked
    //           return done(err);
    //         }
    //       }
    //       callback();
    //     }
    // );
  });
};
