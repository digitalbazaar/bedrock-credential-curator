/*
 * Bedrock Credential Curator Module Test Configuration
 *
 * Copyright (c) 2015-2016 Digital Bazaar, Inc. All rights reserved.
 */
var config = require('bedrock').config;
var fs = require('fs');
var path = require('path');

// configure authorization.io
config['credential-curator']['authorization-io'].baseUrl =
  'https://authorization.dev:33443/dids/';

// MongoDB
config.mongodb.name = 'bedrock_credential_curator_test';
config.mongodb.host = 'localhost';
config.mongodb.port = 27017;
config.mongodb.local.collection = 'bedrock_credential_curator_test';
config.mongodb.username = 'bedrock';
config.mongodb.password = 'password';
config.mongodb.adminPrompt = true;
config.mongodb.dropCollections.onInit = true;
config.mongodb.dropCollections.collections = [];

/**
 * Load a local copy of credentials v1 context.
 */
var constants = config.constants;
constants.CREDENTIALS_CONTEXT_V1_URL = 'https://w3id.org/credentials/v1';
constants.CONTEXTS[constants.CREDENTIALS_CONTEXT_V1_URL] = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../tests/static-cors/contexts/credentials-v1.jsonld'),
    {encoding: 'utf8'}));
constants.IDENTITY_CONTEXT_V1_URL = 'https://w3id.org/identity/v1';
constants.CONTEXTS[constants.IDENTITY_CONTEXT_V1_URL] = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../tests/static-cors/contexts/identity-v1.jsonld'),
    {encoding: 'utf8'}));
constants.SECURITY_CONTEXT_V1_URL = 'https://w3id.org/security/v1';
constants.CONTEXTS[constants.SECURITY_CONTEXT_V1_URL] = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../tests/static-cors/contexts/security-v1.jsonld'),
    {encoding: 'utf8'}));

var permissions = config.permission.permissions;
var roles = config.permission.roles;
roles['identity.manager'] = {
  id: 'identity.manager',
  label: 'Identity Manager',
  comment: 'Role for identity managers.',
  sysPermission: [
    permissions.IDENTITY_ADMIN.id,
    permissions.IDENTITY_ACCESS.id,
    permissions.IDENTITY_INSERT.id,
    permissions.IDENTITY_EDIT.id,
    permissions.PUBLIC_KEY_CREATE.id,
    permissions.PUBLIC_KEY_REMOVE.id
  ]
};
// default registered identity role (contains all permissions for a regular
// identity)
roles['identity.registered'] = {
  id: 'identity.registered',
  label: 'Registered Identity',
  comment: 'Role for registered identities.',
  sysPermission: [].concat(
    roles['identity.manager'].sysPermission,
    [
      // credential permissions
      permissions.CREDENTIAL_ACCESS.id,
      permissions.CREDENTIAL_REMOVE.id
    ]
  )
};
