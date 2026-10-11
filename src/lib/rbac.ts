export type Role =
  | 'super_admin'
  | 'director'
  | 'sales_manager'
  | 'sales_executive'
  | 'survey_engineer'
  | 'design_engineer'
  | 'procurement_manager'
  | 'warehouse_manager'
  | 'installation_manager'
  | 'technician'
  | 'reviewer'
  | 'net_metering_coordinator'
  | 'om_engineer'
  | 'finance'
  | 'customer'
  | 'supplier'
  | 'ai_agent';

export const rolePermissions: Record<Role, string[]> = {
  super_admin: ['*'],
  director: ['quotes:approve', 'projects:manage'],
  sales_manager: ['leads:manage', 'quotes:create', 'quotes:approve'],
  sales_executive: ['leads:create', 'leads:read', 'quotes:create'],
  survey_engineer: ['surveys:create', 'surveys:read'],
  design_engineer: ['design:read', 'design:write'],
  procurement_manager: ['procurement:manage'],
  warehouse_manager: ['inventory:manage'],
  installation_manager: ['work_orders:manage'],
  technician: ['work_orders:read', 'task:evidence:create'],
  reviewer: ['design:review', 'quotes:review'],
  net_metering_coordinator: ['nem:manage'],
  om_engineer: ['tickets:manage', 'monitoring:read'],
  finance: ['payments:read', 'quotes:approve'],
  customer: ['customer:read', 'documents:read'],
  supplier: ['supplier:read'],
  ai_agent: ['ai:orchestrate', 'recommendations:read'],
};

export function authorize(role: Role, permission: string): boolean {
  const permissions = rolePermissions[role] ?? [];
  return permissions.includes('*') || permissions.includes(permission);
}

