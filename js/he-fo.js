/**
 * Simplified he-fo.js
 * Strictly for component injection & navigation state
 */

document.addEventListener("DOMContentLoaded", () => {
    // Inject Header & Footer
    injectComponent("#global-header", "/header.html", highlightActiveNav);
    injectComponent("#global-footer", "/footer.html");
});

async function injectComponent(selector, targetUrl, callback) {
    const target = document.querySelector(selector);
    if (!target) return;

    try {
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error("Fetch failed");
        target.innerHTML = await response.text();
        if (callback) callback();
    } catch (err) {
        console.error(`[Layout] Could not load ${targetUrl}`, err);
    }
}

function highlightActiveNav() {
    const currentPath = window.location.pathname;
    document.querySelectorAll(".nav-link").forEach(link => {
        if (link.getAttribute("href") === currentPath) {
            link.classList.add("active-route-token");
        }
    });
}
