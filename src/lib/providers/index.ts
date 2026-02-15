/**
 * Provider factory
 * Returns the appropriate provider instance based on type
 */

import type { EmailProvider, ProviderType } from './types';
import { MicrosoftProvider } from './microsoft';
import { GoogleProvider } from './google';

export function getProvider(type: ProviderType): EmailProvider {
  switch (type) {
    case 'MICROSOFT':
      return new MicrosoftProvider();
    case 'GOOGLE':
      return new GoogleProvider();
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}

export * from './types';
export { MicrosoftProvider } from './microsoft';
export { GoogleProvider } from './google';
