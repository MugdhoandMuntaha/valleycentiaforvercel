'use client';

interface AnnouncementBarProps {
    show: boolean;
    text: string;
}

export default function AnnouncementBar({ show, text }: AnnouncementBarProps) {
    if (!show) return null;

    return (
        <div
            style={{
                background: '#1a1a1a',
                padding: '7px 0',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: 500,
                color: 'white',
                letterSpacing: '0.3px',
                borderBottom: '1px solid #2a2a2a',
                fontFamily: "'Inter', sans-serif",
            }}
        >
            {text}
        </div>
    );
}
