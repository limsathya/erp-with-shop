"use client";

import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const langs = [
    { code: "en", label: "EN" },
    { code: "zh", label: "中文" },
    { code: "km", label: "ខ្មែរ" },
  ];

  return (
    <div className="flex gap-1">
      {langs.map((l) => (
        <Button
          key={l.code}
          variant={i18n.language === l.code ? "default" : "ghost"}
          size="sm"
          onClick={() => i18n.changeLanguage(l.code)}
        >
          {l.label}
        </Button>
      ))}
    </div>
  );
}
