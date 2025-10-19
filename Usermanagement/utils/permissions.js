// utils/permissions.js
function canSendInvitation(senderRole, targetRole) {
  const permissions = {
    super_admin: ["site_admin", "operator","client_admin"],
    site_admin: ["site_admin", "operator", "client_admin"],
    operator: ["site_admin", "operator", "client_admin"],
    client_admin: ["client_user"],
  };
  
  return permissions[senderRole]?.includes(targetRole);
}

module.exports = { canSendInvitation };
