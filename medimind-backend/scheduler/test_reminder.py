"""
Quick test script for medication reminder functionality
Run this to test email sending without waiting for scheduled times
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from notification.service import send_medication_reminder
from scheduler.reminder_scheduler import check_and_send_reminders

def test_single_email():
    """Test sending a single reminder email"""
    print("Testing single email reminder...")
    
    # Replace with actual test email
    test_email = "karthikrayaprolu13@gmail.com"  # ← Change this to your email
    
    result = send_medication_reminder(
        to_email=test_email,
        medicine_name="Paracetamol",
        dosage="1 tablet",
        timing="morning"
    )
    
    if result:
        print(f"✅ Test email sent successfully to {test_email}")
    else:
        print("❌ Email sending failed (check EMAIL_ENABLED in .env)")
    
    return result

def test_scheduler_check():
    """Test the full scheduler check (checks all enabled schedules in DB)"""
    print("\nTesting scheduler check for current time...")
    print("This will check database for enabled schedules and send reminders")
    
    try:
        check_and_send_reminders()
        print("✅ Scheduler check completed")
    except Exception as e:
        print(f"❌ Scheduler check failed: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("MediMind Reminder Test Script")
    print("=" * 60)
    
    print("\nSelect test option:")
    print("1. Send test email (single)")
    print("2. Run scheduler check (checks DB for current time)")
    print("3. Both")
    
    choice = input("\nEnter choice (1-3): ").strip()
    
    if choice in ["1", "3"]:
        test_single_email()
    
    if choice in ["2", "3"]:
        test_scheduler_check()
    
    print("\n" + "=" * 60)
    print("Test completed!")
