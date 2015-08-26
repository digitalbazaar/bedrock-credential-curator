/*!
 * Credential Task Routes.
 *
 * Copyright (c) 2015 Digital Bazaar, Inc. All rights reserved.
 *
 * @author Dave Longley
 * @author David I. Lehn
 */
define([], function() {

'use strict';

return [{
  path: '/tasks/credentials/compose-identity',
  options: {
    title: 'Compose Identity',
    session: 'required',
    templateUrl: requirejs.toUrl(
      'bedrock-credential-curator/components/tasks/compose-identity.html')
  }
}];

});
