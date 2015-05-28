/*!
 * Credential Manager.
 *
 * Copyright (c) 2015 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 */
define([], function() {

'use strict';

/* @ngInject */
function brCredentialManager() {
  return {
    restrict: 'E',
    scope: {},
    /* jshint multistr: true */
    template: '\
      <div> \
      </div>'
  };
}

return {brCredentialManager: brCredentialManager};

});
