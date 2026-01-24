import React from 'react';
import { NavigationItem } from '@components/admin/NavigationItem.js';

const SupplierNetworkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>
);

const ImportProductIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);

export default function SupplierMenuGroup() {
    return (
        <>
            <NavigationItem
                title="Supplier Network"
                url="/admin/supplier/network"
                Icon={SupplierNetworkIcon}
            />
            <NavigationItem
                title="Import Product"
                url="/admin/supplier/import"
                Icon={ImportProductIcon}
            />
        </>
    );
}

export const layout = {
    areaId: 'adminMenu',
    sortOrder: 40
};
