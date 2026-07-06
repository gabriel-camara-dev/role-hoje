import { Module } from '@nestjs/common';
import { EmailSender } from '@/domain/main/application/mail/email-sender';
import { EnvModule } from '@/infra/env/env.module';
import { ResendEmailSender } from './resend-email-sender';

@Module({
  imports: [EnvModule],
  providers: [
    {
      provide: EmailSender,
      useClass: ResendEmailSender,
    },
  ],
  exports: [EmailSender],
})
export class MailModule {}
