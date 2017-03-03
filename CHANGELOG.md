# bedrock-credential-curator ChangeLog

## 0.5.0 - 2017-03-02

### Changed
- Credential store task layout improved for use in iframes and elsewhere.

## 0.4.10 - 2016-09-20

### Fixed
- Do not change loading status when there is no session.  This would cause the
  identity composer to fail when there was not an already established session.

## 0.4.9 - 2016-09-19

### Changed
- Restructure test framework for CI.

## 0.4.8 - 2016-07-21

### Changed
- Update credentials-polyfill to 0.10.x.

## 0.4.7 - 2016-07-21

### Changed
- Return success on duplicate storage request.

## 0.4.6 - 2016-07-13

### Fixed
- Remove `version` from bower.json.

## 0.4.5 - 2016-07-13

### Changed
- Do not include `@context` in submitted public key; already
  given at top-level of DID object.

## 0.4.4 - 2016-06-08

### Changed
- Do not display spinner during login process.

## 0.4.3 - 2016-05-31

### Fixed
- Fix actor in call to insert API.

## 0.4.2 - 2016-05-30

### Fixed
- Fix actor in call to compose API.

## 0.4.1 - 2016-05-30

### Changed
- Update dependencies.

## 0.4.0 - 2016-05-29

### Changed
- **BREAKING**: Enable permission checking on composing identities and
  storing credentials.
- **BREAKING**: Disable support for old credential-polyfill protocol
  (identity w/public key credential must be sent, not just public key
  when composing an identity).

## 0.3.1 - 2016-04-29

## 0.3.0 - 2016-04-15

### Changed
- Update bedrock and bedrock-angular dependencies.

## 0.2.5 - 2016-03-28

### Changed
- Remove unnecessary "Store Credentials" heading.

## 0.2.4 - 2016-03-28

### Changed
- Add option to claim credential on storage.

## 0.2.3 - 2016-03-27

### Changed
- Use credentials-polyfill 0.8.x.

## 0.2.2 - 2016-03-27

### Changed
- Remove unnecessary "Select Credentials" heading.

## 0.2.1 - 2016-03-25

### Changed
- Add identity to credential-manager directive.

## 0.2.0 - 2016-03-03

### Changed
- Update package dependencies for npm v3 compatibility.

## 0.1.1 - 2016-01-31

### Fixed
- Add missing `request` dependency.

## 0.1.0 - 2016-01-31

### Added
- Use `bedrock-credentials-rest` to display credentials.
