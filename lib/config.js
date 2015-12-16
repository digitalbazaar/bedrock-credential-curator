/*
 * Bedrock Credential Curator Module Configuration
 *
 * Copyright (c) 2015 Digital Bazaar, Inc. All rights reserved.
 */
var config = require('bedrock').config;

var curator = config['credential-curator'] = {};

// map of credential formatters
//   formatter-name: function(credential, meta, callback(err, credential))
curator.formatters = {};

// FIXME: temporary; this key should be stored elsewhere
curator.credentialSigningPrivateKey =
  '-----BEGIN RSA PRIVATE KEY-----\n' +
  'MIIEogIBAAKCAQEAlNthygoi1J5gj5i0GmnvoFBlTRg3oMoMhmj0OHRpFQf2igli\n' +
  'NrzxtjNEZBK3WAbcBGHonNBS1MsxKSoHaS4NcJiu3Wq4DX6MJzDKZuNkah1sxSUt\n' +
  'S2owAfO1QzdCxiHNyqDFr1rnoJqIYx+NfQoaLQn3MU1ymppFIK/yUp/ya/22KCFD\n' +
  'ohkmwMxkda8J2FHBun9ReZubZVVn6Yb7AkOgp1pb2TFzph/va9QHXIghU0MEesW+\n' +
  'V3dMveK3ZYenRSsEWFthysxrxiXlPTBFsgWl3vbBcWnAeGbYyUW1gVeKXoOUvCwK\n' +
  'f51eomC0By4DaJyGPeXugW3dk3PHvGIWYmPHIQIDAQABAoIBAGI84i2HQPNWzl0W\n' +
  'Jw4jiawgQqp9aADqNxfhXgN/9/WUOsVgafu7+D0JWoI8w9kJNdyCjRQoe/HJY1lK\n' +
  'TnfAl8gOS6D+lBb7xBz9GyaJvTQ21RjKbzkNDD/NiXuhlaTSnFC0h6IxeRnJwmbA\n' +
  'ZQz3RM0ifYuBFDgpxaNL2r1ip4dSeGEDqOWYp8f9VSwbfyKVuWATN1VLhGYpCrUd\n' +
  'LEdQhImeQa65UR6iri51lbNnovfN8Qce09rDbpXzG5+uj9ZNgGhM+wFZO2CzQBR9\n' +
  'lGC+K9MFQ9SwxHK8Z+zIu+stGYtQNchHju0rvHYV+RkdnpCu6f4ExxDoCZTbbXts\n' +
  'YoAiMhECgYEAxGd3iEZ3O8JnuIrqfwwm4yaKwXPUkMOdR1LPoYtA8+bli102mZOW\n' +
  'XpA67PdFjnhSD3CtlLoJgtJ51ehyKOWwTPoq0FJLmBr+/BWKmEYBHLQGKTPbNuTL\n' +
  'f3NQgRZ8rMfLoiyA48PJu5QZWiJ6QabVM0UXAAnM5hvEtLntLIcUFIUCgYEAwgZ7\n' +
  'in7e3nKa4dR/KjS1ZYHbjXr2JvSrqa0kzlrolcMGvnkb9Re3tgKZbX3YZ0iH6i8J\n' +
  'C7V/3nlJ2Cxm3TgFjvvzZ/KJ2tY4a5eQgZQV7yNYZV+UyvvaHw6JOK34PKyOEgkE\n' +
  'QPfRMEzqkJV2Cr9cYHGdfvxoX3CxjWJwYUq4KO0CgYBBQ+iyvkfM8fMpnfACu/UI\n' +
  'MryVQHp4iKhxFRGuKuowop/Qye7k5ehoECGksR7KEy2ht93WuGOEt5CJBq846+rE\n' +
  'CbXEeDRqnT3yYu4lX83qzd/mPTcxbKI6/gTYgLJ5cAM5JvTFu0AEN1idXSunOVtL\n' +
  'qD/WYWtXZA7fx5EK5PBFSQKBgHw7wGDWiYevpCJTeLUimL+NHXKCuBgLc9sqJTYI\n' +
  'GYLDJI9TZqZRcG0XTvw/pw/C7lvxj/4yUdS2nqTPEXI2S8DY7GqzbrdzkR67JmkB\n' +
  '0+WSISiPwesSxgA6w3xKUHcxGarMoS+kPgqKRWsceD+7db+/H9ROc9ogg19/F2wE\n' +
  'dtSlAoGAKKYHu/Ez+91cB/jXcXpwLVVxpKuzGrpHqMZ6HxAYpWyOtLtvwlj8VqnU\n' +
  '6DYQwjl795JAAjVZBvMq3x2Vp9/1ITlhcykpssmuhPX2pUtviQiBdPENcNLfbFM4\n' +
  'p4xzAGKZd2X8VeyS9jrqJgWZa2k/BAqLZixalPQ3xR8dZkLdwbs=\n' +
  '-----END RSA PRIVATE KEY-----\n';
curator.credentialSigningPublicKeyId = 'https://example.com/keys/1';
curator.credentialSigningPublicKey = {
  id: curator.credentialSigningPublicKeyId,
  publicKeyPem: '-----BEGIN PUBLIC KEY-----\r\n' +
    'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAlNthygoi1J5gj5i0Gmnv\r\n' +
    'oFBlTRg3oMoMhmj0OHRpFQf2igliNrzxtjNEZBK3WAbcBGHonNBS1MsxKSoHaS4N\r\n' +
    'cJiu3Wq4DX6MJzDKZuNkah1sxSUtS2owAfO1QzdCxiHNyqDFr1rnoJqIYx+NfQoa\r\n' +
    'LQn3MU1ymppFIK/yUp/ya/22KCFDohkmwMxkda8J2FHBun9ReZubZVVn6Yb7AkOg\r\n' +
    'p1pb2TFzph/va9QHXIghU0MEesW+V3dMveK3ZYenRSsEWFthysxrxiXlPTBFsgWl\r\n' +
    '3vbBcWnAeGbYyUW1gVeKXoOUvCwKf51eomC0By4DaJyGPeXugW3dk3PHvGIWYmPH\r\n' +
    'IQIDAQAB\r\n' +
    '-----END PUBLIC KEY-----\r\n'
};
