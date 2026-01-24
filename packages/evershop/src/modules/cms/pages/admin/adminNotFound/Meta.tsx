import { Meta } from '@components/common/Meta.js';
import { Title } from '@components/common/Title.js';
import React from 'react';

export default function SeoMeta() {
  const nodes = [
    <Title key="title" title="Page Not Found" />,
    <Meta key="description" name="description" content="Page Not Found" />
  ];

  return nodes;
}

export const layout = {
  areaId: 'head',
  sortOrder: 1
};
