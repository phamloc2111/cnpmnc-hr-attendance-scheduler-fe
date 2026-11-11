# Employee diligence (SYNC-32)

The employee home page shows recorded work hours and the current month's diligence score. The **My diligence** page (`#/my-diligence`) displays a selected month and week, with separate period totals and a per-day deduction history. Weeks use Monday–Sunday boundaries and may cross a month. Entries show component reasons, raw points, and the applied daily total when the 20-point cap applies.

All data comes from the authenticated employee-only diligence API. Loading and failures have their own states; an API error does not display a fabricated zero score. Work time includes only shifts with both server-recorded check-in and check-out, less the scheduled break.
