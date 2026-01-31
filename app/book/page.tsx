import { BookingWizard } from '@/components/booking';
import { Toaster } from '@/components/ui/toaster';

export const metadata = {
  title: 'Reservar - Hospedaje Poly',
  description: 'Reserva tu cabaña en Hospedaje Poly, Costa Rica',
};

export default function BookPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Hospedaje Poly</h1>
          <p className="text-muted-foreground">
            Reserva tu cabaña para una experiencia inolvidable
          </p>
        </header>

        {/* Booking Wizard */}
        <BookingWizard />

        {/* Toast notifications */}
        <Toaster />
      </div>
    </main>
  );
}
