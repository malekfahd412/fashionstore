---
name: Contact reply flow
description: Admin reply to contact form messages via email
---

## Backend

`POST /api/admin/contact-messages/:id/reply` in `artifacts/api-server/src/routes/contact.ts`:
1. Validates message body
2. Fetches the contact message by ID
3. Updates status to "replied" in DB
4. Sends reply email via `sendContactReply(email, name, message)` in a non-blocking void IIFE
5. Returns `{ message: "Reply sent" }`

`sendContactReply` in `artifacts/api-server/src/lib/email.ts` — sends branded email with the reply message in a left-bordered blockquote.

## Frontend (AdminContactMessagesTab)

State added: `replyText`, `replying`, `replySuccess`  
`selectMsg()` helper resets reply state when switching messages.  
Success message auto-clears after 3 seconds via setTimeout.

**Why:** Email send is non-blocking so API response is instant even if Resend is slow.
