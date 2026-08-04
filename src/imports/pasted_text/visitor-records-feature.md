Simplified Visitor Records Feature (Landlord Dashboard & Visitor Records Settings)

Revise the Visitor Records feature to make it simple, lightweight, and easy to use. The purpose of this feature is only to keep a record of visitors, not to request approval or manage permissions. Visitors do not have accounts in the system. Instead, the student enters the visitor's information through their own account, and the information is automatically recorded for the landlord.

The UI must remain consistent with the DormiTrack design system, using the same Quicksand font, purple gradient theme (#9772F6 → #7549F6), rounded cards, icons, and responsive layout.

1. Profile Update – Visitor Records Settings

In the Landlord Profile page, remove the previous "Boarding House Settings" section related to visitors.

Replace it with a new settings card titled:

Visitor Records Settings

Description:

"Enable Visitor Records if you want students to register their visitors before entering the boarding house. You can choose which visitor information students are required to provide."

Main Toggle

Enable Visitor Records

Options:

🟢 Enabled

⚪ Disabled

When disabled:

The Visitor Records feature is hidden from both the landlord and student.
Students cannot submit visitor information.
Visitor Information Fields

Instead of requiring every field, allow the landlord to decide which information should be collected.

Each item has its own Enable/Disable toggle.

Examples:

☑ Visitor Name

☑ Contact Number

☑ Relationship to Student

☑ Purpose of Visit

☑ Visit Date

The landlord can enable any combination of these fields.

For example:

Visitor Name → Enabled

Contact Number → Disabled

Relationship → Enabled

Purpose → Disabled

Visit Date → Enabled

Only the enabled fields will appear on the student's Visitor Form and in the landlord's Visitor Records.

2. Landlord Home Dashboard – Visitor Records

Keep the Visitor Records section on the Home Dashboard, directly below Reservation Requests.

Instead of displaying a table directly on the dashboard, display a compact card.

Title:

Visitor Records

Display a small notebook/logbook-style card showing:

Total Visitor Records Today
Total Visitor Records This Week

Include a primary button:

📖 View Visitors

Clicking this button should open a modal dialog or expand the section.

Do not navigate to another page.

3. View Visitors Modal

The modal displays all visitor records.

Each visitor record displays:

Visitor Name (only if enabled by the landlord)
Contact Number (only if enabled)
Relationship (only if enabled)
Purpose of Visit (only if enabled)
Visit Date (only if enabled)

Automatically display:

Visiting Student

This field does not need to be entered by the student.

Since the visitor record is submitted from the student's account, the system should automatically display:

Student Name
Student ID (optional)
Assigned Room

This ensures the landlord always knows which student the visitor is visiting.

4. Time Tracking

The system should automatically record visitor entry and exit times.

Time In

When the student submits the visitor form and taps the confirmation button (e.g., "Visitor Has Arrived" or "Confirm Visitor Entry"), the system automatically records:

Time In
Date

No manual input is required.

Time Out

On the Student Home Page, if there is an active visitor, display a small reminder card.

Example:

Current Visitor

"You currently have an active visitor."

Display a button:

Visitor Has Left

or

Confirm Visitor Exit

When the student taps this button:

Automatically record the visitor's Time Out.
Update the visitor record.
Remove the active visitor reminder from the student's Home page.
5. Visitor Record Layout

Inside the View Visitors modal, each visitor record should display:

Visitor Name (if enabled)

Visiting Student (automatically displayed)

Room Number (automatically displayed)

Visit Date (if enabled)

Time In (automatic)

Time Out (automatic if visitor has already left)

Status Badge

Examples:

🟢 Inside

⚪ Left

If the visitor has not yet been marked as having left, display:

Time Out:

Waiting for Student Confirmation

6. Search & Filter

Inside the modal, include:

Search Bar

Search by:

Visitor Name
Student Name

Filters:

Today
This Week
This Month
Currently Inside
Already Left

Sorting:

Newest First
Oldest First
7. Recent Activity Integration

Every visitor action should automatically appear in the Recent Activity section.

Add a new color coding specifically for visitor-related records.

Updated Color Legend:

🟣 Purple — Landlord

🟢 Green — Student

🟠 Orange — Parent

🔵 Blue — Housing Director/Admin

🩷 Pink — Visitor Records

Examples:

🩷 Visitor "Maria Santos" arrived to visit John Dela Cruz.

🩷 Visitor "Maria Santos" left the boarding house.

8. Student Workflow

If Visitor Records is enabled by the landlord:

The student can open the Visitor Record form.

The form will only display the fields that the landlord enabled.

For example, if the landlord enabled only:

Visitor Name
Relationship
Visit Date

Then the student will only see those three fields.

The student does not need to select themselves as the visitor's host, since the system automatically knows which account is submitting the form.

When the student submits the form:

The visitor record is created.
The student's identity is automatically linked.
The assigned room is automatically linked.
Time In is recorded when the student confirms the visitor has arrived.

When the student later taps "Visitor Has Left", the system automatically records the Time Out.

UI & UX Requirements
Keep the Visitor Records feature simple and focused on record-keeping rather than approvals or permissions.
Maintain complete visual consistency with the DormiTrack Student Portal and Landlord Portal.
Open visitor records in a modal or expandable panel without leaving the Home Dashboard.
Automatically display the associated student and room information for every visitor record.
Only display the visitor information fields that the landlord has enabled in Visitor Records Settings.
Automatically update the visitor log, dashboard summary, and Recent Activity whenever a visitor is recorded or marked as having left.
Use clear status badges ("Inside" and "Left") and concise, easy-to-read cards to ensure landlords can quickly review visitor history.