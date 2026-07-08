export const managerRoles = [
  "admin",
  "sales_manager",
  "inventory_manager",
  "production_manager",
  "procurement_manager",
];

export const departmentHome: Record<string, string> = {
  sales: "/sales",
  inventory: "/inventory",
  production: "/production",
  procurement: "/procurement",
};

export function canSeeMainDashboard(role?: string) {
  return Boolean(role && managerRoles.includes(role));
}

export function getUserHomePath(user: { role?: string; department?: string }) {
  if (canSeeMainDashboard(user.role)) {
    return "/";
  }

  if (user.department && departmentHome[user.department]) {
    return departmentHome[user.department];
  }

  return "/profile";
}