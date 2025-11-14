import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

EMAIL_ENABLED = os.getenv("EMAIL_ENABLED", "false").lower() == "true"
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
EMAIL_USER = os.getenv("EMAIL_USER", "")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", EMAIL_USER)


def send_email(to_email: str, subject: str, body: str, html_body: str = None) -> bool:
    """
    Send email notification to user
    
    Args:
        to_email: Recipient email address
        subject: Email subject line
        body: Plain text email body
        html_body: Optional HTML formatted email body
        
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    if not EMAIL_ENABLED:
        print(f"[EMAIL] Disabled. Would send to {to_email}: {subject}")
        return False
    
    if not EMAIL_USER or not EMAIL_PASSWORD:
        print("[EMAIL] Error: EMAIL_USER or EMAIL_PASSWORD not configured")
        return False
    
    try:
        # Create message
        msg = MIMEMultipart("alternative")
        msg["From"] = EMAIL_FROM
        msg["To"] = to_email
        msg["Subject"] = subject
        
        # Add plain text and HTML parts
        msg.attach(MIMEText(body, "plain"))
        if html_body:
            msg.attach(MIMEText(html_body, "html"))
        
        # Connect to SMTP server and send
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASSWORD)
            server.send_message(msg)
        
        print(f"[EMAIL] Sent to {to_email}: {subject}")
        return True
        
    except Exception as e:
        print(f"[EMAIL] Error sending to {to_email}: {str(e)}")
        return False


def send_medication_reminder(to_email: str, medicine_name: str, dosage: str, timing: str) -> bool:
    """
    Send medication reminder notification
    
    Args:
        to_email: User email address
        medicine_name: Name of the medication
        dosage: Dosage instructions
        timing: Time of day (morning/afternoon/evening/night)
        
    Returns:
        bool: True if sent successfully
    """
    subject = f"💊 MediMind Reminder: {medicine_name}"
    
    body = f"""
Hello,

This is your medication reminder from MediMind.

Medicine: {medicine_name}
Dosage: {dosage}
Time: {timing.capitalize()}

Please take your medication as prescribed.

---
MediMind - AI-Powered Prescription Management
    """.strip()
    
    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .pill-icon {{ font-size: 48px; margin-bottom: 10px; }}
        .medicine-card {{ background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 5px; }}
        .detail {{ margin: 10px 0; }}
        .label {{ font-weight: bold; color: #667eea; }}
        .footer {{ text-align: center; margin-top: 30px; color: #888; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="pill-icon">💊</div>
            <h1>Medication Reminder</h1>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>This is your medication reminder from <strong>MediMind</strong>.</p>
            
            <div class="medicine-card">
                <div class="detail">
                    <span class="label">Medicine:</span> {medicine_name}
                </div>
                <div class="detail">
                    <span class="label">Dosage:</span> {dosage}
                </div>
                <div class="detail">
                    <span class="label">Time:</span> {timing.capitalize()}
                </div>
            </div>
            
            <p>Please take your medication as prescribed.</p>
            
            <div class="footer">
                <p>MediMind - AI-Powered Prescription Management</p>
                <p>This is an automated reminder. Please do not reply to this email.</p>
            </div>
        </div>
    </div>
</body>
</html>
    """.strip()
    
    return send_email(to_email, subject, body, html_body)
