/*
 * Copyright (c) 2014-2016 Digital Bazaar, Inc. All rights reserved.
 */
/* globals describe, before, after, it, should, beforeEach, afterEach */
/* jshint node: true */
'use strict';

// FIXME: These tests should eventually be moved into the bedrock-passport
// module when it has a test suite.  This module had the infrastructure that
// made adding these tests expedient.
// These tests are related to cases when the keyId in the HTTPSignature is a
// DID and there is not a registered key or identity already in the system.
// In this case, the didio module will attempt to pull the DID document from
// authorization.io and use the public key found there.

var async = require('async');
var bedrock = require('bedrock');
var brIdentity = require('bedrock-identity');
var config = bedrock.config;
var constants = config.constants;
var database = require('bedrock-mongodb');
var eventLog = require('bedrock-event-log').log;
var helpers = require('./helpers');
var mockData = require('./mock.data');
var request = require('request');
request = request.defaults({json: true});
var store = require('bedrock-credentials-mongodb').provider;
var util = bedrock.util;
var uuid = require('node-uuid');
var jsonld = bedrock.jsonld;
var nodeDocumentLoader = jsonld.documentLoaders.node({strictSSL: false});
jsonld.documentLoader = function(url, callback) {
  var regex = new RegExp(
    config['credential-curator']['authorization-io'].baseUrl + '(.*?)$');
  var didMatch = url.match(regex);
  if(didMatch && didMatch.length === 2 &&
    didMatch[1] in mockData.didDocuments) {
    return callback(
      null, {
        contextUrl: null,
        document: mockData.didDocuments[didMatch[1]],
        documentUrl: url
      });
  }
  if(url in constants.CONTEXTS) {
    return callback(
      null, {
        contextUrl: null,
        document: constants.CONTEXTS[url],
        documentUrl: url
      });
  }
  nodeDocumentLoader(url, callback);
};

var testEndpoint =
  config.server.baseUri +
  config['credential-curator'].endpoints.composeIdentity;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

describe('bedrock-credential-curator signed request', function() {
  before('Prepare the database', function(done) {
    helpers.prepareDatabase({
      credentials: {
        insert: true,
        claimed: true
      },
      identities: {
        insert: false
      }
    }, done);
  });
  after('Remove test data', function(done) {
    helpers.removeCollections(done);
    // done();
  });

  describe('authenticated requests', function() {
    var cryptographicIdentity = {};
    before(function(done) {
      async.parallel([
        function(callback) {
          helpers.createCrytographicIdentity(
            mockData.identities.rsa4096, function(err, result) {
              cryptographicIdentity.rsa4096 = result;
              callback(err);
            });
        },
        function(callback) {
          helpers.createCrytographicIdentity(
            mockData.identities.tenCredentials, function(err, result) {
              cryptographicIdentity.tenCredentials = result;
              callback(err);
            });
        }
      ], done);
    });
    it('Allows signature with a DID as the key id', function(done) {
      request.post(
        {
          url: testEndpoint,
          body: createQuery(cryptographicIdentity.rsa4096),
          httpSignature:
            helpers.createHttpSignature(mockData.identities.rsa4096)
        },
        function(err, res, body) {
          should.not.exist(err);
          res.statusCode.should.equal(200);
          should.exist(body);
          should.exist(body.credential);
          body.credential.should.be.an('array');
          // two = credential inserted plus cryptographicKeyCredential
          body.credential.should.have.length(2);
          body.credential[0]['@graph']
            .should.deep.equal(mockData.identities.rsa4096.credentials[0]);
          done();
        }
      );
    });
    it('Rejects signature with non-matching public key DID', function(done) {
      // NOTE: this DID exists (is mocked), but the public key doesn't match
      // the private key
      var altSignature =
        helpers.createHttpSignature(mockData.identities.rsa4096);
      altSignature.keyId =
        mockData.identities.tenCredentials.keys.publicKey.id;
      request.post(
        {
          url: testEndpoint,
          body: createQuery(cryptographicIdentity.rsa4096),
          httpSignature: altSignature
        },
        function(err, res, body) {
          should.not.exist(err);
          res.statusCode.should.equal(400);
          should.exist(body);
          body.should.be.an('object');
          should.exist(body.type);
          body.type.should.equal('PermissionDenied');
          done();
        }
      );
    });
    it('Rejects signature with non-existing public key DID', function(done) {
      // NOTE: this keyId DID is random and is not mocked
      var altSignature =
        helpers.createHttpSignature(mockData.identities.rsa4096);
      altSignature.keyId = 'did:' + uuid.v4() + '/keys/1';
      request.post(
        {
          url: testEndpoint,
          body: createQuery(cryptographicIdentity.rsa4096),
          httpSignature: altSignature
        },
        function(err, res, body) {
          should.not.exist(err);
          res.statusCode.should.equal(400);
          should.exist(body);
          body.should.be.an('object');
          should.exist(body.type);
          body.type.should.equal('PermissionDenied');
          done();
        }
      );
    });
  });
});

function createQuery(cryptographicIdentity) {
  var credentialQuery = {
    query: {
      '@context': 'https://w3id.org/identity/v1',
      birthDate: ''
    },
    identity: cryptographicIdentity
  };
  return credentialQuery;
}
