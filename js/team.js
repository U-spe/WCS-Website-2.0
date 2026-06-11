document.addEventListener("DOMContentLoaded", () => {
    initScrollReveal();
    initTeamDrawers();
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
    }, { threshold: 0.1, rootMargin: "0px 0px -20px 0px" });

    reveals.forEach(el => observer.observe(el));
}

function initTeamDrawers() {
    const cards = document.querySelectorAll(".team-expand-card");

    cards.forEach(card => {
        card.addEventListener("click", (e) => {
            // Stop click if the user is highlighting text inside the drawer
            if (e.target.closest(".card-hidden-drawer")) return;

            const isExpanded = card.classList.contains("is-expanded");

            // Close all cards first for a clean accordion effect
            cards.forEach(c => c.classList.remove("is-expanded"));

            // Open the clicked card if it wasn't already open
            if (!isExpanded) {
                card.classList.add("is-expanded");
            }
        });
    });
}
