export default function AuthShell({
  theme,
  onThemeToggle,
  title,
  subtitle,
  badge,
  imageUrl,
  highlights,
  children,
  footer,
}) {
  const darkMode = theme === "dark";

  return (
    <div
      className={`min-h-screen ${
        darkMode ? "bg-[#121513] text-[#f7f3ec]" : "bg-[#f6efe6] text-[#172019]"
      }`}
    >
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:grid lg:grid-cols-[1.15fr_0.85fr]">
        <section
          className="relative min-h-[40vh] overflow-hidden px-6 py-8 lg:min-h-screen lg:px-10 lg:py-10"
          style={{
            backgroundImage: `linear-gradient(rgba(18,21,19,0.38), rgba(18,21,19,0.58)), url(${imageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="rounded-md border border-white/25 bg-black/20 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm">
              SpendSpace
            </div>
            <button
              type="button"
              onClick={onThemeToggle}
              className="rounded-md border border-white/25 bg-black/20 px-3 py-2 text-sm text-white transition hover:bg-black/30"
            >
              {darkMode ? "Use light mode" : "Use dark mode"}
            </button>
          </div>

          <div className="mt-14 max-w-xl text-white lg:mt-24">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/80">
              {badge}
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight lg:text-6xl">
              {title}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/85 lg:text-lg">
              {subtitle}
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:mt-16">
            {highlights.map((item) => (
              <div
                key={item.label}
                className="rounded-md border border-white/18 bg-black/18 p-4 text-white backdrop-blur-sm"
              >
                <p className="text-sm text-white/70">{item.label}</p>
                <p className="mt-2 text-xl font-semibold">{item.value}</p>
                <p className="mt-2 text-sm leading-6 text-white/78">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center px-6 py-8 lg:px-10">
          <div
            className={`w-full rounded-md border p-6 shadow-[0_24px_80px_rgba(0,0,0,0.08)] lg:p-8 ${
              darkMode
                ? "border-white/10 bg-white/6"
                : "border-[#d8d0c5] bg-white/88"
            }`}
          >
            {children}
            <div
              className={`mt-6 border-t pt-4 text-sm ${
                darkMode ? "border-white/10 text-[#c9d0c7]" : "border-[#e2d9cf] text-[#546056]"
              }`}
            >
              {footer}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
