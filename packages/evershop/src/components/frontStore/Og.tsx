import { MetaOpenGraph, MetaTwitterCard } from '@components/common/Meta.js';
import React from 'react';

interface OgProps {
  type?: 'website' | 'article' | 'product' | string;
  title?: string;
  description?: string;
  url?: string;
  siteName?: string;
  image?: string;
  locale?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterSite?: string;
  twitterCreator?: string;
  twitterImage?: string;
}

export function Og({
  type,
  title,
  description,
  url,
  siteName,
  image,
  locale,
  twitterCard,
  twitterSite,
  twitterCreator,
  twitterImage
}: OgProps) {
  return (
    <><MetaOpenGraph type={type} title={title} description={description} image={image} url={url} siteName={siteName} />{locale && <meta property="og:locale" content={locale} />}<MetaTwitterCard card={twitterCard} site={twitterSite} creator={twitterCreator} title={title} description={description} image={twitterImage || image} /></>
  );
}