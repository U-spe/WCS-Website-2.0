document.addEventListener('DOMContentLoaded', () => {
    
    // --- Engine Section Accordion & Visual Image Swap ---
    const accItems = document.querySelectorAll('.acc-item');
    const stackImages = document.querySelectorAll('.stack-img');

    if (accItems.length > 0 && stackImages.length > 0) {
        accItems.forEach(item => {
            item.addEventListener('click', function() {
                // 1. Remove active execution state across vectors
                accItems.forEach(i => i.classList.remove('active'));
                stackImages.forEach(img => img.classList.remove('active'));

                // 2. Assign active state targeting clicked instance
                this.classList.add('active');

                // 3. Resolve binding data target attribute
                const targetId = this.getAttribute('data-target');
                const targetImage = document.getElementById(targetId);
                
                // 4. Force image transition layering
                if (targetImage) {
                    targetImage.classList.add('active');
                }
            });
        });
    }

    // --- High-Performance 3D Card Tilt Matrix Configuration ---
    const tiltCards = document.querySelectorAll('.interactive-tilt');
    
    if (tiltCards.length > 0) {
        tiltCards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                // Fine-tuned angular matrix parameters (max 6deg tilt)
                const rotateX = ((y - centerY) / centerY) * -6; 
                const rotateY = ((x - centerX) / centerX) * 6;
                
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;
            });

            card.addEventListener('mouseleave', () => {
                // Zero operational deviation on mouse departure
                card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)`;
            });
        });
    }
});
