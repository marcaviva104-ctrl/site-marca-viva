/**
 * Hero Slider Logic
 * Handles auto-rotation and manual navigation of the diagonal hero slider.
 */

let currentSlide = 0;
let sliderInterval;
const slideDelay = 4000; // 4 seconds

function initHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    if (slides.length === 0) return;

    // Start Auto Play
    startSliderTimer();
}

function showSlide(index) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.slider-dot');

    if (index >= slides.length) index = 0;
    if (index < 0) index = slides.length - 1;

    currentSlide = index;

    // Update Slides
    slides.forEach((slide, i) => {
        if (i === index) {
            slide.classList.add('active');
        } else {
            slide.classList.remove('active');
        }
    });

    // Update Dots
    dots.forEach((dot, i) => {
        if (i === index) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

function nextSlide() {
    showSlide(currentSlide + 1);
}

function goToSlide(index) {
    showSlide(index);
    resetSliderTimer();
}

function startSliderTimer() {
    clearInterval(sliderInterval);
    sliderInterval = setInterval(nextSlide, slideDelay);
}

function resetSliderTimer() {
    clearInterval(sliderInterval);
    startSliderTimer();
}

// Global exposure for HTML onclick
window.goToSlide = goToSlide;

// Init on Load
document.addEventListener('DOMContentLoaded', initHeroSlider);
