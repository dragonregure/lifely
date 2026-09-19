import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, RotateCcw, ShieldCheck } from "lucide-react";
import { LoadingState } from "@/components/Loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import type { Tenant, User, UserAccess } from "@/types";

type OverviewSettingsProps = {
  access: UserAccess | null;
  groupedEffectivePermissions: Record<string, string[]>;
  isLoading: boolean;
  isSaving: boolean;
  members: User[];
  reloadRbac: () => Promise<void>;
  tenant: Tenant | null;
  user: User | null;
};

export function OverviewSettings({
  access,
  groupedEffectivePermissions,
  isLoading,
  isSaving,
  members,
  reloadRbac,
  tenant,
  user,
}: OverviewSettingsProps) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [securityNotice, setSecurityNotice] = useState("");
  const [securityError, setSecurityError] = useState("");
  const [isRefreshingSession, setIsRefreshingSession] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isRevokingTokens, setIsRevokingTokens] = useState(false);

  const handleRefreshTokens = async () => {
    setSecurityNotice("");
    setSecurityError("");
    setIsRefreshingSession(true);

    try {
      await auth.refreshTokens();
      setSecurityNotice("Session refreshed.");
    } catch (error) {
      setSecurityError(error instanceof Error ? error.message : "Could not refresh the session.");
    } finally {
      setIsRefreshingSession(false);
    }
  };

  const handleUpdatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSecurityNotice("");
    setSecurityError("");
    setIsUpdatingPassword(true);

    const form = new FormData(event.currentTarget);

    try {
      await auth.updatePassword({
        currentPassword: String(form.get("currentPassword") ?? ""),
        password: String(form.get("password") ?? ""),
        passwordConfirmation: String(form.get("passwordConfirmation") ?? ""),
      });
      navigate("/login", { replace: true });
    } catch (error) {
      setSecurityError(error instanceof Error ? error.message : "Could not update the password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleRevokeAllTokens = async () => {
    const confirmed = window.confirm("Revoke all active sessions for this account?");

    if (!confirmed) {
      return;
    }

    setSecurityNotice("");
    setSecurityError("");
    setIsRevokingTokens(true);

    try {
      await auth.revokeAllTokens();
      navigate("/login", { replace: true });
    } catch (error) {
      setSecurityError(error instanceof Error ? error.message : "Could not revoke sessions.");
    } finally {
      setIsRevokingTokens(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>{tenant?.name ?? "Office"}</CardTitle>
            <CardDescription>Tenant ID: {tenant?.id ?? "Pending"}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="mt-1 font-semibold">{isLoading ? "Loading" : tenant?.plan ?? "Growth"}</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="mt-1 font-semibold">{isLoading ? "Loading" : tenant?.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : "Unknown"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Signed in access</CardTitle>
            <CardDescription>Roles and permissions returned by the backend for the current user.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <p className="text-sm text-muted-foreground">User</p>
              <p className="mt-1 font-semibold">{isLoading ? "Loading" : user?.name ?? "Unknown"}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Roles</p>
              <div className="flex flex-wrap gap-2">
                {(access?.roles ?? user?.roles ?? []).map((role) => (
                  <Badge key={role} variant={role === "Office Admin" ? "info" : "secondary"}>
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
            <Button variant="outline" className="w-fit" onClick={() => void reloadRbac()} isLoading={isSaving} loadingLabel="Refreshing access">
              {!isSaving && <RotateCcw className="h-4 w-4" />}
              Refresh access
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account security</CardTitle>
          <CardDescription>Manage your access token pair and password-backed sessions.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {(securityNotice || securityError) && (
            <div className={`rounded-md border p-3 text-sm ${securityError ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
              {securityError || securityNotice}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void handleRefreshTokens()} isLoading={isRefreshingSession} loadingLabel="Refreshing session">
              {!isRefreshingSession && <RotateCcw className="h-4 w-4" />}
              Refresh session
            </Button>
            <Button variant="destructive" onClick={() => void handleRevokeAllTokens()} isLoading={isRevokingTokens} loadingLabel="Revoking sessions">
              {!isRevokingTokens && <ShieldCheck className="h-4 w-4" />}
              Revoke all sessions
            </Button>
          </div>

          <form className="grid gap-4 md:grid-cols-3" onSubmit={handleUpdatePassword}>
            <div className="grid gap-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input id="newPassword" name="password" type="password" autoComplete="new-password" required minLength={12} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="passwordConfirmation">Confirm password</Label>
              <Input id="passwordConfirmation" name="passwordConfirmation" type="password" autoComplete="new-password" required minLength={12} />
            </div>
            <div className="md:col-span-3">
              <Button type="submit" isLoading={isUpdatingPassword} loadingLabel="Updating password">
                {!isUpdatingPassword && <KeyRound className="h-4 w-4" />}
                Update password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>Current office members and their primary display roles.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
              {isLoading ? <LoadingState label="Loading members" /> : <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(member.roles.length > 0 ? member.roles : [member.role]).map((role) => (
                          <Badge key={role} variant={role === "Office Admin" ? "info" : "secondary"}>
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Effective permissions</CardTitle>
          <CardDescription>Grouped permissions for the signed-in user. Backend policies remain authoritative.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {isLoading ? <LoadingState label="Loading permissions" /> : Object.entries(groupedEffectivePermissions).map(([group, names]) => (
              <div key={group} className="rounded-md border bg-slate-50 p-3">
                <p className="mb-2 text-sm font-semibold capitalize">{group}</p>
                <div className="flex flex-wrap gap-1">
                  {names.map((permission) => (
                    <Badge key={permission} variant="muted">
                      {permission}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
