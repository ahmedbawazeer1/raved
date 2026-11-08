import { Redirect } from "expo-router";
import { useSession } from "@/lib/session";

/** Opens the right place: sign in, or the student's day. */
export default function Index() {
  const { session } = useSession();
  return <Redirect href={session ? "/today" : "/login"} />;
}
