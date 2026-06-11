/**
 * team.js
 * Drives the accordion interactions and parallax engine
 */

document.addEventListener("DOMContentLoaded", () => {
    initDrawers();
    initMouseParallax();
});

function initDrawers() {
    const cards = document.querySelectorAll(".team-expand-card");

    cards.forEach(card => {
        card.addEventListener("click", (e) => {
            // Prevent drawer text highlight clicks from misfiring
            if (e.target.closest(".card-hidden-drawer")) return;

            const isExpanded = card.classList.contains("is-expanded");

            // Shut all other cards
            cards.forEach(c => c.classList.remove("is-expanded"));

            // Toggle target
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
        
        // Calculate offset from center screen
        const xOffset = (mouseX - window.innerWidth / 2) * 0.05;
        const yOffset = (mouseY - window.innerHeight / 2) * 0.05;

        // Apply kinetic drift to the front image
        target.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
    });
}
