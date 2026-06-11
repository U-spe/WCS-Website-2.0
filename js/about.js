/**
 * about.js
 * Specialized Interactive Mechanics for the About Studio Viewport
 * Web Creation Studios
 */

document.addEventListener("DOMContentLoaded", () => {
    initSharedScrollObserver();
    initValueCardAtmosphere();
    initImageParallaxEngine();
});

/**
 * 1. Core Scroll Reveal Engine
 * Replicated here to keep the about page independent of homepage scripts.
 */
function initSharedScrollObserver() {
    const revealElements = document.querySelectorAll(".reveal");
    
    const observerOptions = {
        root: null,
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    revealElements.forEach(element => observer.observe(element));
}

/**
 * 2. Premium Value Box Luminance Tracker
 * Calculates relative pointer vectors to cast a subtle, dynamic 
 * radial illumination layer onto the value cards on hover.
 */
function initValueCardAtmosphere() {
    const valueBoxes = document.querySelectorAll(".value-box");
    
    valueBoxes.forEach(box => {
        box.addEventListener("mousemove", (event) => {
            const cardBounds = box.getBoundingClientRect();
            
            // Extract exact pixel coordinates relative to the card vector space
            const mouseX = event.clientX - cardBounds.left;
            const mouseY = event.clientY - cardBounds.top;
            
            // Inject localized custom CSS properties directly into the DOM node
            box.style.setProperty("--mouse-x", `${mouseX}px`);
            box.style.setProperty("--mouse-y", `${mouseY}px`);
        });
    });
}

/**
 * 3. Artistic Lens Parallax Engine
 * Creates a slow, luxurious smooth-scroll translation on feature images,
 * giving depth to layout transitions as users scroll down the narrative.
 */
function initImageParallaxEngine() {
    const parallaxImages = document.querySelectorAll(".wcs-image-box img");
    
    window.addEventListener("scroll", () => {
        const viewportTop = window.scrollY;
        
        parallaxImages.forEach(image => {
            const imageParent = image.parentElement;
            const parentOffsetTop = imageParent.offsetTop;
            const parentHeight = imageParent.offsetHeight;
            
            // Determine if the image module is currently passing through the viewport
            if (viewportTop + window.innerHeight > parentOffsetTop && 
                viewportTop < parentOffsetTop + parentHeight) {
                
                // Calculate subtle translation scalar (negative value pulls image upward)
                const relativeShift = (viewportTop - parentOffsetTop) * 0.08;
                image.style.transform = `scale(1.05) translateY(${relativeShift}px)`;
            }
        });
    });
}
