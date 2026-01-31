'use client';

import { Copy, MessageCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SINPE_CONFIG, getWhatsAppUrl, generateSinpeReference } from '@/config/business';
import { useToast } from '@/hooks/use-toast';

interface SinpeInstructionsProps {
  amount: number;
  cabinName: string;
  checkIn: string;
  reservationId?: string;
}

export function SinpeInstructions({
  amount,
  cabinName,
  checkIn,
  reservationId,
}: SinpeInstructionsProps) {
  const { toast } = useToast();
  const reference = generateSinpeReference(cabinName, checkIn);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        description: `${label} copiado al portapapeles`,
      });
    } catch {
      toast({
        variant: 'destructive',
        description: 'Error al copiar',
      });
    }
  };

  const whatsAppUrl = reservationId
    ? getWhatsAppUrl(reservationId, amount)
    : '#';

  return (
    <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <Phone className="h-5 w-5" />
          Instrucciones de Pago SINPE Móvil
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Para confirmar tu reserva, realiza el pago por SINPE Móvil con los siguientes datos:
        </p>

        {/* Amount */}
        <div className="flex items-center justify-between rounded-lg border bg-background p-3">
          <div>
            <p className="text-xs text-muted-foreground">Monto a pagar</p>
            <p className="text-lg font-bold">₡{amount.toLocaleString('es-CR')}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(amount.toString(), 'Monto')}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        {/* Phone Number */}
        <div className="flex items-center justify-between rounded-lg border bg-background p-3">
          <div>
            <p className="text-xs text-muted-foreground">Número SINPE</p>
            <p className="font-mono font-semibold">{SINPE_CONFIG.phone}</p>
            <p className="text-xs text-muted-foreground">{SINPE_CONFIG.ownerName}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              copyToClipboard(SINPE_CONFIG.phone.replace(/\s/g, ''), 'Número')
            }
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        {/* Reference */}
        <div className="flex items-center justify-between rounded-lg border bg-background p-3">
          <div>
            <p className="text-xs text-muted-foreground">Referencia (en descripción)</p>
            <p className="font-mono text-sm font-semibold">{reference}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(reference, 'Referencia')}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        {/* WhatsApp Button */}
        {reservationId && (
          <Button asChild className="w-full bg-green-600 hover:bg-green-700">
            <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" />
              Enviar comprobante por WhatsApp
            </a>
          </Button>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Tu reserva será confirmada una vez verifiquemos el pago
        </p>
      </CardContent>
    </Card>
  );
}
