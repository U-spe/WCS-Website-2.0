/**
 * redirect.mobile.js
 * Detects mobile devices and routes them to the mobile subdomain.
 */

(function() {
    // Check if the user agent matches common mobile operating systems and browsers
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
        // Grab the current path and query string (e.g., /about.html?user=1)
        const currentPath = window.location.pathname + window.location.search;
        
        // Redirect to the mobile site, replacing the current history state
        window.location.replace("https://mobile.webcreationstudios.org" + currentPath);
    }
})();
