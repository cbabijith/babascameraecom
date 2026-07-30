export function InfoPage({
  eyebrow,
  title,
  introduction,
  sections,
}: {
  eyebrow: string;
  title: string;
  introduction: string;
  sections: { title: string; body: React.ReactNode }[];
}) {
  return (
    <section className="page-shell py-14">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E94560]">
        {eyebrow}
      </p>
      <h1 className="mt-2 max-w-3xl text-4xl font-bold">{title}</h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
        {introduction}
      </p>
      <div className="mt-10 grid max-w-4xl gap-5">
        {sections.map((section) => (
          <article
            key={section.title}
            className="rounded-2xl border border-slate-200 bg-white p-6"
          >
            <h2 className="text-xl font-bold">{section.title}</h2>
            <div className="mt-3 text-sm leading-7 text-slate-600">
              {section.body}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
