const NAVY = '#1B2A6B';
const SW = 3;

// 240px-wide wave (2× viewport), period=40px → seamless at translateX(-120px)
function wavePath(y: number): string {
    let d = `M 0 ${y}`;
    for (let x = 0; x < 240; x += 40) {
        d += ` Q ${x + 10} ${y - 4} ${x + 20} ${y} Q ${x + 30} ${y + 4} ${x + 40} ${y}`;
    }
    return d;
}

interface SailboatLoaderProps {
    /** compact=true: 40×40 SVG, no label — for inline / in-card use */
    compact?: boolean;
}

export function SailboatLoader({ compact = false }: SailboatLoaderProps) {
    if (compact) {
        return (
            <svg width={40} height={40} viewBox="0 0 120 120" fill="none">
                {/* Boat shifted down 12px so hull bottom (y=102) is below wave 1 (y=96) */}
                <line x1="60" y1="22" x2="60" y2="82" stroke={NAVY} strokeWidth={SW} strokeLinecap="round" />
                <path d="M 60 22 L 22 82 L 60 82 Z" stroke={NAVY} strokeWidth={SW} strokeLinejoin="round" fill="none" />
                <path d="M 60 36 L 88 82 L 60 82 Z" stroke={NAVY} strokeWidth={SW} strokeLinejoin="round" fill="none" />
                <line x1="20" y1="82" x2="100" y2="82" stroke={NAVY} strokeWidth={SW} strokeLinecap="round" />
                <path d="M 20 82 L 28 94 Q 60 102 92 94 L 100 82" stroke={NAVY} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                {/* Waves last — paint over hull bottom third */}
                <g style={{ animation: 'yw-wave 2s linear infinite' }}>
                    <path d={wavePath(96)} stroke={NAVY} strokeWidth={SW} strokeLinecap="round" fill="none" />
                    <path d={wavePath(106)} stroke={NAVY} strokeWidth={SW} strokeLinecap="round" fill="none" />
                </g>
                <style>{`@keyframes yw-wave{from{transform:translateX(0)}to{transform:translateX(-120px)}}`}</style>
            </svg>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <svg width={120} height={120} viewBox="0 0 120 120" fill="none">
                {/* Boat shifted down 12px so hull bottom (y=102) is below wave 1 (y=96) */}

                {/* Mast */}
                <line x1="60" y1="22" x2="60" y2="82" stroke={NAVY} strokeWidth={SW} strokeLinecap="round" />

                {/* Left sail — large triangle */}
                <path d="M 60 22 L 22 82 L 60 82 Z"
                    stroke={NAVY} strokeWidth={SW} strokeLinejoin="round" fill="none" />

                {/* Right sail — smaller triangle */}
                <path d="M 60 36 L 88 82 L 60 82 Z"
                    stroke={NAVY} strokeWidth={SW} strokeLinejoin="round" fill="none" />

                {/* Hull rail */}
                <line x1="20" y1="82" x2="100" y2="82"
                    stroke={NAVY} strokeWidth={SW} strokeLinecap="round" />

                {/* Hull body — spans y=82→102; wave 1 at y=96 crosses lower third */}
                <path d="M 20 82 L 28 94 Q 60 102 92 94 L 100 82"
                    stroke={NAVY} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" fill="none" />

                {/* Waves last — render on top of hull, seamless horizontal loop */}
                <g style={{ animation: 'yw-wave 2s linear infinite' }}>
                    <path d={wavePath(96)} stroke={NAVY} strokeWidth={SW} strokeLinecap="round" fill="none" />
                    <path d={wavePath(106)} stroke={NAVY} strokeWidth={SW} strokeLinecap="round" fill="none" />
                </g>
            </svg>

            <style>{`
                @keyframes yw-wave {
                    from { transform: translateX(0px); }
                    to   { transform: translateX(-120px); }
                }
            `}</style>

            <span style={{
                fontSize: 13,
                color: '#9ca3af',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                letterSpacing: '0.01em',
            }}>
                Loading...
            </span>
        </div>
    );
}
