export type UserId = string & { readonly __brand: unique symbol };
export type TenantId = string & { readonly __brand: unique symbol };

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}
