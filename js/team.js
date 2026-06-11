/**
 * team.js
 * Controls Intersection Observers, Parallax Engine, and Team Drawers
 */

document.addEventListener("DOMContentLoaded", () => {
    initScrollReveal();
    initDrawers();
    initMouseParallax();
});

function initScrollReveal() {
    const reveals = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    reveals.forEach(el => observer.observe(el));
}

function initDrawers() {
    const cards = document.querySelectorAll(".team-expand-card");

    cards.forEach(card => {
        card.addEventListener("click", (e) => {
            // Prevent click from misfiring if user is selecting text in the drawer
            if (e.target.closest(".card-hidden-drawer")) return;

            const isExpanded = card.classList.contains("is-expanded");

            // Close all other cards
            cards.forEach(c => c.classList.remove("is-expanded"));

            // Toggle clicked card
            if (!isExpanded) {
                card.classList.add("is-expanded");
            }
        });
    });
}

function initMouseParallax() {
    const target = document.querySelector('.parallax-target');
    if (!target) return;

    window.addEventListener('mousemove', (e) => {
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        // Calculate offset from center screen for kinetic drag
        const xOffset = (mouseX - window.innerWidth / 2) * 0.05;
        const yOffset = (mouseY - window.innerHeight / 2) * 0.05;

        // Apply hardware-accelerated translation
        target.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
    });
}
