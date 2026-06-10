// js/index.js
document.addEventListener("DOMContentLoaded", () => {
    initScrollRevealEngine();
    initTeamDrawerMechanics();
    initSurfaceTiltParallax();
});

/**
 * 1. Intersection Observer Engine
 * Monitors scroll alignment and triggers CSS reveal phases smoothly.
 */
function initScrollRevealEngine() {
    const revealTargets = document.querySelectorAll(".reveal");
    
    const observerCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
                observer.unobserve(entry.target);
            }
        });
    };

    const sectionObserver = new IntersectionObserver(observerCallback, {
        root: null,
        threshold: 0.1,
        rootMargin: "0px 0px -40px 0px"
    });

    revealTargets.forEach(target => sectionObserver.observe(target));
}

/**
 * 2. Team Expandable Accordion Engine
 * Calculates explicit internal text heights on runtime invocation to manage transitions cleanly.
 */
function initTeamDrawerMechanics() {
    const teamCards = document.querySelectorAll(".team-expand-card");
    
    teamCards.forEach(card => {
        card.addEventListener("click", () => {
            const hiddenDrawer = card.querySelector(".card-hidden-drawer");
            const isCurrentlyExpanded = card.classList.contains("is-expanded");
            
            // Retract all operational team drawers to focus UI state
            teamCards.forEach(otherCard => {
                otherCard.classList.remove("is-expanded");
                otherCard.querySelector(".card-hidden-drawer").style.maxHeight = null;
            });
            
            // If the card wasn't open, compute exact scroll heights and slide out
            if (!isCurrentlyExpanded) {
                card.classList.add("is-expanded");
                hiddenDrawer.style.maxHeight = hiddenDrawer.scrollHeight + "px";
            }
        });
    });
}

/**
 * 3. Perspective Surface Modifier
 * Maps localized vector planes onto process layout objects to guide interaction pathways.
 */
function initSurfaceTiltParallax() {
    const processCards = document.querySelectorAll("[data-tilt]");
    
    processCards.forEach(card => {
        card.addEventListener("mousemove", (e) => {
            const bounds = card.getBoundingClientRect();
            const coordinateX = e.clientX - bounds.left;
            const coordinateY = e.clientY - bounds.top;
            
            const centerPointX = bounds.width / 2;
            const centerPointY = bounds.height / 2;
            
            const computedRotateX = ((coordinateY - centerPointY) / centerPointY) * -6; 
            const computedRotateY = ((coordinateX - centerPointX) / centerPointX) * 6;
            
            card.style.transform = `perspective(1000px) rotateX(${computedRotateX}deg) rotateY(${computedRotateY}deg) translateY(-5px)`;
        });
        
        card.addEventListener("mouseleave", () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)`;
        });
    });
}
