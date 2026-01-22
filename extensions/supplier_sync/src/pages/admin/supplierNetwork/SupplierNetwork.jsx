import { Card } from '@components/admin/Card';
import axios from 'axios';
import React, { useEffect, useState } from 'react';

export default function SupplierNetwork() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/admin/supplier-sync/stats');
            setStats(response.data.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const runSync = async () => {
        if (!confirm('Run manual sync now? This may take a few seconds.')) return;
        setSyncing(true);
        try {
            await axios.post('/admin/supplier-sync/run');
            alert('Sync completed successfully.');
            await fetchStats();
        } catch (e) {
            alert('Sync failed: ' + (e.response?.data?.error?.message || e.message));
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    if (loading && !stats) return <div className="p-8 text-center">Loading stats...</div>;

    return (
        <div className="main-content-inner">
            <div className="grid grid-cols-1 gap-8">
                <Card title="Supplier Sync Status">
                    <Card.Session>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-interactive">
                                    {stats?.status === 'success' ? '✅ Operational' :
                                        stats?.status === 'error' ? '❌ Error' : 'Unknown'}
                                </h2>
                                <p className="text-textSubdued mt-1">
                                    Last Run: {stats?.lastRun ? new Date(stats.lastRun).toLocaleString() : 'Never'}
                                </p>
                            </div>
                            <button
                                className={`btn btn-primary ${syncing ? 'loading' : ''}`}
                                onClick={runSync}
                                disabled={syncing}
                            >
                                {syncing ? 'Syncing...' : 'Run Sync Now'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 border rounded border-divider bg-backgroundSubdued">
                                <div className="text-2xl font-bold">{stats?.updatedProducts || 0}</div>
                                <div className="text-sm text-textSubdued">Products Synced</div>
                            </div>
                            <div className="p-4 border rounded border-divider bg-backgroundSubdued">
                                <div className="text-2xl font-bold">{stats?.processedOrders || 0}</div>
                                <div className="text-sm text-textSubdued">Orders Processed</div>
                            </div>
                            <div className="p-4 border rounded border-divider bg-backgroundSubdued">
                                <div className="text-2xl font-bold text-critical">{stats?.error ? 1 : 0}</div>
                                <div className="text-sm text-textSubdued">Last Errors</div>
                            </div>
                        </div>

                        {stats?.error && (
                            <div className="mt-6 p-4 border border-critical bg-critical-faded rounded text-critical-contrast overflow-auto">
                                <strong>Last Error:</strong>
                                <pre className="mt-2 text-xs">{stats.error}</pre>
                            </div>
                        )}

                        <div className="mt-8 pt-6 border-t border-divider">
                            <h3 className="font-bold mb-4">Configuration</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-textSubdued">Job Schedule:</span>
                                    <span className="ml-2">Every Hour (0 * * * *)</span>
                                </div>
                                <div>
                                    <span className="text-textSubdued">Mode:</span>
                                    <span className="ml-2">Mock (Random Price/Stock)</span>
                                </div>
                            </div>
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

export const query = `
  query Query {
    site {
      url
    }
  }
`;
