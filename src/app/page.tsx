import { redirect } from "next/navigation";
import { defaultAppId, getAppPath } from "@/shell/appRegistry";

export default function Home() {
  redirect(getAppPath(defaultAppId));
}
