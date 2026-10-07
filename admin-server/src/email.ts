import nodemailer from 'nodemailer';
import type { Config } from './config.js';

export class ResetEmailService {
  constructor(private readonly config: Config) {}

  isConfigured() {
    return Boolean(
      this.config.SMTP_HOST &&
        this.config.SMTP_USER &&
        this.config.SMTP_PASSWORD &&
        this.config.SMTP_FROM,
    );
  }

  async sendPasswordReset(recipient: string, resetUrl: string) {
    if (!this.isConfigured()) throw new Error('SMTP_NOT_CONFIGURED');
    const transporter = nodemailer.createTransport({
      host: this.config.SMTP_HOST,
      port: this.config.SMTP_PORT,
      secure: this.config.SMTP_SECURE,
      auth: { user: this.config.SMTP_USER, pass: this.config.SMTP_PASSWORD },
    });
    await transporter.sendMail({
      from: this.config.SMTP_FROM,
      to: recipient,
      subject: 'Aydınlar yönetici paneli şifre sıfırlama',
      text: `Şifrenizi sıfırlamak için aşağıdaki tek kullanımlık bağlantıyı açın. Bağlantı ${this.config.RESET_TOKEN_MINUTES} dakika geçerlidir.\n\n${resetUrl}`,
    });
  }
}
