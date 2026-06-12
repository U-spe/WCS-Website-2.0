/**
 * he-fo.js
 * Core Dynamic Fragment Injector & Asset Pipeline
 * Web Creation Studios
 */

document.addEventListener("DOMContentLoaded", () => {
    // Initialize responsive environment
    initializeResponsiveEnvironment();

    // Execute dynamic injection layout sequences
    injectComponent("#global-header", "/header.html", initializeNavInteractions);
    injectComponent("#global-footer", "/footer.html");

    // Mount identity assets
    mountDynamicFavicon();

    // Mount WCS AI Widget assets
    mountWCSAIWidgetAssets();
});

/**
 * Asynchronously fetches semantic markup partials and injects them into layout nodes
 */
async function injectComponent(selector, targetUrl, callback = null) {
    const targetNode = document.querySelector(selector);
    if (!targetNode) return;

    try {
        const response = await fetch(targetUrl);

        if (!response.ok) {
            throw new Error(`HTTP status verification failed: ${response.status}`);
        }

        const plainTextMarkup = await response.text();
        targetNode.innerHTML = plainTextMarkup;

        if (callback) {
            callback();
        }

        applyResponsiveAssets();

    } catch (systemError) {
        console.error(
            `[Layout Exception] Failed to inject container from ${targetUrl}:`,
            systemError
        );
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

        if (
            currentPathname === matchingRoute ||
            (matchingRoute !== "/" &&
                currentPathname.startsWith(matchingRoute))
        ) {
            linkElement.classList.add("active-route-token");
        }
    });
}

/**
 * Programmatically configures and mounts the site favicon
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

/**
 * Injects WCS AI Widget CSS + JS into the document head safely
 */
function mountWCSAIWidgetAssets() {
    // prevent duplicate injection
    if (document.getElementById("wcs-ai-widget-css")) return;

    const css = document.createElement("link");
    css.id = "wcs-ai-widget-css";
    css.rel = "stylesheet";
    css.href = "/wcs-ai-widget/widget.css";

    const js = document.createElement("script");
    js.id = "wcs-ai-widget-js";
    js.src = "/wcs-ai-widget/widget.js";
    js.defer = true;

    document.head.appendChild(css);
    document.head.appendChild(js);
}

/**
 * Initializes global responsive utilities
 */
function initializeResponsiveEnvironment() {
    updateViewportHeight();
    updateScreenClass();

    window.addEventListener("resize", () => {
        updateViewportHeight();
        updateScreenClass();
    });

    detectTouchDevice();
}

/**
 * Creates a reliable mobile viewport height variable
 *
 * CSS Usage:
 * min-height: calc(var(--vh, 1vh) * 100);
 */
function updateViewportHeight() {
    const vh = window.innerHeight * 0.01;

    document.documentElement.style.setProperty(
        "--vh",
        `${vh}px`
    );
}

/**
 * Applies mobile/desktop body classes
 */
function updateScreenClass() {
    const mobileBreakpoint = 768;

    document.body.classList.toggle(
        "mobile-layout",
        window.innerWidth <= mobileBreakpoint
    );

    document.body.classList.toggle(
        "desktop-layout",
        window.innerWidth > mobileBreakpoint
    );
}

/**
 * Detects touch-capable devices
 */
function detectTouchDevice() {
    const isTouch =
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0;

    if (isTouch) {
        document.body.classList.add("touch-device");
    } else {
        document.body.classList.add("pointer-device");
    }
}

/**
 * Applies responsive defaults to dynamically injected assets
 */
function applyResponsiveAssets() {
    document.querySelectorAll("img").forEach(imageElement => {
        imageElement.style.maxWidth = "100%";
        imageElement.style.height = "auto";
        imageElement.style.display = "block";
    });

    document.querySelectorAll("iframe, video").forEach(mediaElement => {
        mediaElement.style.maxWidth = "100%";
    });

    document.querySelectorAll("table").forEach(tableElement => {
        tableElement.style.maxWidth = "100%";
        tableElement.style.display = "block";
        tableElement.style.overflowX = "auto";
    });
}
