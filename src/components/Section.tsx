export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-bold">{title}</h2>
      {children}
    </section>
  )
}
