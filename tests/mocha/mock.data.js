/*
 * Copyright (c) 2015-2016 Digital Bazaar, Inc. All rights reserved.
 */
/* globals require, module, exports */
/* jshint -W097 */
'use strict';

var bedrock = require('bedrock');
var config = bedrock.config;
var util = bedrock.util;
var uuid = require('node-uuid');

var credentialTemplate = {
  '@context': 'https://w3id.org/identity/v1',
  issuer: 'did:603e6408-7afb-49e0-a484-b236ae2ba01f',
  type: [
    'Credential',
    'BirthDateCredential'
  ],
  name: 'Birth Date Credential',
  image: 'https://images.com/verified-email-badge',
  issued: '2013-06-17T11:11:11Z',
  claim: {
    birthDate: '1977-06-17T08:15:00Z',
    birthPlace: {
      address: {
        type: 'PostalAddress',
        streetAddress: '1000 Birthing Center Rd',
        addressLocality: 'San Francisco',
        addressRegion: 'CA',
        postalCode: '98888-1234'
      }
    }
  },
  signature: {
    type: 'GraphSignature2012',
    created: '2015-07-24T12:48:38Z',
    creator: 'https://example.com/keys/1',
    signatureValue: 'lRBljDguLA316oTkXoHPxSFYziXTvSZn1Ap2IEZkDc0F93V5BN' +
      'jHXtC+YS7SbwnYfgBb2d4WnvXDSxzGboAEEw/Jcc2/rz0uqfU1/Jbwps5pLMWnHS/' +
      '5JY+9PPbHNS8PZSeonpEH2hTvK+ofv6CVu7voF3PK3q/Jw3tjmJ88XTA='
  }
};

// TODO: Correct these paths to be more accurate
var baseIdPath = bedrock.config.server.baseUri;
var userName = '';
var identities = {};

// user with a valid 4096 bit RSA keypair and issuer permissions
userName = 'rsa4096';
identities[userName] = {};
identities[userName].identity = createIdentity(userName);
identities[userName].identity.sysResourceRole.push({
  sysRole: 'bedrock.credential.issuer'
}, {
  sysRole: 'identity.registered'
});
identities[userName].credentials = [];
identities[userName].credentials.push(
  createCredential(identities[userName].identity.id));
identities[userName].keys = createKeyPair({
  userName: userName,
  publicKey: '-----BEGIN PUBLIC KEY-----\n' +
    'MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAxBTbcgMr6WY74XoUkXBg\n' +
    'n+0PUP2XE4fbcvALoBSBIlMcWep8TUl4/BGM2FBwbgeEgp9ZRJ8dObiK+ZqQjFOh\n' +
    'Gfj0PYP3Xb0c5Djrm0qmC8NRgVO4h2QNEX3Keps1bC6+S096n5XS9qiRsMfr4vN5\n' +
    'ohV9svSP9mmRs+iEs3UBWJl6uoMpkopCxViI1GhhYGjCoB+MGnVJbgEwPjA4POAm\n' +
    'WyMm76tSx0vpI0HLFdN0S9tghrl4jkAzFaBILMfoakx/LpFOiAApivM7HF6YeDZT\n' +
    'MOk6wVYMbbd1jiiy4PLj+nKl96K7RMU+RQZekAZ6Y2FU7wrAbOVBwaXaaRUTVIrN\n' +
    'hOCl7ihXo4w348rVNmDT0pejbSx2QbOY/X7NfUePIkOpyekRChGCrQL3KIicpKCA\n' +
    'bJG83U4niPsynBI3Y/zWvDgs8R/FxEc/UdlBB6Mr9jAeOhbY5vhH1E5dyThJD9Px\n' +
    'pmlY2PuzeAUscsfoXzxHRo2CLzanbvKJKXxMpMVl9lPyvVQHAevVZJO+kJf+Mpzw\n' +
    'Q5X4x/THt7NpSLDjpTsISQGc+0X3DhKvYzcW0iW/bDc9IqXuCPGqa/xf7XhNRLzg\n' +
    '41J2uX0nX9yWwl1opexN3dCxCsYNKTqBTq3uY1aK6WnWWXWt4t8G42A3bKv/7Ncu\n' +
    '9jEBOHnbHLXdQPk+q6wFNfECAwEAAQ==\n' +
    '-----END PUBLIC KEY-----\n',
  privateKey: '-----BEGIN RSA PRIVATE KEY-----\n' +
    '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\n' +
    '-----END RSA PRIVATE KEY-----\n'
});

// user with a valid 4096 bit RSA keypair used for logging test
userName = 'logTest';
identities[userName] = {};
identities[userName].identity = createIdentity(userName);
identities[userName].identity.sysResourceRole.push({
  sysRole: 'identity.registered'
});
identities[userName].credentials = [];
identities[userName].credentials.push(
  createCredential(identities[userName].identity.id));
identities[userName].keys = createKeyPair({
  userName: userName,
  publicKey: '-----BEGIN PUBLIC KEY-----\n' +
    'MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAzzXrMRtLJGCI9U/YQ3rl\n' +
    '0j/YlDaVZ4Kmif7VIomwZstZXFMccCn876QtNuXQ2Q5bvObaP1dSfPoX3iqtCeC0\n' +
    'xp5hjapLLJfVHBp6LG00ka4UOMo2Ts9s9vjYCQBnAQM3GIWxc2tAo7QlGvZF3mWm\n' +
    'kn9TnziK5uXgngT5KMoBt2Rce2S7VW0L/tozBUfzohhvGP109dkrCv295Dfav3PX\n' +
    'xHxYqv4Y/uHJZqhUowQ+onJLT2JcV0YcuCC4nY/Vq3B0UOVbop9vC4dKqFw3WaFD\n' +
    '3Os0WAJBegLq5rMwFAyZJjj3BSRO9eWh5WzQc/k1IX7hXjCmfYfRLcLAbCk+m10J\n' +
    'dzgaGPV6SyvoenJKzUuPD+ie+P4dReKjXt7pwMkTx6Rh773PcLQzz2SM1k/1nGrc\n' +
    'KhrovelesKy2dQJbdDa3WaTT9Nil84JLwzmoVwDyg3jk0gn2wpEnfMc1XpgKbH8K\n' +
    'mnaKjD4+crlmGX/sbucN6YggK1EkCpHPSRyqSnbZWkkD+aZiIQRQzMFHjrRDTZY+\n' +
    'h43qamoaSBoNKsA8uadoCtxQVuc30p4t8aT5v7/Rk29L62QaQJxmH4j2GmWGP42F\n' +
    'Jw2Og57Gbj1m1oYNtuvdCYjS8FT4awWqWxdx3J+xzz5Ec3vnPaegNGTXQBja9Tm4\n' +
    'BP0d9PcuEfX5Zaz3EBFg5NUCAwEAAQ==\n' +
    '-----END PUBLIC KEY-----\n',
  privateKey: '-----BEGIN RSA PRIVATE KEY-----\n' +
    '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\n' +
    '-----END RSA PRIVATE KEY-----\n'
});
// user with a valid 4096 bit RSA keypair used for logging test
userName = 'tenCredentials';
identities[userName] = {};
identities[userName].identity = createIdentity(userName);
identities[userName].identity.sysResourceRole.push({
  sysRole: 'identity.registered'
});
identities[userName].credentials = [];
for(var i = 0; i < 10; i++) {
  identities[userName].credentials.push(
    createCredential(identities[userName].identity.id));
}
identities[userName].keys = createKeyPair({
  userName: userName,
  publicKey: '-----BEGIN PUBLIC KEY-----\n' +
    'MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAtQemd7LHbEQ0u+NO+RrG\n' +
    'iVoTH6LiSASjc/0KODCoQHSPILNRuGjuVuJXZPCTdfHYavldLCx0qjdYLVkGkeP2\n' +
    'Eex2PJF406v2Tcch44Z2/A891SG1e6dwDnybC2Ieirtz7KituQI+TfMnJuY/J3+D\n' +
    'RAdNVblCFm1Z+sL0Q8Ko7jJulUCYTuEBGJXAaiAG/FX3oGirwPToM9XJc3du97OH\n' +
    'SUEOu/ESV0I6KHX3qM9M3C2Z3ArNEAWNBzVKZij3TFk9xADjrpTWuqgCl8cZ/Gu/\n' +
    'iIs5m3UOH4lFYKhH8DYJqiZChEWMRFrOMAH9T9GtXEcuItv51083nOxNwBQMtwpN\n' +
    'GZ+FE2AbOu2rN8+Qlv0AsUiuzoyI8PCjZbevcwWtYQgt8lroWSqBQCsJcubcrYVT\n' +
    'fX0MKJQ9+1mI9y5smY/APApdoXSM7clCtzybVzNFYgKucdSzxHq/ken9188D0oVV\n' +
    'JTCUDtXRhQR+M//sq4gGFRlTmMO4+EyLPP3hK3y7FCmAv32Du+0duX+/EGnnG1H4\n' +
    'YT3mRTL1Ea3jjyrWCHtMtodG51JoitbKSwFZiq0BPfS3DBNk7FyipChedIS/IF5I\n' +
    'rZQ6SZ+t32gcxMGh2EtOZZXegKzAZ8lu2E4crAcyWF6Hr2EXmDF2hN2ANAXekt5L\n' +
    'G9oXY/oBBAeU90NBfZpP44MCAwEAAQ==\n' +
    '-----END PUBLIC KEY-----\n',
  privateKey: '-----BEGIN RSA PRIVATE KEY-----\n' +
    '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\n' +
    '-----END RSA PRIVATE KEY-----\n'
});

// user with a valid 4096 bit RSA keypair but no issuer permissions
userName = 'noPermissions';
identities[userName] = {};
identities[userName].identity = createIdentity(userName);
identities[userName].credentials = [];
identities[userName].credentials.push(
  createCredential(identities[userName].identity.id));
identities[userName].keys = createKeyPair({
  userName: userName,
  publicKey: '-----BEGIN PUBLIC KEY-----\n' +
    'MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAq4xJLJ9UPFdpNkT/kUBU\n' +
    '+qVmUJdFaI0J1gTjWxnRDreoulSOOP511qQlLDAEFZsA4gCuFy0iogHmY/DSkVeB\n' +
    'P5V0r+gzar4lzdo7SVmT4XckqJygfv74Jliqt+sy65YCrqbeWMmMLQ/lAHzITZK0\n' +
    'HnxMzlSf5lxz27OegNHU2WQJOCod7jsFl9NiS6yuv99eg53O2CH3/FKvbc59oqot\n' +
    '9uPQCPK9Dy2DsaT2Y//v7D5f6DNsyP+oyCDzx+NHMT5d1omUq3xoDQPtopy3CLRX\n' +
    'sN6J7+M91JMJ6tr9pj6q43OkDCVpGIcm1WxTgC2MRSMApjJL/38ZI4xSEVqquArQ\n' +
    '3l/t7d6b0OjYg1V6bnYkDh8qBtCCS4HK8E8aWjfF8ffKeemRlfuux4P1P4xdi2wu\n' +
    'ZbzkE3MtwQebu9Ub0Eq3bS8Hv5TqkND2wnaW4znzTggQcikIQh071zLALSxeLY7B\n' +
    'lJR8B0AVhmsoPJ6inZYiyDzxtoWSOzYT74+mtzCcMfhF1DXoKfMqUKgzgaLhS+2u\n' +
    'F6pv1Q6QRuctuU8KUceBJoIxE1tp622zql3ZuSj5LkMxy8Acq+0VriJXnfZGyo8i\n' +
    '43aYLMnu2X12LP6vd6pDa2S+QCLlodpfCqcix/xjklaDomg12s3+GIe3DMNqFxa4\n' +
    'JuhAlpLCKqMOfcjPl4qaOHsCAwEAAQ==\n' +
    '-----END PUBLIC KEY-----\n',
  privateKey: '-----BEGIN RSA PRIVATE KEY-----\n' +
    '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\n' +
    '-----END RSA PRIVATE KEY-----\n'
});

var badIdentities = {};
// user with a valid 4096 bit RSA keypair, but public key will not be known
// to the server
userName = 'userUnknown';
badIdentities[userName] = {};
badIdentities[userName].identity = createIdentity(userName);
badIdentities[userName].keys = createKeyPair({
  userName: userName,
  publicKey: '-----BEGIN PUBLIC KEY-----\n' +
    'MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAt09gaHxM6v4rmuROBrzK\n' +
    'vSNP/7z/o5lzCHIppyjnz0LAjrqpZFNc0hZ7zl7ZzjJrTo/J1ddCBdkT4eORek/2\n' +
    'O3HwuK1VzUGwvNBsdhCrQz48wvq7ZcuQVQapCwXNP+yq6TxXBK9GZC7csfsuW/3O\n' +
    'vqlQXyyQzWxrmABkR2xAL1A+y6HKjE5hXZuDL7Ft19a8XXAGt9eRkFZ5bQ5jwC0k\n' +
    'XlzRZw+yV0cw3kztCnxxmSThMbC1LpqUne4m2zwaBzqM2dUT0dLtEWdsZp/S97oM\n' +
    'q4X6ZzHMZ1Vp/RotahGIf/rXFAweCCVGq/tW3Tou1QKqna+/YcXzKXijLQMoenDs\n' +
    'duuc83LrTQffYQraeLqdJleVDnM0anmhZh1vPjN6uwiz6xQR0ur0MIkxM8CuGqtr\n' +
    'aq7jnFgfu52giYpLjr8jfkBVtSVTJidYBbGe5YPuRIjoQlJYxT5fjBCNpbXNgU2X\n' +
    's4Dgg8OHxkQKyo3VwbtPBUy5a+I+wbs9yQjyTD2Q57EV3UzvpyYp5/Lxi9S0duoO\n' +
    'Nlus4YniIAzMjCX4ks4fczIRwpc9/9hxlDJnFVw+18qSKjJt5QgbvXllO+1rjBR9\n' +
    'yo1rQgtwBndSm8+Fn6K2mOnFp0Kjja3ox78bCM3qIkHKJJqPwKWfAIqzJJmTgKM1\n' +
    'u/zA6biEf1BP3qTeeTVACekCAwEAAQ==\n' +
    '-----END PUBLIC KEY-----\n',
  privateKey: '-----BEGIN RSA PRIVATE KEY-----\n' +
    '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\n' +
    '-----END RSA PRIVATE KEY-----\n'
});

// jscs: disable
var recipientDidDocument = {
  "@context": "https://w3id.org/identity/v1",
  "idp": "did:ef2618b9-946a-4f8e-970d-f784de635990",
  "accessControl": {
    "writePermission": [
      {
        "id": "did:32e89321-a5f1-48ff-8ec8-a4112be1215c/keys/1",
        "type": "CryptographicKey"
      },
      {
        "id": "did:d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1",
        "type": "Identity"
      }
    ]
  },
  "publicKey": [
    {
      "id": "did:32e89321-a5f1-48ff-8ec8-a4112be1215c/keys/1",
      "type": "CryptographicKey",
      "owner": "did:32e89321-a5f1-48ff-8ec8-a4112be1215c",
      "publicKeyPem": "-----BEGIN PUBLIC KEY-----\r\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAgH4EXOXrM2hgFSPxaLYK\r\njkY2QoHlis5ntvvLi1/t5mloxerCZKTBRki7K+F9ForqREFn5SiSkzCJwNXYfbhj\r\n2BJjhSbOoPdbTanQKasaw22X8pcBeagHnPxG29xvhqDSddoIXjeAnVRU7ODkH4VX\r\n9rqKR+PaJKPCD7T5dx4zqiYgCrBLKRr/yFQUV+csbzmOm3AhJdKIwsPj5DxTP5WX\r\n/bYBJ4sDWbHWiAaDWRYo/SPSHO5RR7Vk/hvQpKn0H7SDX2DMf9RpVKtCNXmLM1pD\r\nA7reJU3VpVK1kG9oTTOPCX5PTVZb7WrFFBDSfGPznpYUeRSBixZUbv7CvC4wTxdh\r\nNwIDAQAB\r\n-----END PUBLIC KEY-----\r\n"
    }
  ],
  "signature": {
    "type": "GraphSignature2012",
    "created": "2015-07-02T21:45:26Z",
    "creator": "did:32e89321-a5f1-48ff-8ec8-a4112be1215c/keys/1",
    "signatureValue": "ba9dvZrSEn97zqnjEN0Mjp4nEMyJrEpfVwyThfXfCjTfmgZ7C325p7u5pTE2Zclw8X74UNOy8HqemQXSuIpdNZiU82o/ABZ6n1IKKxnAEVuMXzH1ukMH0ao32tldcwGtM9yonXJGPqtkzYtsCXdQxkM6C5Qf/MEaU83ZF0sUw6m+cQatWKsGDldu771A7+KxGApjbyMAza4c/oeDsNCuo7cbWZisglzQ0Dp0kGOXSCY3nxs28b1UkeLFf740Bs9j7AtayzYaVjwAdHLZeXK669tcuRDzc+BYLscu/6ry0H5EVOHjItMhjjQ4nho4ONr3dPA60c+3yfXZyIfs8UUI1Q=="
  }
};
// jscs: enable

var didDocuments = {};

Object.keys(identities).forEach(function(i) {
  var tempDoc = util.clone(recipientDidDocument);
  tempDoc.id = identities[i].identity.id;
  tempDoc.publicKey[0].id = identities[i].identity.id + '/keys/1';
  tempDoc.publicKey[0].owner = identities[i].identity.id;
  tempDoc.publicKey[0].publicKeyPem = identities[i].keys.publicKey.publicKeyPem;
  didDocuments[identities[i].identity.id] = tempDoc;
});

function createCredential(id) {
  var newCredential = util.clone(credentialTemplate);
  newCredential.id = config.server.baseUri +
    config['credentials-rest'].basePath + '/' + uuid.v4();
  newCredential.claim.id = id;
  return newCredential;
}

function createIdentity(userName) {
  var newIdentity = {
    id: 'did:' + uuid.v4(),
    type: 'Identity',
    sysSlug: userName,
    label: userName,
    email: userName + '@bedrock.dev',
    sysPassword: 'password',
    sysPublic: ['label', 'url', 'description'],
    sysResourceRole: [],
    url: config.server.baseUri,
    description: userName
  };
  return newIdentity;
}

function createKeyPair(options) {
  var userName = options.userName;
  var publicKey = options.publicKey;
  var privateKey = options.privateKey;
  var ownerId = null;
  if(userName === 'userUnknown') {
    // using a random DID for this user
    ownerId = 'did:' + uuid.v4();
  } else {
    ownerId = identities[userName].identity.id;
  }
  var newKeyPair = {
    publicKey: {
      '@context': 'https://w3id.org/identity/v1',
      id: ownerId + '/keys/1',
      type: 'CryptographicKey',
      owner: ownerId,
      label: 'Signing Key 1',
      publicKeyPem: publicKey
    },
    privateKey: {
      type: 'CryptographicKey',
      owner: ownerId,
      label: 'Signing Key 1',
      publicKey: ownerId + '/keys/1',
      privateKeyPem: privateKey
    }
  };
  return newKeyPair;
}

exports.credentialTemplate = credentialTemplate;
exports.identities = identities;
exports.badIdentities = badIdentities;
exports.didDocuments = didDocuments;
