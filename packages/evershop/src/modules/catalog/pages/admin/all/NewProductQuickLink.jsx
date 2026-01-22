import { NavigationItem } from '@components/admin/NavigationItem.js';
import { ArchiveBoxIcon } from '@heroicons/react/24/solid';
import PropTypes from 'prop-types';
import React from 'react';

export default function NewProductQuickLink({ productNew, supplierImportUrl }) {
  // RESELLER MODEL: Hide "New Product" button, force creation via Import
  // Uncomment the return below to restore manual product creation
  return null;

  // return (
  //   <NavigationItem
  //     Icon={ArchiveBoxIcon}
  //     title="New Product"
  //     url={productNew}
  //   />
  // );
}

NewProductQuickLink.propTypes = {
  productNew: PropTypes.string.isRequired,
  supplierImportUrl: PropTypes.string
};

export const layout = {
  areaId: 'quickLinks',
  sortOrder: 20
};

export const query = `
  query Query {
    productNew: url(routeId:"productNew")
    supplierImportUrl: url(routeId:"supplierImport")
  }
`;
