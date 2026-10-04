import { Advisor } from "@/components/app/Advisor";

export default async function Page({ searchParams }: PageProps<"/">) {
  const { mock, autostart } = await searchParams;
  return <Advisor mock={mock === "1"} autostart={autostart === "1"} />;
}
