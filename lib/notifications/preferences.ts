export type NotificationCategory =
  | 'bill'
  | 'transaction'
  | 'offering'
  | 'report'
  | 'system'
  | 'general'
  | 'member'

export interface NotificationCategoryPreferences {
  bill: boolean
  transaction: boolean
  offering: boolean
  report: boolean
  system: boolean
  general: boolean
  member: boolean
}

export const DEFAULT_NOTIFICATION_CATEGORY_PREFERENCES: NotificationCategoryPreferences = {
  bill: true,
  transaction: true,
  offering: true,
  report: true,
  system: true,
  general: true,
  member: true,
}

export interface StoredNotificationPreferences {
  email?: boolean
  push?: boolean
  desktop?: boolean
  sound?: boolean
  categories?: Partial<NotificationCategoryPreferences>
}

export function shouldSendEmailForCategory(
  preferences: StoredNotificationPreferences | null | undefined,
  category: string
): boolean {
  if (preferences?.email === false) {
    return false
  }

  const categories = {
    ...DEFAULT_NOTIFICATION_CATEGORY_PREFERENCES,
    ...(preferences?.categories ?? {}),
  }

  const key = category as NotificationCategory
  if (key in categories) {
    return categories[key as keyof NotificationCategoryPreferences]
  }

  return categories.general
}
