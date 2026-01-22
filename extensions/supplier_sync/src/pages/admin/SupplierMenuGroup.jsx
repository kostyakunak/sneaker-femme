import { NavigationItemGroup } from '@components/admin/NavigationItemGroup';
import { ArrowPathIcon } from '@heroicons/react/24/solid';
import PropTypes from 'prop-types';
import React from 'react';

export default function SupplierMenuGroup({
    supplierSyncStatusUrl,
    supplierImportUrl
}) {
    return (
        <NavigationItemGroup
            id="supplierMenuGroup"
            name="Supplier"
            items={[
                {
                    Icon: ArrowPathIcon,
                    url: supplierSyncStatusUrl,
                    title: 'Sync Status'
                },
                {
                    Icon: ArrowPathIcon,
                    url: supplierImportUrl,
                    title: 'Import Product'
                }
            ]}
        />
    );
}

SupplierMenuGroup.propTypes = {
    supplierSyncStatusUrl: PropTypes.string.isRequired
};

export const layout = {
    areaId: 'adminMenu',
    sortOrder: 25
};

export const query = `
  query Query {
    supplierSyncStatusUrl: url(routeId:"supplierSyncStatus")
    supplierImportUrl: url(routeId:"supplierImport")
  }
`;
