import { Card } from '@components/admin/Card';
import Button from '@components/common/Button';
import { ToastContainer, toast } from 'react-toastify';
import axios from 'axios';
import React, { useState, useEffect } from 'react';
import Area from '@components/common/Area';
import './ImportPage.scss';

// Helper to build tree
function buildCategoryTree(items) {
    const tree = [];
    const map = new Map();

    // Initialize map
    items.forEach(item => {
        map.set(item.categoryId, { ...item, children: [] });
    });

    // Build hierarchy based on path
    items.forEach(item => {
        if (item.path && item.path.length > 1) {
            // It has parents. The direct parent is path[path.length - 2]
            // But wait, path includes itself? 
            // Usually path is [Root, Child, Grandchild].
            // If item is 'Shoes' (id: 20), path might be [{id:10, name:'Men'}, {id:20, name:'Shoes'}]
            // So parent is path[length - 2].
            const parentInPath = item.path[item.path.length - 2];
            if (parentInPath && map.has(parentInPath.categoryId)) {
                map.get(parentInPath.categoryId).children.push(map.get(item.categoryId));
            } else {
                // Fallback if parent not found in list (should not happen if all active)
                tree.push(map.get(item.categoryId));
            }
        } else {
            // Root item (path length 1 or empty)
            tree.push(map.get(item.categoryId));
        }
    });

    return tree;
}

function CategorySelector({ categories, value, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredParent, setHoveredParent] = useState(null);
    const tree = React.useMemo(() => buildCategoryTree(categories), [categories]);
    const wrapperRef = React.useRef(null);

    // Find selected name
    const selectedItem = categories.find(c => String(c.categoryId) === String(value));
    const selectedName = selectedItem
        ? (selectedItem.path ? selectedItem.path.map(p => p.name).join(' > ') : selectedItem.name)
        : '-- Select Category --';

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    return (
        <div className="relative" ref={wrapperRef}>
            <div
                className="form-control cursor-pointer flex justify-between items-center"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{selectedName}</span>
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 flex">
                    {/* Roots Column */}
                    <div className="w-1/2 md:w-1/3 border-r border-gray-100 max-h-60 overflow-y-auto">
                        {tree.map(root => (
                            <div
                                key={root.categoryId}
                                className={`px-4 py-2 cursor-pointer hover:bg-blue-50 flex justify-between items-center ${String(value) === String(root.categoryId) ? 'bg-blue-50 font-bold' : ''}`}
                                onMouseEnter={() => setHoveredParent(root)}
                                onClick={() => {
                                    onChange(root.categoryId);
                                    if (root.children.length === 0) setIsOpen(false);
                                }}
                            >
                                <span>{root.name}</span>
                                {root.children.length > 0 && <span className="text-gray-400">&rsaquo;</span>}
                            </div>
                        ))}
                    </div>

                    {/* Children Column (Flyout) */}
                    <div className="w-1/2 md:w-2/3 bg-gray-50 max-h-60 overflow-y-auto">
                        {hoveredParent && hoveredParent.children.length > 0 ? (
                            hoveredParent.children.map(child => (
                                <div
                                    key={child.categoryId}
                                    className={`px-4 py-2 cursor-pointer hover:bg-blue-100 ${String(value) === String(child.categoryId) ? 'bg-blue-200 font-bold' : ''}`}
                                    onClick={() => {
                                        onChange(child.categoryId);
                                        setIsOpen(false);
                                    }}
                                >
                                    {child.name}
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-gray-400 text-sm italic">
                                {hoveredParent ? 'No subcategories' : 'Hover a category to see subcategories'}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ImportPage({ siteCurrency = 'USD', categories = { items: [] } }) {
    const [step, setStep] = useState(1); // 1: Search, 2: Configure & Import
    const [loading, setLoading] = useState(false);
    const [sku, setSku] = useState('');
    const [productData, setProductData] = useState(null);
    const [markup, setMarkup] = useState(20); // Default 20%
    const [retailPrice, setRetailPrice] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    const handleMarkupChange = (val) => {
        const m = parseFloat(val) || 0;
        setMarkup(val);
        if (productData) {
            const base = parseFloat(productData.supplierPrice || productData.price || 0);
            setRetailPrice((base * (1 + m / 100)).toFixed(2));
        }
    };

    const handleRetailPriceChange = (val) => {
        setRetailPrice(val);
        if (productData) {
            const base = parseFloat(productData.supplierPrice || productData.price || 0);
            const price = parseFloat(val) || 0;
            if (base > 0) {
                const m = ((price / base) - 1) * 100;
                setMarkup(m.toFixed(2));
            }
        }
    };

    const fetchProduct = async () => {
        if (!sku) {
            toast.error('Please enter a Supplier SKU or URL');
            return;
        }
        console.log(`[Frontend] Fetching product for SKU: ${sku}`);
        setLoading(true);
        try {
            const res = await axios.post('/api/admin/supplier-import-fetch', { sku });
            console.log('[Frontend] Received response:', res.data);
            if (res.data && res.data.data) {
                const data = res.data.data;
                setProductData(data);
                // Initialize retail price with default 20% markup
                const base = parseFloat(data.supplierPrice || data.price || 0);
                setRetailPrice((base * 1.2).toFixed(2));
                setMarkup(20);
                setStep(2);
            } else {
                console.error('[Frontend] Response data is invalid:', res.data);
                toast.error('Received invalid data from server');
            }
        } catch (e) {
            console.error('[Frontend] Fetch failed:', e);
            toast.error('Failed to fetch product: ' + (e.response?.data?.error?.message || e.message));
        } finally {
            setLoading(false);
        }
    };

    const importProduct = async () => {
        setLoading(true);
        try {
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

            await axios.post('/api/admin/supplier-import-apply', payload);
            toast.success('Product imported successfully!');

            // Reset
            setTimeout(() => {
                setStep(1);
                setSku('');
                setProductData(null);
                setRetailPrice('');
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
                {step === 2 && <span className="badge badge-info">Step 2: Ready to Import</span>}
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
                                        title="Fetch"
                                        onAction={fetchProduct}
                                        isLoading={loading}
                                    />
                                )}
                                {step === 2 && (
                                    <Button variant="secondary" title="Reset / New Search" onAction={() => { setStep(1); setProductData(null); }} />
                                )}
                            </div>
                            <p className="text-sm text-textSubdued mt-1">This will pull description, images and variants from the supplier feed.</p>
                        </div>
                    </Card.Session>
                </Card>

                {/* Right Column: Preview & Config */}
                {step === 2 && (
                    productData ? (
                        <Card title="Configuration & Import">
                            <Card.Session>
                                <div className="flex gap-4 mb-6 p-4 border rounded border-divider bg-backgroundSubdued">
                                    {productData.images && productData.images[0] ? (
                                        <img src={productData.images[0]} alt="Preview" className="w-20 h-20 object-cover rounded" />
                                    ) : (
                                        <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center text-xs">No Image</div>
                                    )}
                                    <div className="flex-grow">
                                        <h3 className="font-bold">{productData.name || 'Untitled Product'}</h3>
                                        <div className="text-sm">Supplier Price: <span className="font-mono">{siteCurrency === 'UAH' ? '₴' : '$'}{productData.supplierPrice || productData.price || '0.00'}</span></div>
                                        <div className="text-sm">Stock: {productData.qty ?? 0}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-field">
                                        <label>Markup (%)</label>
                                        <input
                                            type="number"
                                            value={markup}
                                            onChange={(e) => handleMarkupChange(e.target.value)}
                                            className="form-control"
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>Retail Price</label>
                                        <div className="flex items-center gap-1">
                                            <span className="text-lg font-bold mr-1">{siteCurrency === 'UAH' ? '₴' : '$'}</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={retailPrice}
                                                onChange={(e) => handleRetailPriceChange(e.target.value)}
                                                className="form-control font-bold"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="form-field mt-4">
                                    <label>Category</label>
                                    <CategorySelector
                                        categories={categories.items}
                                        value={selectedCategory}
                                        onChange={setSelectedCategory}
                                    />
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <Button
                                        variant="primary"
                                        title="Import Product"
                                        onAction={importProduct}
                                        isLoading={loading}
                                    />
                                </div>
                            </Card.Session>
                        </Card>
                    ) : (
                        <Card title="Waiting for Data">
                            <Card.Session>
                                <div className="text-center p-8">
                                    <p className="text-textSubdued">Processing fetched data...</p>
                                    {!loading && <p className="text-critical mt-2">Error: Product data is empty. Try resetting.</p>}
                                </div>
                            </Card.Session>
                        </Card>
                    )
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
    siteCurrency: settingValue(key: "shop.currency")
    categories(filters: [{key: "status", operation: eq, value: "1"}]) {
      items {
        categoryId
        name
        path {
            categoryId
            name
        }
      }
    }
    site {
      url
    }
    pageInfo {
      title
      description
    }
  }
`;
