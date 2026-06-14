import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Building2, ShieldCheck } from "lucide-react";
import lifelyLogoUrl from "@/assets/lifely-logo.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/dashboard";

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const form = new FormData(event.currentTarget);

    try {
      await login({
        email: String(form.get("email")),
        password: String(form.get("password")),
      });
      navigate(redirectTo, { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const form = new FormData(event.currentTarget);

    try {
      await register({
        tenantName: String(form.get("tenantName")),
        name: String(form.get("name")),
        email: String(form.get("registerEmail")),
        password: String(form.get("registerPassword")),
        passwordConfirmation: String(form.get("passwordConfirmation")),
      });
      navigate("/dashboard", { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create workspace.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background p-4">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_420px]">
        <section className="flex min-h-[520px] flex-col justify-between rounded-lg border bg-white p-8 shadow-subtle">
          <div>
            <img src={lifelyLogoUrl} alt="Lifely" className="h-16 w-auto max-w-full object-contain" />
            <h1 className="mt-8 max-w-xl text-4xl font-semibold tracking-normal text-slate-950">Lifely</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              A calm CRM workspace for property offices to manage leads, listings, lead tasks, and queued communication.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-slate-50 p-4">
              <Building2 className="h-5 w-5 text-sky-700" />
              <p className="mt-3 text-sm font-semibold">Tenant-aware</p>
              <p className="mt-1 text-xs text-muted-foreground">Office data stays scoped by tenant.</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4">
              <ShieldCheck className="h-5 w-5 text-sky-700" />
              <p className="mt-3 text-sm font-semibold">Role-ready</p>
              <p className="mt-1 text-xs text-muted-foreground">Admin and agent flows are represented.</p>
            </div>
          </div>
        </section>

        <Card className="self-center">
          <CardHeader>
            <CardTitle>{mode === "login" ? "Sign in" : "Create workspace"}</CardTitle>
            <CardDescription>Use your Lifely API credentials from the Laravel backend.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={setMode}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign in</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

              <TabsContent value="login">
                <form className="grid gap-4" onSubmit={handleLogin}>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" defaultValue="maya@skyline.example" type="email" autoComplete="email" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" name="password" defaultValue="password" type="password" autoComplete="current-password" />
                  </div>
                  <Button type="submit" className="mt-2" disabled={submitting}>
                    {submitting ? "Signing in" : "Enter workspace"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form className="grid gap-4" onSubmit={handleRegister}>
                  <div className="grid gap-2">
                    <Label htmlFor="tenantName">Office name</Label>
                    <Input id="tenantName" name="tenantName" placeholder="Northstar Realty Office" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="name">Admin name</Label>
                    <Input id="name" name="name" placeholder="Avery Stone" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="registerEmail">Email</Label>
                    <Input id="registerEmail" name="registerEmail" type="email" placeholder="avery@example.com" autoComplete="email" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="registerPassword">Password</Label>
                    <Input id="registerPassword" name="registerPassword" type="password" autoComplete="new-password" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="passwordConfirmation">Confirm password</Label>
                    <Input id="passwordConfirmation" name="passwordConfirmation" type="password" autoComplete="new-password" />
                  </div>
                  <Button type="submit" className="mt-2" disabled={submitting}>
                    {submitting ? "Creating" : "Create workspace"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
