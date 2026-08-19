/**
 * Simplified he-fo.js
 * Strictly for component injection & navigation state
 */

document.addEventListener("DOMContentLoaded", () => {
    // Inject Header & Footer
    injectComponent("#global-header", "/header.html", highlightActiveNav);
    injectComponent("#global-footer", "/footer.html");

    // Dynamically import the mobile redirect script
    loadScript("/js/redirect.mobile.js");
});

// Helper to inject external JS files
function loadScript(src) {
    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    document.head.appendChild(script);
}

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
