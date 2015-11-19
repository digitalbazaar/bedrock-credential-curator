/*
 * Copyright (c) 2014-2015 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

var async = require('async');
var bedrock = require('bedrock');
var brIdentity = require('bedrock-identity');
var config = bedrock.config;
var database = require('bedrock-mongodb');
var eventLog = require('bedrock-event-log').log;
var helpers = require('./helpers');
var mockData = require('./mock.data');
var request = require('request');
request = request.defaults({json: true});
var store = require('bedrock-credentials-mongodb').provider;
var util = bedrock.util;
var uuid = require('node-uuid');
var testEndpoint =
  config.server.baseUri +
  config['credential-curator'].endpoints.composeIdentity;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

bedrock.events.on(
  'bedrock-credential-curator.credential.CredentialQuery',
  function(event, callback) {
    eventLog.add(event, callback);
  });

describe('bedrock-credential-curator compose identity', function() {
  before('Prepare the database', function(done) {
    helpers.prepareDatabase({
      credentials: {
        insert: true,
        claimed: true
      }
    }, done);
  });
  after('Remove test data', function(done) {
    helpers.removeCollections(done);
  });
  describe('unauthenticated requests', function() {
    var cryptographicIdentity;
    before(function(done) {
      helpers.createCrytographicIdentity(
        mockData.badIdentities.userUnknown, function(err, result) {
          cryptographicIdentity = result;
          done(err);
        });
    });
    // NOTE: this is a properly formatted request but it is not authenticated
    it('should respond with 400 - PermissionDenied', function(done) {
      request.post(
        {
          url: testEndpoint,
          body: createQuery(cryptographicIdentity)
        },
        function(err, res, body) {
          should.not.exist(err);
          res.statusCode.should.equal(400);
          should.exist(body.type);
          body.type.should.equal('PermissionDenied');
          done();
        }
      );
    });
    // NOTE: has valid httpSignature for an unknown identity
    it(
      'should respond with 400 - PermissionDenied for unknown user',
      function(done) {
      request.post(
        {
          url: testEndpoint,
          body: createQuery(cryptographicIdentity),
          httpSignature:
            helpers.createHttpSignature(mockData.badIdentities.userUnknown)
        },
        function(err, res, body) {
          should.not.exist(err);
          res.statusCode.should.equal(400);
          should.exist(body.type);
          body.type.should.equal('PermissionDenied');
          done();
        }
      );
    });
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
    it('should fulfill a properly authenticated query', function(done) {
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
    it('should fulfill a properly authenticated query for multiple records',
    function(done) {
      request.post(
        {
          url: testEndpoint,
          body: createQuery(cryptographicIdentity.tenCredentials),
          httpSignature:
            helpers.createHttpSignature(mockData.identities.tenCredentials)
        },
        function(err, res, body) {
          should.not.exist(err);
          res.statusCode.should.equal(200);
          should.exist(body);
          should.exist(body.credential);
          body.credential.should.be.an('array');
          // 11 = 10 credential inserted plus cryptographicKeyCredential
          body.credential.should.have.length(11);
          done();
        }
      );
    });
    // NOTE: the cryptographicKeyCredential is altered,
    // invalidating the signature
    describe('altered cryptographicKeyCredential', function() {
      it(
        'should return InvalidSignature if signature creation date is altered',
        function(done) {
        var alteredCryptographicIdentity =
          util.clone(cryptographicIdentity.rsa4096);
        alteredCryptographicIdentity.credential['@graph'].signature.created =
          new Date('October 13, 2014 11:13:00').toJSON();
        request.post(
          {
            url: testEndpoint,
            body: createQuery(alteredCryptographicIdentity),
            httpSignature:
              helpers.createHttpSignature(mockData.identities.rsa4096)
          },
          function(err, res, body) {
            should.not.exist(err);
            res.statusCode.should.equal(400);
            should.exist(body);
            should.exist(body.type);
            body.type.should.be.a('string');
            body.type.should.equal('InvalidSignature');
            done();
          }
        );
      });
      it('should return InvalidSignature if claim id is altered',
        function(done) {
        var alteredCryptographicIdentity =
          util.clone(cryptographicIdentity.rsa4096);
        alteredCryptographicIdentity.credential['@graph'].claim.id = 'did:' +
          uuid.v4();
        request.post(
          {
            url: testEndpoint,
            body: createQuery(alteredCryptographicIdentity),
            httpSignature:
              helpers.createHttpSignature(mockData.identities.rsa4096)
          },
          function(err, res, body) {
            should.not.exist(err);
            res.statusCode.should.equal(400);
            should.exist(body);
            should.exist(body.type);
            body.type.should.be.a('string');
            body.type.should.equal('InvalidSignature');
            done();
          }
        );
      });
    });
  });

  describe('CredentialQuery event logging', function() {
    var cryptographicIdentity = {};
    var savedConfig = {};
    before(function(done) {
      async.parallel([
        function(callback) {
          helpers.createCrytographicIdentity(
            mockData.identities.logTest, function(err, result) {
              cryptographicIdentity.logTest = result;
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
    beforeEach(function() {
      savedConfig.CredentialQuery =
        config['event-log'].eventTypes.CredentialQuery;
    });
    afterEach(function(done) {
      config['event-log'].eventTypes.CredentialQuery =
        savedConfig.CredentialQuery;
      database.collections.eventLog.drop(function(err) {
        // ignore mongo errors, error is thrown if collection does not exist
        done();
      });
    });
    it('should log a CredentialQuery if logging enabled', function(done) {
      async.series([
        function(callback) {
          config['event-log'].eventTypes.CredentialQuery.ensureWriteSuccess =
            true;
          request.post(
            {
              url: testEndpoint,
              body: createQuery(cryptographicIdentity.logTest),
              httpSignature:
                helpers.createHttpSignature(mockData.identities.logTest)
            },
            function(err, res, body) {
              res.statusCode.should.equal(200);
              callback();
            }
          );
        },
        function(callback) {
          database.collections.eventLog.find({
            'event.actor': mockData.identities.logTest.identity.id
          }).toArray(function(err, records) {
            should.not.exist(err);
            should.exist(records);
            records.should.be.an('array');
            records.should.have.length(1);
            records[0].should.be.an('object');
            helpers.validateEvent(
              'CredentialQuery', records[0], mockData.identities.logTest);
            callback();
          });
        }
      ], done);
    });
    it('should log a CredentialQuery with multiple results', function(done) {
      var mockIdentity = mockData.identities.tenCredentials;
      async.series([
        function(callback) {
          config['event-log'].eventTypes.CredentialQuery.ensureWriteSuccess =
            true;
          request.post(
            {
              url: testEndpoint,
              body: createQuery(cryptographicIdentity.tenCredentials),
              httpSignature:
                helpers.createHttpSignature(mockIdentity)
            },
            function(err, res, body) {
              res.statusCode.should.equal(200);
              callback();
            }
          );
        },
        function(callback) {
          var resources = mockIdentity.credentials.map(function(credential) {
            return credential.id;
          });
          database.collections.eventLog.find({
            'event.actor': mockIdentity.identity.id
          }).toArray(function(err, records) {
            should.not.exist(err);
            should.exist(records);
            records.should.be.an('array');
            records.should.have.length(1);
            records[0].event.resource.should.have.length(10);
            records[0].event.resource.sort()
              .should.deep.equal(resources.sort());
            callback();
          });
        }
      ], done);
    });
    it('should log a CredentialQuery if ensureWriteSuccess false',
      function(done) {
      async.series([
        function(callback) {
          config['event-log'].eventTypes.CredentialQuery.ensureWriteSuccess =
            false;
          request.post(
            {
              url: testEndpoint,
              body: createQuery(cryptographicIdentity.logTest),
              httpSignature:
                helpers.createHttpSignature(mockData.identities.logTest)
            },
            function(err, res, body) {
              res.statusCode.should.equal(200);
              callback();
            }
          );
        },
        function(callback) {
          database.collections.eventLog.find({
            'event.actor': mockData.identities.logTest.identity.id
          }).toArray(function(err, records) {
            should.not.exist(err);
            should.exist(records);
            records.should.be.an('array');
            records.should.have.length(1);
            records[0].should.be.an('object');
            helpers.validateEvent(
              'CredentialQuery', records[0], mockData.identities.logTest);
            callback();
          });
        }
      ], done);
    });
  });

  // NOTE: the request is properly authenticated with a known Identity,
  // but the cryptographicKeyCredential does not match the authenticated user
  describe('identity mismatch', function() {
    var cryptographicIdentity;
    before(function(done) {
      helpers.createCrytographicIdentity(
        mockData.identities.noPermissions, function(err, result) {
          cryptographicIdentity = result;
          done(err);
        });
    });
    it('should respond 409 - AuthenticationMismatch', function(done) {
      request.post(
        {
          url: testEndpoint,
          body: createQuery(cryptographicIdentity),
          httpSignature:
            helpers.createHttpSignature(mockData.identities.rsa4096)
        },
        function(err, res, body) {
          should.not.exist(err);
          res.statusCode.should.equal(409);
          should.exist(body);
          should.exist(body.type);
          body.type.should.be.a('string');
          body.type.should.equal('AuthenticationMismatch');
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
