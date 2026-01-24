import { Card } from '@components/admin/Card.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { RadioGroupField } from '@components/common/form/RadioGroupField.js';
import React from 'react';
import { _ } from '../../../../../lib/locale/translate/_.js';

interface InventoryProps {
  product:
  | {
    supplierUpdatedAt?: string;
    supplierSku?: string;
    inventory: {
      qty: number;
      stockAvailability: number;
      manageStock: number;
    };
  }
  | undefined;
}
export default function Inventory({ product }: InventoryProps) {
  const inventory = product?.inventory || {
    qty: undefined,
    stockAvailability: undefined,
    manageStock: undefined
  };

  const isManagedBySupplier = !!product?.supplierSku;

  return (
    <Card title={_('Inventory')} subdued>
      {isManagedBySupplier && (
        <div className="p-4 mb-4 border-l-4 border-info bg-info-faded text-info-contrast rounded-r">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-info-contrast">{_('Managed by Supplier')}</h3>
              <div className="mt-2 text-sm text-info-contrast">
                <p>{_('Inventory is automatically synced. Manual changes are disabled.')}</p>
                {product?.supplierUpdatedAt && (
                  <p className="mt-1 font-mono text-xs opacity-75">{_('Last Sync:')} {new Date(product.supplierUpdatedAt).toLocaleString()}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <Card.Session>
        <RadioGroupField
          name="manage_stock"
          label={_('Manage Stock')}
          options={[
            { value: 1, label: _('Yes') },
            { value: 0, label: _('No') }
          ]}
          defaultValue={inventory.manageStock === 0 ? 0 : 1}
          disabled={isManagedBySupplier}
        />
        {isManagedBySupplier && <input type="hidden" name="manage_stock" value={inventory.manageStock === 0 ? 0 : 1} />}
      </Card.Session>
      <Card.Session>
        <RadioGroupField
          name="stock_availability"
          label={_('Stock Availability')}
          options={[
            { value: 1, label: _('In Stock') },
            { value: 0, label: _('Out of Stock') }
          ]}
          defaultValue={inventory.stockAvailability === 0 ? 0 : 1}
          disabled={isManagedBySupplier}
        />
        {isManagedBySupplier && <input type="hidden" name="stock_availability" value={inventory.stockAvailability === 0 ? 0 : 1} />}
      </Card.Session>
      <Card.Session>
        <NumberField
          name="qty"
          defaultValue={inventory.qty}
          placeholder={_('Quantity')}
          label={_('Quantity')}
          readOnly={isManagedBySupplier}
          helperText={isManagedBySupplier ? (
            <span className="text-interactive">
              {_('Synced from Supplier')}
            </span>
          ) : null}
          required={!isManagedBySupplier}
        />
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 15
};

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      supplierUpdatedAt
      supplierSku
      inventory {
        qty
        stockAvailability
        manageStock
      }
    }
  }
`;
