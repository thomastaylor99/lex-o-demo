import { Screen } from "@/components/app/Screen";

/** The live screen. `?mock=1` plays the scripted conversation, `?autostart=1` skips the welcome screen, `?camera=1` shows the camera switch. */
export default async function Page({ searchParams }: PageProps<"/">) {
  const { mock, autostart } = await searchParams;
  return <Screen mock={mock === "1"} autostart={autostart === "1"} />;
}
