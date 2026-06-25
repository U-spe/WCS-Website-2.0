/* ==========================================================================
   PRICING PAGE INTERACTIONS
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    
    // FAQ Accordion Logic
    const faqItems = document.querySelectorAll(".faq-item");

    faqItems.forEach(item => {
        const questionArea = item.querySelector(".faq-question");
        
        questionArea.addEventListener("click", () => {
            const answer = item.querySelector(".faq-answer");
            const isOpen = item.classList.contains("open");

            // Close all other open items
            faqItems.forEach(i => {
                i.classList.remove("open");
                i.querySelector(".faq-answer").style.maxHeight = null;
            });

            // If the clicked item wasn't open, open it
            if (!isOpen) {
                item.classList.add("open");
                answer.style.maxHeight = answer.scrollHeight + "px";
            }
        });
    });

    // Intersection Observer for Reveal Animations (if not already handled in main.js)
    const reveals = document.querySelectorAll(".reveal");
    
    if (reveals.length > 0) {
        const revealOptions = {
            threshold: 0.15,
            rootMargin: "0px 0px -50px 0px"
        };

        const revealOnScroll = new IntersectionObserver(function(entries, observer) {
            entries.forEach(entry => {
                if (!entry.isIntersecting) {
                    return;
                } else {
                    entry.target.classList.add("active");
                    observer.unobserve(entry.target);
                }
            });
        }, revealOptions);

        reveals.forEach(reveal => {
            revealOnScroll.observe(reveal);
        });
    }
});
