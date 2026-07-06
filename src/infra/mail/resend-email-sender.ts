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

function confirmationEmailHtml({ confirmationUrl, name }: { confirmationUrl: string; name: string }) {
  const safeConfirmationUrl = escapeHtml(confirmationUrl);
  const safeName = escapeHtml(name);

  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Confirme seu email no Onde Hoje em ate 5 minutos.
    </div>
    <div style="margin:0;padding:0;background:#eef4f1;font-family:Arial,Helvetica,sans-serif;color:#16211d;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#eef4f1;">
        <tr>
          <td align="center" style="padding:32px 16px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border-collapse:collapse;overflow:hidden;border-radius:18px;background:#ffffff;border:1px solid #dbe5df;">
              <tr>
                <td style="padding:28px 28px 22px;background:#0f766e;color:#ffffff;">
                  <div style="display:inline-block;border-radius:999px;background:rgba(255,255,255,.14);padding:8px 12px;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;">
                    Onde Hoje
                  </div>
                  <h1 style="margin:18px 0 0;font-size:30px;line-height:1.15;font-weight:800;">
                    Confirme seu email
                  </h1>
                  <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:rgba(255,255,255,.86);">
                    Falta so esse passo para ativar sua conta e comecar a votar nos roles de hoje.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:28px;">
                  <p style="margin:0 0 12px;font-size:16px;line-height:1.6;">Oi, <strong>${safeName}</strong>.</p>
                  <p style="margin:0;color:#5d6c65;font-size:15px;line-height:1.7;">
                    Clique no botao abaixo para confirmar seu email. Por seguranca, esse link expira em
                    <strong style="color:#17211d;">5 minutos</strong>.
                  </p>

                  <div style="margin:26px 0;">
                    <a href="${safeConfirmationUrl}" style="display:inline-block;border-radius:10px;background:#0f766e;color:#ffffff;text-decoration:none;padding:14px 20px;font-size:15px;font-weight:800;">
                      Confirmar email
                    </a>
                  </div>

                  <div style="border-radius:12px;background:#f4f8f6;border:1px solid #dbe5df;padding:14px 16px;">
                    <p style="margin:0;color:#5d6c65;font-size:13px;line-height:1.6;">
                      Se o botao nao funcionar, copie e cole este link no navegador:
                    </p>
                    <p style="margin:8px 0 0;word-break:break-all;font-size:12px;line-height:1.5;color:#0f766e;">
                      ${safeConfirmationUrl}
                    </p>
                  </div>

                  <p style="margin:22px 0 0;color:#7a8781;font-size:12px;line-height:1.6;">
                    Se voce nao criou uma conta no Onde Hoje, ignore este email.
                  </p>
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
