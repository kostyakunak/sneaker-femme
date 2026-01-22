import React, { useState } from 'react';
import { Card } from '@components/admin/Card';
import { PageHeading } from '@components/admin/PageHeading';
import { Button } from '@components/common/Button';

export default function SupplierSyncStatus({ stats }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const syncStats = stats || {
        lastSync: 'Never',
        updatedProducts: 0,
        processedOrders: 0,
        errors: 0,
        lastError: null
    };

    const runSync = async () => {
        setLoading(true);
        setMessage('');
        try {
            const response = await fetch('/admin/supplier-sync/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mock: false })
            });
            const result = await response.json();
            if (result.success) {
                setMessage('✅ Sync completed successfully');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                setMessage(`❌ Error: ${result.message}`);
            }
        } catch (e) {
            setMessage(`❌ Network error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-supplier-sync-status">
            <PageHeading title="Supplier Sync Status" />
            {message && (
                <div className="mt-4 p-4 bg-info-faded text-info-contrast rounded">
                    {message}
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <Card title="Latest Statistics">
                    <Card.Session>
                        <div className="flex justify-between py-2">
                            <span className="text-secondary">Last Sync</span>
                            <span className="font-medium">{syncStats.lastSync}</span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span className="text-secondary">Updated Products</span>
                            <span className="font-medium text-success">{syncStats.updatedProducts}</span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span className="text-secondary">Processed Orders</span>
                            <span className="font-medium text-interactive">{syncStats.processedOrders}</span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span className="text-secondary">Errors</span>
                            <span className="font-medium text-critical">{syncStats.errors}</span>
                        </div>
                    </Card.Session>
                    {syncStats.lastError && (
                        <Card.Session title="Last Error">
                            <p className="text-sm text-critical bg-critical-faded p-2 rounded">{syncStats.lastError}</p>
                        </Card.Session>
                    )}
                </Card>

                <Card title="Manual Controls">
                    <Card.Session>
                        <p className="text-sm text-secondary mb-4">
                            Manually trigger synchronization. Advisory locks prevent parallel execution.
                        </p>
                        <div className="flex flex-col gap-2">
                            <Button
                                title={loading ? 'Running...' : 'Run Sync & Confirm Now'}
                                onAction={runSync}
                                variant="primary"
                                disabled={loading}
                            />
                        </div>
                    </Card.Session>
                </Card>
            </div>
        </div>
    );
}

export const layout = {
    areaId: 'content',
    sortOrder: 10
};
