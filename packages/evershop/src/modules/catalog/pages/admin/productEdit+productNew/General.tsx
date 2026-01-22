import { Card } from '@components/admin/Card.js';
import { CategorySelector } from '@components/admin/CategorySelector.js';
import Area from '@components/common/Area.js';
import { Editor } from '@components/common/form/Editor.js';
import { InputField } from '@components/common/form/InputField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { Modal } from '@components/common/modal/Modal.js';
import { useModal } from '@components/common/modal/useModal.js';
import { _ } from '../../../../../lib/locale/translate/_.js';
import React from 'react';
import { useQuery } from 'urql';
import './General.scss';
import { useFormContext } from 'react-hook-form';

const SKUPriceWeight: React.FC<{
  sku: string;
  price: {
    value: number | undefined;
  };
  weight: {
    value: number | undefined;
  };
  setting: {
    storeCurrency: string;
    weightUnit: string;
  };
}> = ({ sku, price, weight, setting }) => {
  return (
    <div className="grid grid-cols-3 gap-2 mt-4">
      <InputField
        name="sku"
        label="SKU"
        placeholder="Enter SKU"
        defaultValue={sku}
        required
        helperText={_('SKU must be unique')}
      />
      <NumberField
        name="price"
        placeholder="Enter price"
        label={`Price`}
        defaultValue={price?.value}
        unit={setting.storeCurrency}
        min={0}
        required
      />
      <NumberField
        name="weight"
        placeholder="Enter weight"
        label={`Weight`}
        defaultValue={weight?.value}
        unit={setting.weightUnit}
        required
        validation={{ min: 1 }}
        helperText={_('Weight must be a positive number')}
      />
    </div>
  );
};

const SupplierInfo: React.FC<{
  product: {
    price: {
      regular: {
        value: number;
      };
    };
    supplierPrice?: number;
    supplierCurrency?: string;
    supplierUpdatedAt?: string;
  };
}> = ({ product }) => {
  if (!product.supplierPrice) {
    return null;
  }

  const sellingPrice = product.price.regular.value;
  const supplierPrice = product.supplierPrice;
  const margin = sellingPrice > 0 ? (((sellingPrice - supplierPrice) / sellingPrice) * 100).toFixed(2) : 0;
  const marginColor = parseFloat(margin) < 0 ? 'text-critical' : 'text-success';

  return (
    <div className="mt-4 p-4 bg-gray-50 border rounded border-divider">
      <div className="flex justify-between items-center">
        <div>
          <span className="font-semibold text-gray-700">Supplier Data:</span>
          <span className="ml-2">
            {product.supplierPrice} {product.supplierCurrency}
          </span>
        </div>
        <div className="text-sm text-gray-400">
          Last sync: {product.supplierUpdatedAt ? new Date(product.supplierUpdatedAt).toLocaleString() : 'Never'}
        </div>
      </div>
      <div className="mt-2">
        <span className="font-semibold text-gray-700">Estimated Margin:</span>
        <span className={`ml-2 font-bold ${marginColor}`}>
          {margin}%
        </span>
      </div>
    </div>
  );
};

const CategoryQuery = `
  query Query ($id: Int!) {
    category(id: $id) {
      categoryId
      name
      path {
        name
      }
    }
  }
`;

const ProductCategory: React.FC<{
  categoryId: number;
  onChange: () => void;
  onUnassign: () => void;
}> = ({ categoryId, onChange, onUnassign }) => {
  const { register } = useFormContext();
  const [result] = useQuery({
    query: CategoryQuery,
    variables: {
      id: categoryId
    }
  });
  const { data, fetching, error } = result;
  if (error) {
    return (
      <p className="text-critical">
        There was an error fetching categories.
        {error.message}
      </p>
    );
  }
  if (fetching) {
    return <span>Loading...</span>;
  }

  return (
    <div>
      {data.category.path.map((item, index) => (
        <span key={item.name} className="text-gray-500">
          {item.name}
          {index < data.category.path.length - 1 && ' > '}
        </span>
      ))}
      <span className="text-interactive pl-5">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onChange();
          }}
        >
          Change
        </a>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onUnassign();
          }}
          className="text-critical ml-5"
        >
          Unassign
        </a>
      </span>
      <input type="hidden" {...register('category_id')} value={categoryId || ''} />
    </div>
  );
};

const CategorySelect: React.FC<{
  product?:
  | {
    category?: {
      categoryId: number;
      name?: string;
      path?: Array<{ name: string }>;
    };
  }
  | undefined;
}> = ({ product }) => {
  const [category, setCategory] = React.useState<{
    categoryId: number;
    uuid?: string;
    name?: string;
  } | null>(
    product ? product.category : null
  );
  const modal = useModal();

  const onSelect = (categoryId, uuid, name) => {
    setCategory({ categoryId, uuid, name });
    modal.close();
  };

  const onUnassign = () => {
    setCategory(null);
  };

  return (
    <div className="mt-4 relative">
      <div className="mb-2">Category</div>
      {category && (
        <div className="border rounded border-[#c9cccf] mb-2 p-2">
          {category && (
            <ProductCategory
              categoryId={category.categoryId}
              onChange={() => modal.open()}
              onUnassign={onUnassign}
            />
          )}
        </div>
      )}
      {!category && (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            modal.open();
          }}
          className="text-interactive"
        >
          Select category
        </a>
      )}
      <Modal
        title="Select Category"
        isOpen={modal.isOpen}
        onClose={modal.close}
      >
        <CategorySelector
          onSelect={onSelect}
          onUnSelect={() => { }}
          selectedCategories={category ? [category] : []}
        />
      </Modal>
    </div>
  );
};

interface GeneralProps {
  product?: {
    description?: Array<{
      id: string;
      size: number;
      columns: Array<{
        id: string;
        size: number;
        data: object;
      }>;
    }>;
    name: string;
    price: {
      regular: {
        currency: string;
        value: number;
      };
    };
    productId: number;
    uuid: string;
    taxClass: number;
    sku: string;
    weight: {
      unit: string;
      value: number;
    };
    category?: {
      categoryId: number;
      name?: string;
      path?: Array<{ name: string }>;
    };
    supplierPrice?: number;
    supplierCurrency?: string;
    supplierUpdatedAt?: string;
  };
  setting: {
    storeCurrency: string;
    weightUnit: string;
  };
  productTaxClasses: {
    items: Array<{
      value: number;
      text: string;
    }>;
  };
}
export default function General({
  product,
  setting,
  productTaxClasses: { items: taxClasses }
}: GeneralProps) {
  return (
    <Card title="General">
      <Card.Session>
        <Area
          id="productEditGeneral"
          coreComponents={[
            {
              component: {
                default: (
                  <InputField
                    name="name"
                    placeholder="Enter product name"
                    label="Product Name"
                    defaultValue={product?.name}
                    required
                    helperText={_('Product name is required')}
                  />
                )
              },
              sortOrder: 10,
              id: 'name'
            },
            {
              component: {
                default: (
                  <SKUPriceWeight
                    sku={product?.sku || ''}
                    price={
                      product?.price.regular || {
                        value: undefined
                      }
                    }
                    weight={product?.weight || { value: undefined }}
                    setting={setting}
                  />
                )
              },
              sortOrder: 20,
              id: 'SKUPriceWeight'
            },
            {
              component: {
                default: product ? <SupplierInfo product={product} /> : null
              },
              sortOrder: 21,
              id: 'supplierInfo'
            },
            {
              component: {
                default: <CategorySelect product={product} />
              },
              sortOrder: 22,
              id: 'category'
            },
            {
              component: {
                default: (
                  <SelectField
                    name="tax_class"
                    label="Tax Class"
                    options={taxClasses.map((taxClass) => ({
                      value: taxClass.value,
                      label: taxClass.text
                    }))}
                    defaultValue={product?.taxClass || ''}
                    required
                    validation={{ required: true }}
                  />
                )
              },
              sortOrder: 25,
              id: 'tax_class'
            },
            {
              component: {
                default: (
                  <Editor
                    name="description"
                    label="Description"
                    value={product?.description}
                  />
                )
              },
              sortOrder: 30,
              id: 'description'
            }
          ]}
        />
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 10
};

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      productId
      uuid
      name
      description
      sku
      taxClass
      price {
        regular {
          value
          currency
        }
      }
      weight {
        value
        unit
      }
      supplierPrice
      supplierCurrency
      supplierUpdatedAt
      category {
        categoryId
        path {
          name
        }
      }
    }
    setting {
      weightUnit
      storeCurrency
    }
    productTaxClasses: taxClasses {
      items {
        value: taxClassId
        text: name
      }
    }
  }
`;
