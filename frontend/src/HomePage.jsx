import { useState, useEffect } from 'react';

const slides = [
  {
    img: '/truck1.jpg',
    title: 'MOVE ANYTHING, ANYWHERE',
    text: 'Fast, trusted moving across Uganda.'
  },
  {
    img: '/truck2.jpg',
    title: 'HOUSEHOLD ITEMS',
    text: 'From furniture to appliances — we move it safely.'
  },
  {
    img: '/truck3.jpg',
    title: 'HARDWARE & MATERIALS',
    text: 'Cement, steel, pipes — delivered on time.'
  }
];

export default function HomePage() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  function go(n) {
    setCurrent((c) => (c + n + slides.length) % slides.length);
  }

  return (
    <div className="lm-app">

      <header className="lm-nav">
        <div className="lm-logo">🚚 LUCKY MOVERS</div>
        <nav className="lm-nav-links">
          <a href="/"><i className="fa-solid fa-house"></i> Home</a>
          <a href="/book" className="lm-nav-cta"><i className="fa-solid fa-truck"></i> Book Now</a>
          <a href="/complaint"><i className="fa-solid fa-triangle-exclamation"></i> Complaint</a>
          <a href="#about"><i className="fa-solid fa-circle-info"></i> About</a>
          <a href="#contact"><i className="fa-solid fa-phone"></i> Contact</a>
        </nav>
      </header>

      <section className="lm-slider">
        {slides.map((s, i) => (
          <div
            key={i}
            className={'lm-slide' + (i === current ? ' lm-slide-active' : '')}
            style={{ backgroundImage: `url(${s.img})` }}
          >
            <div className="lm-slide-overlay" />
            <div className="lm-slide-content">
              <h1>{s.title}</h1>
              <p>{s.text}</p>
              <a href="/book" className="lm-btn-primary lm-btn-lg">
                <i className="fa-solid fa-box"></i> Book a Truck Now
              </a>
            </div>
          </div>
        ))}

        <button className="lm-arrow lm-arrow-left" onClick={() => go(-1)}>‹</button>
        <button className="lm-arrow lm-arrow-right" onClick={() => go(1)}>›</button>

        <div className="lm-dots">
          {slides.map((_, i) => (
            <span
              key={i}
              className={'lm-dot' + (i === current ? ' lm-dot-active' : '')}
              onClick={() => setCurrent(i)}
            />
          ))}
        </div>
      </section>

      <section className="lm-features-section" id="about">
        <h2>Why Lucky Movers?</h2>
        <div className="lm-features-grid">
          <div className="lm-feature-card">
            <div className="lm-feature-icon"><i className="fa-solid fa-bolt"></i></div>
            <h3>Fast Booking</h3>
            <p>Request a truck in seconds and get matched with a driver immediately.</p>
          </div>
          <div className="lm-feature-card">
            <div className="lm-feature-icon"><i className="fa-solid fa-shield-halved"></i></div>
            <h3>Trusted Drivers</h3>
            <p>All our drivers are verified. Your goods are safe with us.</p>
          </div>
          <div className="lm-feature-card">
            <div className="lm-feature-icon"><i className="fa-solid fa-hand-holding-dollar"></i></div>
            <h3>Fair Prices</h3>
            <p>You offer the price. Drivers accept or counter-offer. No surprises.</p>
          </div>
          <div className="lm-feature-card">
            <div className="lm-feature-icon"><i className="fa-solid fa-location-dot"></i></div>
            <h3>Anywhere in Uganda</h3>
            <p>From Kampala to Fort Portal, we cover the whole country.</p>
          </div>
        </div>
      </section>

      <section className="lm-cta">
        <h2>Ready to move?</h2>
        <p>Book a truck in less than a minute.</p>
        <a href="/book" className="lm-btn-primary lm-btn-lg">
          <i className="fa-solid fa-truck-fast"></i> Request a Truck
        </a>
        <a href="/complaint" className="lm-btn-primary lm-btn-lg" style={{ marginLeft: 12, background: '#c62828' }}>
          <i className="fa-solid fa-triangle-exclamation"></i> Report a Problem
        </a>
      </section>

      <footer className="lm-footer" id="contact">
        <div>
          <h4>🚚 Lucky Movers</h4>
          <p>Uganda's trusted moving service. We move anything, anywhere.</p>
        </div>

        <div>
          <h4>Quick Links</h4>
          <p><a href="/"><i className="fa-solid fa-house"></i> Home</a></p>
          <p><a href="/book"><i className="fa-solid fa-truck"></i> Book a Truck</a></p>
          <p><a href="/complaint"><i className="fa-solid fa-triangle-exclamation"></i> Submit a Complaint</a></p>
          <p><a href="#about"><i className="fa-solid fa-circle-info"></i> About</a></p>
        </div>

        <div>
          <h4>Contact</h4>
          <p><i className="fa-solid fa-phone"></i> +256 700 000 000</p>
          <p><i className="fa-brands fa-whatsapp"></i> WhatsApp available</p>
          <p><i className="fa-solid fa-location-dot"></i> Kampala, Uganda</p>
          <p><i className="fa-solid fa-envelope"></i> info@luckymovers.ug</p>
        </div>

        <div>
          <h4>Follow Us</h4>
          <p><i className="fa-brands fa-facebook"></i> <a href="#">Facebook</a></p>
          <p><i className="fa-brands fa-whatsapp"></i> <a href="#">WhatsApp</a></p>
          <p><i className="fa-brands fa-instagram"></i> <a href="#">Instagram</a></p>
          <p><i className="fa-brands fa-x-twitter"></i> <a href="#">X (Twitter)</a></p>
        </div>

        <div className="lm-footer-bottom">
          © 2026 Lucky Movers. All rights reserved.
        </div>
      </footer>
    </div>
  );
}