export const UserRole = {
  ADMIN: 'admin',
  STORE_MANAGER: 'store_manager',
  CUSTOMER: 'customer',
  SALES: 'sales',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
