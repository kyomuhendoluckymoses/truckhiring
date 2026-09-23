// Simple email sender using Resend
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM || 'Lucky Movers <onboarding@resend.dev>';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📧 mailer.js loaded');
console.log('   RESEND_API_KEY:', RESEND_API_KEY ? '✅ set (starts with ' + RESEND_API_KEY.slice(0, 10) + '...)' : '❌ MISSING');
console.log('   FROM:', FROM);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.log('⚠️ [MAILER] RESEND_API_KEY not set — skipping email');
    return { skipped: true };
  }

  try {
    console.log('📤 [MAILER] POST to resend.com/emails');
    console.log('   to:', to);
    console.log('   from:', FROM);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + RESEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html })
    });

    const data = await res.json();
    console.log('📬 [MAILER] response status:', res.status);
    console.log('📬 [MAILER] response body:', JSON.stringify(data));

    if (!res.ok) {
      console.log('❌ [MAILER] send failed');
      return { error: data };
    }

    console.log('✅ [MAILER] email sent to', to);
    return { ok: true, data };
  } catch (err) {
    console.log('❌ [MAILER] exception:', err.message);
    return { error: err.message };
  }
}

function driverAcceptedEmail(booking, driver) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;background:#f7f7f8;">
    <div style="background:#1a0d2e;color:#fff;padding:20px;border-radius:12px 12px 0 0;">
      <h1 style="margin:0;font-size:22px;">🚚 Lucky Movers</h1>
      <p style="margin:6px 0 0;font-size:13px;opacity:.85;">Moving made simple</p>
    </div>

    <div style="background:#fff;padding:24px;border-radius:0 0 12px 12px;">
      <h2 style="margin:0 0 12px;color:#1a0d2e;">✅ A driver accepted your job!</h2>

      <p style="color:#444;">Hi ${booking.customerName},</p>
      <p style="color:#444;">
        Good news — <strong>${driver.name}</strong> has accepted your booking.
      </p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#fafafa;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:10px;border-bottom:1px solid #eee;"><strong>Driver</strong></td>
            <td style="padding:10px;border-bottom:1px solid #eee;">${driver.name}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #eee;"><strong>Phone</strong></td>
            <td style="padding:10px;border-bottom:1px solid #eee;">${driver.phone}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #eee;"><strong>Truck</strong></td>
            <td style="padding:10px;border-bottom:1px solid #eee;">${driver.truckType}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #eee;"><strong>Pickup</strong></td>
            <td style="padding:10px;border-bottom:1px solid #eee;">${booking.pickupLocation}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #eee;"><strong>Destination</strong></td>
            <td style="padding:10px;border-bottom:1px solid #eee;">${booking.destination}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #eee;"><strong>Agreed price</strong></td>
            <td style="padding:10px;border-bottom:1px solid #eee;">UGX ${booking.agreedPrice || booking.offeredPrice}</td></tr>
        <tr><td style="padding:10px;"><strong>Status</strong></td>
            <td style="padding:10px;color:#2e7d32;font-weight:bold;">Driver Accepted</td></tr>
      </table>

      <p style="color:#444;margin:20px 0 12px;">You can now contact your driver:</p>

      <p>
        <a href="tel:${driver.phone}"
           style="display:inline-block;background:#ff6b35;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;margin-right:8px;">
          📞 Call Driver
        </a>
        <a href="https://wa.me/256${driver.phone.replace(/^0/, '')}"
           style="display:inline-block;background:#25D366;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">
          💬 WhatsApp
        </a>
      </p>

      <p style="color:#888;font-size:12px;margin-top:24px;">
        Thanks for using Lucky Movers.<br />
        This email was sent because you made a booking on our platform.
      </p>
    </div>
  </div>
  `;
}

module.exports = { sendEmail, driverAcceptedEmail }