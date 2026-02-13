import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authStorage } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { authApi } from "../lib/api";
import { settingsStorage } from "../lib/settings";
import { toast } from "sonner";
import { formatDateInTimezone } from "../lib/datetime";
import { Skeleton } from "../components/ui/skeleton";

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
  const [email, setEmail] = useState("");
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [timezone, setTimezone] = useState(
    settingsStorage.getResolvedTimezone()
  );
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);

  const timezoneOptions = useMemo(() => {
    const supported = Intl.supportedValuesOf?.("timeZone");
    return supported && supported.length > 0 ? supported : fallbackTimezones;
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoadingProfile(true);
        const profile = await authApi.me();
        setEmail(profile.email);
        setCreatedAt(profile.createdAt);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load profile";
        toast.error(message);
      } finally {
        setLoadingProfile(false);
      }
    };
    void loadProfile();
  }, []);

  const handleLogout = () => {
    authStorage.clearToken();
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
      setSavingPassword(true);
      await authApi.changePassword({
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
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Settings</p>
        <h1 className="text-3xl font-semibold">Preferences</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>Profile details associated with your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Email</p>
            {loadingProfile ? (
              <Skeleton className="mt-1 h-5 w-48" />
            ) : (
              <p className="font-medium">{email || "—"}</p>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Member since</p>
            {loadingProfile ? (
              <Skeleton className="mt-1 h-5 w-28" />
            ) : (
              <p className="font-medium">
                {!createdAt ? "—" : formatDateInTimezone(createdAt, timezone)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timezone</CardTitle>
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
          <CardTitle className="text-base">Security</CardTitle>
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

      <Button variant="outline" onClick={handleLogout}>
        Log out
      </Button>
    </div>
  );
};
