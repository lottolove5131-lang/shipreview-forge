# Shipment Schedule Change Review for Jira

Export coordinators track each shipment as a Jira issue and keep the ETD in the **Due date** field.
When the carrier rolls a booking or a port is congested, the date moves again and again.
A week later nobody remembers how far it moved, who moved it, or why — and the customer asks.

This app answers that on the issue itself.

## What it does

**Issue panel — "Shipment Schedule Changes"**
- Baseline ETD (the first value ever set) vs. current ETD, and the total shift in days
- Every Due date change: when, who, from → to, shift in days
- The reason, quoted from the comment the same person wrote right after the change, with a link to that comment
- Changes with no such comment are marked **Reason not recorded** — the app never guesses

**Rovo agent — "Shipment Schedule Reviewer"**
- Calls the `get-schedule-changes` action and explains the history in plain words
- Lists changes without a recorded reason
- Drafts a customer update that states the new ETD and only the reasons that were actually written

## How reasons are matched

For each Due date change, the app looks for a comment by the same person, posted no earlier than
one hour before the change and no later than 24 hours after it, and never past the previous or next
Due date change. Each comment explains at most one change. If none fits, the change is "Reason not recorded".

## Data and permissions

- Scope: `read:jira-work` only. All requests run `asUser()`, so people only see issues they can already open.
- No storage, no external calls, no data leaves Atlassian.
- The demo site uses fictional bookings only.

## Run it

```
npm install
forge deploy
forge install
```

Open any issue → panel **Shipment Schedule Changes**. In Rovo chat, pick **Shipment Schedule Reviewer**.

## Tests

`node test/schedule.test.mjs` (pure logic: baseline, shifts, reason matching, rapid consecutive changes).
