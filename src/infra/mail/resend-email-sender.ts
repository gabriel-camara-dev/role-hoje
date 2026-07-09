import { Inject, Injectable, Logger } from '@nestjs/common';
import { EnvService } from '@/infra/env/env.service';
import type { EmailSender, SendEmailConfirmationInput } from '@/domain/main/application/mail/email-sender';

@Injectable()
export class ResendEmailSender implements EmailSender {
  private readonly logger = new Logger(ResendEmailSender.name);

  constructor(@Inject(EnvService) private env: EnvService) {}

  async sendEmailConfirmation(input: SendEmailConfirmationInput): Promise<void> {
    const apiKey = this.env.get('RESEND_API_KEY');
    const fromEmail = this.env.get('RESEND_FROM_EMAIL');
    const confirmationUrl = new URL(
      '/users/email/confirm',
      this.env.get('APP_URL') ?? `http://localhost:${this.env.get('APP_PORT')}`,
    );

    confirmationUrl.searchParams.set('token', input.token);

    if (apiKey.startsWith('re_xxxxx')) {
      this.logger.warn(`Email confirmation skipped for ${input.email}: configure RESEND_API_KEY to send emails.`);
      this.logger.warn(`Email confirmation URL for ${input.email}: ${confirmationUrl.toString()}`);
      return;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: input.email,
          subject: 'Confirme seu email no Onde Hoje',
          html: confirmationEmailHtml({
            name: input.name,
            confirmationUrl: confirmationUrl.toString(),
          }),
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`Resend email confirmation failed for ${input.email}: ${body}`);
        this.logger.warn(`Email confirmation URL for ${input.email}: ${confirmationUrl.toString()}`);
      }
    } catch (error) {
      this.logger.error(`Resend email confirmation request failed for ${input.email}: ${String(error)}`);
      this.logger.warn(`Email confirmation URL for ${input.email}: ${confirmationUrl.toString()}`);
    }
  }
}

// System font stack that renders a modern typeface on every platform
// (SF Pro on Apple, Segoe UI on Windows, Roboto on Android/Gmail).
const BODY_FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

function confirmationEmailHtml({ confirmationUrl, name }: { confirmationUrl: string; name: string }) {
  const safeConfirmationUrl = escapeHtml(confirmationUrl);
  const safeName = escapeHtml(name);

  return `
    <!-- Poppins upgrades headings where the client supports <style>+@import (Apple Mail etc.); everyone else keeps the system stack. -->
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&display=swap');
      .oh-heading { font-family: 'Poppins', ${BODY_FONT} !important; }
      .oh-brand { font-family: 'Poppins', ${BODY_FONT} !important; }
      a.oh-button:hover { background:#0d655e !important; }
    </style>
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Confirme seu email no Onde Hoje em até 5 minutos.
    </div>
    <div style="margin:0;padding:0;background:#eef4f1;font-family:${BODY_FONT};color:#16211d;-webkit-font-smoothing:antialiased;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#eef4f1;">
        <tr>
          <td align="center" style="padding:40px 16px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border-collapse:collapse;overflow:hidden;border-radius:20px;background:#ffffff;border:1px solid #dbe5df;box-shadow:0 18px 45px rgba(15,118,110,.10);">
              <tr>
                <td style="padding:34px 32px 28px;background:linear-gradient(135deg,#0f766e 0%,#0b5f58 100%);background-color:#0f766e;color:#ffffff;">
                  <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                    <tr>
                      <td style="width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,.16);text-align:center;vertical-align:middle;">
                        <span class="oh-brand" style="font-size:16px;font-weight:800;letter-spacing:.04em;color:#ffffff;">OH</span>
                      </td>
                      <td style="padding-left:12px;vertical-align:middle;">
                        <span class="oh-brand" style="font-size:14px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.92);">Onde Hoje</span>
                      </td>
                    </tr>
                  </table>
                  <h1 class="oh-heading" style="margin:22px 0 0;font-size:32px;line-height:1.12;font-weight:800;letter-spacing:-.01em;">
                    Confirme seu email
                  </h1>
                  <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:rgba(255,255,255,.88);">
                    Falta só esse passo para ativar sua conta e começar a votar nos roles de hoje.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:30px 32px;">
                  <p style="margin:0 0 14px;font-size:17px;line-height:1.6;">Oi, <strong>${safeName}</strong> &#128075;</p>
                  <p style="margin:0;color:#5d6c65;font-size:15px;line-height:1.7;">
                    Clique no botão abaixo para confirmar seu email. Por segurança, esse link expira em
                    <strong style="color:#17211d;">5 minutos</strong>.
                  </p>

                  <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:28px 0;">
                    <tr>
                      <td style="border-radius:12px;background:#0f766e;">
                        <a class="oh-button" href="${safeConfirmationUrl}" style="display:inline-block;border-radius:12px;background:#0f766e;color:#ffffff;text-decoration:none;padding:15px 26px;font-size:15px;font-weight:700;letter-spacing:.01em;">
                          Confirmar meu email &#8594;
                        </a>
                      </td>
                    </tr>
                  </table>

                  <div style="border-radius:12px;background:#f4f8f6;border:1px solid #dbe5df;padding:14px 16px;">
                    <p style="margin:0;color:#5d6c65;font-size:13px;line-height:1.6;">
                      Se o botão não funcionar, copie e cole este link no navegador:
                    </p>
                    <p style="margin:8px 0 0;word-break:break-all;font-size:12px;line-height:1.5;color:#0f766e;">
                      ${safeConfirmationUrl}
                    </p>
                  </div>

                  <p style="margin:24px 0 0;color:#7a8781;font-size:12px;line-height:1.6;">
                    Se você não criou uma conta no Onde Hoje, e só ignorar este email.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 32px 26px;border-top:1px solid #eef2f0;">
                  <p class="oh-brand" style="margin:0;font-size:12px;font-weight:700;letter-spacing:.02em;color:#0f766e;">Onde Hoje</p>
                  <p style="margin:4px 0 0;font-size:11px;line-height:1.5;color:#9aa7a1;">Descubra pra onde a galera vai hoje.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
