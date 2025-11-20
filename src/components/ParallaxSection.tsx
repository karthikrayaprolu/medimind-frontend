import { useEffect, useRef, ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

interface ParallaxSectionProps {
    children?: ReactNode;
    className?: string;
    pinDuration?: number; // How long to pin the section (in scroll distance)
    backgroundColor?: string;
}

/**
 * ParallaxSection Component
 * 
 * A reusable component that creates stunning scroll-based animations:
 * - Pins the section while scrolling (sticky effect)
 * - Animates child elements based on scroll progress (scrubbing)
 * - Implements physics-based "lag" effect on elements
 * 
 * Usage:
 * <ParallaxSection>
 *   <div className="hero-text">Your content</div>
 * </ParallaxSection>
 */
const ParallaxSection = ({
    children,
    className = '',
    pinDuration = 2,
    backgroundColor = 'transparent'
}: ParallaxSectionProps) => {
    const sectionRef = useRef<HTMLDivElement>(null);
    const heroTextRef = useRef<HTMLDivElement>(null);
    const floatingElementRef = useRef<HTMLDivElement>(null);
    const backgroundRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Use a flag to check if we're in the browser
        const isBrowser = typeof window !== 'undefined';

        if (!isBrowser || !sectionRef.current) return;

        const ctx = gsap.context(() => {
            // Main timeline for the pinned section
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: 'top top',
                    end: `+=${window.innerHeight * pinDuration}`,
                    scrub: 1, // Smooth scrubbing, 1 second delay
                    pin: true,
                    anticipatePin: 1,
                    // markers: true, // Uncomment for debugging
                },
            });

            // Animate hero text: fade out and move up
            if (heroTextRef.current) {
                tl.to(heroTextRef.current, {
                    y: -100,
                    opacity: 0,
                    scale: 0.8,
                    ease: 'power2.inOut',
                }, 0);
            }

            // Animate floating element with LAG effect (physics/inertia)
            // This creates the "drifting behind" sensation
            if (floatingElementRef.current) {
                tl.to(floatingElementRef.current, {
                    y: 200,
                    x: 100,
                    rotation: 15,
                    scale: 1.5,
                    opacity: 0.3,
                    ease: 'power1.out', // Slower easing = more lag
                }, 0.2); // Delayed start creates the lag effect
            }

            // Animate background with parallax
            if (backgroundRef.current) {
                tl.to(backgroundRef.current, {
                    scale: 1.2,
                    opacity: 0.5,
                    ease: 'none',
                }, 0);
            }

            // Additional animation: rotate and fade
            tl.to(sectionRef.current, {
                // You can add more animations here
            }, 0);

        }, sectionRef);

        // Cleanup function
        return () => {
            ctx.revert(); // Kills all GSAP animations and ScrollTriggers
        };
    }, [pinDuration]);

    return (
        <div
            ref={sectionRef}
            className={`relative w-full h-screen overflow-hidden ${className}`}
            style={{ backgroundColor }}
        >
            {/* Background layer with parallax */}
            <div
                ref={backgroundRef}
                className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-pink-900/20 -z-10"
            />

            {/* Main content container */}
            <div className="relative h-full flex items-center justify-center">
                {/* Hero text that fades and moves */}
                <div
                    ref={heroTextRef}
                    className="text-center z-10"
                >
                    <h1 className="text-6xl md:text-8xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 mb-4">
                        Antigravity
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-300">
                        Scroll to experience the magic
                    </p>
                </div>

                {/* Floating element with lag effect */}
                <div
                    ref={floatingElementRef}
                    className="absolute top-1/4 right-1/4 w-32 h-32 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full blur-xl opacity-60"
                />

                {/* Custom children content */}
                {children && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ParallaxSection;
