import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

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

export default function DriverPage() {
  const [view, setView] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regForm, setRegForm] = useState({
    name: '', email: '', phone: '', password: '',
    truckType: 'Small Moving Truck'
  });
  const [driver, setDriver] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [message, setMessage] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setMessage('Logging in...');
    try {
      const res = await fetch('http://localhost:3000/api/drivers/login', {
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
      const res = await fetch('http://localhost:3000/api/drivers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm)
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('✅ Driver registered! You can now log in.');
        setRegForm({ name: '', email: '', phone: '', password: '', truckType: 'Small Moving Truck' });
        setView('login');
      } else setMessage('❌ ' + (data.message || 'Registration failed'));
    } catch (err) { setMessage('❌ ' + err.message); }
  }

  async function loadJobs(driverId) {
    try {
      const res = await fetch('http://localhost:3000/api/bookings');
      const data = await res.json();
      const mine = (data.bookings || []).filter((b) => String(b.driverId) === String(driverId));
      setJobs(mine);
    } catch (err) { console.error(err); }
  }

  async function setAvailability(newStatus) {
    if (!driver) return;
    try {
      const res = await fetch('http://localhost:3000/api/drivers/' + driver._id + '/availability', {
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
      const res = await fetch('http://localhost:3000/api/bookings/' + id + '/accept-driver', { method: 'POST' });
      const data = await res.json();
      alert(res.ok ? '✅ Job accepted!' : 'Error: ' + (data.message || 'Could not accept'));
      loadJobs(driver._id);
    } catch (err) { alert('❌ ' + err.message); }
  }

  async function counterOffer(id) {
    const newPrice = window.prompt('Enter your counter-offer price (UGX):');
    if (!newPrice) return;
    try {
      const res = await fetch('http://localhost:3000/api/bookings/' + id + '/counter-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPrice: Number(newPrice) })
      });
      const data = await res.json();
      alert(res.ok ? '✅ Counter-offer sent' : 'Error: ' + (data.message || 'Failed'));
      loadJobs(driver._id);
    } catch (err) { alert('❌ ' + err.message); }
  }

  async function rejectJob(id) {
    if (!window.confirm('Reject this job? The system will try another driver.')) return;
    try {
      const res = await fetch('http://localhost:3000/api/bookings/' + id + '/reject-driver', { method: 'POST' });
      const data = await res.json();
      alert(res.ok ? (data.message || 'Sent to next driver') : 'Error: ' + (data.message || 'Failed'));
      loadJobs(driver._id);
    } catch (err) { alert('❌ ' + err.message); }
  }

  function logout() {
    setDriver(null); setJobs([]); setEmail(''); setPassword(''); setMessage('');
  }

  // ==================== NOT LOGGED IN ====================
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

  // ==================== LOGGED IN ====================
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
        <button onClick={() => setAvailability('available')} disabled={driver.availability === 'available'}>
          🟢 I'm Available
        </button>
        <button onClick={() => setAvailability('busy')} disabled={driver.availability === 'busy'}>
          🔴 I'm Busy
        </button>
        <button onClick={() => setAvailability('offline')} disabled={driver.availability === 'offline'}>
          ⚪ Go Offline
        </button>
      </Section>

      <button onClick={logout}>Log Out</button>

      <h2 style={{ marginTop: 24 }}>My Assigned Jobs ({jobs.length})</h2>

      {jobs.length === 0 ? (
        <p>No jobs assigned to you yet.</p>
      ) : (
        jobs.map((b) => (
          <Section key={b._id} title={'📦 Job ' + (b.bookingCode || b._id.slice(-6))}>
            <p><strong>Customer:</strong> {b.customerName}</p>
            <p><strong>Phone:</strong> {b.customerPhone}</p>
            <p><strong>Pickup:</strong> {b.pickupLocation}</p>
            <p><strong>Destination:</strong> {b.destination}</p>
            <p><strong>Truck:</strong> {b.selectedTruck}</p>
            <p><strong>Cargo:</strong> {b.cargoDescription}</p>
            <p><strong>Customer Offers:</strong> UGX {b.offeredPrice}</p>
            {b.driverCounterPrice && (
              <p><strong>Your counter-offer:</strong> UGX {b.driverCounterPrice}</p>
            )}
            {b.agreedPrice && (
              <p><strong>✅ Agreed price:</strong> UGX {b.agreedPrice}</p>
            )}
            <p><strong>Status:</strong> {b.status}</p>

            {/* =============== MAP WITH PICKUP & DESTINATION =============== */}
            {(b.pickupCoords || b.destinationCoords) && (
              <div style={{ height: 280, borderRadius: 8, overflow: 'hidden', marginTop: 12 }}>
                <MapContainer
                  center={[
                    (b.pickupCoords?.lat || b.destinationCoords?.lat) || 0.3476,
                    (b.pickupCoords?.lng || b.destinationCoords?.lng) || 32.5825
                  ]}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap Humanitarian'
                    url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
                  />
                  <FitBounds pickup={b.pickupCoords} destination={b.destinationCoords} />

                  {b.pickupCoords && (
                    <Marker position={b.pickupCoords} icon={pickupIcon}>
                      <Popup>📦 Pickup<br />{b.pickupLocation}</Popup>
                    </Marker>
                  )}
                  {b.destinationCoords && (
                    <Marker position={b.destinationCoords} icon={destinationIcon}>
                      <Popup>🎯 Destination<br />{b.destination}</Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
            )}

            {b.status !== 'Confirmed' && (
              <>
                <button onClick={() => acceptJob(b._id)}>✅ Accept Job</button>
                <button onClick={() => counterOffer(b._id)}>💬 Counter-Offer</button>
                <button onClick={() => rejectJob(b._id)}>❌ Reject Job</button>
              </>
            )}
          </Section>
        ))
      )}
    </div>
  );
}