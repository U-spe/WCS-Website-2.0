/**
 * he-fo.js
 * Core System Component Injector & Asset Pipeline
 * Web Creation Studios Architecture
 */

document.addEventListener("DOMContentLoaded", () => {
    // Execute structural injection layout sequences
    injectComponent("#global-header", "/header.html", initializeNavInteractions);
    injectComponent("#global-footer", "/footer.html");
    
    // Mount brand assets dynamically to document head
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
        console.error(`[Matrix Exception] Failed to inject layout chunk from ${targetUrl}:`, systemError);
    }
}

/**
 * Validates window context routing parameters to apply active state visual markers
 */
function initializeNavInteractions() {
    const structuralPathname = window.location.pathname;
    const interfaceLinks = document.querySelectorAll(".nav-link");

    interfaceLinks.forEach(linkElement => {
        const structuralRoute = linkElement.getAttribute("href");
        
        // Match base domain routes and nested system pathways accurately
        if (structuralPathname === structuralRoute || (structuralRoute !== "/" && structuralPathname.startsWith(structuralRoute))) {
            linkElement.classList.add("active-route-token");
        }
    });
}

/**
 * Enforces brand alignment by programmatically writing the favicon link element
 * into the head, utilizing your specified root-relative asset directory.
 */
function mountDynamicFavicon() {
    // Mandate: Dynamic identity assets must resolve from root-relative paths
    const productionFaviconPath = "/images/logos/favicon.ico";
    
    let targetFaviconNode = document.querySelector("link[rel~='icon']");
    
    if (!targetFaviconNode) {
        targetFaviconNode = document.createElement("link");
        targetFaviconNode.rel = "icon";
        document.head.appendChild(targetFaviconNode);
    }
    
    targetFaviconNode.href = productionFaviconPath;
    targetFaviconNode.type = "image/x-icon";
}
