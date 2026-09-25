import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
const destinationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

function FitBounds({ pickup, destination }) {
  const map = useMap();
  if (pickup && destination) {
    map.fitBounds(L.latLngBounds([pickup.lat, pickup.lng], [destination.lat, destination.lng]), { padding: [50, 50] });
  } else if (pickup) map.setView([pickup.lat, pickup.lng], 13);
  return null;
}

function Section({ title, children }) {
  return (
    <section className="card" style={{ marginBottom: 20, textAlign: 'left', padding: 20 }}>
      <h2 style={{ marginBottom: 12 }}>{title}</h2>
      {children}
    </section>
  );
}

function JobMap({ booking }) {
  const { pickupCoords, destinationCoords, pickupLocation, destination } = booking;
  if (!pickupCoords && !destinationCoords) return null;
  return (
    <div style={{ height: 280, borderRadius: 8, overflow: 'hidden', marginTop: 12 }}>
      <MapContainer
        center={[
          (pickupCoords?.lat || destinationCoords?.lat) || 0.3476,
          (pickupCoords?.lng || destinationCoords?.lng) || 32.5825
        ]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
        />
        <FitBounds pickup={pickupCoords} destination={destinationCoords} />
        {pickupCoords && (
          <Marker position={pickupCoords} icon={pickupIcon}>
            <Popup>📦 Pickup<br />{pickupLocation}</Popup>
          </Marker>
        )}
        {destinationCoords && (
          <Marker position={destinationCoords} icon={destinationIcon}>
            <Popup>🎯 Destination<br />{destination}</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

function jobWhatsAppLink(b) {
  const message =
    '🚚 Lucky Movers - Job Details\n\n' +
    'Booking: ' + (b.bookingCode || b._id.slice(-6)) + '\n' +
    'Customer: ' + b.customerName + ' (' + b.customerPhone + ')\n' +
    'Pickup: ' + b.pickupLocation + '\n' +
    'Destination: ' + b.destination + '\n' +
    'Truck: ' + b.selectedTruck + '\n' +
    'Cargo: ' + b.cargoDescription + '\n' +
    'Agreed Price: UGX ' + (b.agreedPrice || b.offeredPrice) + '\n' +
    'Payment: ' + (b.paymentMethod || 'Not chosen') +
      (b.paymentStatus ? ' — ' + b.paymentStatus : '') + '\n\n' +
    'From Lucky Movers';

  return 'https://wa.me/256' + b.customerPhone.replace(/^0/, '') +
    '?text=' + encodeURIComponent(message);
}

export default function DriverPage() {
  const [view, setView] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regForm, setRegForm] = useState({
    name: '', email: '', phone: '', password: '',
    truckType: 'Small Moving Truck'
  });
  const [driver, setDriver] = useState(null);
  const [pendingJobs, setPendingJobs] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [historyJobs, setHistoryJobs] = useState([]);
  const [message, setMessage] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setMessage('Logging in...');
    try {
      const res = await fetch(`${API}/drivers/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) { setMessage('❌ ' + (data.message || 'Login failed')); return; }
      setDriver(data.driver);
      setMessage('Welcome, ' + data.driver.name + '!');
      loadJobs(data.driver._id);
    } catch (err) { setMessage('❌ ' + err.message); }
  }

  function handleRegChange(e) {
    setRegForm({ ...regForm, [e.target.name]: e.target.value });
  }

  async function handleRegister(e) {
    e.preventDefault();
    setMessage('');
    try {
      const res = await fetch(`${API}/drivers/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm)
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('✅ Registered! You can now log in.');
        setRegForm({ name: '', email: '', phone: '', password: '', truckType: 'Small Moving Truck' });
        setView('login');
      } else setMessage('❌ ' + (data.message || 'Registration failed'));
    } catch (err) { setMessage('❌ ' + err.message); }
  }

  async function loadJobs(driverId) {
    if (!driverId) return;
    try {
      const res = await fetch(`${API}/bookings`);
      const data = await res.json();

      const mine = (data.bookings || []).filter(
        (b) => String(b.driverId) === String(driverId)
      );

      const pending = mine.filter(
        (b) => b.status === 'Sent to driver' || b.status === 'Sent to next driver'
      );
      const active = mine.filter((b) => b.status === 'Confirmed');
      const past = mine.filter(
        (b) => b.status !== 'Sent to driver' &&
               b.status !== 'Sent to next driver' &&
               b.status !== 'Confirmed'
      );

      setPendingJobs(pending);
      setActiveJobs(active);
      setHistoryJobs(past);
    } catch (err) { console.error(err); }
  }

  // ⚡ REFRESH EVERY 1 SECOND (was 3000ms)
  useEffect(() => {
    if (!driver?._id) return;
    const interval = setInterval(() => loadJobs(driver._id), 1000);
    return () => clearInterval(interval);
  }, [driver?._id]);

  async function setAvailability(newStatus) {
    if (!driver) return;
    try {
      const res = await fetch(`${API}/drivers/${driver._id}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: newStatus })
      });
      const data = await res.json();
      if (res.ok) { setDriver(data.driver); setMessage('Status: ' + newStatus); }
      else setMessage('❌ ' + (data.message || 'Failed'));
    } catch (err) { setMessage('❌ ' + err.message); }
  }

  async function acceptJob(id) {
    if (!window.confirm('Accept this job as-is?')) return;
    try {
      const res = await fetch(`${API}/bookings/${id}/accept-driver`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage('✅ Job accepted! Check "My Active Jobs" below.');
        loadJobs(driver._id);
      } else {
        alert('Error: ' + (data.message || 'Could not accept'));
      }
    } catch (err) { alert('❌ ' + err.message); }
  }

  async function counterOffer(id) {
    const newPrice = window.prompt('Enter your counter-offer price (UGX):');
    if (!newPrice) return;
    try {
      const res = await fetch(`${API}/bookings/${id}/counter-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPrice: Number(newPrice) })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('✅ Counter-offer sent for UGX ' + newPrice);
        loadJobs(driver._id);
      } else {
        alert('Error: ' + (data.message || 'Failed'));
      }
    } catch (err) { alert('❌ ' + err.message); }
  }

  async function rejectJob(id) {
    if (!window.confirm('Reject this job? It will be sent to another driver.')) return;
    try {
      const res = await fetch(`${API}/bookings/${id}/reject-driver`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || 'Sent to next driver');
        loadJobs(driver._id);
      } else {
        alert('Error: ' + (data.message || 'Failed'));
      }
    } catch (err) { alert('❌ ' + err.message); }
  }

  function logout() {
    setDriver(null);
    setPendingJobs([]);
    setActiveJobs([]);
    setHistoryJobs([]);
    setEmail('');
    setPassword('');
    setMessage('');
  }

  if (!driver) {
    return (
      <div className="container">
        <h1>🚚 Lucky Movers — Driver</h1>
        {view === 'login' && (
          <form onSubmit={handleLogin} className="card">
            <h3>Log In</h3>
            <input type="email" placeholder="Email" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={password}
              onChange={(e) => setPassword(e.target.value)} required />
            <button type="submit">Log In</button>
            <p style={{ marginTop: 12 }}>
              New driver?{' '}
              <button type="button"
                onClick={() => { setView('register'); setMessage(''); }}
                style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer', textDecoration: 'underline' }}>
                Register here
              </button>
            </p>
          </form>
        )}
        {view === 'register' && (
          <form onSubmit={handleRegister} className="card">
            <h3>Register a New Driver</h3>
            <input name="name" placeholder="Full Name" value={regForm.name}
              onChange={handleRegChange} required />
            <input name="email" type="email" placeholder="Email" value={regForm.email}
              onChange={handleRegChange} required />
            <input name="phone" type="tel" placeholder="Phone" value={regForm.phone}
              onChange={handleRegChange} required />
            <input name="password" type="password" placeholder="Password" value={regForm.password}
              onChange={handleRegChange} required />
            <select name="truckType" value={regForm.truckType} onChange={handleRegChange}>
              <option>Pickup</option>
              <option>Small Moving Truck</option>
              <option>Medium Moving Truck</option>
              <option>Large Moving Truck</option>
            </select>
            <button type="submit">Register</button>
            <p style={{ marginTop: 12 }}>
              Already have an account?{' '}
              <button type="button"
                onClick={() => { setView('login'); setMessage(''); }}
                style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer', textDecoration: 'underline' }}>
                Log in here
              </button>
            </p>
          </form>
        )}
        {message && <p className="message">{message}</p>}
      </div>
    );
  }

  return (
    <div className="container">
      <h1>🚚 Driver: {driver.name}</h1>
      <p><strong>Email:</strong> {driver.email}</p>
      <p><strong>Phone:</strong> {driver.phone}</p>
      <p><strong>Truck:</strong> {driver.truckType}</p>

      <Section title="My Status">
        <p>
          <strong>Current:</strong>{' '}
          <span style={{
            fontWeight: 'bold',
            color: driver.availability === 'available' ? 'green' :
                   driver.availability === 'busy' ? 'darkorange' : 'gray'
          }}>
            {driver.availability === 'available' && '🟢 Available'}
            {driver.availability === 'busy' && '🔴 Busy'}
            {driver.availability === 'offline' && '⚪ Offline'}
          </span>
        </p>

        <button
          onClick={() => setAvailability('available')}
          disabled={driver.availability === 'available'}
          style={{
            background: '#2e7d32',
            color: 'white',
            fontWeight: 'bold',
            opacity: driver.availability === 'available' ? 0.5 : 1
          }}
        >
          🟢 I'm Available
        </button>

        <button
          onClick={() => setAvailability('busy')}
          disabled={driver.availability === 'busy'}
          style={{
            background: '#c62828',
            color: 'white',
            fontWeight: 'bold',
            opacity: driver.availability === 'busy' ? 0.5 : 1
          }}
        >
          🔴 I'm Busy
        </button>

        <button
          onClick={() => setAvailability('offline')}
          disabled={driver.availability === 'offline'}
          style={{
            background: '#616161',
            color: 'white',
            fontWeight: 'bold',
            opacity: driver.availability === 'offline' ? 0.5 : 1
          }}
        >
          ⚪ Go Offline
        </button>
      </Section>

      {message && <p className="message">{message}</p>}

      <button onClick={logout} style={{ marginBottom: 20 }}>Log Out</button>

      <h2 style={{ marginTop: 24, color: '#c62828' }}>
        🔔 New Jobs Waiting ({pendingJobs.length})
      </h2>

      {pendingJobs.length === 0 ? (
        <p style={{ color: '#666' }}>No new jobs. They'll appear here automatically.</p>
      ) : (
        pendingJobs.map((b) => (
          <Section key={b._id} title={'📦 Job ' + (b.bookingCode || b._id.slice(-6))}>
            <p><strong>Customer:</strong> {b.customerName} — {b.customerPhone}</p>
            <p><strong>Pickup:</strong> {b.pickupLocation}</p>
            <p><strong>Destination:</strong> {b.destination}</p>
            <p><strong>Truck:</strong> {b.selectedTruck}</p>
            <p><strong>Cargo:</strong> {b.cargoDescription}</p>
            <p style={{ fontSize: 18, color: '#ff6b35' }}>
              <strong>Customer Offers: UGX {b.offeredPrice}</strong>
            </p>
            <JobMap booking={b} />
            <div style={{ marginTop: 12 }}>
              <button onClick={() => acceptJob(b._id)}>✅ Accept Job</button>
              <button onClick={() => counterOffer(b._id)}>💰 Counter-Offer</button>
              <button onClick={() => rejectJob(b._id)}>❌ Reject Job</button>
            </div>

            <p style={{ marginTop: 12 }}>
              <a href={'tel:' + b.customerPhone}
                style={{
                  display: 'inline-block', background: '#ff6b35', color: 'white',
                  padding: '8px 16px', borderRadius: 8, textDecoration: 'none',
                  fontWeight: 'bold', marginRight: 8
                }}>
                <i className="fa-solid fa-phone"></i> Call Customer
              </a>
              <a
                href={jobWhatsAppLink(b)}
                target="_blank" rel="noreferrer"
                style={{
                  display: 'inline-block', background: '#25D366', color: 'white',
                  padding: '8px 16px', borderRadius: 8, textDecoration: 'none',
                  fontWeight: 'bold'
                }}>
                <i className="fa-brands fa-whatsapp"></i> WhatsApp
              </a>
            </p>
          </Section>
        ))
      )}

      <h2 style={{ marginTop: 32, color: '#2e7d32' }}>
        🚚 My Active Jobs ({activeJobs.length})
      </h2>

      {activeJobs.length === 0 ? (
        <p style={{ color: '#666' }}>You have no active jobs. Accepted jobs will show here.</p>
      ) : (
        activeJobs.map((b) => (
          <Section key={b._id} title={'✅ Job ' + (b.bookingCode || b._id.slice(-6))}>
            <p><strong>Customer:</strong> {b.customerName} — {b.customerPhone}</p>
            <p><strong>Pickup:</strong> {b.pickupLocation}</p>
            <p><strong>Destination:</strong> {b.destination}</p>
            <p><strong>Cargo:</strong> {b.cargoDescription}</p>
            <p style={{ fontSize: 18, color: '#2e7d32' }}>
              <strong>Agreed Price: UGX {b.agreedPrice || b.offeredPrice}</strong>
            </p>
            <p>
              <strong>Payment:</strong>{' '}
              {b.paymentMethod ? (
                <>
                  {b.paymentMethod}
                  {b.paymentPhone && ' — ' + b.paymentPhone}
                  {' — '}
                  <span style={{
                    color: b.paymentStatus === 'paid' ? 'green' : 'orange',
                    fontWeight: 'bold'
                  }}>
                    {b.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Unpaid'}
                  </span>
                </>
              ) : (
                <span style={{ color: '#666' }}>Customer hasn't chosen yet</span>
              )}
            </p>
            <p>
              <a href={'tel:' + b.customerPhone}
                style={{
                  display: 'inline-block', background: '#ff6b35', color: 'white',
                  padding: '8px 16px', borderRadius: 8, textDecoration: 'none',
                  fontWeight: 'bold', marginRight: 8
                }}>
                <i className="fa-solid fa-phone"></i> Call Customer
              </a>
              <a
                href={jobWhatsAppLink(b)}
                target="_blank" rel="noreferrer"
                style={{
                  display: 'inline-block', background: '#25D366', color: 'white',
                  padding: '8px 16px', borderRadius: 8, textDecoration: 'none',
                  fontWeight: 'bold'
                }}>
                <i className="fa-brands fa-whatsapp"></i> WhatsApp
              </a>
            </p>
            <JobMap booking={b} />
          </Section>
        ))
      )}

      {historyJobs.length > 0 && (
        <>
          <h2 style={{ marginTop: 32, color: '#666' }}>
            📜 History ({historyJobs.length})
          </h2>
          {historyJobs.map((b) => (
            <Section key={b._id} title={'Job ' + (b.bookingCode || b._id.slice(-6))}>
              <p><strong>Customer:</strong> {b.customerName}</p>
              <p><strong>Route:</strong> {b.pickupLocation} → {b.destination}</p>
              <p><strong>Status:</strong> {b.status}</p>
              {b.agreedPrice && <p><strong>Agreed:</strong> UGX {b.agreedPrice}</p>}
            </Section>
          ))}
        </>
      )}
    </div>
  );
}