import { useState, useEffect } from 'react';

const API = 'https://truckhiring-backend.onrender.com/api';

export default function AdminPage() {
  const [key, setKey] = useState(localStorage.getItem('adminKey') || '');
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState('bookings');
  const [drivers, setDrivers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [message, setMessage] = useState('');

  function headers() {
    return { 'Content-Type': 'application/json', 'x-admin-key': key };
  }

  async function login(e) {
    e.preventDefault();
    setMessage('Checking...');
    try {
      const res = await fetch(`${API}/admin/drivers`, { headers: headers() });
      if (res.ok) {
        localStorage.setItem('adminKey', key);
        setAuthed(true);
        setMessage('Logged in');
      } else {
        setMessage('Wrong admin key');
      }
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function loadAll() {
    try {
      const [d, b, c] = await Promise.all([
        fetch(`${API}/admin/drivers`, { headers: headers() }).then(r => r.json()),
        fetch(`${API}/admin/bookings`, { headers: headers() }).then(r => r.json()),
        fetch(`${API}/admin/complaints`, { headers: headers() }).then(r => r.json())
      ]);
      setDrivers(d.drivers || []);
      setBookings(b.bookings || []);
      setComplaints(c.complaints || []);
    } catch (err) {
      setMessage(err.message);
    }
  }

  useEffect(() => { if (authed) loadAll(); }, [authed]);

  async function deleteDriver(id) {
    if (!window.confirm('Delete this driver permanently?')) return;
    await fetch(`${API}/admin/drivers/${id}`, { method: 'DELETE', headers: headers() });
    loadAll();
  }

  async function suspendDriver(id) {
    if (!window.confirm('Suspend this driver?')) return;
    await fetch(`${API}/admin/drivers/${id}/suspend`, { method: 'PATCH', headers: headers() });
    loadAll();
  }

  async function setPayment(id, status) {
    await fetch(`${API}/admin/bookings/${id}/payment`, {
      method: 'PATCH', headers: headers(),
      body: JSON.stringify({ paymentStatus: status })
    });
    loadAll();
  }

  async function resolveComplaint(id) {
    const note = window.prompt('Admin note:') || '';
    await fetch(`${API}/admin/complaints/${id}`, {
      method: 'PATCH', headers: headers(),
      body: JSON.stringify({ status: 'Resolved', adminNote: note })
    });
    loadAll();
  }

  function fmt(n) {
    return 'UGX ' + Number(n || 0).toLocaleString();
  }

  const totalPaid = bookings
    .filter(b => b.paymentStatus === 'paid')
    .reduce((sum, b) => sum + (b.agreedPrice || b.offeredPrice || 0), 0);

  const totalPending = bookings
    .filter(b => !b.paymentStatus || b.paymentStatus === 'unpaid')
    .reduce((sum, b) => sum + (b.agreedPrice || b.offeredPrice || 0), 0);

  const totalRefunded = bookings
    .filter(b => b.paymentStatus === 'refunded')
    .reduce((sum, b) => sum + (b.agreedPrice || b.offeredPrice || 0), 0);

  if (!authed) {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', padding: 20, fontFamily: 'Arial' }}>
        <h1>🔐 Admin Login</h1>
        <form onSubmit={login} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="password"
            placeholder="Admin key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            style={{ padding: 10, fontSize: 16 }}
          />
          <button type="submit" style={{ padding: 10, fontSize: 16 }}>Log In</button>
        </form>
        {message && <p>{message}</p>}
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: 'Arial' }}>
      <h1>🛠️ Admin Dashboard</h1>

      {/* Money Summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ background: '#e8f5e9', border: '2px solid #4caf50', padding: 16, borderRadius: 10, minWidth: 200 }}>
          <div style={{ fontSize: 13, color: '#2e7d32' }}>💰 Money Collected</div>
          <div style={{ fontSize: 22, fontWeight: 'bold', color: '#1b5e20', marginTop: 6 }}>{fmt(totalPaid)}</div>
        </div>
        <div style={{ background: '#fff8e1', border: '2px solid #ff9800', padding: 16, borderRadius: 10, minWidth: 200 }}>
          <div style={{ fontSize: 13, color: '#e65100' }}>⏳ Pending</div>
          <div style={{ fontSize: 22, fontWeight: 'bold', color: '#bf360c', marginTop: 6 }}>{fmt(totalPending)}</div>
        </div>
        <div style={{ background: '#ffebee', border: '2px solid #f44336', padding: 16, borderRadius: 10, minWidth: 200 }}>
          <div style={{ fontSize: 13, color: '#c62828' }}>↩️ Refunded</div>
          <div style={{ fontSize: 22, fontWeight: 'bold', color: '#b71c1c', marginTop: 6 }}>{fmt(totalRefunded)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => setTab('drivers')}>Drivers ({drivers.length})</button>
        <button onClick={() => setTab('bookings')}>Bookings ({bookings.length})</button>
        <button onClick={() => setTab('complaints')}>Complaints ({complaints.length})</button>
        <button onClick={loadAll}>🔄 Refresh</button>
        <button onClick={() => { localStorage.removeItem('adminKey'); setAuthed(false); }}>Log Out</button>
      </div>

      {message && <p>{message}</p>}

      {/* Drivers */}
      {tab === 'drivers' && (
        <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#1a0d2e', color: 'white' }}>
            <tr>
              <th>Name</th><th>Email</th><th>Phone</th><th>Truck</th>
              <th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map(d => (
              <tr key={d._id}>
                <td>{d.name}</td>
                <td>{d.email || '-'}</td>
                <td>{d.phone}</td>
                <td>{d.truckType}</td>
                <td>{d.availability}</td>
                <td>
                  <button onClick={() => suspendDriver(d._id)}>Suspend</button>
                  <button onClick={() => deleteDriver(d._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Bookings with payment info */}
      {tab === 'bookings' && (
        <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#1a0d2e', color: 'white' }}>
            <tr>
              <th>Customer</th>
              <th>Driver</th>
              <th>Amount</th>
              <th>Payment Method</th>
              <th>Payment Phone</th>
              <th>Status</th>
              <th>Paid On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: 20 }}>No bookings yet.</td></tr>
            ) : bookings.map(b => (
              <tr key={b._id}>
                <td>
                  <strong>{b.customerName}</strong>
                  <br /><small>{b.customerPhone}</small>
                </td>
                <td>{b.driverName || '-'}</td>
                <td>{fmt(b.agreedPrice || b.offeredPrice)}</td>
                <td>{b.paymentMethod || '-'}</td>
                <td>{b.paymentPhone || '-'}</td>
                <td style={{
                  color: b.paymentStatus === 'paid' ? 'green'
                       : b.paymentStatus === 'refunded' ? 'orange'
                       : 'red',
                  fontWeight: 'bold'
                }}>
                  {b.paymentStatus || 'unpaid'}
                </td>
                <td>{b.paidAt ? new Date(b.paidAt).toLocaleString() : '-'}</td>
                <td>
                  <button onClick={() => setPayment(b._id, 'paid')}>Mark Paid</button>
                  <button onClick={() => setPayment(b._id, 'refunded')}>Refund</button>
                  <button onClick={() => setPayment(b._id, 'unpaid')}>Unpaid</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Complaints */}
      {tab === 'complaints' && (
        <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#1a0d2e', color: 'white' }}>
            <tr>
              <th>Customer</th><th>Subject</th><th>Message</th>
              <th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {complaints.map(c => (
              <tr key={c._id}>
                <td>
                  <strong>{c.customerName}</strong>
                  <br /><small>{c.customerPhone}</small>
                </td>
                <td>{c.subject}</td>
                <td>{c.message}</td>
                <td>{c.status}</td>
                <td>
                  {c.status !== 'Resolved' && (
                    <button onClick={() => resolveComplaint(c._id)}>Resolve</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}