import { request } from '../../shared/api/client'

export type Weights = { punctuality: number; hourBalance: number; tenure: number; positionMatch: number; managerRating: number }
export type Score = { employeeId: string; employeeName: string; score: number; punctuality: number; hourBalance: number; tenure: number; positionMatch: number; managerRating: number; absencePenalty: number; previousWeekMinutes: number; currentWeekMinutes: number; unexcusedAbsences: number }
export type Team = { managerId: string; weekStart: string; positionId: string | null; weights: Weights; items: Score[] }
export type Own = { weekStart: string; score: number }
function query(managerId?: string, week?: string, positionId?: string) {
  const params = new URLSearchParams()
  if (managerId) params.set('managerId', managerId)
  if (week) params.set('week', week)
  if (positionId) params.set('positionId', positionId)
  return params.toString()
}
export const loadPriorityTeam = (managerId?: string, week?: string, positionId?: string) => request<Team>('/priority-scores?' + query(managerId, week, positionId))
export const loadOwnPriority = (week?: string) => request<Own>('/priority-scores/me' + (week ? '?week=' + encodeURIComponent(week) : ''))
export const loadPriorityRatings = (managerId?: string) => request<Record<string, number>>('/priority-scores/ratings?' + query(managerId))
export const savePriorityRating = (employeeId: string, rating: number, managerId?: string) => request<void>('/priority-scores/ratings/' + employeeId + '?' + query(managerId), { method: 'PUT', body: JSON.stringify({ rating }) })
export const savePriorityWeights = (weights: Weights, managerId?: string) => request<Weights>('/priority-scores/weights?' + query(managerId), { method: 'PUT', body: JSON.stringify(weights) })
