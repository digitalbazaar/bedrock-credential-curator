/*!
 * Compose Identity Controller.
 *
 * Copyright (c) 2015 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 * @author Matt Collier
 */
define([], function() {

'use strict';

/* @ngInject */
function factory(config) {
  var self = this;
  self.request = config.data.request;
  self.credentials = config.data.curator.credentials;
  self.query = config.data.curator.query;
  self.identity = {};
  self.library = {};

  // transmit the selected credential to the requestor
  self.transmit = function(identity) {
    navigator.credentials.transmit(identity, {
      responseUrl: self.request.credentialCallbackUrl
    });
  };
}

return {ComposeIdentityController: factory};

});
