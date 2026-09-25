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

  async function suspendDriver(driver) {
    const reason = window.prompt(
      'Why are you suspending ' + driver.name + '?\n\n' +
      'This reason will be emailed to the driver.'
    );
    if (reason === null) return;
    if (!reason.trim()) {
      alert('You must provide a reason.');
      return;
    }
    try {
      const res = await fetch(`${API}/admin/drivers/${driver._id}/suspend`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ reason: reason.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('✅ Suspended: ' + driver.name + ' (reason emailed)');
        loadAll();
      } else {
        setMessage('❌ ' + (data.message || 'Failed'));
      }
    } catch (err) {
      setMessage('❌ ' + err.message);
    }
  }

  async function unsuspendDriver(id) {
    if (!window.confirm('Reactivate this driver?')) return;
    await fetch(`${API}/admin/drivers/${id}/unsuspend`, { method: 'PATCH', headers: headers() });
    loadAll();
  }

  async function deleteDriver(driver) {
    const typed = window.prompt(
      'Type the driver\'s name to confirm permanent deletion:\n\n' +
      'Name: ' + driver.name
    );
    const cleanTyped = (typed || '').trim().toLowerCase();
    const cleanName = (driver.name || '').trim().toLowerCase();
    if (cleanTyped !== cleanName) {
      alert('Name did not match. Deletion cancelled.');
      return;
    }
    const reason = window.prompt(
      'Why are you removing ' + driver.name + '?\n\n' +
      'This reason will be emailed to the driver.'
    );
    if (reason === null) return;
    if (!reason.trim()) {
      alert('You must provide a reason.');
      return;
    }
    try {
      const res = await fetch(`${API}/admin/drivers/${driver._id}`, {
        method: 'DELETE',
        headers: headers(),
        body: JSON.stringify({ reason: reason.trim() })
      });
      if (res.status === 409) {
        const data = await res.json();
        const force = window.confirm(
          '⚠️ ' + data.message + '\n\nDelete anyway? Active jobs will be orphaned.'
        );
        if (!force) return;
        await fetch(`${API}/admin/drivers/${driver._id}?force=true`, {
          method: 'DELETE',
          headers: headers(),
          body: JSON.stringify({ reason: reason.trim() })
        });
      }
      setMessage('✅ Removed: ' + driver.name + ' (reason emailed)');
      loadAll();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  function whatsappReasonLink(driver, action) {
    const reason = driver.suspensionReason || '(reason)';
    const message =
      'Hi ' + driver.name + ', this is Lucky Movers admin.\n\n' +
      'Your account has been ' + action + '.\n\n' +
      'Reason: ' + reason + '\n\n' +
      'Please contact us on 0742502188 if you have questions.';
    return 'https://wa.me/256' + (driver.phone || '').replace(/^0/, '') +
      '?text=' + encodeURIComponent(message);
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

  // ─── MONEY SUMMARIES ───
  const totalPaid = bookings
    .filter(b => b.paymentStatus === 'paid')
    .reduce((sum, b) => sum + (b.agreedPrice || b.offeredPrice || 0), 0);

  const totalPending = bookings
    .filter(b => !b.paymentStatus || b.paymentStatus === 'unpaid')
    .reduce((sum, b) => sum + (b.agreedPrice || b.offeredPrice || 0), 0);

  const totalRefunded = bookings
    .filter(b => b.paymentStatus === 'refunded')
    .reduce((sum, b) => sum + (b.agreedPrice || b.offeredPrice || 0), 0);

  // ─── DRIVER EARNINGS ───
  // Only confirmed jobs count as earned (driver actually did the work)
  const earningsByDriver = drivers.map(driver => {
    const myJobs = bookings.filter(b =>
      String(b.driverId) === String(driver._id) &&
      b.status === 'Confirmed'
    );

    const paidJobs = myJobs.filter(b => b.paymentStatus === 'paid');
    const unpaidJobs = myJobs.filter(b => b.paymentStatus !== 'paid');

    const totalEarned = myJobs.reduce(
      (sum, b) => sum + (b.agreedPrice || b.offeredPrice || 0), 0
    );
    const paidAmount = paidJobs.reduce(
      (sum, b) => sum + (b.agreedPrice || b.offeredPrice || 0), 0
    );
    const unpaidAmount = unpaidJobs.reduce(
      (sum, b) => sum + (b.agreedPrice || b.offeredPrice || 0), 0
    );

    return {
      driver,
      trips: myJobs.length,
      paidTrips: paidJobs.length,
      totalEarned,
      paidAmount,
      unpaidAmount
    };
  }).sort((a, b) => b.totalEarned - a.totalEarned);

  const earningsTotal = earningsByDriver.reduce((s, e) => s + e.totalEarned, 0);
  const earningsPaid = earningsByDriver.reduce((s, e) => s + e.paidAmount, 0);
  const earningsUnpaid = earningsByDriver.reduce((s, e) => s + e.unpaidAmount, 0);

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

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => setTab('drivers')}>Drivers ({drivers.length})</button>
        <button onClick={() => setTab('bookings')}>Bookings ({bookings.length})</button>
        <button onClick={() => setTab('earnings')}>💰 Driver Earnings</button>
        <button onClick={() => setTab('complaints')}>Complaints ({complaints.length})</button>
        <button onClick={loadAll}>🔄 Refresh</button>
        <button onClick={() => { localStorage.removeItem('adminKey'); setAuthed(false); }}>Log Out</button>
      </div>

      {message && <p style={{ fontWeight: 'bold' }}>{message}</p>}

      {/* ============ EARNINGS TAB ============ */}
      {tab === 'earnings' && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ background: '#e3f2fd', border: '2px solid #2196f3', padding: 16, borderRadius: 10, minWidth: 200 }}>
              <div style={{ fontSize: 13, color: '#0d47a1' }}>💵 Total Earned by All Drivers</div>
              <div style={{ fontSize: 22, fontWeight: 'bold', color: '#0d47a1', marginTop: 6 }}>{fmt(earningsTotal)}</div>
            </div>
            <div style={{ background: '#e8f5e9', border: '2px solid #4caf50', padding: 16, borderRadius: 10, minWidth: 200 }}>
              <div style={{ fontSize: 13, color: '#2e7d32' }}>✅ Already Paid (customers)</div>
              <div style={{ fontSize: 22, fontWeight: 'bold', color: '#1b5e20', marginTop: 6 }}>{fmt(earningsPaid)}</div>
            </div>
            <div style={{ background: '#fff8e1', border: '2px solid #ff9800', padding: 16, borderRadius: 10, minWidth: 200 }}>
              <div style={{ fontSize: 13, color: '#e65100' }}>⏳ Still Pending</div>
              <div style={{ fontSize: 22, fontWeight: 'bold', color: '#bf360c', marginTop: 6 }}>{fmt(earningsUnpaid)}</div>
            </div>
          </div>

          <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#1a0d2e', color: 'white' }}>
              <tr>
                <th>Driver</th>
                <th>Phone</th>
                <th>Trips</th>
                <th>Paid Trips</th>
                <th>Total Earned</th>
                <th>✅ Paid</th>
                <th>⏳ Pending</th>
              </tr>
            </thead>
            <tbody>
              {earningsByDriver.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: 20 }}>No drivers yet.</td></tr>
              ) : earningsByDriver.map(({ driver, trips, paidTrips, totalEarned, paidAmount, unpaidAmount }) => (
                <tr key={driver._id}>
                  <td><strong>{driver.name}</strong></td>
                  <td>{driver.phone}</td>
                  <td>{trips}</td>
                  <td>{paidTrips}</td>
                  <td style={{ fontWeight: 'bold', color: '#0d47a1' }}>{fmt(totalEarned)}</td>
                  <td style={{ color: 'green', fontWeight: 'bold' }}>{fmt(paidAmount)}</td>
                  <td style={{ color: 'orange', fontWeight: 'bold' }}>{fmt(unpaidAmount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f5f5f5', fontWeight: 'bold' }}>
                <td colSpan="4" style={{ textAlign: 'right' }}>TOTALS:</td>
                <td style={{ color: '#0d47a1' }}>{fmt(earningsTotal)}</td>
                <td style={{ color: 'green' }}>{fmt(earningsPaid)}</td>
                <td style={{ color: 'orange' }}>{fmt(earningsUnpaid)}</td>
              </tr>
            </tfoot>
          </table>
        </>
      )}

      {/* ============ DRIVERS TAB ============ */}
      {tab === 'drivers' && (
        <>
          <div style={{ background: '#f5f5f7', padding: 20, borderRadius: 12, marginBottom: 20 }}>
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
                <th>Status</th><th>Suspension Reason</th><th>Actions</th>
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
                  <td style={{ color: '#b71c1c', fontSize: 12 }}>
                    {d.suspensionReason || '—'}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {d.availability !== 'suspended' ? (
                      <button onClick={() => suspendDriver(d)}
                        style={{ background: '#ff9800', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', marginRight: 6 }}>
                        Suspend
                      </button>
                    ) : (
                      <button onClick={() => unsuspendDriver(d._id)}
                        style={{ background: '#2e7d32', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', marginRight: 6 }}>
                        Reactivate
                      </button>
                    )}
                    <a href={whatsappReasonLink(d, d.availability === 'suspended' ? 'suspended' : 'updated')}
                       target="_blank" rel="noreferrer"
                       style={{ background: '#25D366', color: 'white', padding: '6px 10px', borderRadius: 6, textDecoration: 'none', marginRight: 6, fontWeight: 'bold', fontSize: 13 }}>
                      WhatsApp
                    </a>
                    <button onClick={() => deleteDriver(d)}
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

      {/* ============ BOOKINGS TAB ============ */}
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

      {/* ============ COMPLAINTS TAB ============ */}
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