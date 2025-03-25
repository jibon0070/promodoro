export const roles = ["general", "super admin", "admin"] as const;

type Role = (typeof roles)[number];

export default Role;
