import Ribbons from './Ribbons.js';

// Initialize Ribbons component as a page-wide cursor effect
const ribbonsContainer = document.getElementById('ribbons-container');
if (ribbonsContainer) {
  new Ribbons(ribbonsContainer, {
    colors: ['#5227FF'], // Electric purple/blue matching the usage example
    baseThickness: 30,
    speedMultiplier: 0.5,
    maxAge: 500,
    enableFade: false,
    enableShaderEffect: false,
    backgroundColor: [0, 0, 0, 0] // fully transparent overlay
  });
}

const revealItems = document.querySelectorAll('.reveal');

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.16,
  }
);

revealItems.forEach((item) => observer.observe(item));

const heroVideo = document.querySelector('.hero-video');

if (heroVideo) {
  heroVideo.play().catch(() => {
    heroVideo.classList.add('video-hidden');
  });

  heroVideo.addEventListener('error', () => {
    heroVideo.classList.add('video-hidden');
  });
}

const headerLinks = document.querySelectorAll('.site-nav a, .brand, .btn-secondary[href="#hero"]');

headerLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    const href = link.getAttribute('href');

    if (!href || !href.startsWith('#')) return;

    const target = document.querySelector(href);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
