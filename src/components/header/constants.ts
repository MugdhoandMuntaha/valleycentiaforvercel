export interface NavLink {
    name: string;
    href: string;
    hasDropdown: boolean;
    highlight?: boolean;
    dropdownItems?: { name: string; href: string }[];
}

export const popularChoices = [
    { label: 'Shampoo', href: '/shop?type=shampoo' },
    { label: 'Hair Mask', href: '/shop?type=hair-mask' },
    { label: 'Roll On', href: '/shop?type=roll-on' },
    { label: 'Sunscreen', href: '/shop?type=sunscreen' },
    { label: 'Face Wash', href: '/shop?type=face-wash' },
    { label: 'Hair Oil', href: '/shop?type=hair-oil' },
];
