import { Card } from '@components/admin/Card';
import React from 'react';
import { _ } from '@evershop/evershop/lib/locale/translate';

export default function DropshipQuickLinks() {
    return (
        <Card title="Management">
            <Card.Session>
                <ul className="space-y-3">
                    <li>
                        <a href="/admin/orders?payment_status=authorized" className="flex items-center text-textSubdued hover:text-interactive transition-colors">
                            <span className="w-2 h-2 rounded-full bg-warning mr-2"></span>
                            Verify Authorized Orders
                        </a>
                    </li>
                    <li>
                        <a href="/admin/supplier/network" className="flex items-center text-textSubdued hover:text-interactive transition-colors">
                            <span className="w-2 h-2 rounded-full bg-info mr-2"></span>
                            Supplier Sync Status
                        </a>
                    </li>
                    <li>
                        <a href="/admin/products" className="flex items-center text-textSubdued hover:text-interactive transition-colors">
                            <span className="w-2 h-2 rounded-full bg-subdued mr-2"></span>
                            Manage Catalog
                        </a>
                    </li>
                </ul>
            </Card.Session>
        </Card>
    );
}

export const layout = {
    areaId: 'rightSide',
    sortOrder: 1
};
