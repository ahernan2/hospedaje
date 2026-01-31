'use client';

import { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, LogOut, RefreshCw, AlertCircle, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';

interface Reservation {
  id: string;
  cabin_name: string;
  guest_details: {
    name: string;
    email: string;
    phone: string;
  };
  check_in: string;
  check_out: string;
  pax_count: number;
  total_amount_crc: number;
  status: string;
  payment_status: string;
  source: string;
  notes?: string;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'pending_payment', label: 'Pendiente', color: 'text-amber-600' },
  { value: 'confirmed', label: 'Confirmada', color: 'text-blue-600' },
  { value: 'checked_in', label: 'Check-in', color: 'text-green-600' },
  { value: 'cancelled', label: 'Cancelada', color: 'text-red-600' },
];

const ADMIN_SECRET_KEY = 'hospedaje_admin_secret';

export default function AdminPage() {
  const { toast } = useToast();
  const [adminSecret, setAdminSecret] = useState<string>('');
  const [secretInput, setSecretInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Check for stored admin secret on mount
  useEffect(() => {
    const stored = localStorage.getItem(ADMIN_SECRET_KEY);
    if (stored) {
      setAdminSecret(stored);
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch reservations when authenticated
  const fetchReservations = useCallback(async () => {
    if (!adminSecret) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reservations', {
        headers: {
          'X-Admin-Secret': adminSecret,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Invalid secret - log out
          handleLogout();
          throw new Error('Credenciales inválidas');
        }
        throw new Error(data.error || 'Error al cargar reservas');
      }

      setReservations(data.reservations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, [adminSecret]);

  useEffect(() => {
    if (isAuthenticated && adminSecret) {
      fetchReservations();
    }
  }, [isAuthenticated, adminSecret, fetchReservations]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (secretInput.trim()) {
      localStorage.setItem(ADMIN_SECRET_KEY, secretInput.trim());
      setAdminSecret(secretInput.trim());
      setIsAuthenticated(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_SECRET_KEY);
    setAdminSecret('');
    setSecretInput('');
    setIsAuthenticated(false);
    setReservations([]);
  };

  const handleStatusChange = async (reservationId: string, newStatus: string) => {
    setUpdatingId(reservationId);

    try {
      const response = await fetch(`/api/reservations/${reservationId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Secret': adminSecret,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar');
      }

      // Update local state
      setReservations((prev) =>
        prev.map((r) =>
          r.id === reservationId
            ? { ...r, status: data.status, payment_status: data.payment_status }
            : r
        )
      );

      toast({
        description: 'Estado actualizado correctamente',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        description: err instanceof Error ? err.message : 'Error al actualizar',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find((s) => s.value === status)?.color || 'text-gray-600';
  };

  // Login Form
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
        <Card className="w-full max-w-sm mx-4">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle>Panel de Administración</CardTitle>
            <CardDescription>Hospedaje Poly</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Clave de Administrador</label>
                <Input
                  type="password"
                  placeholder="Ingresa la clave..."
                  value={secretInput}
                  onChange={(e) => setSecretInput(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Ingresar
              </Button>
            </form>
          </CardContent>
        </Card>
        <Toaster />
      </main>
    );
  }

  // Admin Dashboard
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Panel de Administración</h1>
            <p className="text-muted-foreground">Hospedaje Poly - Reservaciones</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReservations}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="p-4 flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && reservations.length === 0 ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : reservations.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No hay reservaciones registradas
            </CardContent>
          </Card>
        ) : (
          /* Reservations Table */
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cabaña</TableHead>
                      <TableHead>Huésped</TableHead>
                      <TableHead>Fechas</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reservations.map((reservation) => (
                      <TableRow key={reservation.id}>
                        <TableCell className="font-medium">
                          {reservation.cabin_name}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{reservation.guest_details.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {reservation.guest_details.phone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>
                              {format(new Date(reservation.check_in), 'd MMM', { locale: es })} -{' '}
                              {format(new Date(reservation.check_out), 'd MMM', { locale: es })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {reservation.pax_count} {reservation.pax_count === 1 ? 'huésped' : 'huéspedes'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          ₡{reservation.total_amount_crc.toLocaleString('es-CR')}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={reservation.status}
                            onValueChange={(value) => handleStatusChange(reservation.id, value)}
                            disabled={updatingId === reservation.id}
                          >
                            <SelectTrigger className={`w-[140px] ${getStatusColor(reservation.status)}`}>
                              {updatingId === reservation.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                  className={option.color}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Summary */}
        {reservations.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{reservations.length}</p>
                <p className="text-xs text-muted-foreground">Total Reservas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {reservations.filter((r) => r.status === 'pending_payment').length}
                </p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {reservations.filter((r) => r.status === 'confirmed').length}
                </p>
                <p className="text-xs text-muted-foreground">Confirmadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {reservations.filter((r) => r.status === 'checked_in').length}
                </p>
                <p className="text-xs text-muted-foreground">Check-in</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <Toaster />
    </main>
  );
}
