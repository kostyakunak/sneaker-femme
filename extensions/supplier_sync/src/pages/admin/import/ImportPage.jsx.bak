import { Card } from '@components/admin/Card';
import { Button } from '@components/common/Button';
import { ToastContainer, toast } from 'react-toastify';
import axios from 'axios';
import React, { useState, useEffect } from 'react';

import Area from '@components/common/Area';
import './ImportPage.scss';

export default function ImportPage() {
    const [step, setStep] = useState(1); // 1: Search, 2: Configure & Import
    const [loading, setLoading] = useState(false);
    const [sku, setSku] = useState('');
    const [productData, setProductData] = useState(null);
    const [markup, setMarkup] = useState(20); // Default 20%
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');

    useEffect(() => {
        // Fetch categories for the dropdown
        // This query requires standard GraphQL or REST. Let's use simplified REST if available or just hardcode for MVP if too complex.
        // Actually, let's leave category empty for now or try to use a basic query if we can.
        // For MVP, we will let user enter ID or just import without category.
    }, []);

    const fetchProduct = async () => {
        if (!sku) {
            toast.error('Please enter a Supplier SKU or URL');
            return;
        }
        setLoading(true);
        try {
            const res = await axios.post('/admin/import/fetch', { sku });
            setProductData(res.data.data);
            setStep(2);
        } catch (e) {
            toast.error('Failed to fetch product: ' + (e.response?.data?.error?.message || e.message));
        } finally {
            setLoading(false);
        }
    };

    const importProduct = async () => {
        setLoading(true);
        try {
            // Calculate Retail Price
            const basePrice = parseFloat(productData.supplierPrice || productData.price);
            const retailPrice = (basePrice * (1 + markup / 100)).toFixed(2);

            const payload = {
                sku: productData.sku, // Local SKU = Supplier SKU for simplicity
                name: productData.name,
                description: productData.description,
                price: retailPrice,
                qty: productData.qty,
                supplierSku: productData.sku, // Linking Key
                supplierSource: 'manual_import',
                supplierPrice: productData.supplierPrice,
                category_id: selectedCategory,
                status: 1 // Enabled
            };

            await axios.post('/admin/import/product', payload);
            toast.success('Product imported successfully!');

            // Reset
            setTimeout(() => {
                setStep(1);
                setSku('');
                setProductData(null);
            }, 1500);

        } catch (e) {
            toast.error('Import failed: ' + (e.response?.data?.error?.message || e.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="main-content-inner">
            <div className="flex justify-between mb-4">
                <h1 className="text-2xl font-bold">Import from Supplier</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Input */}
                <Card title="Fetch Data">
                    <Card.Session>
                        <div className="form-field">
                            <label htmlFor="sku">Supplier SKU / URL</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    id="sku"
                                    placeholder="e.g. NIKE-AIR-001"
                                    value={sku}
                                    onChange={(e) => setSku(e.target.value)}
                                    disabled={step === 2}
                                    className="form-control"
                                />
                                {step === 1 && (
                                    <Button
                                        variant="primary"
                                        onClick={fetchProduct}
                                        isLoading={loading}
                                    >
                                        Fetch
                                    </Button>
                                )}
                                {step === 2 && (
                                    <Button variant="default" onClick={() => setStep(1)}>Reset</Button>
                                )}
                            </div>
                            <p className="text-sm text-textSubdued mt-1">This will pull description, images and variants from the supplier feed.</p>
                        </div>
                    </Card.Session>
                </Card>

                {/* Right Column: Preview & Config */}
                {step === 2 && productData && (
                    <Card title="Configuration & Import">
                        <Card.Session>
                            <div className="flex gap-4 mb-6 p-4 border rounded border-divider bg-backgroundSubdued">
                                {productData.images && productData.images[0] && (
                                    <img src={productData.images[0]} alt="Preview" className="w-20 h-20 object-cover rounded" />
                                )}
                                <div>
                                    <h3 className="font-bold">{productData.name}</h3>
                                    <div className="text-sm">Supplier Price: <span className="font-mono">${productData.supplierPrice}</span></div>
                                    <div className="text-sm">Stock: {productData.qty}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-field">
                                    <label>Markup (%)</label>
                                    <input
                                        type="number"
                                        value={markup}
                                        onChange={(e) => setMarkup(e.target.value)}
                                        className="form-control"
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Retail Price</label>
                                    <div className="p-2 border border-divider rounded bg-gray-50 font-bold">
                                        ${(parseFloat(productData.supplierPrice) * (1 + markup / 100)).toFixed(2)}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <Button
                                    variant="primary"
                                    onClick={importProduct}
                                    isLoading={loading}
                                >
                                    Import Product
                                </Button>
                            </div>
                        </Card.Session>
                    </Card>
                )}
            </div>
            <ToastContainer />
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
