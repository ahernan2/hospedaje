'use client';

import { Home, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import type { CabinAvailability } from '@/types/api.types';

interface CabinCardProps {
  cabin: CabinAvailability;
  isSelected: boolean;
  pricePerNight: number;
  onSelect: () => void;
}

export function CabinCard({
  cabin,
  isSelected,
  pricePerNight,
  onSelect,
}: CabinCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary border-primary',
        !cabin.is_available && 'opacity-50 cursor-not-allowed'
      )}
      onClick={() => {
        if (cabin.is_available) {
          onSelect();
        }
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                cabin.is_available
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <Home className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">{cabin.cabin_name}</h3>
              {cabin.is_available ? (
                <p className="text-sm text-muted-foreground">
                  ₡{pricePerNight.toLocaleString('es-CR')} / noche
                </p>
              ) : (
                <p className="text-sm text-destructive">No disponible</p>
              )}
            </div>
          </div>
          {isSelected && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-4 w-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
