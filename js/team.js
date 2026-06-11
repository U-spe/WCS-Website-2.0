/**
 * team.js
 * Visual Mechanics and Kinetic Adjustments for WCS Team Page
 * Web Creation Studios
 */

document.addEventListener("DOMContentLoaded", () => {
    initScrollRevealEngine();
    initTeamCardDrawers();
    initAmbientOrbMouseParallax();
});

/**
 * 1. Native Viewport Intersect Engine
 */
function initScrollRevealEngine() {
    const reveals = document.querySelectorAll(".reveal");
    const config = {
        root: null,
        threshold: 0.1,
        rootMargin: "0px 0px -40px 0px"
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
                observer.unobserve(entry.target);
            }
        });
    }, config);

    reveals.forEach(el => observer.observe(el));
}

/**
 * 2. Modern Accordion Card Mechanics
 * Handles layout drawer calculation logic on user clicks
 */
function initTeamCardDrawers() {
    const cards = document.querySelectorAll(".team-expand-card");

    cards.forEach(card => {
        card.addEventListener("click", (e) => {
            // Prevent nested interaction misfires inside text selections
            if (e.target.closest(".card-hidden-drawer")) return;

            const isExpanded = card.classList.contains("is-expanded");

            // Close siblings to keep visual balance clean
            cards.forEach(c => c.classList.remove("is-expanded"));

            if (!isExpanded) {
                card.classList.add("is-expanded");
            }
        });
    });
}

/**
 * 3. Moving Stuff: Mouse Interaction Engine
 * Moves ambient layout layers smoothly relative to pointer offsets
 */
function initAmbientOrbMouseParallax() {
    const orbs = document.querySelectorAll(".ambient-orb");
    const nodes = document.querySelectorAll(".matrix-node");

    window.addEventListener("mousemove", (e) => {
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // Soft calculation matrix shift coordinates for full-page background orbs
        const orbXShift = (mouseX - window.innerWidth / 2) * 0.03;
        const orbYShift = (mouseY - window.innerHeight / 2) * 0.03;

        orbs.forEach(orb => {
            orb.style.transform = `translate(${orbXShift}px, ${orbYShift}px)`;
        });

        // Tighter micro-movement calculation for hero layout frame components
        nodes.forEach((node, index) => {
            const structuralScalar = (index + 1) * 0.15;
            const nodeX = (mouseX - window.innerWidth / 2) * structuralScalar;
            const nodeY = (mouseY - window.innerHeight / 2) * structuralScalar;
            node.style.transform = `translate(${nodeX}px, ${nodeY}px)`;
        });
    });
}
