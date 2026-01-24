import { NavigationItemGroup } from "@components/admin/NavigationItemGroup";
import { ChatBubbleLeftIcon as ChatIcon } from '@heroicons/react/24/solid';
import PropTypes from "prop-types";
import React from "react";

export default function ReviewMenuGroup({ reviewGrid }) {
  return (
    <NavigationItemGroup
      id="reviewMenuGroup"
      name="Product Review"
      items={[
        {
          Icon: ChatIcon,
          url: reviewGrid,
          title: "Reviews",
        },
      ]}
    />
  );
}

ReviewMenuGroup.propTypes = {
  reviewGrid: PropTypes.string.isRequired,
};

export const layout = {
  areaId: "adminMenu",
  sortOrder: 40,
};

export const query = `
  query Query {
    reviewGrid: url(routeId:"reviewGrid")
  }
`;
