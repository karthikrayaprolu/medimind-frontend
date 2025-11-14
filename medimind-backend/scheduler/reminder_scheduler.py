import os
from datetime import datetime, time
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from bson import ObjectId

from db.mongo import sync_schedules, sync_users
from notification.service import send_medication_reminder

scheduler = BackgroundScheduler()


def check_and_send_reminders():
    """
    Check all enabled schedules and send reminders for current time period
    Runs every hour to check if any medications are due
    """
    print(f"[SCHEDULER] Running reminder check at {datetime.now()}")
    
    current_hour = datetime.now().hour
    
    # Determine current timing period
    if 6 <= current_hour < 12:
        timing_period = "morning"
    elif 12 <= current_hour < 17:
        timing_period = "afternoon"
    elif 17 <= current_hour < 21:
        timing_period = "evening"
    else:
        timing_period = "night"
    
    print(f"[SCHEDULER] Current timing period: {timing_period}")
    
    try:
        # Find all enabled schedules that include current timing
        schedules = list(sync_schedules.find({
            "enabled": True,
            "timings": timing_period
        }))
        
        print(f"[SCHEDULER] Found {len(schedules)} schedules for {timing_period}")
        
        for schedule in schedules:
            try:
                # Get user email
                user = sync_users.find_one({"_id": ObjectId(schedule["user_id"])})
                if not user or "email" not in user:
                    print(f"[SCHEDULER] Skipping schedule {schedule['_id']}: No user email")
                    continue
                
                # Send reminder
                success = send_medication_reminder(
                    to_email=user["email"],
                    medicine_name=schedule["medicine_name"],
                    dosage=schedule["dosage"],
                    timing=timing_period
                )
                
                if success:
                    # Update last_reminder_sent timestamp
                    sync_schedules.update_one(
                        {"_id": schedule["_id"]},
                        {"$set": {"last_reminder_sent": datetime.utcnow()}}
                    )
                    print(f"[SCHEDULER] Sent reminder for {schedule['medicine_name']} to {user['email']}")
                else:
                    print(f"[SCHEDULER] Failed to send reminder for {schedule['medicine_name']}")
                    
            except Exception as e:
                print(f"[SCHEDULER] Error processing schedule {schedule.get('_id')}: {str(e)}")
                continue
        
        print(f"[SCHEDULER] Reminder check completed")
        
    except Exception as e:
        print(f"[SCHEDULER] Error in check_and_send_reminders: {str(e)}")


def start_scheduler():
    """Start the background scheduler for medication reminders"""
    if scheduler.running:
        print("[SCHEDULER] Already running")
        return
    
    # Schedule reminder checks at specific times
    # Morning: 8 AM
    scheduler.add_job(
        check_and_send_reminders,
        CronTrigger(hour=8, minute=0),
        id="morning_reminder",
        name="Morning Medication Reminder",
        replace_existing=True
    )
    
    # Afternoon: 1 PM
    scheduler.add_job(
        check_and_send_reminders,
        CronTrigger(hour=13, minute=0),
        id="afternoon_reminder",
        name="Afternoon Medication Reminder",
        replace_existing=True
    )
    
    # Evening: 6 PM
    scheduler.add_job(
        check_and_send_reminders,
        CronTrigger(hour=18, minute=0),
        id="evening_reminder",
        name="Evening Medication Reminder",
        replace_existing=True
    )
    
    # Night: 9 PM
    scheduler.add_job(
        check_and_send_reminders,
        CronTrigger(hour=21, minute=0),
        id="night_reminder",
        name="Night Medication Reminder",
        replace_existing=True
    )
    
    scheduler.start()
    print("[SCHEDULER] Started with 4 daily reminder checks (8 AM, 1 PM, 6 PM, 9 PM)")


def stop_scheduler():
    """Stop the background scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        print("[SCHEDULER] Stopped")


def get_scheduler_status():
    """Get current scheduler status and jobs"""
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run": str(job.next_run_time) if job.next_run_time else None
        })
    
    return {
        "running": scheduler.running,
        "jobs": jobs
    }
