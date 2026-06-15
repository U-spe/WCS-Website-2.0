document.addEventListener('DOMContentLoaded', () => {
    
    // --- Engine Section Accordion & Image Swap ---
    const accItems = document.querySelectorAll('.acc-item');
    const stackImages = document.querySelectorAll('.stack-img');

    accItems.forEach(item => {
        item.addEventListener('click', function() {
            // 1. Remove active state from all items and images
            accItems.forEach(i => i.classList.remove('active'));
            stackImages.forEach(img => img.classList.remove('active'));

            // 2. Add active state to clicked item
            this.classList.add('active');

            // 3. Find the target image ID from the data attribute
            const targetId = this.getAttribute('data-target');
            const targetImage = document.getElementById(targetId);
            
            // 4. Activate the corresponding image
            if (targetImage) {
                targetImage.classList.add('active');
            }
        });
    });

    // --- Interactive 3D Card Tilt Effect ---
    const tiltCards = document.querySelectorAll('.interactive-tilt');
    tiltCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            // Calculate rotational angles based on cursor offset
            const rotateX = ((y - centerY) / centerY) * -6; 
            const rotateY = ((x - centerX) / centerX) * 6;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;
        });

        card.addEventListener('mouseleave', () => {
            // Smooth reset when mouse departures the surface
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)`;
        });
    });
});
