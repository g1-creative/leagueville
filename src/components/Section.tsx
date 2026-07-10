export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-4">
        <h2 className="display text-[15px] leading-none">{title}</h2>
        <span className="h-px flex-1 bg-rule" />
      </div>
      {children}
    </section>
  )
}
