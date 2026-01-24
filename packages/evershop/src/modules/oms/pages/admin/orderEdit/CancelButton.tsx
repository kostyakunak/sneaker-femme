import Button from '@components/common/Button.js';
import { Form } from '@components/common/form/Form.js';
import { TextareaField } from '@components/common/form/TextareaField.js';
import { Modal } from '@components/common/modal/Modal.js';
import { useModal } from '@components/common/modal/useModal.js';
import RenderIfTrue from '@components/common/RenderIfTrue.js';
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { _ } from '@evershop/evershop/lib/locale/translate/_';

interface CancelButtonProps {
  order: {
    cancelApi: string;
    paymentStatus: {
      code: string;
      isCancelable: boolean;
    };
    shipmentStatus: {
      code: string;
      isCancelable: boolean;
    };
  };
}
export default function CancelButton({
  order: { cancelApi, paymentStatus, shipmentStatus }
}: CancelButtonProps) {
  const modal = useModal();
  const form = useForm();
  return (
    <RenderIfTrue
      condition={
        paymentStatus.isCancelable !== false &&
        shipmentStatus.isCancelable !== false
      }
    >
      <Button
        title={_('Cancel Order')}
        variant="danger"
        onAction={() => {
          modal.open();
        }}
      />
      <Modal title={_('Cancel Order')} onClose={modal.close} isOpen={modal.isOpen}>
        <Form
          form={form}
          id="cancelReason"
          method="POST"
          action={cancelApi}
          submitBtn={false}
          onSuccess={(response) => {
            if (response.error) {
              toast.error(response.error.message);
            } else {
              // Reload the page
              window.location.reload();
            }
          }}
        >
          <div>
            <TextareaField
              name="reason"
              label={_('Reason for cancellation')}
              placeholder={_('Reason for cancellation')}
              required
              validation={{
                required: _('Reason is required')
              }}
            />
          </div>
          <div className="flex justify-end">
            <div className="grid grid-cols-2 gap-2">
              <Button title={_('Cancel')} variant="danger" onAction={modal.close} />
              <Button
                title={_('Submit Cancellation')}
                variant="primary"
                isLoading={form.formState.isSubmitting}
                onAction={async () => {
                  (
                    document.getElementById('cancelReason') as HTMLFormElement
                  ).dispatchEvent(
                    new Event('submit', { cancelable: true, bubbles: true })
                  );
                }}
              />
            </div>
          </div>
        </Form>
      </Modal>
    </RenderIfTrue>
  );
}

export const layout = {
  areaId: 'pageHeadingRight',
  sortOrder: 35
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      paymentStatus {
        code
        isCancelable
      }
      shipmentStatus {
        code
        isCancelable
      }
      cancelApi
    }
  }
`;
