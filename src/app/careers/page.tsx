'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    Briefcase,
    MapPin,
    Clock,
    ChevronDown,
    ChevronUp,
    FlaskConical,
    Palette,
    BarChart3,
    Headphones,
    Code,
    Megaphone,
    Heart,
    Zap,
    BookOpen,
    Coffee,
    Sparkles,
    Send,
} from 'lucide-react';

/* ─── Data ─── */
const perks = [
    { icon: Heart, title: 'Health & Wellness', desc: 'Comprehensive medical insurance, mental health support, and wellness stipends' },
    { icon: Zap, title: 'Flexible Work', desc: 'Hybrid model — work from home 2 days a week with flexible hours' },
    { icon: BookOpen, title: 'Learning Budget', desc: '৳50,000/year for courses, conferences, and professional development' },
    { icon: Coffee, title: 'Free Products', desc: 'Monthly hampers from Bare Anatomy, Chemist at Play, and Sun Scoop' },
    { icon: Sparkles, title: 'Growth Path', desc: 'Clear promotion ladders and quarterly performance reviews' },
    { icon: BarChart3, title: 'ESOPs', desc: 'Stock options for key roles — grow as the company grows' },
];

interface JobListing {
    id: string;
    title: string;
    department: string;
    departmentIcon: typeof Briefcase;
    location: string;
    type: string;
    experience: string;
    description: string;
    responsibilities: string[];
    requirements: string[];
}

const jobs: JobListing[] = [
    {
        id: 'sr-formulation-chemist',
        title: 'Sr. Formulation Chemist',
        department: 'R&D',
        departmentIcon: FlaskConical,
        location: 'Mumbai, India',
        type: 'Full-time',
        experience: '4–7 years',
        description: 'Lead the development of novel hair and skin care formulations across our brand portfolio.',
        responsibilities: [
            'Design and develop new product formulations from concept to production scale',
            'Conduct stability testing and ensure compliance with regulatory standards',
            'Collaborate with the product team to translate consumer insights into formulations',
            'Evaluate and source raw materials from global suppliers',
        ],
        requirements: [
            'M.Sc. or Ph.D. in Chemistry, Cosmetic Science, or related field',
            '4+ years of experience in cosmetic/personal care formulation',
            'Strong knowledge of active ingredients (AHAs, BHAs, peptides, retinoids)',
            'Experience with stability testing and GMP processes',
        ],
    },
    {
        id: 'brand-designer',
        title: 'Brand Designer',
        department: 'Design',
        departmentIcon: Palette,
        location: 'Mumbai, India',
        type: 'Full-time',
        experience: '2–4 years',
        description: 'Shape the visual identity of our brands across digital and physical touchpoints.',
        responsibilities: [
            'Design packaging, social media creatives, and campaign assets',
            'Maintain and evolve brand guidelines for all three brands',
            'Create compelling product photography direction and art direction',
            'Collaborate with marketing on launch campaigns and seasonal promotions',
        ],
        requirements: [
            'Degree in Graphic Design, Visual Communication, or equivalent',
            'Proficiency in Figma, Adobe Creative Suite, and motion design tools',
            'Portfolio showcasing D2C/beauty brand work',
            'Strong typography and color theory fundamentals',
        ],
    },
    {
        id: 'growth-marketing-lead',
        title: 'Growth Marketing Lead',
        department: 'Marketing',
        departmentIcon: Megaphone,
        location: 'Mumbai / Remote',
        type: 'Full-time',
        experience: '5–8 years',
        description: 'Own the full-funnel growth engine — from acquisition and retention to lifecycle marketing.',
        responsibilities: [
            'Plan and execute paid acquisition strategies across Meta, Google, and programmatic',
            'Build and optimize email/SMS lifecycle journeys for retention',
            'Analyze ROAS, LTV, and CAC metrics to inform budget allocation',
            'Partner with product and analytics teams on conversion optimization',
        ],
        requirements: [
            'MBA or equivalent experience in digital marketing',
            '5+ years in performance marketing for a D2C brand',
            'Hands-on experience with Meta Ads Manager, Google Ads, and Clevertap/Moengage',
            'Strong analytical skills with SQL and data visualization tools',
        ],
    },
    {
        id: 'customer-experience-specialist',
        title: 'Customer Experience Specialist',
        department: 'CX',
        departmentIcon: Headphones,
        location: 'Mumbai, India',
        type: 'Full-time',
        experience: '1–3 years',
        description: 'Be the voice of ValleyCentia — deliver exceptional support and turn customers into advocates.',
        responsibilities: [
            'Handle customer queries across chat, email, and social media channels',
            'Resolve product-related concerns and process returns/replacements',
            'Gather and categorize customer feedback for the product team',
            'Maintain a CSAT score above 4.5/5',
        ],
        requirements: [
            'Bachelor\'s degree in any field',
            '1+ years of customer support experience, preferably in e-commerce',
            'Excellent written and verbal communication in English and Hindi',
            'Empathetic, patient, and detail-oriented personality',
        ],
    },
    {
        id: 'frontend-engineer',
        title: 'Frontend Engineer',
        department: 'Engineering',
        departmentIcon: Code,
        location: 'Remote',
        type: 'Full-time',
        experience: '2–5 years',
        description: 'Build the shopping experiences millions of customers love — fast, beautiful, and accessible.',
        responsibilities: [
            'Develop and maintain our Next.js e-commerce storefront',
            'Implement responsive, accessible UI components with pixel-perfect design fidelity',
            'Optimize Core Web Vitals and page performance',
            'Integrate with headless CMS and commerce APIs',
        ],
        requirements: [
            'Strong proficiency in React, TypeScript, and Next.js',
            'Experience with CSS-in-JS, Tailwind, or design system development',
            'Understanding of web performance optimization techniques',
            'Familiarity with e-commerce platforms (Shopify, Medusa, or similar)',
        ],
    },
    {
        id: 'data-analyst',
        title: 'Data Analyst',
        department: 'Analytics',
        departmentIcon: BarChart3,
        location: 'Mumbai / Remote',
        type: 'Full-time',
        experience: '2–4 years',
        description: 'Turn data into actionable insights that drive product, marketing, and CX decisions.',
        responsibilities: [
            'Build dashboards and reports for key business metrics',
            'Conduct cohort analysis, funnel analysis, and A/B test evaluation',
            'Partner with marketing and product teams to define KPIs',
            'Maintain data quality and documentation across warehouses',
        ],
        requirements: [
            'Bachelor\'s in Statistics, Economics, CS, or related field',
            'Proficient in SQL, Python/R, and BI tools (Metabase/Looker/Tableau)',
            'Experience with event-tracking systems (Mixpanel, Amplitude, or GA4)',
            'Strong communication skills to present insights to non-technical stakeholders',
        ],
    },
];

const departments = ['All', ...Array.from(new Set(jobs.map((j) => j.department)))];

export default function CareersPage() {
    const [activeDept, setActiveDept] = useState('All');
    const [expandedJob, setExpandedJob] = useState<string | null>(null);

    const filteredJobs = activeDept === 'All' ? jobs : jobs.filter((j) => j.department === activeDept);

    return (
        <div style={{ minHeight: '100vh', background: '#fafafa' }}>
            {/* ═══ Hero ═══ */}
            <section
                style={{
                    background: 'linear-gradient(135deg, #0a0a0b 0%, #1a1a1a 50%, #121a12 100%)',
                    padding: '56px 0 64px',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        bottom: '-30%',
                        left: '-5%',
                        width: '500px',
                        height: '500px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(201,169,110,0.06) 0%, transparent 70%)',
                        pointerEvents: 'none',
                    }}
                />
                <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 48px', position: 'relative' }}>
                    <Link
                        href="/"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#777',
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '13px',
                            textDecoration: 'none',
                            marginBottom: '32px',
                            transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#777'; }}
                    >
                        <ArrowLeft size={16} />
                        Home
                    </Link>

                    <p
                        style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '12px',
                            fontWeight: 600,
                            letterSpacing: '2.5px',
                            textTransform: 'uppercase',
                            color: '#c9a96e',
                            marginBottom: '14px',
                        }}
                    >
                        Careers
                    </p>
                    <h1
                        style={{
                            fontFamily: "'Outfit', sans-serif",
                            fontSize: 'clamp(32px, 5vw, 52px)',
                            fontWeight: 800,
                            color: '#ffffff',
                            lineHeight: 1.15,
                            marginBottom: '20px',
                            maxWidth: '700px',
                        }}
                    >
                        Build the future of <span style={{ color: '#c9a96e' }}>beauty</span> with us.
                    </h1>
                    <p
                        style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '17px',
                            color: '#999',
                            lineHeight: 1.7,
                            maxWidth: '580px',
                        }}
                    >
                        We&apos;re a fast-growing team of scientists, designers, engineers, and brand builders on a
                        mission to make personal care honest, effective, and accessible.
                    </p>
                    <div style={{ marginTop: '28px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <a
                            href="#openings"
                            style={{
                                fontFamily: "'Inter', sans-serif",
                                fontSize: '14px',
                                fontWeight: 700,
                                color: '#1a1a1a',
                                background: '#f5c518',
                                padding: '13px 32px',
                                borderRadius: '28px',
                                textDecoration: 'none',
                                transition: 'background 0.2s ease, transform 0.2s ease',
                                display: 'inline-block',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#e6b800';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#f5c518';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            View Open Roles
                        </a>
                        <span
                            style={{
                                fontFamily: "'Inter', sans-serif",
                                fontSize: '14px',
                                color: '#666',
                            }}
                        >
                            {jobs.length} positions open
                        </span>
                    </div>
                </div>
            </section>

            {/* ═══ Perks ═══ */}
            <section style={{ padding: '64px 0', background: '#ffffff', borderBottom: '1px solid #f0f0e8' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 48px' }}>
                    <p
                        style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '12px',
                            fontWeight: 600,
                            letterSpacing: '2px',
                            textTransform: 'uppercase',
                            color: '#c9a96e',
                            marginBottom: '10px',
                        }}
                    >
                        Why ValleyCentia
                    </p>
                    <h2
                        style={{
                            fontFamily: "'Outfit', sans-serif",
                            fontSize: '28px',
                            fontWeight: 700,
                            color: '#1a1a1a',
                            marginBottom: '36px',
                        }}
                    >
                        Perks & Benefits
                    </h2>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '16px',
                        }}
                    >
                        {perks.map((perk, i) => (
                            <div
                                key={i}
                                style={{
                                    background: '#fafafa',
                                    border: '1px solid #f0f0e8',
                                    borderRadius: '12px',
                                    padding: '24px',
                                    transition: 'box-shadow 0.25s ease, transform 0.25s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.05)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.boxShadow = 'none';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                <perk.icon size={20} color="#c9a96e" style={{ marginBottom: '12px' }} />
                                <h3
                                    style={{
                                        fontFamily: "'Inter', sans-serif",
                                        fontSize: '15px',
                                        fontWeight: 700,
                                        color: '#1a1a1a',
                                        marginBottom: '6px',
                                    }}
                                >
                                    {perk.title}
                                </h3>
                                <p
                                    style={{
                                        fontFamily: "'Inter', sans-serif",
                                        fontSize: '13px',
                                        color: '#888',
                                        lineHeight: 1.55,
                                    }}
                                >
                                    {perk.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ Job Listings ═══ */}
            <section id="openings" style={{ padding: '64px 0 80px' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 48px' }}>
                    <p
                        style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '12px',
                            fontWeight: 600,
                            letterSpacing: '2px',
                            textTransform: 'uppercase',
                            color: '#c9a96e',
                            marginBottom: '10px',
                        }}
                    >
                        Open Positions
                    </p>
                    <h2
                        style={{
                            fontFamily: "'Outfit', sans-serif",
                            fontSize: '28px',
                            fontWeight: 700,
                            color: '#1a1a1a',
                            marginBottom: '24px',
                        }}
                    >
                        Find Your Role
                    </h2>

                    {/* Department Filter */}
                    <div
                        style={{
                            display: 'flex',
                            gap: '8px',
                            flexWrap: 'wrap',
                            marginBottom: '28px',
                        }}
                    >
                        {departments.map((dept) => (
                            <button
                                key={dept}
                                onClick={() => setActiveDept(dept)}
                                style={{
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    padding: '8px 20px',
                                    borderRadius: '20px',
                                    border: '1px solid',
                                    borderColor: activeDept === dept ? '#1a1a1a' : '#e0e0e0',
                                    background: activeDept === dept ? '#1a1a1a' : '#ffffff',
                                    color: activeDept === dept ? '#ffffff' : '#555',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                {dept}
                            </button>
                        ))}
                    </div>

                    {/* Job count */}
                    <p
                        style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '14px',
                            color: '#888',
                            marginBottom: '16px',
                        }}
                    >
                        {filteredJobs.length} position{filteredJobs.length !== 1 ? 's' : ''} available
                    </p>

                    {/* Listings */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {filteredJobs.map((job) => {
                            const isOpen = expandedJob === job.id;
                            return (
                                <div
                                    key={job.id}
                                    style={{
                                        background: '#ffffff',
                                        border: '1px solid',
                                        borderColor: isOpen ? '#c9a96e' : '#f0f0e8',
                                        borderRadius: '14px',
                                        overflow: 'hidden',
                                        transition: 'border-color 0.2s ease',
                                    }}
                                >
                                    {/* Header row */}
                                    <button
                                        onClick={() => setExpandedJob(isOpen ? null : job.id)}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '16px',
                                            padding: '20px 24px',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '10px',
                                                background: '#faf6ee',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <job.departmentIcon size={20} color="#c9a96e" />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h3
                                                style={{
                                                    fontFamily: "'Inter', sans-serif",
                                                    fontSize: '16px',
                                                    fontWeight: 700,
                                                    color: '#1a1a1a',
                                                    marginBottom: '4px',
                                                }}
                                            >
                                                {job.title}
                                            </h3>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '14px',
                                                    flexWrap: 'wrap',
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        fontFamily: "'Inter', sans-serif",
                                                        fontSize: '12px',
                                                        color: '#888',
                                                    }}
                                                >
                                                    <Briefcase size={12} />
                                                    {job.department}
                                                </span>
                                                <span
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        fontFamily: "'Inter', sans-serif",
                                                        fontSize: '12px',
                                                        color: '#888',
                                                    }}
                                                >
                                                    <MapPin size={12} />
                                                    {job.location}
                                                </span>
                                                <span
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        fontFamily: "'Inter', sans-serif",
                                                        fontSize: '12px',
                                                        color: '#888',
                                                    }}
                                                >
                                                    <Clock size={12} />
                                                    {job.experience}
                                                </span>
                                            </div>
                                        </div>
                                        <span
                                            style={{
                                                fontFamily: "'Inter', sans-serif",
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                color: '#ffffff',
                                                background: '#1a1a1a',
                                                padding: '5px 12px',
                                                borderRadius: '12px',
                                                flexShrink: 0,
                                                marginRight: '8px',
                                            }}
                                        >
                                            {job.type}
                                        </span>
                                        {isOpen ? (
                                            <ChevronUp size={18} color="#888" style={{ flexShrink: 0 }} />
                                        ) : (
                                            <ChevronDown size={18} color="#888" style={{ flexShrink: 0 }} />
                                        )}
                                    </button>

                                    {/* Expanded detail */}
                                    {isOpen && (
                                        <div
                                            style={{
                                                padding: '0 24px 24px',
                                                borderTop: '1px solid #f0f0e8',
                                            }}
                                        >
                                            <p
                                                style={{
                                                    fontFamily: "'Inter', sans-serif",
                                                    fontSize: '14px',
                                                    color: '#555',
                                                    lineHeight: 1.65,
                                                    padding: '20px 0 16px',
                                                }}
                                            >
                                                {job.description}
                                            </p>

                                            <div
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '1fr 1fr',
                                                    gap: '24px',
                                                    marginBottom: '24px',
                                                }}
                                            >
                                                <div>
                                                    <h4
                                                        style={{
                                                            fontFamily: "'Inter', sans-serif",
                                                            fontSize: '13px',
                                                            fontWeight: 700,
                                                            color: '#1a1a1a',
                                                            marginBottom: '10px',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.5px',
                                                        }}
                                                    >
                                                        Responsibilities
                                                    </h4>
                                                    <ul
                                                        style={{
                                                            padding: '0 0 0 16px',
                                                            margin: 0,
                                                        }}
                                                    >
                                                        {job.responsibilities.map((r, i) => (
                                                            <li
                                                                key={i}
                                                                style={{
                                                                    fontFamily: "'Inter', sans-serif",
                                                                    fontSize: '13px',
                                                                    color: '#666',
                                                                    lineHeight: 1.6,
                                                                    marginBottom: '6px',
                                                                }}
                                                            >
                                                                {r}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <div>
                                                    <h4
                                                        style={{
                                                            fontFamily: "'Inter', sans-serif",
                                                            fontSize: '13px',
                                                            fontWeight: 700,
                                                            color: '#1a1a1a',
                                                            marginBottom: '10px',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.5px',
                                                        }}
                                                    >
                                                        Requirements
                                                    </h4>
                                                    <ul
                                                        style={{
                                                            padding: '0 0 0 16px',
                                                            margin: 0,
                                                        }}
                                                    >
                                                        {job.requirements.map((r, i) => (
                                                            <li
                                                                key={i}
                                                                style={{
                                                                    fontFamily: "'Inter', sans-serif",
                                                                    fontSize: '13px',
                                                                    color: '#666',
                                                                    lineHeight: 1.6,
                                                                    marginBottom: '6px',
                                                                }}
                                                            >
                                                                {r}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>

                                            <a
                                                href={`mailto:careers@valleycentia.com?subject=Application: ${job.title}`}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    fontFamily: "'Inter', sans-serif",
                                                    fontSize: '14px',
                                                    fontWeight: 700,
                                                    color: '#1a1a1a',
                                                    background: '#f5c518',
                                                    padding: '12px 28px',
                                                    borderRadius: '24px',
                                                    textDecoration: 'none',
                                                    transition: 'background 0.2s ease, transform 0.2s ease',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = '#e6b800';
                                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = '#f5c518';
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                }}
                                            >
                                                <Send size={14} />
                                                Apply for this Role
                                            </a>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* No results */}
                    {filteredJobs.length === 0 && (
                        <div
                            style={{
                                textAlign: 'center',
                                padding: '60px 20px',
                                background: '#ffffff',
                                borderRadius: '14px',
                                border: '1px solid #f0f0e8',
                            }}
                        >
                            <Briefcase size={40} color="#ddd" style={{ marginBottom: '12px' }} />
                            <p
                                style={{
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: '15px',
                                    color: '#999',
                                }}
                            >
                                No positions in this department right now. Check back soon!
                            </p>
                        </div>
                    )}
                </div>
            </section>

            {/* ═══ CTA ═══ */}
            <section
                style={{
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2218 100%)',
                    padding: '56px 0',
                    textAlign: 'center',
                }}
            >
                <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 32px' }}>
                    <h2
                        style={{
                            fontFamily: "'Outfit', sans-serif",
                            fontSize: '26px',
                            fontWeight: 700,
                            color: '#ffffff',
                            marginBottom: '10px',
                        }}
                    >
                        Don&apos;t see your role?
                    </h2>
                    <p
                        style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '15px',
                            color: '#888',
                            marginBottom: '24px',
                            lineHeight: 1.6,
                        }}
                    >
                        We&apos;re always looking for exceptional talent. Send us your resume and we&apos;ll reach out
                        when the right opportunity opens up.
                    </p>
                    <a
                        href="mailto:careers@valleycentia.com?subject=General Application"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#1a1a1a',
                            background: '#f5c518',
                            padding: '13px 32px',
                            borderRadius: '28px',
                            textDecoration: 'none',
                            transition: 'background 0.2s ease, transform 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#e6b800';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#f5c518';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <Send size={14} />
                        Send Your Resume
                    </a>
                </div>
            </section>
        </div>
    );
}
