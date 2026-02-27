import React, { useEffect, useMemo, useRef, useState } from 'react';

interface CsPlayerProps {
    videoId: string;
    autoplay?: boolean;
}

declare global {
    interface Window {
        Plyr: any;
    }
}

const PLYR_SCRIPT_ID = 'forsaj-plyr-script';
let plyrLoadingPromise: Promise<boolean> | null = null;

const ensurePlyrLoaded = (): Promise<boolean> => {
    if (typeof window === 'undefined') return Promise.resolve(false);
    if (window.Plyr) return Promise.resolve(true);
    if (plyrLoadingPromise) return plyrLoadingPromise;

    plyrLoadingPromise = new Promise<boolean>((resolve) => {
        const existing = document.getElementById(PLYR_SCRIPT_ID) as HTMLScriptElement | null;
        if (existing) {
            existing.addEventListener('load', () => resolve(!!window.Plyr), { once: true });
            existing.addEventListener('error', () => resolve(false), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.id = PLYR_SCRIPT_ID;
        script.src = 'https://cdn.plyr.io/3.7.8/plyr.js';
        script.async = true;
        script.onload = () => resolve(!!window.Plyr);
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
    });

    return plyrLoadingPromise;
};

const CsPlayer: React.FC<CsPlayerProps> = ({ videoId, autoplay = false }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);
    const [renderMode, setRenderMode] = useState<'loading' | 'plyr' | 'iframe'>('loading');
    const iframeSrc = useMemo(
        () =>
            `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&rel=0&modestbranding=1&playsinline=1`,
        [videoId, autoplay]
    );

    useEffect(() => {
        let isMounted = true;
        setRenderMode('loading');

        const cleanupPlayer = () => {
            if (!playerRef.current) return;
            try {
                playerRef.current.destroy();
            } catch {
                // Ignore destruction errors
            } finally {
                playerRef.current = null;
            }
        };

        const initPlyr = () => {
            if (!isMounted || !containerRef.current) return;
            if (!window.Plyr) return;

            cleanupPlayer();

            try {
                const player = new window.Plyr(containerRef.current, {
                    autoplay: autoplay,
                    invertTime: false,
                    toggleInvert: false,
                    youtube: {
                        noCookie: true,
                        rel: 0,
                        showinfo: 0,
                        iv_load_policy: 3,
                        modestbranding: 1
                    },
                    controls: [
                        'play-large',
                        'play',
                        'progress',
                        'current-time',
                        'mute',
                        'volume',
                        'captions',
                        'settings',
                        'pip',
                        'airplay',
                        'fullscreen',
                    ],
                    settings: ['quality', 'speed', 'loop']
                });

                playerRef.current = player;
                if (autoplay && typeof player.play === 'function') {
                    player.once?.('ready', () => {
                        player.play().catch(() => {
                            // Autoplay can be blocked; user can still press play.
                        });
                    });
                }
                setRenderMode('plyr');
            } catch (err) {
                console.error('Plyr initialization failed:', err);
                setRenderMode('iframe');
            }
        };

        const fallbackTimer = window.setTimeout(() => {
            if (!isMounted) return;
            setRenderMode((currentMode) => {
                if (currentMode === 'plyr') return currentMode;
                cleanupPlayer();
                return 'iframe';
            });
        }, 1400);

        const bootstrap = async () => {
            if (window.Plyr) {
                initPlyr();
                return;
            }

            const loaded = await ensurePlyrLoaded();
            if (!isMounted) return;
            if (!loaded || !window.Plyr) {
                setRenderMode('iframe');
                return;
            }
            initPlyr();
        };

        bootstrap();

        return () => {
            isMounted = false;
            window.clearTimeout(fallbackTimer);
            cleanupPlayer();
        };
    }, [videoId, autoplay]);

    return (
        <div className="relative w-full h-full bg-black rounded-sm overflow-hidden shadow-2xl">
            {renderMode === 'iframe' ? (
                <iframe
                    key={videoId}
                    src={iframeSrc}
                    className="w-full h-full"
                    title="Video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                />
            ) : (
                <div
                    ref={containerRef}
                    data-plyr-provider="youtube"
                    data-plyr-embed-id={videoId}
                    className="w-full h-full"
                />
            )}
            {renderMode === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-gray-300 text-xs font-black italic uppercase tracking-widest">
                    YUKLENIR...
                </div>
            )}
        </div>
    );
};

export default CsPlayer;
