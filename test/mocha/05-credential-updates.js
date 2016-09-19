/*
 * Copyright (c) 2015-2016 Digital Bazaar, Inc. All rights reserved.
 */
 /* globals describe, before, after, it, should, beforeEach, afterEach */
 /* jshint node: true */
'use strict';

var async = require('async');
var bedrock = require('bedrock');
var config = bedrock.config;
var database = require('bedrock-mongodb');
var eventLog = require('bedrock-event-log').log;
var helpers = require('./helpers');
var mockData = require('./mock.data');
var request = require('request');
request = request.defaults({json: true});
var store = require('bedrock-credentials-mongodb');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

// register listeners for event logging
bedrock.events.on(
  'bedrock-credentials-rest.credential.CredentialClaim',
  function(event, callback) {
    eventLog.add(event, callback);
  });
bedrock.events.on(
  'bedrock-credentials-rest.credential.CredentialReject',
  function(event, callback) {
    eventLog.add(event, callback);
  });

var testEndpoint = config.server.baseUri +
  config['credentials-rest'].basePath;

describe('bedrock-credential-curator credential updates', function() {
  before('Prepare the database', function(done) {
    helpers.prepareDatabase({
      credentials: {
        insert: true,
        claimed: false
      }
    }, done);
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
    it('should respond PermissionDenied when public key unregistered',
      function(done) {
      var query = {};
      request.post({
        url: testEndpoint,
        body: query,
        httpSignature:
          helpers.createHttpSignature(
            mockData.badIdentities.userUnknown)
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
    describe('when credential is specified with ?id=credentialId',
      function() {
      it('should respond 400 on unknown credential', function(done) {
        var credentialId = testEndpoint + '/unknownCredentialId1234';
        var updateRequest = {
          '@context': 'https://w3id.org/identity/v1',
          id: credentialId,
          sysState: 'claimed'
        };
        request.post({
          url: testEndpoint + '?id=' + credentialId,
          body: updateRequest,
          httpSignature:
            helpers.createHttpSignature(
              mockData.identities.tenCredentials)
        }, function(err, res, body) {
          should.not.exist(err);
          res.statusCode.should.equal(400);
          should.exist(body);
          body.should.be.an('object');
          should.exist(body.type);
          body.type.should.be.a('string');
          body.type.should.equal('UpdateCredentialFailed');
          done();
        });
      });
      it('should mark a credential "claimed"', function(done) {
        var credentialId =
          mockData.identities.tenCredentials.credentials[0].id;
        var startTime = Date.now();
        async.series([
          function(callback) {
            var updateRequest = {
              '@context': 'https://w3id.org/identity/v1',
              id: credentialId,
              sysState: 'claimed'
            };
            request.post({
              url: testEndpoint + '?id=' + credentialId,
              body: updateRequest,
              httpSignature:
                helpers.createHttpSignature(
                  mockData.identities.tenCredentials)
            }, function(err, res, body) {
              should.not.exist(err);
              res.statusCode.should.equal(204);
              callback();
            });
          },
          function(callback) {
            var options = {
              credentialId: credentialId,
              startTime: startTime,
              stopTime: Date.now(),
              expectedState: 'claimed',
              acceptanceStatus: 'accepted'
            };
            validateCredential(options, callback);
          }
        ], done);
      });
      it('should mark a credential "rejected"', function(done) {
        var credentialId =
          mockData.identities.tenCredentials.credentials[1].id;
        var startTime = Date.now();
        async.series([
          function(callback) {
            var updateRequest = {
              '@context': 'https://w3id.org/identity/v1',
              id: credentialId,
              sysState: 'rejected'
            };
            request.post({
              url: testEndpoint + '?id=' + credentialId,
              body: updateRequest,
              httpSignature:
                helpers.createHttpSignature(
                  mockData.identities.tenCredentials)
            }, function(err, res, body) {
              should.not.exist(err);
              res.statusCode.should.equal(204);
              callback();
            });
          },
          function(callback) {
            var options = {
              credentialId: credentialId,
              startTime: startTime,
              stopTime: Date.now(),
              expectedState: 'rejected',
              acceptanceStatus: 'rejected'
            };
            validateCredential(options, callback);
          }
        ], done);
      });
      it('should return 400 on redundant claim/reject requests',
        function(done) {
        var credentialId =
          mockData.identities.tenCredentials.credentials[2].id;
        var updateRequest = {
          '@context': 'https://w3id.org/identity/v1',
          id: credentialId,
          sysState: 'claimed'
        };
        var options = {
          credentialId: credentialId,
          endpoint: testEndpoint + '?id=' + credentialId,
          identity: mockData.identities.tenCredentials,
          updateRequest: updateRequest
        };
        testRedundantRequest(options, done);
      });
      it('return 409 if credential id in URL != update request',
        function(done) {
          var credentialId =
            mockData.identities.tenCredentials.credentials[3].id;
          var badCredentialId = 'https://wrongid.com/credential/1234';
          var updateRequest = {
            '@context': 'https://w3id.org/identity/v1',
            id: credentialId,
            sysState: 'rejected'
          };
          request.post({
            url: testEndpoint + '?id=' + badCredentialId,
            body: updateRequest,
            httpSignature:
              helpers.createHttpSignature(
                mockData.identities.tenCredentials)
          }, function(err, res, body) {
            should.not.exist(err);
            res.statusCode.should.equal(409);
            should.exist(body);
            body.should.be.an('object');
            should.exist(body.type);
            body.type.should.be.a('string');
            body.type.should.equal('CredentialIdMismatch');
            done();
          });
        });
    });
    describe('when credential is specified in the URL', function() {
      it('should respond 400 on unknown credential', function(done) {
        var credentialId = testEndpoint + '/unknownCredentialId1234';
        var updateRequest = {
          '@context': 'https://w3id.org/identity/v1',
          id: credentialId,
          sysState: 'claimed'
        };
        request.post({
          url: credentialId,
          body: updateRequest,
          httpSignature:
            helpers.createHttpSignature(
              mockData.identities.tenCredentials)
        }, function(err, res, body) {
          should.not.exist(err);
          res.statusCode.should.equal(400);
          should.exist(body);
          body.should.be.an('object');
          should.exist(body.type);
          body.type.should.be.a('string');
          body.type.should.equal('UpdateCredentialFailed');
          done();
        });
      });
      it('should mark a credential as "claimed"', function(done) {
        var credentialId =
          mockData.identities.tenCredentials.credentials[4].id;
        var startTime = Date.now();
        async.series([
          function(callback) {
            var updateRequest = {
              '@context': 'https://w3id.org/identity/v1',
              id: credentialId,
              sysState: 'claimed'
            };
            request.post({
              url: credentialId,
              body: updateRequest,
              httpSignature:
                helpers.createHttpSignature(
                  mockData.identities.tenCredentials)
            }, function(err, res, body) {
              should.not.exist(err);
              res.statusCode.should.equal(204);
              callback();
            });
          },
          function(callback) {
            var options = {
              credentialId: credentialId,
              startTime: startTime,
              stopTime: Date.now(),
              expectedState: 'claimed',
              acceptanceStatus: 'accepted'
            };
            validateCredential(options, callback);
          }
        ], done);
      });
      it('should mark a credential as "rejected"', function(done) {
        var credentialId =
          mockData.identities.tenCredentials.credentials[5].id;
        var startTime = Date.now();
        async.series([
          function(callback) {
            var updateRequest = {
              '@context': 'https://w3id.org/identity/v1',
              id: credentialId,
              sysState: 'rejected'
            };
            request.post({
              url: credentialId,
              body: updateRequest,
              httpSignature:
                helpers.createHttpSignature(
                  mockData.identities.tenCredentials)
            }, function(err, res, body) {
              should.not.exist(err);
              res.statusCode.should.equal(204);
              callback();
            });
          },
          function(callback) {
            var options = {
              credentialId: credentialId,
              startTime: startTime,
              stopTime: Date.now(),
              expectedState: 'rejected',
              acceptanceStatus: 'rejected'
            };
            validateCredential(options, callback);
          }
        ], done);
      });
      it('should return 400 on redundant claim/reject requests',
        function(done) {
        var credentialId =
          mockData.identities.tenCredentials.credentials[6].id;
        var updateRequest = {
          '@context': 'https://w3id.org/identity/v1',
          id: credentialId,
          sysState: 'claimed'
        };
        var options = {
          credentialId: credentialId,
          endpoint: credentialId,
          identity: mockData.identities.tenCredentials,
          updateRequest: updateRequest
        };
        testRedundantRequest(options, done);
      });
      it('return 409 if credential id in URL != update request',
        function(done) {
          var credentialId =
            mockData.identities.tenCredentials.credentials[3].id;
          var badCredentialId = 'https://wrongid.com/credential/1234';
          var updateRequest = {
            '@context': 'https://w3id.org/identity/v1',
            id: badCredentialId,
            sysState: 'rejected'
          };
          request.post({
            url: credentialId,
            body: updateRequest,
            httpSignature:
              helpers.createHttpSignature(
                mockData.identities.tenCredentials)
          }, function(err, res, body) {
            should.not.exist(err);
            res.statusCode.should.equal(409);
            should.exist(body);
            body.should.be.an('object');
            should.exist(body.type);
            body.type.should.be.a('string');
            body.type.should.equal('CredentialIdMismatch');
            done();
          });
        });
    });
  });
  describe('event logging', function() {
    var savedConfig = {};
    beforeEach(function() {
      savedConfig.CredentialClaim =
        config['event-log'].eventTypes.CredentialClaim;
      savedConfig.CredentialReject =
        config['event-log'].eventTypes.CredentialReject;
    });
    afterEach(function(done) {
      config['event-log'].eventTypes.CredentialClaim =
        savedConfig.CredentialClaim;
      config['event-log'].eventTypes.CredentialReject =
        savedConfig.CredentialReject;
      database.collections.eventLog.drop(function(err) {
        // ignore mongo errors, error is thrown if collection does not exist
        done();
      });
    });
    it('should log credential acceptance', function(done) {
      var credentialId =
        mockData.identities.tenCredentials.credentials[7].id;
      var startTime = Date.now();
      async.series([
        function(callback) {
          var updateRequest = {
            '@context': 'https://w3id.org/identity/v1',
            id: credentialId,
            sysState: 'claimed'
          };
          request.post({
            url: credentialId,
            body: updateRequest,
            httpSignature:
              helpers.createHttpSignature(
                mockData.identities.tenCredentials)
          }, function(err, res, body) {
            should.not.exist(err);
            res.statusCode.should.equal(204);
            callback();
          });
        },
        function(callback) {
          var options = {
            credentialId: credentialId,
            eventType: 'CredentialClaim',
            identity: mockData.identities.tenCredentials.identity
          };
          checkEvent(options, callback);
        }
      ], done);
    });
    it('should log credential rejection', function(done) {
      var credentialId =
        mockData.identities.tenCredentials.credentials[8].id;
      var startTime = Date.now();
      async.series([
        function(callback) {
          var updateRequest = {
            '@context': 'https://w3id.org/identity/v1',
            id: credentialId,
            sysState: 'rejected'
          };
          request.post({
            url: credentialId,
            body: updateRequest,
            httpSignature:
              helpers.createHttpSignature(
                mockData.identities.tenCredentials)
          }, function(err, res, body) {
            should.not.exist(err);
            res.statusCode.should.equal(204);
            callback();
          });
        },
        function(callback) {
          var options = {
            credentialId: credentialId,
            eventType: 'CredentialReject',
            identity: mockData.identities.tenCredentials.identity
          };
          checkEvent(options, callback);
        }
      ], done);
    });
  });
});

function testRedundantRequest(options, callback) {
  async.series([
    function(callback) {
      request.post({
        url: options.endpoint,
        body: options.updateRequest,
        httpSignature:
          helpers.createHttpSignature(options.identity)
      }, function(err, res, body) {
        should.not.exist(err);
        res.statusCode.should.equal(204);
        callback();
      });
    },
    function(callback) {
      request.post({
        url: options.endpoint,
        body: options.updateRequest,
        httpSignature:
          helpers.createHttpSignature(options.identity)
      }, function(err, res, body) {
        should.not.exist(err);
        res.statusCode.should.equal(400);
        should.exist(body);
        body.should.be.an('object');
        should.exist(body.type);
        body.type.should.be.a('string');
        body.type.should.equal('UpdateCredentialFailed');
        callback();
      });
    }
  ], callback);
}

function validateCredential(options, callback) {
  store.provider.get(
    null, options.credentialId, function(err, credential, meta) {
      credential.sysState.should.be.a('string');
      credential.sysState.should.equal(options.expectedState);
      should.exist(meta.acceptance);
      meta.acceptance.should.be.an('object');
      should.exist(meta.updated);
      meta.updated.should.be.a('number');
      meta.updated.should.be.within(options.startTime, options.stopTime);
      should.exist(meta.acceptance.status);
      meta.acceptance.status.should.be.a('string');
      meta.acceptance.status.should.equal(options.acceptanceStatus);
      should.exist(meta.acceptance.date);
      meta.acceptance.date.should.be.a('number');
      meta.acceptance.date.should.equal(meta.updated);
      callback();
    });
}

function checkEvent(options, callback) {
  database.collections.eventLog.find({
    'event.actor': options.identity.id,
    'event.resource': options.credentialId
  }).toArray(function(err, records) {
    should.not.exist(err);
    should.exist(records);
    records.should.be.an('array');
    records.should.have.length(1);
    records[0].should.be.an('object');
    helpers.validateEvent(
      options.eventType, records[0], options.identity);
    callback();
  });
}
