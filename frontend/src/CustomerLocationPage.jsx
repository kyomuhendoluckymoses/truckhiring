import { useState, useEffect } from 'react';
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
const myLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

function FitBounds({ pickup, destination }) {
  const map = useMap();
  useEffect(() => {
    if (pickup && destination) {
      map.fitBounds(L.latLngBounds([pickup.lat, pickup.lng], [destination.lat, destination.lng]), { padding: [50, 50] });
    } else if (pickup) map.setView([pickup.lat, pickup.lng], 13);
    else if (destination) map.setView([destination.lat, destination.lng], 13);
  }, [pickup, destination, map]);
  return null;
}

async function geocodePlace(text) {
  const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ug&q=' +
    encodeURIComponent(text);
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  const data = await res.json();
  if (!data || data.length === 0) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

export default function CustomerLocationPage() {
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    selectedTruck: 'Small Moving Truck',
    offeredPrice: '',
    pickupLocation: '',
    destination: '',
    pickupDate: '',
    cargoDescription: ''
  });

  const [pickupCoords, setPickupCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [myLocation, setMyLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);

  const [booking, setBooking] = useState(null);
  const [driver, setDriver] = useState(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Payment section state
  const [paymentMethod, setPaymentMethod] = useState('MTN Mobile Money');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentSaved, setPaymentSaved] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function refreshBooking() {
    if (!booking?._id) return;
    try {
      const res = await fetch('http://localhost:3000/api/bookings');
      const data = await res.json();
      const fresh = (data.bookings || []).find((b) => b._id === booking._id);
      if (fresh) {
        setBooking(fresh);

        if (fresh.driverId && !driver) {
          const dRes = await fetch('http://localhost:3000/api/drivers');
          const dData = await dRes.json();
          const d = (dData.drivers || []).find(
            (x) => String(x._id) === String(fresh.driverId)
          );
          if (d) setDriver(d);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    if (!booking?._id) return;
    const interval = setInterval(refreshBooking, 3000);
    return () => clearInterval(interval);
  }, [booking?._id, driver]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      if (!form.customerName || !form.customerPhone || !form.customerEmail ||
          !form.pickupLocation || !form.destination || !form.pickupDate ||
          !form.cargoDescription || !form.offeredPrice) {
        setMessage('⚠️ Please fill all fields.');
        return;
      }

      setMessage('Creating booking...');
      setBooking(null);
      setDriver(null);
      setPaymentSaved(false);

      let pickup = null;
      let dest = null;

      try {
        if (navigator.geolocation) {
          pickup = await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              () => resolve(null),
              { enableHighAccuracy: true, timeout: 5000 }
            );
          });
        }
      } catch (e) {}

      setMyLocation(pickup);

      if (!pickup) {
        try { pickup = await geocodePlace(form.pickupLocation); } catch (e) {}
      }
      try { dest = await geocodePlace(form.destination); } catch (e) {}

      setPickupCoords(pickup);
      setDestinationCoords(dest);

      const payload = { ...form, pickupCoords: pickup, destinationCoords: dest };

      const res = await fetch('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage('❌ ' + (data.message || 'Error creating booking'));
        return;
      }

      const created = data.booking;
      setBooking(created);
      setMessage('Booking created. Finding a driver...');

      const assignRes = await fetch(
        'http://localhost:3000/api/bookings/' + created._id + '/assign-driver',
        { method: 'POST' }
      );
      const assignData = await assignRes.json();

      if (assignRes.ok) {
        setDriver(assignData.driver);
        setMessage('✅ Driver found! Waiting for them to accept...');
      } else {
        setMessage('⚠️ ' + (assignData.message || 'No driver available'));
      }
    } catch (err) {
      setMessage('❌ ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitPayment(e) {
    e.preventDefault();
    if (!booking?._id) return;

    if (paymentMethod !== 'Cash on pickup' && !paymentPhone.trim()) {
      alert('Please enter your mobile money number');
      return;
    }

    try {
      const res = await fetch(
        'http://localhost:3000/api/bookings/' + booking._id + '/choose-payment',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentMethod, paymentPhone: paymentPhone.trim() })
        }
      );
      const data = await res.json();

      if (res.ok) {
        setBooking(data.booking);
        setPaymentSaved(true);
      } else {
        alert(data.message || 'Could not save payment');
      }
    } catch (err) {
      alert(err.message);
    }
  }

  // Payment section shown only when driver has accepted
  const showPaymentSection =
    booking && booking.status === 'Confirmed' && !booking.paymentMethod;

  // Show payment summary when payment is saved
  const showPaymentSummary =
    booking && booking.paymentMethod;

  return (
    <div className="lm-app">

      <header className="lm-nav">
        <div className="lm-logo">🚚 LUCKY MOVERS</div>
        <nav className="lm-nav-links">
          <a href="/"><i className="fa-solid fa-house"></i> Home</a>
          <a href="/book" className="lm-nav-cta"><i className="fa-solid fa-truck"></i> Book Now</a>
          <a href="/complaint"><i className="fa-solid fa-triangle-exclamation"></i> Complaint</a>
          <a href="#contact"><i className="fa-solid fa-phone"></i> Contact</a>
        </nav>
      </header>

      <div className="lm-book-page">
        <h1>📝 Book a Truck</h1>
        <p>Fill the form below and we'll match you with a driver.</p>

        <div className="lm-card">
          <form onSubmit={handleSubmit} className="lm-form">

            <div className="lm-field">
              <i className="fa-solid fa-user lm-field-icon"></i>
              <input name="customerName" placeholder="Your Name"
                value={form.customerName} onChange={handleChange} required />
            </div>

            <div className="lm-field">
              <i className="fa-solid fa-phone lm-field-icon"></i>
              <input name="customerPhone" placeholder="Phone (07...)"
                value={form.customerPhone} onChange={handleChange} required />
            </div>

            <div className="lm-field">
              <i className="fa-solid fa-envelope lm-field-icon"></i>
              <input name="customerEmail" type="email" placeholder="Email (for driver updates)"
                value={form.customerEmail} onChange={handleChange} required />
            </div>

            <div className="lm-field">
              <i className="fa-solid fa-location-dot lm-field-icon"></i>
              <input name="pickupLocation" placeholder="Pickup — e.g. Kampala, Uganda"
                value={form.pickupLocation} onChange={handleChange} required />
            </div>

            <div className="lm-field">
              <i className="fa-solid fa-flag-checkered lm-field-icon"></i>
              <input name="destination" placeholder="Destination — e.g. Jinja, Uganda"
                value={form.destination} onChange={handleChange} required />
            </div>

            <div className="lm-field">
              <i className="fa-solid fa-calendar lm-field-icon"></i>
              <input name="pickupDate" type="date"
                value={form.pickupDate} onChange={handleChange} required />
            </div>

            <div className="lm-field">
              <i className="fa-solid fa-truck lm-field-icon"></i>
              <select name="selectedTruck" value={form.selectedTruck} onChange={handleChange}>
                <option>Pickup</option>
                <option>Small Moving Truck</option>
                <option>Medium Moving Truck</option>
                <option>Large Moving Truck</option>
              </select>
            </div>

            <div className="lm-field lm-field-textarea">
              <i className="fa-solid fa-box lm-field-icon"></i>
              <textarea name="cargoDescription" placeholder="What are you transporting?"
                value={form.cargoDescription} onChange={handleChange} required />
            </div>

            <div className="lm-field">
              <i className="fa-solid fa-money-bill-wave lm-field-icon"></i>
              <input name="offeredPrice" type="number" placeholder="Your Offered Price (UGX)"
                value={form.offeredPrice} onChange={handleChange} required />
            </div>

            <button type="submit" className="lm-btn-primary" disabled={submitting}>
              <i className="fa-solid fa-truck-fast"></i>{' '}
              {submitting ? 'Please wait…' : 'Request a Truck'}
            </button>
          </form>

          <button type="button" className="lm-btn-ghost"
            onClick={() => setShowMap(!showMap)}>
            <i className="fa-solid fa-map"></i>{' '}
            {showMap ? 'Hide map' : 'Show map (optional)'}
          </button>
        </div>

        {showMap && (
          <section className="lm-map-section">
            <h3>🗺️ Preview on map</h3>
            <p className="lm-hint">
              Optional — ignore this if you don't need it. Drag a pin if it's wrong.
            </p>
            <div className="lm-map-wrap">
              <MapContainer center={[0.3476, 32.5825]} zoom={12} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; OpenStreetMap Humanitarian'
                  url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
                />
                <FitBounds pickup={pickupCoords} destination={destinationCoords} />
                {myLocation && (
                  <Marker position={myLocation} icon={myLocationIcon}>
                    <Popup>🔵 You are here</Popup>
                  </Marker>
                )}
                {pickupCoords && (
                  <Marker position={pickupCoords} icon={pickupIcon} draggable={true}
                    eventHandlers={{
                      dragend: (e) => {
                        const ll = e.target.getLatLng();
                        setPickupCoords({ lat: ll.lat, lng: ll.lng });
                      }
                    }}>
                    <Popup>📦 Pickup</Popup>
                  </Marker>
                )}
                {destinationCoords && (
                  <Marker position={destinationCoords} icon={destinationIcon} draggable={true}
                    eventHandlers={{
                      dragend: (e) => {
                        const ll = e.target.getLatLng();
                        setDestinationCoords({ lat: ll.lat, lng: ll.lng });
                      }
                    }}>
                    <Popup>🎯 Destination</Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          </section>
        )}

        {message && <div className="lm-message">{message}</div>}

        {booking && (
          <section className="lm-result">
            <h3>✅ Your Booking</h3>
            <p><strong>Code:</strong> {booking.bookingCode || booking._id.slice(-6)}</p>
            <p><strong>Status:</strong> {booking.status}</p>
            <p><strong>Pickup:</strong> {booking.pickupLocation}</p>
            <p><strong>Destination:</strong> {booking.destination}</p>
            <p><strong>Truck:</strong> {booking.selectedTruck}</p>
            <p><strong>Offered:</strong> UGX {booking.offeredPrice}</p>
          </section>
        )}

        {driver && (
          <section className="lm-result lm-driver-result">
            <h3>👨‍✈️ Your Driver</h3>
            <p><strong>Name:</strong> {driver.name}</p>
            <p><strong>Phone:</strong> {driver.phone}</p>
            <p><strong>Truck:</strong> {driver.truckType}</p>
            <div className="lm-contact">
              <a href={'tel:' + driver.phone} className="lm-btn-primary">📞 Call</a>
              <a
                href={
                  'https://wa.me/256' + driver.phone.replace(/^0/, '') +
                  '?text=' +
                  encodeURIComponent(
                    'Hello ' + driver.name + ', this is ' + form.customerName +
                    '. I have a booking on Lucky Movers.\n\n' +
                    'Pickup: ' + form.pickupLocation + '\n' +
                    'Destination: ' + form.destination + '\n' +
                    'Cargo: ' + form.cargoDescription + '\n' +
                    'Offered price: UGX ' + form.offeredPrice + '\n\n' +
                    'When can you come?'
                  )
                }
                target="_blank"
                rel="noreferrer"
                className="lm-btn-whatsapp"
              >
                💬 WhatsApp
              </a>
            </div>
          </section>
        )}

        {/* PAYMENT SECTION — appears only after driver accepts */}
        {showPaymentSection && (
          <section className="lm-result" style={{ borderLeft: '6px solid #ff6b35' }}>
            <h3>💳 Pay for Your Move</h3>
            <p style={{ fontSize: 18 }}>
              <strong>Amount to pay:</strong> UGX {(booking.agreedPrice || booking.offeredPrice).toLocaleString()}
            </p>
            <p style={{ color: '#666', marginBottom: 16 }}>
              Choose how you want to pay:
            </p>

            <form onSubmit={submitPayment}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="radio"
                    name="pm"
                    value="MTN Mobile Money"
                    checked={paymentMethod === 'MTN Mobile Money'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  📱 MTN Mobile Money
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="radio"
                    name="pm"
                    value="Airtel Money"
                    checked={paymentMethod === 'Airtel Money'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  📱 Airtel Money
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="radio"
                    name="pm"
                    value="Cash on pickup"
                    checked={paymentMethod === 'Cash on pickup'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  💵 Cash on pickup
                </label>
              </div>

              {paymentMethod !== 'Cash on pickup' && (
                <input
                  type="tel"
                  placeholder="Mobile Money number (e.g. 0700123456)"
                  value={paymentPhone}
                  onChange={(e) => setPaymentPhone(e.target.value)}
                  style={{ padding: 12, fontSize: 16, border: '1px solid #ddd', borderRadius: 8, width: '100%', marginBottom: 16 }}
                />
              )}

              <button type="submit" className="lm-btn-primary">
                Confirm Payment Method
              </button>
            </form>
          </section>
        )}

        {/* PAYMENT SUMMARY — appears once payment is saved */}
        {showPaymentSummary && (
          <section className="lm-result" style={{ borderLeft: '6px solid #4caf50' }}>
            <h3>💳 Payment</h3>
            <p><strong>Amount:</strong> UGX {(booking.agreedPrice || booking.offeredPrice).toLocaleString()}</p>
            <p><strong>Method:</strong> {booking.paymentMethod}</p>
            {booking.paymentPhone && (
              <p><strong>Phone:</strong> {booking.paymentPhone}</p>
            )}
            <p>
              <strong>Status:</strong>{' '}
              <span style={{
                color: booking.paymentStatus === 'paid' ? 'green' : 'red',
                fontWeight: 'bold'
              }}>
                {booking.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Waiting for payment'}
              </span>
            </p>
            {booking.paymentStatus !== 'paid' && (
              <p style={{ fontSize: 13, color: '#666' }}>
                {booking.paymentMethod === 'Cash on pickup'
                  ? 'Pay the driver in cash when they arrive.'
                  : 'You will receive a prompt on your phone. Or contact support.'}
              </p>
            )}
          </section>
        )}
      </div>

      <footer className="lm-footer">
        <div>
          <h4>🚚 Lucky Movers</h4>
          <p>Uganda's trusted moving service. We move anything, anywhere.</p>
        </div>
        <div>
          <h4>Quick Links</h4>
          <p><a href="/"><i className="fa-solid fa-house"></i> Home</a></p>
          <p><a href="/book"><i className="fa-solid fa-truck"></i> Book a Truck</a></p>
          <p><a href="/complaint"><i className="fa-solid fa-triangle-exclamation"></i> Complaint</a></p>
        </div>
        <div>
          <h4>Contact</h4>
          <p><i className="fa-solid fa-phone"></i> +256 700 000 000</p>
          <p><i className="fa-brands fa-whatsapp"></i> WhatsApp available</p>
          <p><i className="fa-solid fa-location-dot"></i> Kampala, Uganda</p>
        </div>
        <div className="lm-footer-bottom">
          © 2026 Lucky Movers. All rights reserved.
        </div>
      </footer>
    </div>
  );
}