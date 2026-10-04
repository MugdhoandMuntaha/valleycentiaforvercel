'use client';

import Link from 'next/link';
import Image from 'next/image';

interface HeaderLogoProps {
    style?: React.CSSProperties;
}

export default function HeaderLogo({ style }: HeaderLogoProps = {}) {
    return (
        <Link
            href="/"
            className="header-logo"
            style={{
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                textDecoration: 'none',
                ...style,
            }}
        >
            <Image
                src="/logo69.png"
                alt="ValleyCentia Logo"
                width={229}
                height={70}
                priority
                unoptimized
                style={{ height: '55px', width: 'auto', objectFit: 'fill' }}
            />
        </Link>
    );
}
