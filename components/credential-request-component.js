/*!
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

import jsonld from 'jsonld';
import {CredentialEventProxy, ProfileKeyStore}
  from 'bedrock-credential-handler';

export default {
  bindings: {
    createSession: '&brCreateSession'
  },
  controller: Ctrl,
  templateUrl:
    'bedrock-credential-curator/components/credential-request-component.html'
};

/* @ngInject */
function Ctrl($http, $scope, brSessionService, config) {
  const self = this;

  let _resolve;
  let _reject;

  (async () => {
    console.log('loaded credential request UI');
    const proxy = new CredentialEventProxy();
    const event = await proxy.receive('credentialrequest');
    console.log('UI got credential request event', event);
    event.respondWith(new Promise(async (resolve, reject) => {
      _resolve = resolve;
      _reject = reject;

      self.credentialRequestOptions = event.credentialRequestOptions;
      self.query = self.credentialRequestOptions.web.VerifiableProfile;

      try {
        // TODO: naming, etc. can likely be improved, copied from old
        //   credential-task-component
        await authenticate({event});
        console.log('authenticated');
        self.identity = await getIdentity({event});
        self.credentials = jsonld.getValues(
          self.identity, 'credential').map(function(credential) {
          return credential['@graph'];
        });
        self.choices = self.credentials.slice();
        console.log('ready to show request choices', self.credentials);
      } catch(e) {
        return reject(e);
      }

      $scope.$apply();
    }));

    self.send = async composedProfile => {
      try {
        // sign the profile using the device key
        // TODO: or the temporary key that was generated for public terminal
        const pkStore = new ProfileKeyStore('/credential-handler');
        const profile = await pkStore.get(event.hintKey);
        let verifiableProfile;
        if(profile) {
          verifiableProfile = await pkStore.sign({
            doc: composedProfile,
            domain: event.credentialRequestOrigin,
            publicKeyId: profile.publicKey.id,
            privateKeyPem: profile.publicKey.privateKeyPem,
          });
        } else {
          // TODO: should be using in-memory profile, not fetching again, so
          // there would be no `else` in that case
          throw new Error('Not implemented');
        }
        _resolve({dataType: 'VerifiableProfile', data: verifiableProfile});
      } catch(e) {
        _reject(e);
      }
    };
  })();

  // TODO: code duplicated in `credential-request-component`, consolidate it
  async function authenticate({event}) {
    console.log('authenticating...');
    const session = await brSessionService.get();
    if(!session.identity) {
      console.log('creating session...');
      // session does not exist, create it
      return self.createSession({identity: {id: event.hintKey}});
    }

    if(session.identity.id !== event.hintKey) {
      // force logout; session authenticated for wrong identity
      // FIXME: logout listeners should handle this cleanup or it should
      //   not be needed at all
      if(config.data.idp && 'identity' in config.data.idp.session) {
        delete config.data.idp.session.identity;
      }
      await brSessionService.logout();

      return self.createSession({identity: {id: event.hintKey}});
    }

    return session;
  }

  // gets credentials for the identity composer
  async function getIdentity({event, registerKey}) {
    const url = '/tasks/credentials/compose-identity';
    const data = {
      query: event.credentialRequestOptions.web.VerifiableProfile
    };
    if(registerKey) {
      data.registerKey = true;
    }

    // TODO: submitting a profile with a public key credential is not strictly
    //   necessary with new flow where repository manages keys -- done to
    //   more quickly transition without having to alter backend
    const pkStore = new ProfileKeyStore('/credential-handler');
    const profile = await pkStore.get(event.hintKey);
    if(profile) {
      // FIXME: `domain` required by legacy software is repository domain,
      //   is this correct or should it be `event.credentialRequestOrigin`?
      data.identity = await pkStore.createCryptoKeyProfile(
        {profile, domain: window.location.origin});
      console.log('data', data);
    } else {
      // TODO: generate identity with temporary key
      throw new Error('Not implemented');
    }

    const response = await $http.post(url, data);

    // TODO: implement more comprehensive error handling
    if(response.status !== 200) {
      throw response;
    }

    return response.data;
  }
}
