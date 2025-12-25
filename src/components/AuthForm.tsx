import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import type { AuthError } from '@supabase/supabase-js';

interface Props {
  onSignIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  onSignUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
}

export function AuthForm({ onSignIn, onSignUp }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const result = isSignUp
        ? await onSignUp(email, password)
        : await onSignIn(email, password);

      if (result.error) {
        setError(getErrorMessage(result.error));
      } else if (isSignUp) {
        setMessage('Registrazione completata! Controlla la tua email per confermare l\'account.');
        setEmail('');
        setPassword('');
        setIsSignUp(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (error: AuthError): string => {
    switch (error.message) {
      case 'Invalid login credentials':
        return 'Email o password non corretti';
      case 'User already registered':
        return 'Email già registrata';
      case 'Email not confirmed':
        return 'Conferma la tua email prima di accedere';
      default:
        return error.message;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isSignUp ? 'Registrazione' : 'Accesso'}</CardTitle>
          <CardDescription>
            Gestione Fatture - Regime Forfettario 2025
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tua@email.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                minLength={6}
              />
              {isSignUp && (
                <p className="text-xs text-muted-foreground">
                  Minimo 6 caratteri
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            {message && (
              <p className="text-sm text-green-600">{message}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Caricamento...' : isSignUp ? 'Registrati' : 'Accedi'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setMessage('');
                }}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                {isSignUp
                  ? 'Hai già un account? Accedi'
                  : 'Non hai un account? Registrati'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
