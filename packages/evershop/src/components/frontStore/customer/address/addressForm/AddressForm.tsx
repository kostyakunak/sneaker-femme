import Area from '@components/common/Area.js';
import { InputField } from '@components/common/form/InputField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { NameAndTelephone } from '@components/frontStore/customer/address/addressForm/NameAndTelephone.js';
import { ProvinceAndPostcode } from '@components/frontStore/customer/address/addressForm/ProvinceAndPostcode.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import { CustomerAddressGraphql } from '@evershop/evershop/types/customerAddress';
import React from 'react';
import { useFormContext } from 'react-hook-form';

interface CustomerAddressFormProps {
  allowCountries: {
    value: string;
    label: string;
    provinces: {
      value: string;
      label: string;
    }[];
  }[];
  address?: CustomerAddressGraphql;
  areaId?: string;
  fieldNamePrefix?: string;
}
const UA_PROVINCES = [
  { value: 'UA-71', label: 'Черкаська область' },
  { value: 'UA-74', label: 'Чернігівська область' },
  { value: 'UA-77', label: 'Чернівецька область' },
  { value: 'UA-12', label: 'Дніпропетровська область' },
  { value: 'UA-14', label: 'Донецька область' },
  { value: 'UA-26', label: 'Івано-Франківська область' },
  { value: 'UA-63', label: 'Харківська область' },
  { value: 'UA-65', label: 'Херсонська область' },
  { value: 'UA-68', label: 'Хмельницька область' },
  { value: 'UA-35', label: 'Кіровоградська область' },
  { value: 'UA-30', label: 'Київ' },
  { value: 'UA-32', label: 'Київська область' },
  // { value: 'UA-09', label: 'Луганська область' }, // Temporarily removed due to full occupation
  { value: 'UA-46', label: 'Львівська область' },
  { value: 'UA-48', label: 'Миколаївська область' },
  { value: 'UA-51', label: 'Одеська область' },
  { value: 'UA-53', label: 'Полтавська область' },
  { value: 'UA-56', label: 'Рівненська область' },
  // { value: 'UA-43', label: 'Автономна Республіка Крим' }, // Temporarily removed due to occupation
  // { value: 'UA-40', label: "Севастополь" }, // Temporarily removed due to occupation
  { value: 'UA-59', label: 'Сумська область' },
  { value: 'UA-61', label: 'Тернопільська область' },
  { value: 'UA-05', label: 'Вінницька область' },
  { value: 'UA-07', label: 'Волинська область' },
  { value: 'UA-21', label: 'Закарпатська область' },
  { value: 'UA-23', label: 'Запорізька область' },
  { value: 'UA-18', label: 'Житомирська область' }
];

export function CustomerAddressForm({
  allowCountries = [],
  address = {},
  areaId = 'customerAddressForm',
  fieldNamePrefix = 'address'
}: CustomerAddressFormProps) {
  const { watch, setValue } = useFormContext();

  const getFieldName = (fieldName: string) => {
    return fieldNamePrefix ? `${fieldNamePrefix}.${fieldName}` : fieldName;
  };

  const selectedCountry = watch(
    getFieldName('country'),
    'UA' // Force default to UA
  );

  React.useEffect(() => {
    // Force set country to UA on mount if not set
    if (!address?.country?.code || address?.country?.code !== 'UA') {
      setValue(getFieldName('country'), 'UA');
    }
  }, []); // Run once on mount

  // Calculate provinces based on selected country
  const currentProvinces = selectedCountry === 'UA'
    ? UA_PROVINCES
    : (allowCountries.find(c => c.value === selectedCountry)?.provinces || []);

  return (
    <Area
      id={areaId}
      coreComponents={[
        {
          component: {
            default: (
              <NameAndTelephone
                fullName={address?.fullName || ''}
                telephone={address?.telephone || ''}
                getFieldName={getFieldName}
              />
            )
          },
          sortOrder: 10
        },
        {
          component: {
            default: (
              <InputField
                name={getFieldName('address_1')}
                label={_('Address')}
                placeholder={_('Address')}
                defaultValue={address?.address1 || ''}
                required
                validation={{
                  required: _('Address is required')
                }}
              />
            )
          },
          sortOrder: 20
        },
        {
          component: {
            default: (
              <InputField
                name={getFieldName('address_2')}
                label={_('Address 2')}
                placeholder={_('Address 2')}
                defaultValue={address?.address2 || ''}
              />
            )
          },
          sortOrder: 30
        },
        {
          component: {
            default: (
              <InputField
                name={getFieldName('city')}
                label={_('City')}
                placeholder={_('City')}
                defaultValue={address?.city || ''}
              />
            )
          },
          sortOrder: 40
        },
        {
          component: {
            default: (
              <div className="hidden">
                <SelectField
                  defaultValue={'UA'}
                  label={_('Country')}
                  name={getFieldName('country')}
                  placeholder={_('Country')}
                  onChange={(value) => {
                    setValue(getFieldName('country'), value.target.value);
                    setValue(getFieldName('province'), '');
                  }}
                  required
                  validation={{ required: _('Country is required') }}
                  options={allowCountries.length > 0 ? allowCountries : [{ value: 'UA', label: 'Ukraine' }]}
                />
              </div>
            )
          },
          sortOrder: 50
        },
        {
          component: {
            default: (
              <ProvinceAndPostcode
                provinces={currentProvinces}
                province={address?.province || { code: '' }}
                postcode={address?.postcode || ''}
                getFieldName={getFieldName}
              />
            )
          },
          sortOrder: 60
        },
        {
          component: {
            default: (
              <p className="text-sm text-gray-500 mt-2 italic">
                {_('Примiтка: доставка на тимчасово окуповані території не здійснюється.')}
              </p>
            )
          },
          sortOrder: 70
        }
      ]}
    />
  );
}
