import { MailService } from '@sendgrid/mail';

// Set the API key when available
if (process.env.SENDGRID_API_KEY) {
  console.log('SendGrid API key found, initializing mail service');
  const mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY as string);
} else {
  console.warn('SendGrid API key not found, email functionality will not work');
}

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition: string;
  }>;
}

const DEFAULT_FROM_EMAIL = 'noreply@example.com'; // Update with your SendGrid sender identity

/**
 * Send an email using SendGrid
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.error('Cannot send email: SendGrid API key not configured');
    return false;
  }

  try {
    const mailService = new MailService();
    mailService.setApiKey(process.env.SENDGRID_API_KEY as string);
    
    await mailService.send({
      to: params.to,
      from: params.from || DEFAULT_FROM_EMAIL,
      subject: params.subject,
      text: params.text || '',
      html: params.html || '',
      attachments: params.attachments,
    });
    
    console.log(`Email sent successfully to ${params.to}`);
    return true;
  } catch (error: any) {
    console.error('SendGrid email error:', error?.response?.body || error);
    return false;
  }
}

/**
 * Generate and send a receipt email
 */
export async function sendReceiptEmail(
  to: string,
  receiptNumber: string,
  receiptDate: string,
  amount: number,
  description: string,
  itemCount: number,
  tax: number = 0
): Promise<boolean> {
  const totalAmount = amount + tax;
  const formattedAmount = (amount / 100).toFixed(2);
  const formattedTax = (tax / 100).toFixed(2);
  const formattedTotal = (totalAmount / 100).toFixed(2);
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #333; margin-bottom: 5px;">Receipt</h1>
        <p style="color: #666; margin: 0;">Receipt #: ${receiptNumber}</p>
        <p style="color: #666; margin: 0;">Date: ${receiptDate}</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h2 style="color: #333; font-size: 18px; margin-bottom: 10px;">Purchase Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #eaeaea;">
            <th style="text-align: left; padding: 10px 5px;">Description</th>
            <th style="text-align: right; padding: 10px 5px;">Quantity</th>
            <th style="text-align: right; padding: 10px 5px;">Amount</th>
          </tr>
          <tr>
            <td style="padding: 10px 5px;">${description}</td>
            <td style="text-align: right; padding: 10px 5px;">${itemCount}</td>
            <td style="text-align: right; padding: 10px 5px;">$${formattedAmount}</td>
          </tr>
          <tr style="border-top: 1px solid #eaeaea;">
            <td colspan="2" style="text-align: right; padding: 10px 5px; font-weight: bold;">Tax:</td>
            <td style="text-align: right; padding: 10px 5px;">$${formattedTax}</td>
          </tr>
          <tr>
            <td colspan="2" style="text-align: right; padding: 10px 5px; font-weight: bold;">Total:</td>
            <td style="text-align: right; padding: 10px 5px; font-weight: bold;">$${formattedTotal}</td>
          </tr>
        </table>
      </div>
      
      <div style="margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
        <p>Thank you for your purchase!</p>
        <p>If you have any questions, please contact support.</p>
      </div>
    </div>
  `;
  
  const text = `
Receipt #: ${receiptNumber}
Date: ${receiptDate}

Purchase Details:
${description} x ${itemCount}: $${formattedAmount}
Tax: $${formattedTax}
Total: $${formattedTotal}

Thank you for your purchase!
  `;
  
  return await sendEmail({
    to,
    subject: `Receipt #${receiptNumber} for your purchase`,
    html,
    text,
  });
}