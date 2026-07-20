import { EmailSender, type SendEmailConfirmationInput } from '@/domain/main/application/mail/email-sender';

/** Records confirmation emails instead of sending them. */
export class FakeEmailSender extends EmailSender {
  public sent: SendEmailConfirmationInput[] = [];

  async sendEmailConfirmation(input: SendEmailConfirmationInput): Promise<void> {
    this.sent.push(input);
  }
}
