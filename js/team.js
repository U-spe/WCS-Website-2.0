/**
 * team.js
 * Controls Intersection Observers, Parallax Engine, 3D Hero Tilt, and Team Drawers
 */

document.addEventListener("DOMContentLoaded", () => {
    initScrollReveal();
    initDrawers();
    initHeroTilt();
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
            if (e.target.closest(".card-hidden-drawer")) return;

            const isExpanded = card.classList.contains("is-expanded");
            cards.forEach(c => c.classList.remove("is-expanded"));

            if (!isExpanded) {
                card.classList.add("is-expanded");
            }
        });
    });
}

function initHeroTilt() {
    const tiltTarget = document.querySelector('.tilt-target');
    const heroVisual = document.querySelector('.hero-visual');
    if (!tiltTarget || !heroVisual) return;

    heroVisual.addEventListener('mousemove', (e) => {
        const rect = heroVisual.getBoundingClientRect();
        // Calculate mouse position relative to the center of the image container
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        // Apply a gentle 3D rotation based on mouse coordinates
        const rotateX = (y / rect.height) * -20; // 20 degree max tilt
        const rotateY = (x / rect.width) * 20;

        tiltTarget.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    // Reset snap when mouse leaves the hero area
    heroVisual.addEventListener('mouseleave', () => {
        tiltTarget.style.transform = `rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        tiltTarget.style.transition = 'transform 0.5s ease-out';
    });

    heroVisual.addEventListener('mouseenter', () => {
        tiltTarget.style.transition = 'transform 0.1s ease-out';
    });
}

function initMouseParallax() {
    const target = document.querySelector('.parallax-target');
    if (!target) return;

    window.addEventListener('mousemove', (e) => {
        const xOffset = (e.clientX - window.innerWidth / 2) * 0.05;
        const yOffset = (e.clientY - window.innerHeight / 2) * 0.05;
        target.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
    });
}
