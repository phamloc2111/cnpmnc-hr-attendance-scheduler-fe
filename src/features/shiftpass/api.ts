import { request } from '../../shared/api/client'
import type { AvailableShiftPassItem, ShiftPassItem, ShiftPassNotificationItem } from './types'

export const createShiftPass = (scheduleId: string, reason?: string) =>
  request<ShiftPassItem>('/shift-passes', {
    method: 'POST',
    body: JSON.stringify({ scheduleId, reason: reason?.trim() || undefined }),
  })

export const listMyShiftPasses = () =>
  request<ShiftPassItem[]>('/shift-passes/mine')

export const listAvailableShiftPasses = () =>
  request<AvailableShiftPassItem[]>('/shift-passes/available')

export const claimShiftPass = (id: string) =>
  request<ShiftPassItem>('/shift-passes/' + id + '/claim', { method: 'POST' })

export const cancelShiftPass = (id: string) =>
  request<void>('/shift-passes/' + id, { method: 'DELETE' })

export const listShiftPassNotifications = () =>
  request<ShiftPassNotificationItem[]>('/shift-passes/notifications')
