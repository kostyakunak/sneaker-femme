import React from 'react';

interface LogoProps {
  dashboardUrl: string;
}
export default function Logo({ dashboardUrl }: LogoProps) {
  return (
    <div className="logo w-9 h-auto flex items-center">
      <a href={dashboardUrl} className="flex items-end">
        <img
          src="/admin/assets/la-femme-et-ses-shoes-high-resolution-logo-grayscale-transparent.png"
          alt="La Femme Et Ses Shoes"
          className="w-32 h-auto"
        />
      </a>
    </div>
  );
}

export const layout = {
  areaId: 'header',
  sortOrder: 10
};

export const query = `
  query query {
    dashboardUrl: url(routeId:"dashboard")
  }
`;
