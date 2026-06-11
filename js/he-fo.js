/**
 * he-fo.js
 * Core Dynamic Fragment Injector & Asset Pipeline
 * Web Creation Studios
 */

/**
 * he-fo.js
 * Global Header, Footer, and Brand Asset Initialization
 */

document.addEventListener("DOMContentLoaded", () => {
    initializeBrandAssets();
    injectLayoutComponents();
});

function initializeBrandAssets() {
    // Dynamic Favicon Loader
    const currentFavicon = document.querySelector("link[rel~='icon']");
    if (!currentFavicon) {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/jpeg';
        // Enforcing absolute root-relative directory per strict project specs
        link.href = '/images/logos/wcs-favicon.jpg'; 
        document.head.appendChild(link);
    }
}

function injectLayoutComponents() {
    const headerElement = document.getElementById('global-header');
    const footerElement = document.getElementById('global-footer');

    if (headerElement) {
        headerElement.innerHTML = `
            <header class="wcs-global-nav">
                <div class="nav-brand">WCS // TEAM</div>
                <nav class="nav-links">
                    <a href="/index.html">Home</a>
                    <a href="/portfolio.html">Portfolio</a>
                    <a href="/contact.html">Contact</a>
                </nav>
            </header>
        `;
    }

    if (footerElement) {
        footerElement.innerHTML = `
            <footer class="wcs-global-footer text-center mt-10 p-5 border-t border-slate-800 text-slate-400">
                <p>&copy; ${new Date().getFullYear()} Web Creation Studios. All Systems Operational.</p>
            </footer>
        `;
    }
}
