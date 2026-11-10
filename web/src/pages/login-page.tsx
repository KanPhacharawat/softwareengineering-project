import { useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, type Location } from 'react-router';
import { CircleAlert, GraduationCap, Loader2 } from 'lucide-react';
import { useAuth } from '@/auth/auth-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api';

type Fields = { email?: string; password?: string };

// /login (F-01): email + password form. Field errors under each input, one error banner for failed login,
// submit button disabled with a spinner while sending (design.md section 6).
export function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const wanted = (location.state as { from?: Location } | null)?.from?.pathname;
  const from = wanted && wanted !== '/login' ? wanted : '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Fields>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Logged in (already, or just now): go to the page the user wanted, or home.
  if (user) return <Navigate to={from} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors: Fields = {};
    if (!email.trim()) errors.email = 'Enter your email';
    if (!password) errors.password = 'Enter your password';
    setFieldErrors(errors);
    if (errors.email || errors.password) {
      (errors.email ? emailRef : passwordRef).current?.focus();
      return;
    }

    setSending(true);
    try {
      await login(email.trim(), password); // sets the user; the redirect above then runs
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') {
        setFieldErrors(err.fields);
      } else {
        setFormError(err instanceof Error ? err.message : 'Something went wrong');
        setPassword('');
        passwordRef.current?.focus();
      }
      setSending(false);
    }
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-8">
      <div className="flex items-center gap-2">
        <GraduationCap className="size-5" />
        <span className="font-semibold">CPMS</span>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 className="text-2xl font-semibold tracking-tight">Log in to CPMS</h1>
          <CardDescription>Use the account given to you for this course.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {formError && (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                ref={emailRef}
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@example.com"
                autoFocus
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              />
              {fieldErrors.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                ref={passwordRef}
                id="password"
                type="password"
                autoComplete="current-password"
                maxLength={200}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              />
              {fieldErrors.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={sending}>
              {sending && <Loader2 className="animate-spin" />}
              Log in
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
