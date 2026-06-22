import { useTranslation } from "react-i18next";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/theme-provider";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: "light", label: t("settings.light"), icon: Sun },
    { value: "dark", label: t("settings.dark"), icon: Moon },
    { value: "system", label: t("settings.system"), icon: Monitor },
  ] as const;

  const langs = [
    { code: "en", label: "English" },
    { code: "zh", label: "中文 (Chinese)" },
    { code: "km", label: "ខ្មែរ (Khmer)" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("settings.title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.appearance")}</CardTitle>
          <CardDescription>{t("settings.theme")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid max-w-md grid-cols-3 gap-3">
            {themes.map((th) => (
              <button
                key={th.value}
                onClick={() => setTheme(th.value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition-colors",
                  theme === th.value ? "border-primary bg-accent" : "hover:bg-accent"
                )}
              >
                <th.icon className="h-5 w-5" />
                {th.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("settings.language")}</CardTitle>
          <CardDescription>English · 中文 · ខ្មែរ</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md space-y-2">
            {langs.map((l) => (
              <button
                key={l.code}
                onClick={() => i18n.changeLanguage(l.code)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors",
                  i18n.language === l.code ? "border-primary bg-accent" : "hover:bg-accent"
                )}
              >
                {l.label}
                {i18n.language === l.code && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
