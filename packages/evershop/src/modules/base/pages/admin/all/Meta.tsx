import { Meta } from '@components/common/Meta.js';
import { Title } from '@components/common/Title.js';
import React from 'react';

interface SeoMetaProps {
  pageInfo: {
    title: string;
    description: string;
  };
}

export default function SeoMeta({
  pageInfo: { title, description }
}: SeoMetaProps) {
  // IMPORTANT:
  // React ругается на пробельные текстовые ноды внутри <head>.
  // Если возвращать несколько JSX‑элементов рядом (`<Title />\n<Meta />`),
  // то между ними появляется whitespace‑нода. Поэтому вместо фрагмента
  // возвращаем массив элементов – так лишний текстовый нод не создаётся.
  const nodes = [
    <Title key="title" title={title} />,
    description ? (
      <Meta key="description" name="description" content={description} />
    ) : null
  ].filter(Boolean) as React.ReactElement[];

  return nodes;
}

export const layout = {
  areaId: 'head',
  sortOrder: 5
};

export const query = `
  query query {
    pageInfo {
      title
      description
    }
  }
`;
