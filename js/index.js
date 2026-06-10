// js/index.js
document.addEventListener("DOMContentLoaded", () => {
    initScrollRevealEngine();
    initMouseCardTiltEffect();
    initHeroParallaxGrid();
});

/**
 * 1. Scroll Reveal Engine
 * Automatically tracks page scroll vectors and triggers clean entries 
 * for the sections when they pierce the viewport.
 */
function initScrollRevealEngine() {
    const revealSections = document.querySelectorAll(".reveal, .portfolio-project-card");
    
    const revealCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
                if(entry.target.classList.contains('portfolio-project-card')) {
                    entry.target.style.opacity = "1";
                }
                observer.unobserve(entry.target); // Execution locking
            }
        });
    };

    const revealObserver = new IntersectionObserver(revealCallback, {
        root: null,
        threshold: 0.12, // Fires when 12% of section is visible
        rootMargin: "0px 0px -40px 0px"
    });

    revealSections.forEach(section => {
        revealObserver.observe(section);
    });
}

/**
 * 2. Mouse Coordinate Card Tilt Effect
 * Maps cursor positions over team component surfaces to skew 
 * matrix depth fields dynamically.
 */
function initMouseCardTiltEffect() {
    const cards = document.querySelectorAll("[data-tilt]");
    
    cards.forEach(card => {
        card.addEventListener("mousemove", (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left; 
            const y = e.clientY - rect.top; 
            
            // Normalize inputs around grid origins
            const midX = rect.width / 2;
            const midY = rect.height / 2;
            
            // Scale rotational metrics
            const rotateX = ((y - midY) / midY) * -8; 
            const rotateY = ((x - midX) / midX) * 8;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
        });
        
        card.addEventListener("mouseleave", () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)`;
        });
    });
}

/**
 * 3. Hero Vector Parallax Drift
 * Slightly adjusts background alignment during initial scrolling steps.
 */
function initHeroParallaxGrid() {
    const interactiveGrid = document.querySelector(".interactive-grid");
    if (!interactiveGrid) return;
    
    window.addEventListener("scroll", () => {
        const scrolled = window.pageYOffset;
        if (scrolled < window.innerHeight) {
            interactiveGrid.style.transform = `translateY(${scrolled * 0.15}px)`;
        }
    });
}
