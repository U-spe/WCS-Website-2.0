// js/index.js
document.addEventListener("DOMContentLoaded", () => {
    initIntersectionObserver();
    initComponentTilts();
    initParallaxDrift();
});

/**
 * 1. Precision Interface Intersection Engine
 * Dispatches active visual classes when DOM sections scroll into visible parameters.
 */
function initIntersectionObserver() {
    const revealTargets = document.querySelectorAll(".reveal");
    
    const observerOptions = {
        root: null,
        threshold: 0.1,
        rootMargin: "0px 0px -30px 0px"
    };

    const observerCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
                observer.unobserve(entry.target);
            }
        });
    };

    const globalObserver = new IntersectionObserver(observerCallback, observerOptions);
    revealTargets.forEach(target => globalObserver.observe(target));
}

/**
 * 2. Surface Skew Coordinate Mapper
 * Generates responsive perspective skew modifications based on local mouse movements.
 */
function initComponentTilts() {
    const tiltPanels = document.querySelectorAll("[data-tilt]");
    
    tiltPanels.forEach(panel => {
        panel.addEventListener("mousemove", (event) => {
            const dimensions = panel.getBoundingClientRect();
            const mouseX = event.clientX - dimensions.left;
            const mouseY = event.clientY - dimensions.top;
            
            const internalX = dimensions.width / 2;
            const internalY = dimensions.height / 2;
            
            const pitch = ((mouseY - internalY) / internalY) * -5; // Constrained rotational threshold
            const yaw = ((mouseX - internalX) / internalX) * 5;
            
            panel.style.transform = `perspective(800px) rotateX(${pitch}deg) rotateY(${yaw}deg)`;
        });
        
        panel.addEventListener("mouseleave", () => {
            panel.style.transform = `perspective(800px) rotateX(0deg) rotateY(0deg)`;
        });
    });
}

/**
 * 3. Asymmetric Parallax Drift Controller
 * Delays background vector speeds to create dimensional depth upon vertical scrolling.
 */
function initParallaxDrift() {
    const matrixGrid = document.querySelector(".interactive-grid");
    if (!matrixGrid) return;
    
    window.addEventListener("scroll", () => {
        const structuralOffset = window.pageYOffset;
        if (structuralOffset < window.innerHeight) {
            matrixGrid.style.transform = `translateY(${structuralOffset * 0.12}px)`;
        }
    });
}
