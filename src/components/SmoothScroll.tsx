import { ReactLenis } from '@studio-freight/react-lenis';
import { ReactNode } from 'react';

interface SmoothScrollProps {
    children: ReactNode;
}

/**
 * SmoothScroll Wrapper Component
 * 
 * Wraps the entire application to provide smooth, inertial scrolling
 * using Lenis. This creates the "weightless" and fluid feel similar
 * to antigravity.google.
 * 
 * Features:
 * - Smooth inertial scrolling with physics-based easing
 * - Optimized performance with RAF (RequestAnimationFrame)
 * - Integrates seamlessly with GSAP ScrollTrigger
 */
const SmoothScroll = ({ children }: SmoothScrollProps) => {
    return (
        <ReactLenis
            root
            options={{
                // Smoothness of the scroll (0-1, higher = smoother but more lag)
                lerp: 0.1,

                // Duration of the scroll animation
                duration: 1.2,

                // Easing function for smooth deceleration
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),

                // Direction of the scroll
                orientation: 'vertical',

                // Gesture orientation
                gestureOrientation: 'vertical',

                // Smooth wheel scrolling
                smoothWheel: true,

                // Wheel multiplier (scroll speed)
                wheelMultiplier: 1,

                // Touch multiplier
                touchMultiplier: 2,

                // Infinite scroll
                infinite: false,
            }}
        >
            {children}
        </ReactLenis>
    );
};

export default SmoothScroll;
