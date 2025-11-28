import path from 'path';
import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs } from '@graphql-tools/merge';
import { getEnabledExtensions } from '../../../bin/extension/index.js';
import { CONSTANTS } from '../../../lib/helpers.js';

export function buildTypeDefs(isAdmin = false) {
  // Define module loading order to ensure dependencies are loaded first
  const moduleOrder = [
    'base',      // Basic types like Country, Currency, DateTime, etc.
    'checkout',  // Price, Weight, Cart types
    'catalog',   // Product-related types
    'customer',  // Customer types
    'auth',      // Auth types
    'cms',       // CMS types
    'oms',       // Order management types
    'promotion', // Promotion types
    'setting',   // Setting types
    'cod',       // Cash on delivery types
    'paypal',    // PayPal types
    'stripe',    // Stripe types
    'tax',       // Tax types
    'graphql'    // GraphQL query types
  ];

  const allTypeDefs = [];

  // Load modules in specific order
  moduleOrder.forEach(moduleName => {
    const modulePath = path.join(CONSTANTS.MODULESPATH, moduleName, 'graphql/types/**/*.graphql');
    try {
      const moduleDefs = loadFilesSync(modulePath, {
        ignoredExtensions: isAdmin ? [] : ['.admin.graphql']
      });
      // Sort type definitions to ensure base types are loaded first
      const sortedDefs = moduleDefs.sort((a, b) => {
        const aContent = typeof a === 'string' ? a : a.loc?.source?.body || '';
        const bContent = typeof b === 'string' ? b : b.loc?.source?.body || '';

        // Prioritize type definitions over extensions
        const aIsType = aContent.includes('type ') && !aContent.includes('extend type');
        const bIsType = bContent.includes('type ') && !bContent.includes('extend type');
        const aIsExtend = aContent.includes('extend type');
        const bIsExtend = bContent.includes('extend type');

        if (aIsType && bIsExtend) return -1;
        if (bIsType && aIsExtend) return 1;

        // Sort by filename to ensure consistent loading
        return 0;
      });
      allTypeDefs.push(...sortedDefs);
    } catch (e) {
      // Module might not exist, continue
    }
  });

  const extensions = getEnabledExtensions();
  extensions.forEach((extension) => {
    try {
      const extensionDefs = loadFilesSync(path.join(extension.path, 'graphql/types/**/*.graphql'), {
        ignoredExtensions: isAdmin ? [] : ['.admin.graphql']
      });
      allTypeDefs.push(...extensionDefs);
    } catch (e) {
      // Extension might not have graphql types, continue
    }
  });

  const typeDefs = mergeTypeDefs(allTypeDefs);
  return typeDefs;
}
