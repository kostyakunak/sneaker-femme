import React, { useState } from 'react';
import PropTypes from 'prop-types';

export default function CatalogMenu(props) {
    console.log('🔍 CatalogMenu called with props:', props);

    const { catalogMenu } = props;
    console.log('📦 catalogMenu:', catalogMenu);

    if (!catalogMenu) {
        console.log('❌ No catalogMenu in props');
        return null;
    }

    // Filter to get only root categories (those that should be in nav)
    const rootCategories = catalogMenu.items?.filter(item =>
        item.children && item.children.length > 0
    ) || [];

    if (rootCategories.length === 0) {
        console.log('❌ No root categories with children');
        return null;
    }

    console.log('✅ Rendering CatalogMenu with', rootCategories.length, 'root categories');
    console.log('📋 Items:', rootCategories.map(item => ({ name: item.name, childrenCount: item.children?.length || 0 })));

    return (
        <div className="catalog-menu relative group z-50">
            <a href="#" className="flex items-center gap-1 text-sm font-bold uppercase hover:text-primary transition-colors py-4">
                <span>Каталог</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </a>

            <div className="absolute top-full left-0 min-w-[250px] bg-white shadow-lg rounded-b-md border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
                <ul className="py-2">
                    {rootCategories.map((cat) => (
                        <li key={cat.uuid} className="group/item relative px-4 py-2 hover:bg-gray-50">
                            <div className="flex justify-between items-center w-full">
                                <a href={cat.url} className="block w-full text-gray-700 hover:text-black">
                                    {cat.name}
                                </a>
                                {cat.children && cat.children.length > 0 && (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-400">
                                        <chevron-right points="9 18 15 12 9 6"></chevron-right>
                                        <polyline points="9 18 15 12 9 6"></polyline>
                                    </svg>
                                )}
                            </div>

                            {/* Submenu */}
                            {cat.children && cat.children.length > 0 && (
                                <div className="absolute left-full top-0 min-w-[220px] bg-white shadow-lg rounded-md border border-gray-100 opacity-0 invisible group-hover/item:opacity-100 group-hover/item:visible transition-all duration-200 ml-1">
                                    <ul className="py-2">
                                        {cat.children.map((sub) => (
                                            <li key={sub.uuid} className="px-4 py-2 hover:bg-gray-50">
                                                <a href={sub.url} className="block text-gray-600 hover:text-black">
                                                    {sub.name}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

CatalogMenu.propTypes = {
    catalogMenu: PropTypes.shape({
        category: PropTypes.shape({
            uuid: PropTypes.string,
            children: PropTypes.arrayOf(PropTypes.shape({
                uuid: PropTypes.string,
                name: PropTypes.string,
                url: PropTypes.string,
                children: PropTypes.arrayOf(PropTypes.shape({
                    uuid: PropTypes.string,
                    name: PropTypes.string,
                    url: PropTypes.string
                }))
            }))
        })
    })
};

export const layout = {
    areaId: 'headerMiddleLeft',
    sortOrder: 1
};

export const query = `
  query CatalogMenu {
    catalogMenu: categories {
      items {
        uuid
        name
        url
        children {
          uuid
          name
          url
        }
      }
    }
  }
`;
