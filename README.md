# 🛒 Lidl Vacancy & Recruitment Automation
**Version:** 3.0 (4-Person Core Team)  
**Last Updated:** 30/03/2026  
**Primary Platform:** Google Apps Script / Google Sheets

## 📋 Overview
This system automates the lifecycle of vacancy management for the recruitment team. It handles the **Round-Robin distribution** of new roles, tracks **assignment history**, and manages the **Friday reporting cycle** for regional stakeholders (NFL, BEL, EXE).

---

## 👥 Current Recruitment Team
The system is currently configured for a 4-person rotation:
* **JO** (Josephine Oluyitan)
* **HS** (Haydn Scott)
* **MS** (Mahyar Shami)
* **HW** (Harriet Winter)

*Note: AB and HV have been decommissioned from the automation as of March 2026.*

---

## ⚙️ Core Logic & Files

### 1. `Assignments.gs`
Handles the daily "Round-Robin" and manual assignment triggers.
* **`processRoles()`**: Triggered when a job title is entered in Column E. It assigns the next recruiter in the rotation (JO -> HS -> MS -> HW) and logs the entry in `Assignment_History`.
* **`installedOnEdit()`**: A ghost-proofing trigger. If you manually type a recruiter's initials in Column A, it checks if the role is new, logs it, and sends an automated "New Assignment" email.
* **Workload Tracker**: Calculates the total open vacancies per recruiter for a quick management overview.

### 2. `Reporting.gs`
Manages the critical Friday reporting window.
* **9:00 AM Dispatch (`sendIndividualUpdates`)**: Generates 4 separate Google Sheets containing only the roles assigned to each recruiter and emails them a direct link.
* **12:00 PM Consolidation (`consolidateAndSend`)**:
    * Scans the update folder for today’s date.
    * **Duplicate-Proofing**: If a recruiter has multiple files for the same day, the script keeps only the entry with a valid note.
    * **Regional Separation**: Automatically splits data into 3 distinct emails for **NFL, BEL,** and **EXE** leads.
    * **Preview Mode**: Sends a consolidated test to the Lead Account (MS) before the final blast.

---

## 📅 The Weekly Rhythm

| Time | Action | Description |
| :--- | :--- | :--- |
| **Mon–Thu** | Daily Assignments | As roles are added to the "Live Vacancies" sheet, they are automatically assigned. |
| **Fri 9:00 AM** | Document Dispatch | Recruiters receive their personal update sheets via email. |
| **Fri 12:00 PM** | Consolidation | Notes are pulled from all 4 sheets and organized by region. |
| **Fri 12:15 PM** | Final Review | Lead Account reviews the "Preview" and clicks "Finalise" to update stakeholders. |

---

## 🛠️ Maintenance & Updates

### Adding/Removing a Recruiter
To modify the team, update the `ACTIVE_TEAM` and `RECRUITER_EMAILS` variables at the top of **both** `.gs` files.
```javascript
var ACTIVE_TEAM = ["JO", "HS", "MS", "HW"];
