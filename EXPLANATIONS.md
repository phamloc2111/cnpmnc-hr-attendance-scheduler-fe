# Attendance explanations

Employees use **Attendance explanations** (`#/my-explanations`) to find eligible shifts, submit a reason, and view approval or rejection. Their history is paginated independently of the eligible-shift list. Attendance results also show the explanation review status.

Managers and administrators use **Review explanations** (`#/explanations-management`). Managers see only direct reports. Rejecting a submission requires a written reason. For a late arrival, the optional penalty-exemption checkbox requires written grounds; approving without that checkbox leaves the late deduction in place.

The pages use the configured API base URL and the same authenticated request client as other attendance features. Review outcomes are visible in the employee's history after a refresh.

The submission dialog accepts up to three optional JPEG, PNG, or WebP images (5 MiB each), with previews and removal before sending. Images are sent as multipart form data; submissions without images continue to use JSON. Employees can see their submitted images in history, and managers can view them in the review dialog. Image requests use the bearer token and release temporary browser object URLs when no longer needed.
