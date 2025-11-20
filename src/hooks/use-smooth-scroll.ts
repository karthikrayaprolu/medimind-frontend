import { useLenis } from '@studio-freight/react-lenis';

/**
 * Custom hook for smooth scrolling to sections
 * Integrates with Lenis for parallax-style smooth navigation
 */
export const useSmoothScroll = () => {
    const lenis = useLenis();

    const scrollToSection = (id: string, offset: number = -80) => {
        const element = document.getElementById(id);

        if (!element) {
            console.warn(`Element with id "${id}" not found`);
            return;
        }

        if (lenis) {
            // Use Lenis smooth scroll
            lenis.scrollTo(element, {
                offset: offset, // Offset for fixed header
                duration: 1.5, // Duration in seconds
                easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Custom easing
                lerp: 0.1, // Smoothness
                immediate: false,
                lock: false,
                force: false,
            });
        } else {
            // Fallback to native smooth scroll
            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition + offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    const scrollToTop = () => {
        if (lenis) {
            lenis.scrollTo(0, {
                duration: 1.2,
                easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            });
        } else {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    };

    return { scrollToSection, scrollToTop };
};
