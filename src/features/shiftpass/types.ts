export type ShiftPassStatus = 'OPEN' | 'CLAIMED' | 'CANCELLED' | 'EXPIRED'

export type ShiftPassItem = {
  id: string
  scheduleId: string
  requesterId: string
  requesterName: string
  claimerId: string | null
  claimerName: string | null
  workDate: string
  shiftName: string
  startsAt: string
  endsAt: string
  breakMinutes: number
  workingMinutes: number
  requiredPositionId: string | null
  requiredPosition: string | null
  reason: string | null
  status: ShiftPassStatus
  createdAt: string
  claimedAt: string | null
  notifiedCount: number
}

export type AvailableShiftPassItem = {
  id: string
  scheduleId: string
  requesterId: string
  requesterName: string
  workDate: string
  shiftName: string
  startsAt: string
  endsAt: string
  breakMinutes: number
  workingMinutes: number
  requiredPositionId: string | null
  requiredPosition: string | null
  reason: string | null
  createdAt: string
  eligible: boolean
  ineligibleReason: string | null
  currentWeekMinutes: number
  maxWeeklyMinutes: number
}

export type ShiftPassNotificationItem = {
  id: string
  shiftPassId: string
  kind: string
  title: string
  body: string
  status: string
  createdAt: string
  closedAt: string | null
}
