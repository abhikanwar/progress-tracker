import { useNavigate } from "react-router-dom";
import { authStorage } from "../lib/auth";
import { Button } from "../components/ui/button";

export const SettingsPage = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    authStorage.clearToken();
    navigate("/login");
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Settings</p>
        <h1 className="text-3xl font-semibold">Preferences</h1>
      </div>
      <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
        Settings controls will live here.
      </div>
      <div>
        <Button variant="outline" onClick={handleLogout}>
          Log out
        </Button>
      </div>
    </div>
  );
};
