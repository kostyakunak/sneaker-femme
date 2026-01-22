import React, { useState } from 'react';
import { Card } from '@components/admin/Card';
import { PageHeading } from '@components/admin/PageHeading';
import { TextField } from '@components/common/form/TextField';
import { Button } from '@components/common/Button';

export default function ImportProduct() {
    const [sku, setSku] = useState('');
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleFetch = async () => {
        setLoading(true);
        setMessage('');
        // Mock fetch - in production, replace with real supplier API call
        setTimeout(() => {
            setPreview({
                name: `Sample Product ${sku}`,
                price: 99.99,
                description: 'Fetched from supplier API',
                images: ['https://picsum.photos/200']
            });
            setLoading(false);
        }, 1000);
    };

    const handleImport = async () => {
        setLoading(true);
        setMessage('');
        try {
            const response = await fetch('/admin/supplier-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sku: sku,
                    categoryId: 1,
                    price: preview.price,
                    enabled: true
                })
            });
            const result = await response.json();
            if (result.success) {
                setMessage(`✅ Product imported successfully! ID: ${result.product.id}`);
                setTimeout(() => {
                    window.location.href = '/admin/products';
                }, 2000);
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
        <div className="admin-supplier-import">
            <PageHeading title="Import Product by SKU" />

            {message && (
                <div className="mt-4 p-4 bg-info-faded text-info-contrast rounded">
                    {message}
                </div>
            )}

            <div className="mt-6 flex flex-col gap-6 max-w-2xl">
                <Card title="Supplier SKU Info" subdued>
                    <Card.Session>
                        <div className="flex gap-4 items-end">
                            <div className="flex-grow">
                                <TextField
                                    label="Supplier SKU"
                                    placeholder="Enter SKU (e.g. ABC-123)"
                                    value={sku}
                                    onChange={(e) => setSku(e.target.value)}
                                />
                            </div>
                            <Button
                                title={loading ? 'Fetching...' : 'Fetch Details'}
                                onAction={handleFetch}
                                variant="primary"
                                disabled={!sku || loading}
                            />
                        </div>
                    </Card.Session>
                </Card>

                {preview && (
                    <Card title="Product Preview">
                        <Card.Session>
                            <div className="flex gap-4">
                                <img src={preview.images[0]} alt="Preview" className="w-32 h-32 object-cover rounded border" />
                                <div className="flex-grow">
                                    <h4 className="font-bold text-lg">{preview.name}</h4>
                                    <p className="text-success font-bold">${preview.price}</p>
                                    <p className="text-sm text-secondary mt-2">{preview.description}</p>
                                </div>
                            </div>
                        </Card.Session>
                        <Card.Session>
                            <div className="flex justify-end gap-2">
                                <Button
                                    title="Cancel"
                                    onAction={() => setPreview(null)}
                                    variant="secondary"
                                    disabled={loading}
                                />
                                <Button
                                    title={loading ? 'Importing...' : 'Import Product into Evershop'}
                                    onAction={handleImport}
                                    variant="primary"
                                    disabled={loading}
                                />
                            </div>
                        </Card.Session>
                    </Card>
                )}
            </div>
        </div>
    );
}

export const layout = {
    areaId: 'content',
    sortOrder: 10
};
