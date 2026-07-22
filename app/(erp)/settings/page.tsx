"use client";

import { useAuth } from "@/components/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModeToggle } from "@/components/mode-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="grid gap-6 max-w-md">
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div><Label>Name</Label><p className="text-sm">{user?.name}</p></div>
            <div><Label>Email</Label><p className="text-sm">{user?.email}</p></div>
            <div><Label>Role</Label><p className="text-sm">{user?.role}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Theme</Label><ModeToggle />
            </div>
            <div className="flex items-center justify-between">
              <Label>Language</Label><LanguageSwitcher />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
