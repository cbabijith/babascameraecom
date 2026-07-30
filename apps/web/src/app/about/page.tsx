import { InfoPage } from "@/components/content/info-page";

export const metadata = { title: "About us" };

export default function AboutPage() {
  return (
    <InfoPage
      eyebrow="Our story"
      title="Photography expertise, dependable service"
      introduction="Baba's Camera helps photographers and creators choose authentic cameras, lenses and accessories with knowledgeable support before and after purchase."
      sections={[
        {
          title: "What we offer",
          body: "A carefully managed catalog of imaging and creator equipment, transparent order updates, secure online payment and supported cash-on-delivery checkout.",
        },
        {
          title: "How we help",
          body: "Our team can help compare compatible gear, understand product availability and follow an existing delivery. Contact us before ordering if you need guidance.",
        },
      ]}
    />
  );
}
