import { Inject, Injectable } from '@nestjs/common';
import { EmailSender } from '@/domain/main/application/mail/email-sender';
import type { Result } from '@/core/result';
import { success } from '@/core/result';
import { UsersRepository } from '../../repositories/users-repository';
import { generateEmailVerificationToken } from './email-verification-token';

interface ResendUserEmailConfirmationUseCaseRequest {
  email: string;
}

type ResendUserEmailConfirmationUseCaseResponse = Result<never, { resent: true }>;

@Injectable()
export class ResendUserEmailConfirmationUseCase {
  constructor(
    @Inject(UsersRepository) private usersRepository: UsersRepository,
    @Inject(EmailSender) private emailSender: EmailSender,
  ) {}

  async execute({
    email,
  }: ResendUserEmailConfirmationUseCaseRequest): Promise<ResendUserEmailConfirmationUseCaseResponse> {
    const user = await this.usersRepository.findBy({ email });

    if (!user || user.emailVerifiedAt) {
      return success({ resent: true });
    }

    const emailVerificationToken = generateEmailVerificationToken();

    await this.usersRepository.updateById(user.id, {
      emailVerificationTokenHash: emailVerificationToken.tokenHash,
      emailVerificationTokenExpiresAt: emailVerificationToken.expiresAt,
    });

    await this.emailSender.sendEmailConfirmation({
      email: user.email,
      name: user.name,
      token: emailVerificationToken.token,
    });

    return success({ resent: true });
  }
}
