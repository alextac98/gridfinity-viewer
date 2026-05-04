import { notFound } from "next/navigation";
import { AppShell } from "@/shell/AppShell";
import { apps, isRegisteredAppId } from "@/shell/appRegistry";

type AppPageProps = {
  params: Promise<{
    appId: string;
  }>;
};

export default async function AppPage({ params }: AppPageProps) {
  const { appId } = await params;

  if (!isRegisteredAppId(appId)) {
    notFound();
  }

  return <AppShell activeAppId={appId} />;
}

export function generateStaticParams() {
  return apps.map((app) => ({
    appId: app.id,
  }));
}
