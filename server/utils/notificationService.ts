import { MailService } from '@sendgrid/mail';

interface NotificationPreferences {
  userId: number;
  emailEnabled: boolean;
  uploadNotifications: boolean;
  processingNotifications: boolean;
  email: string;
}

interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

class NotificationService {
  private mailService: MailService | null = null;
  private isEnabled: boolean = false;

  constructor() {
    this.initializeEmailService();
  }

  private initializeEmailService() {
    if (process.env.SENDGRID_API_KEY) {
      this.mailService = new MailService();
      this.mailService.setApiKey(process.env.SENDGRID_API_KEY);
      this.isEnabled = true;
      console.log('✅ Email notification service initialized');
    } else {
      console.log('⚠️ SENDGRID_API_KEY not found - email notifications disabled');
    }
  }

  private getUploadCompleteTemplate(fileName: string, recordCount: number): EmailTemplate {
    return {
      subject: 'File Upload Complete - HRSN Analytics',
      text: `Your file upload has completed successfully.

File: ${fileName}
Records processed: ${recordCount.toLocaleString()}

You can now proceed with data analysis. Log in to your account to continue.

Best regards,
HRSN Analytics Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">File Upload Complete</h2>
          <p>Your file upload has completed successfully.</p>
          
          <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <strong>Upload Details:</strong><br>
            <strong>File:</strong> ${fileName}<br>
            <strong>Records processed:</strong> ${recordCount.toLocaleString()}
          </div>
          
          <p>You can now proceed with data analysis. Log in to your account to continue.</p>
          
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
            Best regards,<br>
            HRSN Analytics Team
          </div>
        </div>
      `
    };
  }

  private getProcessingCompleteTemplate(patientCount: number, symptomCount: number, processingTime: string): EmailTemplate {
    return {
      subject: 'Data Processing Complete - HRSN Analytics',
      text: `Your data processing has completed successfully.

Processing Results:
- Patients analyzed: ${patientCount.toLocaleString()}
- Symptoms extracted: ${symptomCount.toLocaleString()}
- Processing time: ${processingTime}

Your data is now ready for analysis. Log in to your account to explore the results.

Best regards,
HRSN Analytics Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">Data Processing Complete</h2>
          <p>Your data processing has completed successfully.</p>
          
          <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <strong>Processing Results:</strong><br>
            <strong>Patients analyzed:</strong> ${patientCount.toLocaleString()}<br>
            <strong>Symptoms extracted:</strong> ${symptomCount.toLocaleString()}<br>
            <strong>Processing time:</strong> ${processingTime}
          </div>
          
          <p>Your data is now ready for analysis. Log in to your account to explore the results.</p>
          
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
            Best regards,<br>
            HRSN Analytics Team
          </div>
        </div>
      `
    };
  }

  async sendUploadNotification(
    userEmail: string, 
    fileName: string, 
    recordCount: number,
    preferences?: NotificationPreferences
  ): Promise<boolean> {
    if (!this.isEnabled || !this.mailService) {
      console.log('Email service not available');
      return false;
    }

    // Check user preferences if provided
    if (preferences && (!preferences.emailEnabled || !preferences.uploadNotifications)) {
      console.log('Upload notifications disabled for user');
      return false;
    }

    try {
      const template = this.getUploadCompleteTemplate(fileName, recordCount);
      
      await this.mailService.send({
        to: userEmail,
        from: process.env.FROM_EMAIL || 'notifications@hrsnanalytics.com',
        subject: template.subject,
        text: template.text,
        html: template.html
      });

      console.log(`✅ Upload notification sent to ${userEmail}`);
      return true;
    } catch (error) {
      console.error('Failed to send upload notification:', error);
      return false;
    }
  }

  async sendProcessingCompleteNotification(
    userEmail: string,
    patientCount: number,
    symptomCount: number,
    processingTime: string,
    preferences?: NotificationPreferences
  ): Promise<boolean> {
    if (!this.isEnabled || !this.mailService) {
      console.log('Email service not available');
      return false;
    }

    // Check user preferences if provided
    if (preferences && (!preferences.emailEnabled || !preferences.processingNotifications)) {
      console.log('Processing notifications disabled for user');
      return false;
    }

    try {
      const template = this.getProcessingCompleteTemplate(patientCount, symptomCount, processingTime);
      
      await this.mailService.send({
        to: userEmail,
        from: process.env.FROM_EMAIL || 'notifications@hrsnanalytics.com',
        subject: template.subject,
        text: template.text,
        html: template.html
      });

      console.log(`✅ Processing notification sent to ${userEmail}`);
      return true;
    } catch (error) {
      console.error('Failed to send processing notification:', error);
      return false;
    }
  }

  // Test function for development
  async testNotification(userEmail: string): Promise<boolean> {
    if (!this.isEnabled || !this.mailService) {
      console.log('Email service not available for testing');
      return false;
    }

    try {
      await this.mailService.send({
        to: userEmail,
        from: process.env.FROM_EMAIL || 'notifications@hrsnanalytics.com',
        subject: 'Test Notification - HRSN Analytics',
        text: 'This is a test notification to verify email functionality.',
        html: '<p>This is a test notification to verify email functionality.</p>'
      });

      console.log(`✅ Test notification sent to ${userEmail}`);
      return true;
    } catch (error) {
      console.error('Failed to send test notification:', error);
      return false;
    }
  }

  isEmailServiceAvailable(): boolean {
    return this.isEnabled;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export type { NotificationPreferences };