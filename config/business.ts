// Business configuration for Hospedaje Poly
// IMPORTANT: Replace placeholder values before production

export const SINPE_CONFIG = {
  phone: '+506 8XXX-XXXX',      // REPLACE with actual SINPE number
  ownerName: 'Hospedaje Poly',
} as const;

export const WHATSAPP_CONFIG = {
  phone: '+5068XXXXXXXX',       // REPLACE with actual WhatsApp number (no spaces/dashes)
  // Pre-filled message template for payment confirmation
  getPaymentMessage: (reservationId: string, amount: number) => {
    return encodeURIComponent(
      `Hola! Acabo de hacer una reserva (${reservationId}) y envié el pago SINPE de ₡${amount.toLocaleString('es-CR')}. Adjunto comprobante.`
    );
  },
} as const;

export const BUSINESS_INFO = {
  name: 'Hospedaje Poly',
  checkInTime: '15:00',  // 3:00 PM
  checkOutTime: '11:00', // 11:00 AM
  maxOccupancy: 3,
  totalCabins: 5,
} as const;

// Helper to generate WhatsApp URL
export function getWhatsAppUrl(reservationId: string, amount: number): string {
  const message = WHATSAPP_CONFIG.getPaymentMessage(reservationId, amount);
  return `https://wa.me/${WHATSAPP_CONFIG.phone.replace(/[^0-9]/g, '')}?text=${message}`;
}

// Helper to generate SINPE reference
export function generateSinpeReference(cabinName: string, checkIn: string): string {
  const dateStr = checkIn.replace(/-/g, '');
  const cleanCabinName = cabinName.replace(/\s+/g, '');
  return `POLY-${cleanCabinName}-${dateStr}`;
}
