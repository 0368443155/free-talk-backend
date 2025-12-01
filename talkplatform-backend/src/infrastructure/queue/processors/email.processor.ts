import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';

export interface EmailJobData {
  to: string;
  subject: string;
  template?: string;
  data?: Record<string, any>;
  html?: string;
  text?: string;
}

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  @Process('send')
  async handleSendEmail(job: Job<EmailJobData>) {
    const { to, subject, html, text, template, data } = job.data;

    this.logger.log(`Processing email job ${job.id} to ${to}`);

    try {
      // TODO: Implement email sending logic
      // Example: await this.emailService.send({ to, subject, html, text, template, data });
      
      this.logger.log(`Email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  @Process('send-bulk')
  async handleSendBulkEmail(job: Job<{ emails: EmailJobData[] }>) {
    const { emails } = job.data;

    this.logger.log(`Processing bulk email job ${job.id} for ${emails.length} emails`);

    // Process emails in batches
    const batchSize = 10;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      await Promise.all(
        batch.map(email => this.handleSendEmail({ data: email } as Job<EmailJobData>)),
      );
    }

    this.logger.log(`Bulk email job ${job.id} completed`);
  }
}

