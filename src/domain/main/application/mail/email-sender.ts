export interface SendEmailConfirmationInput {
  email: string;
  name: string;
  token: string;
}

export abstract class EmailSender {
  abstract sendEmailConfirmation(input: SendEmailConfirmationInput): Promise<void>;
}
