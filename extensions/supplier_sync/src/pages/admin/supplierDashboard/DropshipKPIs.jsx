import { Card } from '@components/admin/Card';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { Area } from '@components/common/Area';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import './DropshipWidgets.scss';

// CSS for widgets
const style = `
.kpi-card {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
}
.kpi-value {
    font-size: 2rem;
    font-weight: bold;
    margin-top: 0.5rem;
}
.kpi-label {
    font-size: 0.875rem;
    color: #6b7280;
}
`;

export function DropshipKPIs() {
    const [stats, setStats] = useState(null);
    const [authorizedCount, setAuthorizedCount] = useState(0);

    useEffect(() => {
        // Fetch Sync Stats
        axios.get('/admin/supplier-sync/stats')
            .then(res => setStats(res.data.data))
            .catch(e => console.error(e));

        // Fetch Authorized Orders Count (Requires a specific query, but we can rely on sync stats or quick filter count hack)
        // For now, let's just create a link to the filter page as the widget
    }, []);

    return (
        <>
            <style>{style}</style>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* KPI 1: Awaiting Confirmation */}
                <Card title={_('Awaiting Confirmation')}>
                    <Card.Session>
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-sm text-textSubdued">Orders to process</div>
                                {/* Ideally we would fetch the count here. For MVP, we provide a direct link. */}
                                <a href="/admin/orders?payment_status=authorized" className="text-interactive font-bold hover:underline mt-2 block">
                                    View Orders &rarr;
                                </a>
                            </div>
                            <div className="p-3 bg-warning-faded text-warning rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            </div>
                        </div>
                    </Card.Session>
                </Card>

                {/* KPI 2: Sync Status */}
                <Card title={_('Supplier Sync')}>
                    <Card.Session>
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-sm text-textSubdued">Last run: {stats?.lastRun ? new Date(stats.lastRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}</div>
                                <div className={`font-bold mt-1 ${stats?.status === 'error' ? 'text-critical' : 'text-success'}`}>
                                    {stats?.status === 'success' ? 'Operational' : stats?.status === 'error' ? 'Error' : 'Unknown'}
                                </div>
                            </div>
                            <div className={`p-3 rounded-full ${stats?.status === 'error' ? 'bg-critical-faded text-critical' : 'bg-success-faded text-success'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" /></svg>
                            </div>
                        </div>
                        <div className="mt-2 text-right">
                            <a href="/admin/supplier/network" className="text-sm text-interactive hover:underline">Manage &rarr;</a>
                        </div>
                    </Card.Session>
                </Card>
            </div>
        </>
    );
}

export function DropshipQuickLinks() {
    return (
        <Card title="Quick Links">
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
                        <a href="/admin/products?status=0" className="flex items-center text-textSubdued hover:text-interactive transition-colors">
                            <span className="w-2 h-2 rounded-full bg-critical mr-2"></span>
                            Disabled Products
                        </a>
                    </li>
                </ul>
            </Card.Session>
        </Card>
    );
}

// Layout Export to inject widgets
// We inject KPIs into 'leftSide' (Main column) at the top (sortOrder 1)
// We inject QuickLinks into 'rightSide' (Sidebar) at the top (sortOrder 1)
export const layout = {
    areaId: 'leftSide',
    sortOrder: 1
};

export default DropshipKPIs;

// We need a second export for the right side, but standard ES modules only support one default.
// However, the Evershop Layout system usually scans for `layout` and `default` export.
// To inject TWO things into TWO different areas from ONE file is tricky if we follow the standard `pages/admin/dashboard` pattern.
// Strategy: I will split this into two files `DropshipKPIs.jsx` and `DropshipQuickLinks.jsx` to be safe effectively.
