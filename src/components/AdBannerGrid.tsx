'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './AdBannerGrid.module.css';

export interface AdBanner {
  id: number;
  image: string;
  alt: string;
  href: string;
}

const DEFAULT_ADS: AdBanner[] = [
  {
    id: 1,
    image: '/ads/ad-skincare.jpg',
    alt: 'Your Glow Essentials – Premium Skincare Collection',
    href: '/shop?category=skincare',
  },
  {
    id: 2,
    image: '/ads/ad-makeup.jpg',
    alt: 'Makeup Meets Skincare – Radiant Beauty',
    href: '/shop?category=makeup',
  },
  {
    id: 3,
    image: '/ads/ad-babycare.jpg',
    alt: 'Gentle Care Happy Baby – Organic & Nurturing',
    href: '/shop?category=baby-care',
  },
  {
    id: 4,
    image: '/ads/ad-haircare.svg',
    alt: 'Healthy Hair Starts Here – Hair Care Collection',
    href: '/shop?category=hair-care',
  },
];

interface AdBannerGridProps {
  ads?: AdBanner[];
}

export default function AdBannerGrid({ ads = DEFAULT_ADS }: AdBannerGridProps) {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {ads.map((ad) => (
            <Link key={ad.id} href={ad.href} className={styles.card}>
              <Image
                src={ad.image}
                alt={ad.alt}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className={styles.image}
                priority={ad.id <= 2}
              />
              {/* Hover overlay */}
              <div className={styles.overlay} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
