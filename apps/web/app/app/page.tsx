import { redirect } from "next/navigation";

/**
 * The legacy shell lived at /app. The redesigned workspace (NavRail ·
 * SpacePanel · MainArea) at /spaces is now the only app surface — keep this
 * route as a permanent redirect so old bookmarks and deep links still land.
 */
export default function LegacyAppRedirect() {
  redirect("/spaces");
}
