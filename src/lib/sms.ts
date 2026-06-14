// Auto-open SMS / WhatsApp / Email for emergency contacts

export interface ContactLite { name: string; phone: string; email?: string | null }
export interface UserInfo { name: string; phone?: string | null; bloodGroup?: string | null; note?: string | null }

export const buildEmergencyMessage = (
  user: UserInfo,
  coords: { lat: number; lng: number } | null,
) => {
  const mapLink = coords ? `https://maps.google.com/?q=${coords.lat},${coords.lng}` : "Location unavailable";
  const lines = [
    `🚨 EMERGENCY - Jeevan Raksha`,
    `${user.name} needs help NOW.`,
    user.phone ? `Phone: ${user.phone}` : null,
    user.bloodGroup ? `Blood: ${user.bloodGroup}` : null,
    user.note ? `Note: ${user.note}` : null,
    `Live location: ${mapLink}`,
    `Police: 100  |  Ambulance: 108`,
  ].filter(Boolean);
  return lines.join("\n");
};

const sanitizePhone = (p: string) => p.replace(/[^\d+]/g, "");

export const openSmsToAll = (contacts: ContactLite[], message: string) => {
  if (!contacts.length) return;
  const numbers = contacts.map((c) => sanitizePhone(c.phone)).join(",");
  const href = `sms:${numbers}?body=${encodeURIComponent(message)}`;
  window.location.href = href;
};

export const openWhatsAppFor = (contact: ContactLite, message: string) => {
  const num = sanitizePhone(contact.phone).replace(/^\+/, "");
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(message)}`, "_blank");
};

export const openEmailToAll = (contacts: ContactLite[], subject: string, message: string) => {
  const emails = contacts.map((c) => c.email).filter(Boolean).join(",");
  if (!emails) return;
  window.location.href = `mailto:${emails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
};
