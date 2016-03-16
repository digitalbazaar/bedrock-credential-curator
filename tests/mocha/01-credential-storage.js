/*
 * Copyright (c) 2015-2016 Digital Bazaar, Inc. All rights reserved.
 */
 /* globals describe, before, after, it, should, beforeEach, afterEach */
 /* jshint node: true */
'use strict';

var async = require('async');
var bedrock = require('bedrock');
var config = bedrock.config;
var util = bedrock.util;
var database = require('bedrock-mongodb');
var eventLog = require('bedrock-event-log').log;
var helpers = require('./helpers');
var store = require('bedrock-credentials-mongodb');
var request = require('request');
var mockData = require('./mock.data');
var uuid = require('node-uuid');
request = request.defaults({json: true});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

bedrock.events.on(
  'bedrock-credential-curator.credential.CredentialStore',
  function(event, callback) {
    eventLog.add(event, callback);
  });

var testEndpoint = config.server.baseUri +
  config['credential-curator'].endpoints.storeCredentials;

describe('bedrock-credential-curator credential storage', function() {
  before('Prepare the database', function(done) {
    helpers.prepareDatabase({credentials: false}, done);
  });
  after('Remove test data', function(done) {
    helpers.removeCollections(done);
  });

  describe('unauthenticated requests', function() {
    it('should respond with 400 - PermissionDenied', function(done) {
      request.post({
        url: testEndpoint,
        body: {'some': 'credential'}
      }, function(err, res, body) {
        should.not.exist(err);
        res.statusCode.should.equal(400);
        should.exist(body);
        body.should.be.an('object');
        body.type.should.be.a('string');
        body.type.should.equal('PermissionDenied');
        done();
      });
    });
  });

  describe('authenticated requests', function() {
    it('should respond PermissionDenied when public key is not registered',
      function(done) {
      request.post({
        url: testEndpoint,
        body: createUniqueCredential(uuid.v4()),
        httpSignature:
          helpers.createHttpSignature(mockData.badIdentities.userUnknown)
      }, function(err, res, body) {
        should.not.exist(err);
        res.statusCode.should.equal(400);
        should.exist(body);
        body.should.be.an('object');
        body.type.should.be.a('string');
        body.type.should.equal('PermissionDenied');
        done();
      });
    });

    it('should respond with 200 on a valid storage request', function(done) {
      var uniqueCredential = createUniqueCredential(uuid.v4());
      request.post({
        url: testEndpoint,
        body: uniqueCredential,
        httpSignature: helpers.createHttpSignature(mockData.identities.rsa4096)
      }, function(err, res, body) {
        should.not.exist(err);
        res.statusCode.should.equal(200);
        var credentialId = uniqueCredential.credential[0]['@graph'].id;
        findCredential(credentialId, function(err, result) {
          should.not.exist(err);
          result.should.equal(1);
          done();
        });
      });
    });

    // FIXME: enable this test after
    // bedrock-credential-curator#enableStorePermission has been merged
    it.skip('should respond PermissionDenied on invalid permissions',
      function(done) {
      var uniqueCredential =
        createUniqueCredential(uuid.v4());
      request.post({
        url: testEndpoint,
        body: uniqueCredential,
        httpSignature:
          helpers.createHttpSignature(mockData.identities.noPermissions)
      }, function(err, res, body) {
        should.not.exist(err);
        res.statusCode.should.equal(403);
        should.exist(body);
        body.should.be.an('object');
        should.exist(body.type);
        body.type.should.be.a('string');
        body.type.should.equal('PermissionDenied');
        should.exist(body.details);
        body.details.should.be.an('object');
        should.exist(body.details.sysPermission);
        body.details.sysPermission.should.be.a('string');
        body.details.sysPermission.should.equal('CREDENTIAL_INSERT');
        done();
      });
    });
  });

  describe('duplicate detection', function() {
    var referenceIdAlpha;

    beforeEach(function(done) {
      referenceIdAlpha = uuid.v4();
      var credentialAlpha = createUniqueCredential(uuid.v4());
      credentialAlpha.credential[0]['@graph'].referenceId = referenceIdAlpha;
      request.post({
        url: testEndpoint,
        body: credentialAlpha,
        httpSignature: helpers.createHttpSignature(mockData.identities.rsa4096)
      }, function(err, res, body) {
        should.not.exist(err);
        res.statusCode.should.equal(200);
        done();
      });
    });

    it('should store credentials with unique referenceIds', function(done) {
      var credentialBeta = createUniqueCredential(uuid.v4());
      // use a unique referenceId
      credentialBeta.credential[0]['@graph'].referenceId = uuid.v4();
      request.post({
        url: testEndpoint,
        body: credentialBeta,
        httpSignature: helpers.createHttpSignature(mockData.identities.rsa4096)
      }, function(err, res, body) {
        should.not.exist(err);
        res.statusCode.should.equal(200);
        done();
      });
    });

    // FIXME: Enable test when unique index is enabled in credentials-mongodb
    it.skip(
      'should return 409 on duplicate issuer + referenceId', function(done) {
      var credentialGamma = createUniqueCredential(uuid.v4());
      // reuse referenceIdAlpha
      credentialGamma.credential[0]['@graph'].referenceId = referenceIdAlpha;
      request.post({
        url: testEndpoint,
        body: credentialGamma,
        httpSignature: helpers.createHttpSignature(mockData.identities.rsa4096)
      }, function(err, res, body) {
        should.not.exist(err);
        res.statusCode.should.equal(409);
        should.exist(body);
        body.should.be.an('object');
        should.exist(body.type);
        body.type.should.be.a('string');
        body.type.should.equal('DuplicateCredential');
        done();
      });
    });
  });

  describe('CredentialStore event logging', function() {
    var savedConfig = {};
    before(function(done) {
      database.collections.eventLog.drop(function(err) {
        // ignore mongo errors, error is thrown if collection does not exist
        done();
      });
    });
    beforeEach(function() {
      savedConfig.CredentialStore =
        config['event-log'].eventTypes.CredentialStore;
    });
    afterEach(function(done) {
      config['event-log'].eventTypes.CredentialStore =
        savedConfig.CredentialStore;
      database.collections.eventLog.drop(function(err) {
        // ignore mongo errors, error is thrown if collection does not exist
        done();
      });
    });
    it('should log a valid storage request', function(done) {
      async.series([
        function(callback) {
          request.post({
            url: testEndpoint,
            body: helpers.createIdentity(mockData.identities.rsa4096),
            httpSignature:
              helpers.createHttpSignature(mockData.identities.rsa4096)
          }, function(err, res, body) {
            should.not.exist(err);
            res.statusCode.should.equal(200);
            callback();
          });
        },
        function(callback) {
          database.collections.eventLog.find({
            'event.actor': mockData.identities.rsa4096.identity.id
          }).toArray(function(err, records) {
            should.not.exist(err);
            should.exist(records);
            records.should.be.an('array');
            records.should.have.length(1);
            records[0].should.be.an('object');
            helpers.validateEvent(
              'CredentialStore', records[0], mockData.identities.rsa4096);
            callback();
          });
        }
      ], done);
    });
    it('should log a storage request if ensureWriteSuccess is false',
     function(done) {
      async.series([
        function(callback) {
          config['event-log'].eventTypes.CredentialQuery.ensureWriteSuccess =
            false;
          request.post({
            url: testEndpoint,
            body: helpers.createIdentity(mockData.identities.tenCredentials),
            httpSignature:
              helpers.createHttpSignature(mockData.identities.tenCredentials)
          }, function(err, res, body) {
            should.not.exist(err);
            res.statusCode.should.equal(200);
            callback();
          });
        },
        function(callback) {
          database.collections.eventLog.find({
            'event.actor': mockData.identities.tenCredentials.identity.id
          }).toArray(function(err, records) {
            should.not.exist(err);
            should.exist(records);
            records.should.be.an('array');
            records.should.have.length(1);
            records[0].should.be.an('object');
            helpers.validateEvent(
              'CredentialStore', records[0],
              mockData.identities.tenCredentials);
            callback();
          });
        }
      ], done);
    });
  });
});

function createUniqueCredential(claimId) {
  var testBaseUri = 'https://example.com/credentials/';
  var newCredential = util.clone(mockData.credentialTemplate);
  newCredential.id = testBaseUri + uuid.v4();
  newCredential.claim.id = claimId;
  var newIdentity = {
    '@context': 'https://w3id.org/identity/v1',
    type: 'Identity',
    id: claimId,
    credential: [{'@graph': newCredential}]
  };
  return newIdentity;
}

function findCredential(credentialId, callback) {
  var query = {'credential.id': credentialId};
  store.provider.collection.count(query, {}, function(err, result) {
    if(err) {
      return callback(err);
    }
    callback(null, result);
  });
}
