/**
 * pricing.js
 * Specialized Interactive Interface Logic
 * Web Creation Studios
 */

document.addEventListener("DOMContentLoaded", () => {
    initializeFaqAccordion();
});

/**
 * Handles smooth max-height transitions for content accordions.
 */
function initializeFaqAccordion() {
    const faqItems = document.querySelectorAll(".faq-item");

    faqItems.forEach(item => {
        const structuralTrigger = item.querySelector(".faq-question");
        
        structuralTrigger.addEventListener("click", () => {
            const answerContainer = item.querySelector(".faq-answer");
            const isOpen = item.classList.contains("open");

            // Collapses all open rows smoothly to maintain clean context layout
            faqItems.forEach(innerItem => {
                innerItem.classList.remove("open");
                const innerAnswer = innerItem.querySelector(".faq-answer");
                if (innerAnswer) innerAnswer.style.maxHeight = null;
            });

            // If the clicked element wasn't open, expand it using dynamic element height limits
            if (!isOpen) {
                item.classList.add("open");
                answerContainer.style.maxHeight = answerContainer.scrollHeight + "px";
            }
        });
    });
}
