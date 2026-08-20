/**
 * Simplified he-fo.js
 * Strictly for component injection, navigation state, & mobile menu
 */

document.addEventListener("DOMContentLoaded", () => {
    // Inject Header & Footer, then run the setup functions
    injectComponent("#global-header", "/header.html", () => {
        highlightActiveNav();
        initMobileMenu(); // Initializes mobile nav after header is in the DOM
    });
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
    let currentPath = window.location.pathname.replace(/\.html$/, "").replace(/\/$/, "");
    if (currentPath === "" || currentPath === "/index") currentPath = "/";

    document.querySelectorAll(".nav-link").forEach(link => {
        const hrefAttr = link.getAttribute("href");
        if (!hrefAttr || hrefAttr === "#") return;

        let linkPath = new URL(link.href).pathname.replace(/\.html$/, "").replace(/\/$/, "");
        if (linkPath === "" || linkPath === "/index") linkPath = "/";

        if (linkPath === currentPath) {
            link.classList.add("active-route-token");
        }
    });
}

function initMobileMenu() {
    // Update these selectors if your classes are named differently in header.html
    const menuToggle = document.querySelector('.mobile-toggle, .hamburger, .menu-btn');
    const navMenu = document.querySelector('.nav-links, .nav-menu, .mobile-nav');

    if (!menuToggle || !navMenu) return;

    // Toggle menu open/close
    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
        // Optional: lock body scrolling when menu is open
        document.body.classList.toggle('no-scroll');
    });

    // Close menu when a link is clicked (crucial for mobile user experience)
    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            menuToggle.classList.remove('active');
            navMenu.classList.remove('active');
            document.body.classList.remove('no-scroll');
        });
    });
}
