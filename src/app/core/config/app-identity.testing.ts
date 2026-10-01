import { LegalIdentity } from './app-identity';

/** A complete `LegalIdentity` for specs that provide their own `APP_IDENTITY`. */
export const TEST_LEGAL_IDENTITY: LegalIdentity = {
  entity: 'Test Operator',
  address: 'Test City',
  dataRegion: 'Test Region',
  contacts: {
    legal: 'legal@test.example',
    privacy: 'privacy@test.example',
    abuse: 'abuse@test.example',
    copyright: 'copyright@test.example',
    security: 'security@test.example',
  },
  euRepresentative: null,
  ukRepresentative: null,
};
