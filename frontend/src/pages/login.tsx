import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ModeToggle } from "@/components/mode-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useAuth } from "@/context/auth-context";
import { apiError } from "@/lib/api";

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("admin@erp.local");
  const [password, setPassword] = useState("admin1234");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(name, email, password);
      navigate("/");
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="absolute right-4 top-4 flex items-center gap-1">
        <LanguageSwitcher />
        <ModeToggle />
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
            E
          </div>
          <CardTitle className="text-2xl">{t("app.title")}</CardTitle>
          <CardDescription>{t("auth.signInToContinue")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            {mode === "register" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">{t("common.name")}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? t("auth.signIn") : t("common.create")}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "login" ? "Create an account →" : "← Back to sign in"}
          </button>

          <p className="mt-4 rounded-md bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
            {t("auth.demo")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
