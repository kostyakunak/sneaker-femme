import Button from '@components/common/Button.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { Modal } from '@components/common/modal/Modal.js';
import { useModal } from '@components/common/modal/useModal.js';
import React from 'react';
import { useForm } from 'react-hook-form';
import { _ } from '@evershop/evershop/lib/locale/translate/_';

interface AddTrackingButtonProps {
  order: {
    shipment: {
      carrier: string;
      trackingNumber: string;
      updateShipmentApi: string;
    };
    createShipmentApi: string;
  };
  carriers: {
    value: string;
    label: string;
  }[];
}
export default function AddTrackingButton({
  order: { shipment },
  carriers
}: AddTrackingButtonProps) {
  const modal = useModal();
  const form = useForm();
  if (!shipment) {
    return null;
  } else {
    return (
      <>
        <Button
          title={_('Edit Tracking Info')}
          variant="primary"
          onAction={() => {
            modal.open();
          }}
        />
        <Modal
          title={_('Edit Tracking Information')}
          onClose={modal.close}
          isOpen={modal.isOpen}
        >
          <Form
            form={form}
            id="editTrackingInfo"
            method="PATCH"
            action={shipment.updateShipmentApi}
            submitBtn={false}
            onSuccess={() => {
              location.reload();
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <div>
                <InputField
                  type="text"
                  name="tracking_number"
                  label={_('Tracking number')}
                  placeholder={_('Tracking number')}
                  defaultValue={shipment.trackingNumber || ''}
                  required
                  validation={{
                    required: _('Tracking number is required')
                  }}
                />
              </div>
              <div>
                <SelectField
                  name="carrier"
                  label={_('Carrier')}
                  defaultValue={shipment.carrier || ''}
                  required
                  options={carriers}
                  validation={{
                    required: _('Carrier is required')
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  title={_('Cancel')}
                  variant="danger"
                  onAction={modal.close}
                />
                <Button
                  title={_('Save')}
                  variant="primary"
                  isLoading={form.formState.isSubmitting}
                  onAction={async () => {
                    (
                      document.getElementById(
                        'editTrackingInfo'
                      ) as HTMLFormElement
                    ).dispatchEvent(
                      new Event('submit', { cancelable: true, bubbles: true })
                    );
                  }}
                />
              </div>
            </div>
          </Form>
        </Modal>
      </>
    );
  }
}

export const layout = {
  areaId: 'order_actions',
  sortOrder: 5
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      shipment {
        shipmentId
        carrier
        trackingNumber
        updateShipmentApi
      }
      createShipmentApi
    },
    carriers {
      label: name
      value: code
    }
  }
`;
