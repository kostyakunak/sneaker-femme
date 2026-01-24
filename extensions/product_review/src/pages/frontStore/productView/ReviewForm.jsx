import { InputField } from "@components/common/form/InputField";
import { TextareaField } from "@components/common/form/TextareaField";
import { Form } from "@components/common/form/Form";
import { _ } from "@evershop/evershop/lib/locale/translate/_";
import { StarIcon as StartIcon } from '@heroicons/react/24/solid';
import PropTypes from "prop-types";
import React from "react";

export default function ReviewForm({ action, product }) {
  const [error, setError] = React.useState(null);
  const [rating, setRating] = React.useState(0);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const onSuccess = (response) => {
    if (!response.error) {
      setIsSubmitted(true);
    } else {
      setError(response.error.message);
    }
  };

  const rate = (score) => {
    setRating(score);
  };

  return (
    <div className="product-comment-form">
      {isSubmitted && (
        <div className="success text-success">
          {_("Your review has been submitted successfully!")}
        </div>
      )}
      {!isSubmitted && (
        <>
          <h3>{_("Your comment")}</h3>
          {error && <div className="error text-critical">{error}</div>}
          <Form
            id="comment-form"
            action={action}
            method="POST"
            onSuccess={onSuccess}
            submitBtnText={_("Submit review")}>
            <label htmlFor="rating">{_("Your Rating")}</label>
            <div className="rating__stars">
              {[...Array(5)].map((e, i) => (
                <a
                  key={i}
                  className=""
                  href="#"
                  onClick={(element) => {
                    element.preventDefault();
                    rate(i + 1);
                  }}>
                  <StartIcon
                    width={20}
                    height={20}
                    fill={rating > i ? "#ff5501" : "#989898"}
                  />
                </a>
              ))}
            </div>
            <InputField
              type="hidden"
              name="rating"
              value={rating}
              validation={{ required: "Rating is required" }}
            />
            <InputField
              name="customer_name"
              label={_("Your Name")}
              type="text"
              validation={{ required: "Name is required" }}
            />
            <TextareaField
              name="comment"
              label={_("Your Comment")}
              validation={{ required: "Comment is required" }}
            />
            <InputField type="hidden" name="product_id" value={product.productId} />
          </Form>
        </>
      )}
    </div>
  );
}

ReviewForm.propTypes = {
  action: PropTypes.string.isRequired,
  product: PropTypes.shape({
    productId: PropTypes.number.isRequired,
  }).isRequired,
};

export const layout = {
  areaId: "productPageMiddleLeft",
  sortOrder: 50,
};

export const query = `
  query {
    action: url(routeId: "addReview"),
    product: product(id: getContextValue("productId")) {
      productId
    }
  }
`;
