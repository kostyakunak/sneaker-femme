import React from 'react';

export default function HeaderElements() {
    return (
        <div className="flex items-center gap-4 self-center pr-2">
            <div className="ukraine-flag flex items-center" title="Ukraine">
                <svg
                    width="20"
                    height="14"
                    viewBox="0 0 600 400"
                    xmlns="http://www.w3.org/2000/svg"
                    className="rounded-sm shadow-sm"
                >
                    <rect width="600" height="400" fill="#0057B7" />
                    <rect width="600" height="200" y="200" fill="#FFD700" />
                </svg>
            </div>
            <a
                href="https://www.instagram.com/geass.shoes"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 hover:text-pink-600 transition-colors duration-200"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
            </a>
        </div>
    );
}

export const layout = {
    areaId: 'headerMiddleRight',
    sortOrder: 5
};
