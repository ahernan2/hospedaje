'use client';

import { BookingProvider, useBooking } from '@/contexts/BookingContext';
import { StepIndicator } from './StepIndicator';
import { DatePaxStep } from './DatePaxStep';
import { CabinSelectStep } from './CabinSelectStep';
import { GuestDetailsStep } from './GuestDetailsStep';
import { ConfirmationStep } from './ConfirmationStep';
import { Card, CardContent } from '@/components/ui/card';

function WizardContent() {
  const { state } = useBooking();

  const renderStep = () => {
    switch (state.step) {
      case 1:
        return <DatePaxStep />;
      case 2:
        return <CabinSelectStep />;
      case 3:
        return <GuestDetailsStep />;
      case 4:
        return <ConfirmationStep />;
      default:
        return <DatePaxStep />;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Step Indicator */}
      <StepIndicator currentStep={state.step} />

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {renderStep()}
        </CardContent>
      </Card>
    </div>
  );
}

export function BookingWizard() {
  return (
    <BookingProvider>
      <WizardContent />
    </BookingProvider>
  );
}
