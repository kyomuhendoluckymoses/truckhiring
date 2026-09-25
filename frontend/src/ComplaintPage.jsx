import { useState } from 'react';

const API = 'https://truckhiring-backend.onrender.com/api';

export default function ComplaintPage() {
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    subject: '',
    message: ''
  });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSending(true);

    try {
      const res = await fetch(`${API}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        setSent(true);
        setForm({ customerName: '', customerPhone: '', subject: '', message: '' });
      } else {
        const data = await res.json();
        setError(data.message || 'Could not submit complaint');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 24, fontFamily: 'Arial' }}>
      <h1>📣 Submit a Complaint</h1>
      <p style={{ color: '#666' }}>
        Tell us what went wrong. We read every message.
      </p>

      {sent && (
        <div style={{
          background: '#e8f5e9',
          border: '1px solid #4caf50',
          padding: 16,
          borderRadius: 8,
          marginBottom: 20,
          color: '#2e7d32'
        }}>
          ✅ Your complaint was submitted. We'll look into it.
        </div>
      )}

      {error && (
        <div style={{
          background: '#ffebee',
          border: '1px solid #f44336',
          padding: 16,
          borderRadius: 8,
          marginBottom: 20,
          color: '#c62828'
        }}>
          ❌ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          name="customerName"
          placeholder="Your Name"
          value={form.customerName}
          onChange={handleChange}
          required
          style={{ padding: 12, fontSize: 16, border: '1px solid #ddd', borderRadius: 8 }}
        />

        <input
          name="customerPhone"
          placeholder="Your Phone (e.g. 0700000001)"
          value={form.customerPhone}
          onChange={handleChange}
          required
          style={{ padding: 12, fontSize: 16, border: '1px solid #ddd', borderRadius: 8 }}
        />

        <input
          name="subject"
          placeholder="Subject (e.g. Driver arrived late)"
          value={form.subject}
          onChange={handleChange}
          required
          style={{ padding: 12, fontSize: 16, border: '1px solid #ddd', borderRadius: 8 }}
        />

        <textarea
          name="message"
          placeholder="Describe what happened..."
          value={form.message}
          onChange={handleChange}
          required
          style={{ padding: 12, fontSize: 16, border: '1px solid #ddd', borderRadius: 8, minHeight: 120 }}
        />

        <button
          type="submit"
          disabled={sending}
          style={{
            background: '#ff6b35',
            color: 'white',
            border: 'none',
            padding: 14,
            fontSize: 16,
            fontWeight: 'bold',
            borderRadius: 8,
            cursor: 'pointer'
          }}
        >
          {sending ? 'Sending...' : 'Submit Complaint'}
        </button>
      </form>
    </div>
  );
}