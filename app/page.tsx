import Link from 'next/link';
import { Home, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PRICING, BUSINESS_RULES } from '@/types/database.types';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="text-center py-12 space-y-6">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Home className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">Hospedaje Poly</h1>
          <p className="text-xl text-muted-foreground max-w-md mx-auto">
            Tu hogar lejos de casa en Costa Rica
          </p>
          <Button asChild size="lg" className="text-lg px-8">
            <Link href="/book">
              <Calendar className="mr-2 h-5 w-5" />
              Reservar Ahora
            </Link>
          </Button>
        </section>

        {/* Features Section */}
        <section className="py-12">
          <h2 className="text-2xl font-bold text-center mb-8">Nuestras Cabañas</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Ubicación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {BUSINESS_RULES.TOTAL_CABINS} cabañas disponibles en un ambiente tranquilo y natural
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-primary" />
                  Comodidad
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Cabañas equipadas para hasta {BUSINESS_RULES.MAX_OCCUPANCY} huéspedes
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Horarios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Check-in: {BUSINESS_RULES.CHECK_IN_TIME}<br />
                  Check-out: {BUSINESS_RULES.CHECK_OUT_TIME}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-12">
          <h2 className="text-2xl font-bold text-center mb-8">Tarifas</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[1, 2, 3].map((pax) => (
              <Card key={pax} className={pax === 2 ? 'border-primary shadow-lg' : ''}>
                <CardHeader className="text-center">
                  <CardTitle>{pax} {pax === 1 ? 'Huésped' : 'Huéspedes'}</CardTitle>
                  <CardDescription>Por noche</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-3xl font-bold">
                    ₡{PRICING[pax as 1 | 2 | 3].toLocaleString('es-CR')}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">CRC / noche</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 text-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 space-y-4">
              <h3 className="text-xl font-semibold">¿Listo para reservar?</h3>
              <p className="text-muted-foreground">
                Reserva directamente y paga con SINPE Móvil
              </p>
              <Button asChild size="lg" className="w-full">
                <Link href="/book">Hacer Reserva</Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="py-8 text-center text-sm text-muted-foreground border-t">
          <p>&copy; {new Date().getFullYear()} Hospedaje Poly. Todos los derechos reservados.</p>
        </footer>
      </div>
    </main>
  );
}
