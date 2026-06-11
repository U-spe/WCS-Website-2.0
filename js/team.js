/**
 * team.js
 * Specialized Layout Actions for the Interactive Team Architecture
 * Web Creation Studios
 */

document.addEventListener("DOMContentLoaded", () => {
    initScrollRevealEngine();
    initTeamDrawerMechanics();
});

/**
 * 1. Native Viewport Intersect Engine
 * Triggers layout entry variables when elements enter view fields
 */
function initScrollRevealEngine() {
    const revealElements = document.querySelectorAll(".reveal");
    
    const configuration = {
        root: null,
        threshold: 0.1,
        rootMargin: "0px 0px -40px 0px"
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
                observer.unobserve(entry.target); // Execution completes once fired
            }
        });
    }, configuration);

    revealElements.forEach(targetNode => revealObserver.observe(targetNode));
}

/**
 * 2. Accordion Card Grid Framework
 * Manages clean layout transitions and ensures expanding cards closed state rules are clean
 */
function initTeamDrawerMechanics() {
    const teamCards = document.querySelectorAll(".team-expand-card");

    teamCards.forEach(activeCard => {
        activeCard.addEventListener("click", (event) => {
            // Prevent drawer click events from misfiring layout recalculations
            if (event.target.closest(".card-hidden-drawer")) return;

            const isAlreadyExpanded = activeCard.classList.contains("is-expanded");

            // Step A: Close any currently expanded card systems to keep layout pristine
            teamCards.forEach(card => {
                if (card !== activeCard) {
                    card.classList.remove("is-expanded");
                }
            });

            // Step B: Toggle state logic for targeted card instance
            if (isAlreadyExpanded) {
                activeCard.classList.remove("is-expanded");
            } else {
                activeCard.classList.add("is-expanded");
                
                // Optional Step C: Smooth viewport scrolling correction for compact mobile viewports
                if (window.innerWidth < 992) {
                    setTimeout(() => {
                        activeCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    }, 450); // Matches transition timelines exactly
                }
            }
        });
    });
}
