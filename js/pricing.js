document.addEventListener("DOMContentLoaded", () => {
    // FAQ Logic Only
    const faqItems = document.querySelectorAll(".faq-item");

    faqItems.forEach(item => {
        const questionArea = item.querySelector(".faq-question");
        
        questionArea.addEventListener("click", () => {
            const answer = item.querySelector(".faq-answer");
            const isOpen = item.classList.contains("open");

            faqItems.forEach(i => {
                i.classList.remove("open");
                if(i.querySelector(".faq-answer")) {
                    i.querySelector(".faq-answer").style.maxHeight = null;
                }
            });

            if (!isOpen) {
                item.classList.add("open");
                answer.style.maxHeight = answer.scrollHeight + "px";
            }
        });
    });
});
