import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { authStorage } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { settingsStorage } from "../lib/settings";
import { toast } from "sonner";
import { formatDateInTimezone } from "../lib/datetime";
import { Skeleton } from "../components/ui/skeleton";
import { useChangePasswordMutation, useMeQuery } from "../hooks/queries/useAuthQueries";

const fallbackTimezones = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
];

export const SettingsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const meQuery = useMeQuery();
  const [timezone, setTimezone] = useState(
    settingsStorage.getResolvedTimezone()
  );
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const changePasswordMutation = useChangePasswordMutation();
  const savingPassword = changePasswordMutation.isPending;

  const timezoneOptions = useMemo(() => {
    const supported = Intl.supportedValuesOf?.("timeZone");
    return supported && supported.length > 0 ? supported : fallbackTimezones;
  }, []);

  const handleLogout = () => {
    authStorage.clearToken();
    queryClient.clear();
    navigate("/login");
  };

  const handleSaveTimezone = () => {
    settingsStorage.setTimezone(timezone);
    toast.success("Timezone preference saved.");
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();

    if (passwordForm.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
      toast.success("Password updated.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update password";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6 motion-enter stagger-children">
      <div className="page-header">
        <div>
          <p className="page-kicker">Settings</p>
          <h1 className="page-title">Preferences</h1>
        </div>
        <div className="page-actions">
          <Button variant="outline" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="section-title">Account</CardTitle>
          <CardDescription>Profile details associated with your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Email</p>
            {meQuery.isLoading ? (
              <Skeleton className="mt-1 h-5 w-48" />
            ) : (
              <p className="font-medium">{meQuery.data?.email || "—"}</p>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Member since</p>
            {meQuery.isLoading ? (
              <Skeleton className="mt-1 h-5 w-28" />
            ) : (
              <p className="font-medium">
                {!meQuery.data?.createdAt ? "—" : formatDateInTimezone(meQuery.data.createdAt, timezone)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="section-title">Timezone</CardTitle>
          <CardDescription>
            This preference will be used for due dates, weekly rollups, and reminders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="timezone">Timezone</Label>
          <select
            id="timezone"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {timezoneOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <Button type="button" onClick={handleSaveTimezone}>
            Save timezone
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="section-title">Security</CardTitle>
          <CardDescription>Change your account password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleChangePassword}>
            <div className="grid gap-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                }
                autoComplete="current-password"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                }
                autoComplete="new-password"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-new-password">Confirm new password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                value={passwordForm.confirmNewPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, confirmNewPassword: event.target.value }))
                }
                autoComplete="new-password"
                required
              />
            </div>
            <Button type="submit" disabled={savingPassword}>
              {savingPassword ? "Updating..." : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>

    </div>
  );
};
