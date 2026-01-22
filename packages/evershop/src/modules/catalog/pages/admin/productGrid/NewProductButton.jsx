import Button from '@components/common/Button';
import PropTypes from 'prop-types';
import React from 'react';

export default function NewProductButton({ newProductUrl }) {
  // RESELLER MODEL: Hide "New Product" button from grid
  // All products must be created via "Import by SKU"
  return null;

  // Uncomment to restore manual product creation
  // return <Button url={newProductUrl} title="New Product" />;
}

NewProductButton.propTypes = {
  newProductUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 10
};

export const query = `
  query Query {
    newProductUrl: url(routeId: "productNew")
  }
`;
