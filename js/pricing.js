/* ==========================================================================
   WCS PRICING INTERACTION & REVEAL SYSTEM
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    
    // 1. FAQ ACCORDION LOGIC
    const faqItems = document.querySelectorAll(".faq-item");

    faqItems.forEach(item => {
        const questionArea = item.querySelector(".faq-question");
        
        questionArea.addEventListener("click", () => {
            const answer = item.querySelector(".faq-answer");
            const isOpen = item.classList.contains("open");

            // Close all others cleanly
            faqItems.forEach(i => {
                i.classList.remove("open");
                if(i.querySelector(".faq-answer")) {
                    i.querySelector(".faq-answer").style.maxHeight = null;
                }
            });

            // Toggle target
            if (!isOpen) {
                item.classList.add("open");
                // Uses scrollHeight of the inner padding wrapper to get true height
                answer.style.maxHeight = answer.scrollHeight + "px";
            }
        });
    });

    // 2. SCROLL REVEAL OBSERVER (Self-contained fail-safe)
    const reveals = document.querySelectorAll(".reveal");
    
    if (reveals.length > 0 && "IntersectionObserver" in window) {
        const revealOptions = {
            threshold: 0.15,
            rootMargin: "0px 0px -50px 0px"
        };

        const revealOnScroll = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("active");
                    observer.unobserve(entry.target);
                }
            });
        }, revealOptions);

        reveals.forEach(reveal => {
            revealOnScroll.observe(reveal);
        });
    } else {
        // Fallback for older browsers: show everything immediately
        reveals.forEach(reveal => reveal.classList.add("active"));
    }
});
