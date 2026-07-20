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
