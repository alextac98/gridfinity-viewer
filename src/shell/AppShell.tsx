"use client";

import {
  Boxes,
  Download,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Save,
  Sun,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppUpcoming } from "@/apps/AppUpcoming";
import { apps, getAppPath, type RegisteredAppId } from "./appRegistry";
import styles from "./AppShell.module.css";

function getInitialTheme(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem("gridfinity-theme");

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

type AppShellProps = {
  activeAppId: RegisteredAppId;
};

export function AppShell({ activeAppId }: AppShellProps) {
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);
  const activeApp = apps.find((app) => app.id === activeAppId) ?? apps[0];
  const isDark = theme === "dark";

  useEffect(() => {
    window.localStorage.setItem("gridfinity-theme", theme);
  }, [theme]);

  return (
    <main
      className={`${styles.page} ${
        isSidebarCollapsed ? styles.collapsedPage : ""
      } ${isDark ? styles.darkTheme : ""}`}
    >
      <aside
        className={`${styles.sidebar} ${
          isSidebarCollapsed ? styles.collapsedSidebar : ""
        }`}
      >
        <div className={styles.sidebarHeader}>
          <a className={styles.brand} href="#" aria-label="Gridfinity Center">
            <Boxes aria-hidden="true" size={24} />
            <span>Gridfinity Center</span>
          </a>

          <div className={styles.sidebarControls}>
            <button
              aria-label={
                isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              className={styles.sidebarIconButton}
              onClick={() =>
                setIsSidebarCollapsed((isCollapsed) => !isCollapsed)
              }
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              type="button"
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen aria-hidden="true" size={18} />
              ) : (
                <PanelLeftClose aria-hidden="true" size={18} />
              )}
            </button>
          </div>
        </div>

        <div className={styles.appTabs} role="tablist" aria-label="Apps">
          {apps.map((app) => {
            const Icon = app.icon;
            const isActive = app.id === activeApp.id;

            return (
              <button
                aria-controls={`${app.id}-panel`}
                aria-selected={isActive}
                className={isActive ? styles.activeTab : styles.appTab}
                id={`${app.id}-tab`}
                key={app.id}
                onClick={() => router.push(getAppPath(app.id), { scroll: false })}
                role="tab"
                title={app.name}
                type="button"
              >
                <Icon aria-hidden="true" size={19} />
                <span>{app.name}</span>
                {"comingSoon" in app && app.comingSoon ? (
                  <small className={styles.soonBadge}>Soon</small>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className={styles.sidebarBottom}>
          <button
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className={styles.themeToggle}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            type="button"
          >
            {isDark ? (
              <Sun aria-hidden="true" size={18} />
            ) : (
              <Moon aria-hidden="true" size={18} />
            )}
            <span>{isDark ? "Light mode" : "Dark mode"}</span>
          </button>
        </div>
      </aside>

      <section
        aria-labelledby={`${activeApp.id}-tab`}
        className={styles.workspace}
        id={`${activeApp.id}-panel`}
        role="tabpanel"
      >
        <header className={styles.topbar}>
          <div>
            <p className={styles.eyebrow}>{activeApp.eyebrow}</p>
            <h1>{activeApp.name}</h1>
            <p>{activeApp.description}</p>
          </div>
          <div className={styles.topbarActions}>
            <button type="button" aria-label="Save preset">
              <Save aria-hidden="true" size={18} />
            </button>
            <button type="button" aria-label="Export files">
              <Download aria-hidden="true" size={18} />
            </button>
          </div>
        </header>

        {"Component" in activeApp ? (
          <activeApp.Component accent={activeApp.accent} />
        ) : (
          <AppUpcoming
            accent={activeApp.accent}
            description={activeApp.description}
            icon={activeApp.icon}
            name={activeApp.name}
          />
        )}
      </section>
    </main>
  );
}
