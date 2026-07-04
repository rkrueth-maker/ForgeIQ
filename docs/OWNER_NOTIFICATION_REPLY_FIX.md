# Highway 38 Solutions — Owner Notification Reply Fix

## Problem found during live request test

The Google Form request path works, but the owner notification email is sent from the owner inbox to the owner inbox. If the owner hits **Reply**, the response goes back to the owner instead of the customer.

## Immediate rule

Do not hit **Reply** on `New Highway 38 Request` notification emails.

Instead, copy the customer email or phone from the action block and start a new email or text to the customer.

## Owner notification email should include this block at the top

```text
ACTION REQUIRED — DO NOT HIT REPLY

This notification was sent to the owner inbox.
To contact the customer, start a NEW email or text using the customer info below.

Customer name: {{Name}}
Customer email: {{Email}}
Customer phone/text: {{Phone number}}
Best contact method: {{Best way to contact you}}

Recommended first response:
{{Recommended first response}}
```

## Better owner notification body template

```text
New Highway 38 Solutions Request

ACTION REQUIRED — DO NOT HIT REPLY
This notification was sent to the owner inbox.
To contact the customer, start a NEW email or text using the customer info below.

CUSTOMER CONTACT
Name: {{Name}}
Email: {{Email}}
Phone/text: {{Phone number}}
Best contact: {{Best way to contact you}}

REQUEST SUMMARY
Desk: {{What desk fits your problem best?}}
Package: {{What package sounds closest?}}
Problem: {{What do you need help with?}}
Desired outcome: {{What outcome do you want?}}
Messy / confusing / costing time: {{What is messy, confusing, or costing time?}}
Photos/files/links: {{Do you have photos, screenshots, files, or links?}}
Notes/details: {{Measurements, rough notes, or important details}}
Budget: {{Budget range}}
Timeline: {{How soon do you need this?}}
Anything else: {{Anything else I should know?}}

OWNER NEXT STEP
1. Classify lead.
2. Check if enough info exists for a Problem Snapshot or package reply.
3. Start a NEW message to the customer.
4. Do not reply to this notification email.

Tracker:
{{Tracker link}}
```

## Safer first-response template

```text
Hi {{Name}},

Thanks for sending the Highway 38 Solutions request.

I reviewed what you sent. The best starting point looks like {{recommended_package}} because {{short_reason}}.

The next useful step is to sort out:

1. {{step_1}}
2. {{step_2}}
3. {{step_3}}

To move forward, send {{missing_info_request}}. Photos, screenshots, notes, or a rough explanation are enough.

Big problems. Clear plans.
Highway 38 Solutions
```

## Source to fix

This likely needs to be updated in the Google Form / Google Sheet Apps Script automation, not the website repo. The website only sends visitors to the form. The form or automation sends the owner email and customer confirmation.
