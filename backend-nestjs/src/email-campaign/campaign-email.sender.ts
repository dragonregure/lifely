import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';

export type EmailAddress = {
  address: string;
  name?: string | null;
};

export type EmailMessage = {
  to: EmailAddress[];
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
};

@Injectable()
export class MailEmailSender {
  private readonly transport = nodemailer.createTransport({
    host: process.env['MAIL_HOST'] ?? '127.0.0.1',
    port: this.positiveInt(process.env['MAIL_PORT'], 1025),
    secure: process.env['MAIL_ENCRYPTION'] === 'ssl',
    auth:
      process.env['MAIL_USERNAME'] && process.env['MAIL_PASSWORD']
        ? {
            user: process.env['MAIL_USERNAME'],
            pass: process.env['MAIL_PASSWORD'],
          }
        : undefined,
  });

  async send(message: EmailMessage): Promise<void> {
    await this.transport.sendMail({
      from: this.fromAddress(),
      to: message.to.map((recipient) => this.formatAddress(recipient)),
      subject: message.subject,
      html: message.html,
      text: message.text,
      headers: message.headers,
    });
  }

  private fromAddress(): string {
    return this.formatAddress({
      address: process.env['MAIL_FROM_ADDRESS'] ?? 'hello@lifely.local',
      name: process.env['MAIL_FROM_NAME'] ?? 'Lifely',
    });
  }

  private formatAddress(address: EmailAddress): string {
    if (!address.name) {
      return address.address;
    }

    return `"${address.name.replace(/"/g, '\\"')}" <${address.address}>`;
  }

  private positiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value ?? '', 10);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}
