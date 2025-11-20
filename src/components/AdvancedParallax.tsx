import { useEffect, useRef, ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface AdvancedParallaxProps {
    children?: ReactNode;
    className?: string;
}

/**
 * Advanced Parallax Component
 * 
 * Demonstrates more complex scroll-based animations:
 * - Multiple layers with different parallax speeds
 * - Rotation and scale effects
 * - Color transitions
 * - Staggered animations
 */
const AdvancedParallax = ({ children, className = '' }: AdvancedParallaxProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const layer1Ref = useRef<HTMLDivElement>(null);
    const layer2Ref = useRef<HTMLDivElement>(null);
    const layer3Ref = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const ctx = gsap.context(() => {
            // Create main timeline
            const mainTimeline = gsap.timeline({
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: 'top top',
                    end: '+=3000', // 3x viewport height
                    scrub: 1,
                    pin: true,
                    anticipatePin: 1,
                },
            });

            // Layer 1: Slow parallax (background)
            if (layer1Ref.current) {
                mainTimeline.to(layer1Ref.current, {
                    y: 300,
                    scale: 1.3,
                    rotation: 10,
                    opacity: 0.3,
                    ease: 'none',
                }, 0);
            }

            // Layer 2: Medium parallax (midground)
            if (layer2Ref.current) {
                mainTimeline.to(layer2Ref.current, {
                    y: 150,
                    x: -100,
                    rotation: -15,
                    scale: 0.8,
                    opacity: 0.5,
                    ease: 'power1.out',
                }, 0.1); // Slight delay for lag effect
            }

            // Layer 3: Fast parallax (foreground)
            if (layer3Ref.current) {
                mainTimeline.to(layer3Ref.current, {
                    y: -200,
                    x: 100,
                    rotation: 20,
                    scale: 1.5,
                    opacity: 0,
                    ease: 'power2.out',
                }, 0.2); // More delay = more lag
            }

            // Text animation with color change
            if (textRef.current) {
                mainTimeline
                    .to(textRef.current, {
                        y: -150,
                        scale: 0.5,
                        opacity: 0,
                        ease: 'power2.in',
                    }, 0)
                    .to(textRef.current, {
                        color: '#ff00ff',
                        textShadow: '0 0 20px rgba(255, 0, 255, 0.5)',
                    }, 0);
            }

            // Staggered circle animations
            const circles = containerRef.current?.querySelectorAll('.parallax-circle');
            if (circles && circles.length > 0) {
                mainTimeline.to(circles, {
                    y: (i) => -100 * (i + 1), // Each circle moves different amount
                    rotation: (i) => 360 * (i + 1),
                    scale: (i) => 1 + (i * 0.2),
                    opacity: 0,
                    stagger: 0.1, // Stagger the animations
                    ease: 'power1.out',
                }, 0.15);
            }

        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-screen overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950 ${className}`}
        >
            {/* Layer 1: Background */}
            <div
                ref={layer1Ref}
                className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 blur-3xl"
            />

            {/* Layer 2: Midground shapes */}
            <div
                ref={layer2Ref}
                className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-cyan-500/30 to-blue-500/30 rounded-full blur-2xl"
            />

            {/* Layer 3: Foreground shapes */}
            <div
                ref={layer3Ref}
                className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-br from-pink-500/40 to-purple-500/40 rounded-full blur-xl"
            />

            {/* Staggered circles */}
            <div className="absolute inset-0 flex items-center justify-center gap-8">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="parallax-circle w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full opacity-60"
                    />
                ))}
            </div>

            {/* Main text */}
            <div className="relative h-full flex items-center justify-center z-10">
                <div ref={textRef} className="text-center">
                    <h1 className="text-7xl md:text-9xl font-bold text-white mb-6">
                        Advanced
                    </h1>
                    <p className="text-2xl md:text-3xl text-gray-300">
                        Multi-layer Parallax
                    </p>
                </div>
            </div>

            {/* Custom children */}
            {children && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                    {children}
                </div>
            )}
        </div>
    );
};

export default AdvancedParallax;
