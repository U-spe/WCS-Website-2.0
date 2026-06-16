/**
 * he-fo.js
 * Core Dynamic Fragment Injector & Asset Pipeline
 * Web Creation Studios
 */

document.addEventListener("DOMContentLoaded", () => {

    initializeResponsiveEnvironment();

    injectComponent(
        "#global-header",
        "/header.html",
        initializeNavInteractions
    );

    injectComponent(
        "#global-footer",
        "/footer.html"
    );

    initializeSiteIdentity();

});

/**
 * Initializes all site-wide identity assets.
 */
function initializeSiteIdentity() {
    mountDynamicFavicons();
    applyThemeColor();
    applyAppleTouchIcon();
    applyManifest();
}

/**
 * Asynchronously fetches semantic markup partials and injects them.
 */
async function injectComponent(selector, targetUrl, callback = null) {

    const targetNode = document.querySelector(selector);

    if (!targetNode) return;

    try {

        const response = await fetch(targetUrl);

        if (!response.ok) {
            throw new Error(
                `HTTP status verification failed: ${response.status}`
            );
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
 * Navigation state detection.
 */
function initializeNavInteractions() {

    const currentPathname =
        window.location.pathname;

    const interfaceLinks =
        document.querySelectorAll(".nav-link");

    interfaceLinks.forEach(linkElement => {

        const matchingRoute =
            linkElement.getAttribute("href");

        if (

            currentPathname === matchingRoute ||

            (
                matchingRoute !== "/" &&
                currentPathname.startsWith(
                    matchingRoute
                )
            )

        ) {

            linkElement.classList.add(
                "active-route-token"
            );

        }

    });

}

/**
 * Mounts ALL favicon formats.
 */

function mountDynamicFavicons() {

    const faviconAssets = [

        {
            rel: "icon",
            type: "image/x-icon",
            href: "/images/logos/favicon.ico"
        },

        {
            rel: "icon",
            type: "image/png",
            sizes: "32x32",
            href: "/images/logos/favicon-32x32.png"
        },

        {
            rel: "icon",
            type: "image/png",
            sizes: "16x16",
            href: "/images/logos/favicon-16x16.png"
        },

        {
            rel: "shortcut icon",
            href: "/images/logos/wcs-logo.png"
        }

    ];

    faviconAssets.forEach(asset => {

        let existing =
            document.querySelector(
                `link[rel="${asset.rel}"]${asset.sizes ? `[sizes="${asset.sizes}"]` : ""}`
            );

        if (!existing) {

            existing =
                document.createElement("link");

            document.head.appendChild(
                existing
            );

        }

        existing.rel =
            asset.rel;

        existing.href =
            asset.href;

        if (asset.type)
            existing.type =
                asset.type;

        if (asset.sizes)
            existing.sizes =
                asset.sizes;

    });

}

/**
 * Apple devices.
 */

function applyAppleTouchIcon() {

    let icon =
        document.querySelector(
            'link[rel="apple-touch-icon"]'
        );

    if (!icon) {

        icon =
            document.createElement(
                "link"
            );

        document.head.appendChild(
            icon
        );

    }

    icon.rel =
        "apple-touch-icon";

    icon.href =
        "/images/logos/apple-touch-icon.png";

}

/**
 * Manifest support.
 */

function applyManifest() {

    let manifest =
        document.querySelector(
            'link[rel="manifest"]'
        );

    if (!manifest) {

        manifest =
            document.createElement(
                "link"
            );

        document.head.appendChild(
            manifest
        );

    }

    manifest.rel =
        "manifest";

    manifest.href =
        "/site.webmanifest";

}

/**
 * Browser theme color.
 */

function applyThemeColor() {

    let theme =
        document.querySelector(
            'meta[name="theme-color"]'
        );

    if (!theme) {

        theme =
            document.createElement(
                "meta"
            );

        document.head.appendChild(
            theme
        );

    }

    theme.name =
        "theme-color";

    theme.content =
        "#081019";

}

/**
 * Responsive initialization.
 */

function initializeResponsiveEnvironment() {

    updateViewportHeight();
    updateScreenClass();

    window.addEventListener(
        "resize",
        () => {

            updateViewportHeight();
            updateScreenClass();

        }
    );

    detectTouchDevice();

}

/**
 * Mobile viewport helper.
 */

function updateViewportHeight() {

    const vh =
        window.innerHeight * 0.01;

    document.documentElement
        .style
        .setProperty(
            "--vh",
            `${vh}px`
        );

}

/**
 * Mobile/Desktop classes.
 */

function updateScreenClass() {

    const mobileBreakpoint =
        768;

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
 * Touch detection.
 */

function detectTouchDevice() {

    const isTouch =

        "ontouchstart" in window ||

        navigator.maxTouchPoints > 0 ||

        navigator.msMaxTouchPoints > 0;

    if (isTouch) {

        document.body.classList.add(
            "touch-device"
        );

    }

    else {

        document.body.classList.add(
            "pointer-device"
        );

    }

}

/**
 * Responsive media defaults.
 */

function applyResponsiveAssets() {

    document
        .querySelectorAll("img")
        .forEach(imageElement => {

            imageElement.style.maxWidth =
                "100%";

            imageElement.style.height =
                "auto";

            imageElement.style.display =
                "block";

        });

    document
        .querySelectorAll(
            "iframe, video"
        )
        .forEach(mediaElement => {

            mediaElement.style.maxWidth =
                "100%";

        });

    document
        .querySelectorAll(
            "table"
        )
        .forEach(tableElement => {

            tableElement.style.maxWidth =
                "100%";

            tableElement.style.display =
                "block";

            tableElement.style.overflowX =
                "auto";

        });

}
