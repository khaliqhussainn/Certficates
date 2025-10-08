import nodemailer from 'nodemailer'

// Guard against client-side execution
if (typeof window !== 'undefined') {
  throw new Error('Email utility can only be used on the server side')
}

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

// Verify transporter configuration
transporter.verify(function (error, success) {
  if (error) {
    console.log('SMTP configuration error:', error)
  } else {
    console.log('Email server is ready to send messages')
  }
})

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetUrl: string
) {
  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'CertifyPro'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    to: email,
    subject: 'Reset Your Password - CertifyPro',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 48px 40px 32px; text-align: center; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #6366f1 100%); border-radius: 12px 12px 0 0;">
                    <div style="display: inline-block; width: 80px; height: 80px; background-color: rgba(255,255,255,0.2); border-radius: 50%; margin-bottom: 16px; line-height: 80px; font-size: 40px;">
                      🎓
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">CertifyPro</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 48px 40px;">
                    <h2 style="margin: 0 0 24px; color: #111827; font-size: 28px; font-weight: 700;">Reset Your Password</h2>
                    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
                      Hello <strong>${name}</strong>,
                    </p>
                    <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                      We received a request to reset your password for your CertifyPro account. Click the button below to create a new password:
                    </p>
                    <table role="presentation" style="margin: 32px 0; width: 100%;">
                      <tr>
                        <td align="center">
                          <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 18px 48px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); border-radius: 8px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 32px 0 16px; color: #6b7280; font-size: 14px; line-height: 1.5;">
                      Or copy and paste this link into your browser:
                    </p>
                    <div style="padding: 16px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; word-break: break-all;">
                      <a href="${resetUrl}" style="color: #2563eb; font-size: 14px; text-decoration: none;">${resetUrl}</a>
                    </div>
                    <div style="margin: 32px 0; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
                      <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                        <strong>⚠️ Important:</strong> This link will expire in <strong>1 hour</strong> for security reasons. If you didn't request this password reset, please ignore this email.
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 32px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; text-align: center; line-height: 1.5;">
                      This email was sent by <strong>CertifyPro</strong>
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                      © ${new Date().getFullYear()} CertifyPro. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `
Reset Your Password
Hello ${name},
We received a request to reset your password for your CertifyPro account.
Click the link below to create a new password:
${resetUrl}
⚠️ Important: This link will expire in 1 hour for security reasons.
If you didn't request a password reset, you can safely ignore this email.
---
© ${new Date().getFullYear()} CertifyPro. All rights reserved.
    `.trim(),
  }
  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('✅ Password reset email sent successfully')
    console.log('Message ID:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('❌ Error sending password reset email:', error)
    throw new Error('Failed to send password reset email')
  }
}
