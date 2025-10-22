/**
 * Generates a random alphanumeric invitation code of a given length.
 * @param {number} length - Length of the invitation code.
 * @returns {string} Random invitation code.
 */
export default function generateInvitationCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
