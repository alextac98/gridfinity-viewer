import { ArrowRight, Code2, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { apps, getAppPath } from "./appRegistry";
import styles from "./HomePage.module.css";

function getStatusLabel(app: (typeof apps)[number]) {
  if ("statusTag" in app && app.statusTag) {
    return app.statusTag;
  }

  if ("comingSoon" in app && app.comingSoon) {
    return "soon";
  }

  return "ready";
}

export function HomePage() {
  return (
    <section className={styles.page}>
      <section className={styles.hero} aria-labelledby="home-title">
        <Image
          alt=""
          className={styles.heroImage}
          fill
          priority
          sizes="100vw"
          src="/gridfinity-workbench-hero.png"
        />
        <div className={styles.heroScrim} />

        <div className={styles.heroUtility}>
          <a
            className={styles.sourceLink}
            href="https://github.com/alextac98/gridfinity-viewer"
            rel="noreferrer"
            target="_blank"
          >
            <Code2 aria-hidden="true" size={18} />
            <span>Source</span>
          </a>
        </div>

        <div className={styles.heroContent}>
          <p className={styles.kicker}>
            <Sparkles aria-hidden="true" size={16} />
            Browser-based Gridfinity tools
          </p>
          <h1 id="home-title">Gridfinity Center</h1>
          <p className={styles.heroCopy}>
            Generate bins, baseplates, and printable labels from one focused
            workspace.
          </p>
          <Link className={styles.primaryAction} href={getAppPath(apps[0].id)}>
            Open {apps[0].name}
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </div>
      </section>

      <section className={styles.appsSection} aria-labelledby="apps-title">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Tools</p>
            <h2 id="apps-title">Choose a workspace</h2>
          </div>
          <p>
            Each tool keeps its own settings and opens inside the same
            Gridfinity workspace.
          </p>
        </div>

        <div className={styles.appGrid}>
          {apps.map((app) => {
            const Icon = app.icon;
            const statusLabel = getStatusLabel(app);

            return (
              <Link
                className={styles.appCard}
                href={getAppPath(app.id)}
                key={app.id}
              >
                <span className={styles.appIcon} aria-hidden="true">
                  <Icon size={24} />
                </span>
                <span className={styles.appText}>
                  <span className={styles.appMeta}>
                    <span>{app.eyebrow}</span>
                    <small>{statusLabel}</small>
                  </span>
                  <span className={styles.appName}>{app.name}</span>
                  <span className={styles.appDescription}>
                    {app.description}
                  </span>
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className={styles.appArrow}
                  size={19}
                />
              </Link>
            );
          })}
        </div>
      </section>
    </section>
  );
}
