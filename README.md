# bedrock-credential-curator

A [bedrock][] module that provides an interface for claiming, managing, and
providing credentials to consumers.

## Quick Examples

TODO: Explain that this module provides a JS API, web services, and AngularJS
widgets.

## Setup

```
bower install bedrock-credential-curator
```

Installation of the module followed by a restart of your [bedrock][]
application is sufficient to make the module available to your application.

<!-- ## How It Works

TODO: -->

## Description

This module provies a wrapper for a credentials store. It provides directive 
for credentials, and routes that map to templates that have a controller that 
will either store or transmit the credentials using 
navigator.credentials.transmit to a credential consumer. It also can compose a 
view for an identity.

## Bedrock Dependencies
	
### Bower

* bedrock-angular-identity-composer: Provides a widget for composing a view of 
an identity from a set of credentials

* bedrock-angular-credential: Provides directives for displaying a credential 
given an IdentityCredential object
 	
### NPM

* bedrock-credentials-rest: REST API for credential storage which is used to 
retrieve and store credentials

* bedrock-passport: REST API for authentication to bedrock which is used to 
verify a user is viewing credentials that they have access to

* bedrock-permission: API for managing access control to
	resources which is used to get permission to view identities

[bedrock]: https://github.com/digitalbazaar/bedrock
[bedrock-angular]: https://github.com/digitalbazaar/bedrock-angular
[bower]: http://bower.io/
[AngularJS]: https://github.com/angular/angular.js
