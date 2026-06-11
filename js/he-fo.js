/**
 * he-fo.js
 * Core Dynamic Fragment Injector & Asset Pipeline
 * Web Creation Studios
 */

document.addEventListener("DOMContentLoaded", () => {
    // Execute dynamic injection layout sequences
    injectComponent("#global-header", "/header.html", initializeNavInteractions);
    injectComponent("#global-footer", "/footer.html");
    
    // Mount identity assets dynamically to document head
    mountDynamicFavicon();
});

/**
 * Asynchronously fetches semantic markup partials and injects them into layout nodes
 */
async function injectComponent(selector, targetUrl, callback = null) {
    const targetNode = document.querySelector(selector);
    if (!targetNode) return;

    try {
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error(`HTTP status verification failed: ${response.status}`);
        
        const plainTextMarkup = await response.text();
        targetNode.innerHTML = plainTextMarkup;
        
        if (callback) callback();
    } catch (systemError) {
        console.error(`[Layout Exception] Failed to inject container from ${targetUrl}:`, systemError);
    }
}

/**
 * Validates window routing parameters to apply active navigation menu styling rules
 */
function initializeNavInteractions() {
    const currentPathname = window.location.pathname;
    const interfaceLinks = document.querySelectorAll(".nav-link");

    interfaceLinks.forEach(linkElement => {
        const matchingRoute = linkElement.getAttribute("href");
        
        // Handle root configurations and nested folders perfectly
        if (currentPathname === matchingRoute || (matchingRoute !== "/" && currentPathname.startsWith(matchingRoute))) {
            linkElement.classList.add("active-route-token");
        }
    });
}

/**
 * Programmatically configures and mounts the site favicon link element using
 * your locked root-relative asset pathing rule.
 */
function mountDynamicFavicon() {
    const coreFaviconPath = "/images/logos/favicon.ico";
    let targetFaviconNode = document.querySelector("link[rel~='icon']");
    
    if (!targetFaviconNode) {
        targetFaviconNode = document.createElement("link");
        targetFaviconNode.rel = "icon";
        document.head.appendChild(targetFaviconNode);
    }
    
    targetFaviconNode.href = coreFaviconPath;
    targetFaviconNode.type = "image/x-icon";
}
