/*!
 * Storage Credentials Controller.
 *
 * Copyright (c) 2015 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 * @author Matt Collier
 */
define(['angular', 'jsonld'], function(angular, jsonld) {

'use strict';

/* @ngInject */
function factory($http, $scope, brAlertService, config) {
  var self = this;
  self.request = config.data.curator.request;
  self.identity = config.data.curator.identity;
  self.credentials = jsonld.getValues(
    self.identity, 'credential').map(function(credential) {
    return credential['@graph'];
  });
  self.choices = self.credentials.slice();

  // post credentials to be stored
  self.store = function() {
    var identity = angular.extend(
      {}, self.identity, {
        credential: self.choices.map(function(credential) {
          return {'@graph': credential};
        })
      });
    Promise.resolve($http.post(
      '/tasks/credentials/store-credentials', identity))
      .then(function(response) {
        if(response.status !== 200) {
          throw response;
        }
      }).then(function() {
        navigator.credentials.transmit(identity, {
          responseUrl: self.request.storageCallback
        });
      }).catch(function(err) {
        console.error('Failed to store credential', err);
        brAlertService.add('error', 'Failed to store the credential.');
      }).then(function() {
        $scope.$apply();
      });
  };
}

return {StoreCredentialsController: factory};

});
