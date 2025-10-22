export function canSendInvitation(senderRole, targetRole) {
  const permissions = {
    super_admin: ["site_admin", "operator", "client_admin", "client_user"],
    site_admin: ["site_admin", "operator", "client_admin", "client_user"],
    operator: ["site_admin", "operator", "client_admin", "client_user"],
    client_admin: ["client_user"],
  };
  
  return permissions[senderRole]?.includes(targetRole);
}
