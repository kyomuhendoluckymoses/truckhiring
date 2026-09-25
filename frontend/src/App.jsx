import { useState, useEffect } from 'react';
import './App.css';

function App() {
  // Logged-in driver (persisted in localStorage)
  const [currentDriver, setCurrentDriver] = useState(null);

  // Drivers list (public view)
  const [drivers, setDrivers] = useState([]);
  const [showAll, setShowAll] = useState(false);

  // Register form
  const [form, setForm] = useState({
    name: '',
    phone: '',
    password: '',
    truckType: 'Medium Moving Truck'
  });

  // Login form
  const [loginForm, setLoginForm] = useState({
    phone: '',
    password: ''
  });

  const [message, setMessage] = useState('');

  // On page load: restore login + fetch drivers
  useEffect(() => {
    const saved = localStorage.getItem('luckyDriver');
    if (saved) {
      try {
        setCurrentDriver(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem('luckyDriver');
      }
    }
    fetchDrivers(false);
  }, []);

  async function fetchDrivers(all = false) {
    try {
      const url = all
        ? 'https://truckhiring-backend.onrender.com/api/drivers'
        : 'https://truckhiring-backend.onrender.com/api/drivers/available';
      const res = await fetch(url);
      const data = await res.json();
      setDrivers(data.drivers || []);
    } catch (err) {
      console.error('Error fetching drivers:', err);
    }
  }

  // ---------- Register ----------
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleRegister(e) {
    e.preventDefault();
    setMessage('');

    try {
      const res = await fetch('https://truckhiring-backend.onrender.com/api/drivers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('✅ Driver registered! You can now log in.');
        setForm({ name: '', phone: '', password: '', truckType: 'Medium Moving Truck' });
        fetchDrivers(showAll);
      } else {
        setMessage('❌ ' + data.message);
      }
    } catch (err) {
      setMessage('❌ Error: ' + err.message);
    }
  }

  // ---------- Login ----------
  function handleLoginChange(e) {
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  }

  async function handleLogin(e) {
    e.preventDefault();
    setMessage('');

    try {
      const res = await fetch('https://truckhiring-backend.onrender.com/api/drivers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });

      const data = await res.json();

      if (res.ok) {
        setCurrentDriver(data.driver);
        localStorage.setItem('luckyDriver', JSON.stringify(data.driver));
        setLoginForm({ phone: '', password: '' });
        setMessage('✅ Logged in as ' + data.driver.name);
      } else {
        setMessage('❌ ' + data.message);
      }
    } catch (err) {
      setMessage('❌ Error: ' + err.message);
    }
  }

  function handleLogout() {
    setCurrentDriver(null);
    localStorage.removeItem('luckyDriver');
    setMessage('You have been logged out.');
  }

  // ---------- Availability toggle ----------
  async function toggleAvailability(id, current) {
    const newStatus = current === 'available' ? 'offline' : 'available';

    try {
      const res = await fetch(`https://truckhiring-backend.onrender.com/api/drivers/${id}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: newStatus })
      });

      const data = await res.json();

      // If we just updated the logged-in driver, refresh their stored info
      if (currentDriver && data.driver && data.driver._id === currentDriver._id) {
        setCurrentDriver(data.driver);
        localStorage.setItem('luckyDriver', JSON.stringify(data.driver));
      }

      fetchDrivers(showAll);
    } catch (err) {
      console.error('Error updating availability:', err);
    }
  }

  return (
    <div className="container">
      <h1>🚚 Lucky Movers — Driver Dashboard</h1>

      {/* -------- Logged-in view -------- */}
      {currentDriver && (
        <section className="card" style={{ background: '#e8f5e9' }}>
          <h2>👋 Welcome, {currentDriver.name}</h2>
          <p>
            <strong>Phone:</strong> {currentDriver.phone}
            <br />
            <strong>Truck:</strong> {currentDriver.truckType}
            <br />
            <strong>Status:</strong> <span className="status">{currentDriver.availability}</span>
          </p>
          <button onClick={handleLogout}>Logout</button>
        </section>
      )}

      {/* -------- Login form (shown when NOT logged in) -------- */}
      {!currentDriver && (
        <section className="card">
          <h2>Driver Login</h2>
          <form onSubmit={handleLogin}>
            <input
              name="phone"
              placeholder="Phone"
              value={loginForm.phone}
              onChange={handleLoginChange}
              required
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={handleLoginChange}
              required
            />
            <button type="submit">Log In</button>
          </form>
        </section>
      )}

      {/* -------- Register form (only when NOT logged in) -------- */}
      {!currentDriver && (
        <section className="card">
          <h2>Register a New Driver</h2>
          <form onSubmit={handleRegister}>
            <input
              name="name"
              placeholder="Full Name"
              value={form.name}
              onChange={handleChange}
              required
            />
            <input
              name="phone"
              placeholder="Phone (e.g. 0700000001)"
              value={form.phone}
              onChange={handleChange}
              required
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
            />
            <select name="truckType" value={form.truckType} onChange={handleChange}>
              <option>Pickup</option>
              <option>Small Moving Truck</option>
              <option>Medium Moving Truck</option>
              <option>Large Moving Truck</option>
            </select>
            <button type="submit">Register Driver</button>
          </form>
        </section>
      )}

      {message && <p className="message">{message}</p>}

      {/* -------- Public drivers list -------- */}
      <section className="card">
        <h2>
          {showAll ? 'All Drivers' : 'Available Drivers'} ({drivers.length})
        </h2>

        <button
          onClick={() => {
            const next = !showAll;
            setShowAll(next);
            fetchDrivers(next);
          }}
        >
          {showAll ? 'Show available only' : 'Show all drivers'}
        </button>

        {drivers.length === 0 ? (
          <p>No drivers to show.</p>
        ) : (
          <ul>
            {drivers.map((d) => (
              <li key={d._id}>
                <strong>{d.name}</strong> — {d.phone} — {d.truckType} —{' '}
                <span className="status">{d.availability}</span>
                <button onClick={() => toggleAvailability(d._id, d.availability)}>
                  Toggle
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default App;