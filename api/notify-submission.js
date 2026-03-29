// api/notify-submission.js
// Sends a notification email to support when a feature request or bug report is submitted.
// Called from AppFooter.vue after a successful Supabase insert.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { type, data } = req.body

  if (!type || !data) {
    return res.status(400).json({ error: 'Missing type or data' })
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    console.error('[notify-submission] RESEND_API_KEY not set')
    return res.status(500).json({ error: 'Email service not configured' })
  }

  const toEmail = 'support@ultimatefantasydashboard.com'

  let subject, html

  if (type === 'feature_request') {
    subject = `💡 New Feature Request: ${data.title}`
    html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0f1117; color: #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: #eab308; padding: 12px 24px;">
          <span style="font-size: 16px; font-weight: 800; color: #0a0c14; text-transform: uppercase; letter-spacing: 2px;">💡 Feature Request</span>
        </div>
        <div style="padding: 24px;">
          <h2 style="color: #fff; margin: 0 0 16px;">${data.title}</h2>
          <p style="color: #9ca3af; margin: 0 0 20px; line-height: 1.6;">${data.description}</p>
          <hr style="border: none; border-top: 1px solid #1e2130; margin: 20px 0;">
          <table style="width: 100%; font-size: 13px; color: #6b7280;">
            <tr><td style="padding: 4px 0;"><strong style="color: #9ca3af;">Name:</strong></td><td>${data.name || '(not provided)'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong style="color: #9ca3af;">Email:</strong></td><td>${data.email || '(not provided)'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong style="color: #9ca3af;">User ID:</strong></td><td>${data.user_id || 'anonymous'}</td></tr>
          </table>
        </div>
        <div style="padding: 12px 24px; background: #0a0c14; text-align: center;">
          <span style="font-size: 11px; color: #374151;">ultimatefantasydashboard.com · admin notification</span>
        </div>
      </div>
    `
  } else if (type === 'bug_report') {
    subject = `🐛 Bug Report: ${data.title}`
    html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0f1117; color: #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: #ef4444; padding: 12px 24px;">
          <span style="font-size: 16px; font-weight: 800; color: #fff; text-transform: uppercase; letter-spacing: 2px;">🐛 Bug Report</span>
        </div>
        <div style="padding: 24px;">
          <h2 style="color: #fff; margin: 0 0 16px;">${data.title}</h2>
          <p style="color: #9ca3af; margin: 0 0 20px; line-height: 1.6;">${data.description}</p>
          <hr style="border: none; border-top: 1px solid #1e2130; margin: 20px 0;">
          <table style="width: 100%; font-size: 13px; color: #6b7280;">
            <tr><td style="padding: 4px 0; width: 100px;"><strong style="color: #9ca3af;">Page:</strong></td><td>${data.page || '(not specified)'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong style="color: #9ca3af;">Device:</strong></td><td>${data.device || '(not specified)'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong style="color: #9ca3af;">Name:</strong></td><td>${data.name || '(not provided)'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong style="color: #9ca3af;">Email:</strong></td><td>${data.email || '(not provided)'}</td></tr>
            <tr><td style="padding: 4px 0;"><strong style="color: #9ca3af;">User ID:</strong></td><td>${data.user_id || 'anonymous'}</td></tr>
          </table>
        </div>
        <div style="padding: 12px 24px; background: #0a0c14; text-align: center;">
          <span style="font-size: 11px; color: #374151;">ultimatefantasydashboard.com · admin notification</span>
        </div>
      </div>
    `
  } else {
    return res.status(400).json({ error: 'Unknown submission type' })
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'UFD Notifications <notifications@ultimatefantasydashboard.com>',
        to: [toEmail],
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[notify-submission] Resend error:', err)
      return res.status(500).json({ error: 'Email send failed' })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[notify-submission] Fetch error:', err)
    return res.status(500).json({ error: 'Network error' })
  }
}
