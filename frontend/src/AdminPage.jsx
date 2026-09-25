import { useState, useEffect } from 'react';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api';

const inputStyle = {
  padding: '10px 12px',
  fontSize: 14,
  border: '1px solid #ccc',
  borderRadius: 6,
  width: '100%',
  boxSizing: 'border-box'
};

export default function AdminPage() {
  const [key, setKey] = useState(localStorage.getItem('adminKey') || '');
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState('drivers');
  const [drivers, setDrivers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [message, setMessage] = useState('');
  const [newDriver, setNewDriver] = useState({
    name: '', email: '', phone: '', password: '', truckType: 'Small Moving Truck'
  });
  const [formMessage, setFormMessage] = useState('');

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

  // ─── ADD DRIVER ───
  async function registerDriver() {
    setFormMessage('');
    if (!newDriver.name || !newDriver.email || !newDriver.phone ||
        !newDriver.password || !newDriver.truckType) {
      setFormMessage('❌ Fill all fields');
      return;
    }
    try {
      const res = await fetch(`${API}/admin/drivers`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(newDriver)
      });
      const data = await res.json();
      if (res.ok) {
        setFormMessage('✅ Driver registered: ' + data.driver.name);
        setNewDriver({
          name: '', email: '', phone: '', password: '', truckType: 'Small Moving Truck'
        });
        loadAll();
      } else {
        setFormMessage('❌ ' + (data.message || 'Failed'));
      }
    } catch (err) {
      setFormMessage('❌ ' + err.message);
    }
  }

  // ─── SUSPEND ───
  async function suspendDriver(id) {
    if (!window.confirm('Suspend this driver? They cannot receive new jobs.')) return;
    await fetch(`${API}/admin/drivers/${id}/suspend`, { method: 'PATCH', headers: headers() });
    loadAll();
  }

  // ─── UNSUSPEND ───
  async function unsuspendDriver(id) {
    if (!window.confirm('Reactivate this driver?')) return;
    await fetch(`${API}/admin/drivers/${id}/unsuspend`, { method: 'PATCH', headers: headers() });
    loadAll();
  }

  // ─── DELETE (with active-jobs warning) ───
  async function deleteDriver(id, name) {
    const typed = window.prompt(
      'Type the driver\'s name to confirm permanent deletion:\n\n' +
      'Name: ' + name
    );
    if (typed !== name) {
      alert('Name did not match. Deletion cancelled.');
      return;
    }

    try {
      const res = await fetch(`${API}/admin/drivers/${id}`, {
        method: 'DELETE',
        headers: headers()
      });

      if (res.status === 409) {
        const data = await res.json();
        const force = window.confirm(
          '⚠️ ' + data.message + '\n\nDelete anyway? Active jobs will be orphaned.'
        );
        if (!force) return;
        await fetch(`${API}/admin/drivers/${id}?force=true`, {
          method: 'DELETE',
          headers: headers()
        });
      }

      loadAll();
    } catch (err) {
      alert('Error: ' + err.message);
    }
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

      {/* Money summary */}
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

      {/* DRIVERS TAB */}
      {tab === 'drivers' && (
        <>
          <div style={{
            background: '#f5f5f7', padding: 20, borderRadius: 12, marginBottom: 20
          }}>
            <h3 style={{ marginTop: 0 }}>➕ Register a New Driver</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input placeholder="Full Name" value={newDriver.name}
                onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                style={inputStyle} />
              <input placeholder="Email" type="email" value={newDriver.email}
                onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                style={inputStyle} />
              <input placeholder="Phone (e.g. 0742502188)" value={newDriver.phone}
                onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                style={inputStyle} />
              <input placeholder="Password" type="text" value={newDriver.password}
                onChange={(e) => setNewDriver({ ...newDriver, password: e.target.value })}
                style={inputStyle} />
              <select value={newDriver.truckType}
                onChange={(e) => setNewDriver({ ...newDriver, truckType: e.target.value })}
                style={inputStyle}>
                <option>Pickup</option>
                <option>Small Moving Truck</option>
                <option>Medium Moving Truck</option>
                <option>Large Moving Truck</option>
              </select>
              <button onClick={registerDriver}
                style={{
                  background: '#2e7d32', color: 'white', border: 'none',
                  padding: '12px 20px', borderRadius: 8, fontWeight: 'bold',
                  cursor: 'pointer', fontSize: 15
                }}>
                Register Driver
              </button>
            </div>
            {formMessage && <p style={{ marginTop: 12, fontWeight: 'bold' }}>{formMessage}</p>}
          </div>

          <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#1a0d2e', color: 'white' }}>
              <tr>
                <th>Name</th><th>Email</th><th>Phone</th><th>Truck</th>
                <th>Status</th><th>Joined</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map(d => (
                <tr key={d._id}>
                  <td>{d.name}</td>
                  <td>{d.email || '—'}</td>
                  <td>{d.phone}</td>
                  <td>{d.truckType}</td>
                  <td style={{
                    color: d.availability === 'available' ? 'green' :
                           d.availability === 'suspended' ? 'red' :
                           d.availability === 'busy' ? 'darkorange' : '#666',
                    fontWeight: 'bold'
                  }}>
                    {d.availability}
                  </td>
                  <td>{new Date(d.createdAt).toLocaleDateString()}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {d.availability !== 'suspended' ? (
                      <button onClick={() => suspendDriver(d._id)}
                        style={{ background: '#ff9800', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', marginRight: 6 }}>
                        Suspend
                      </button>
                    ) : (
                      <button onClick={() => unsuspendDriver(d._id)}
                        style={{ background: '#2e7d32', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', marginRight: 6 }}>
                        Reactivate
                      </button>
                    )}
                    <button onClick={() => deleteDriver(d._id, d.name)}
                      style={{ background: 'crimson', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* BOOKINGS TAB */}
      {tab === 'bookings' && (
        <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#1a0d2e', color: 'white' }}>
            <tr>
              <th>Customer</th><th>Driver</th><th>Amount</th>
              <th>Payment Method</th><th>Payment Phone</th>
              <th>Status</th><th>Paid On</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: 20 }}>No bookings yet.</td></tr>
            ) : bookings.map(b => (
              <tr key={b._id}>
                <td><strong>{b.customerName}</strong><br /><small>{b.customerPhone}</small></td>
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

      {/* COMPLAINTS TAB */}
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
                <td><strong>{c.customerName}</strong><br /><small>{c.customerPhone}</small></td>
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