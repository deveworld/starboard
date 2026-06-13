const REPO = "https://github.com/deveworld/starboard";
const RAW = "https://github.com/deveworld/starboard/raw/main";

const features = [
  {
    icon: "⌨️",
    title: "6 Mechanical Keys",
    desc: "MX-style switches in a 3×2 grid with through-hole diodes for a clean NKRO matrix.",
  },
  {
    icon: "🎛️",
    title: "Rotary Encoder",
    desc: "EC11 with push-switch — volume by default, RGB control on the FN layer.",
  },
  {
    icon: "🖥️",
    title: "0.91\" OLED",
    desc: "128×32 SSD1306 over I²C showing the device name and active layer.",
  },
  {
    icon: "🌈",
    title: "6× SK6812 RGB",
    desc: "Per-LED addressable underglow, edge-mounted for a soft diffused glow.",
  },
  {
    icon: "🧠",
    title: "Seeed XIAO RP2040",
    desc: "Dual-core RP2040 with native USB-C — no extra support components needed.",
  },
  {
    icon: "🔧",
    title: "QMK Firmware",
    desc: "Fully remappable with layers, encoder maps and a prebuilt UF2 you can flash now.",
  },
];

const specs: { label: string; value: string }[] = [
  { label: "PCB", value: "63.0 × 63.0 mm · 2-layer" },
  { label: "Case", value: "83.8 × 83.8 × 18.5 mm" },
  { label: "MCU", value: "Seeed XIAO RP2040" },
  { label: "Inputs", value: "6 switches + 1 encoder" },
  { label: "Lighting", value: "6 × SK6812 MINI-E" },
  { label: "Display", value: "0.91\" 128×32 OLED" },
  { label: "Fasteners", value: "4 × M3×16 → heatset" },
  { label: "Firmware", value: "QMK · starboard:default" },
];

const bom: { part: string; qty: number }[] = [
  { part: "Seeed XIAO RP2040", qty: 1 },
  { part: "MX-style mechanical switch", qty: 6 },
  { part: "Blank DSA keycap", qty: 6 },
  { part: "EC11 rotary encoder, 20 mm D-shaft", qty: 1 },
  { part: "0.91\" 128×32 OLED display", qty: 1 },
  { part: "SK6812 MINI-E RGB LED", qty: 6 },
  { part: "1N4148 through-hole diode", qty: 6 },
  { part: "M3×16 mm screw", qty: 4 },
  { part: "M3×5×4 mm heatset insert", qty: 4 },
];

const downloads: { label: string; sub: string; href: string }[] = [
  { label: "Firmware (.uf2)", sub: "Flash-ready QMK build", href: `${RAW}/production/firmware.uf2` },
  { label: "Gerbers (.zip)", sub: "Fab-ready PCB output", href: `${RAW}/production/gerbers.zip` },
  { label: "Case — Top (.STEP)", sub: "Top plate", href: `${RAW}/production/Top.STEP` },
  { label: "Case — Bottom (.STEP)", sub: "Bottom shell", href: `${RAW}/production/Bottom.STEP` },
  { label: "KiCad project", sub: "Schematic + PCB sources", href: `${REPO}/tree/main/PCB` },
  { label: "Full source", sub: "Everything on GitHub", href: REPO },
];

type Key = { label: string; sub?: string; accent?: boolean; wide?: boolean };

function Cap({ k }: { k: Key }) {
  return (
    <div
      className={`flex h-16 flex-col items-center justify-center rounded-lg border text-center ${
        k.accent
          ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
          : "border-white/10 bg-white/[0.03] text-zinc-200"
      }`}
    >
      <span className="text-sm font-semibold leading-none">{k.label}</span>
      {k.sub ? <span className="mt-1 text-[10px] text-zinc-500">{k.sub}</span> : null}
    </div>
  );
}

export default function Home() {
  const baseRow1: Key[] = [
    { label: "Esc" },
    { label: "↑" },
    { label: "Mute", sub: "🔇" },
  ];
  const baseRow2: Key[] = [
    { label: "←" },
    { label: "↓" },
    { label: "→", sub: "FN hold", accent: true },
  ];

  return (
    <div className="relative">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07070a]/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <a href="#top" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-emerald-400 to-cyan-400 text-sm font-black text-black">
              S
            </span>
            Starboard
          </a>
          <div className="hidden items-center gap-7 text-sm text-zinc-400 sm:flex">
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#specs" className="transition hover:text-white">Specs</a>
            <a href="#keymap" className="transition hover:text-white">Keymap</a>
            <a href="#bom" className="transition hover:text-white">BOM</a>
            <a href="#downloads" className="transition hover:text-white">Downloads</a>
          </div>
          <a
            href={REPO}
            className="rounded-md border border-white/15 px-3 py-1.5 text-sm font-medium text-zinc-200 transition hover:border-white/30 hover:bg-white/5"
          >
            GitHub ↗
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section id="top" className="bg-grid relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-emerald-500/10 to-transparent" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 md:grid-cols-2 md:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
              ● Hackpad · kit-parts build
            </span>
            <h1 className="mt-5 text-5xl font-black leading-[1.05] tracking-tight text-white md:text-6xl">
              Starboard
            </h1>
            <p className="mt-4 max-w-md text-lg text-zinc-400">
              A compact six-key macropad with a rotary encoder, OLED and RGB — built
              entirely from kit parts around a Seeed XIAO RP2040 and QMK.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={`${RAW}/production/firmware.uf2`}
                className="rounded-lg bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-300"
              >
                ↓ Download firmware
              </a>
              <a
                href={REPO}
                className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5"
              >
                View on GitHub
              </a>
            </div>
            <dl className="mt-10 flex gap-8 text-sm">
              <div>
                <dt className="text-zinc-500">Keys</dt>
                <dd className="text-2xl font-bold text-white">6 + ⟳</dd>
              </div>
              <div>
                <dt className="text-zinc-500">PCB</dt>
                <dd className="text-2xl font-bold text-white">63 mm²</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Layers</dt>
                <dd className="text-2xl font-bold text-white">2</dd>
              </div>
            </dl>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 blur-2xl" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assembled-model-render.png"
              alt="Starboard assembled 3D render"
              className="relative w-full rounded-2xl border border-white/10 shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-3xl font-bold tracking-tight text-white">What&apos;s inside</h2>
        <p className="mt-2 text-zinc-400">Everything you need for a tactile, RGB-lit control deck.</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-white/10 bg-[#101015] p-6 transition hover:border-emerald-400/30 hover:bg-[#13131a]"
            >
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-4 text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Specs */}
      <section id="specs" className="border-y border-white/10 bg-[#0a0a0e]">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-3xl font-bold tracking-tight text-white">Specifications</h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {specs.map((s) => (
              <div key={s.label} className="bg-[#101015] p-5">
                <div className="text-xs uppercase tracking-wide text-zinc-500">{s.label}</div>
                <div className="mt-1.5 font-semibold text-white">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Keymap */}
      <section id="keymap" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-3xl font-bold tracking-tight text-white">Default keymap</h2>
        <p className="mt-2 text-zinc-400">
          Base layer. Hold <span className="font-semibold text-emerald-300">→</span> for the FN layer
          (RGB controls + bootloader).
        </p>
        <div className="mt-10 grid gap-8 md:grid-cols-[auto_1fr] md:items-center">
          <div className="rounded-2xl border border-white/10 bg-[#101015] p-6">
            <div className="mb-4 flex items-center justify-end">
              <div className="flex flex-col items-center">
                <div className="grid h-12 w-12 place-items-center rounded-full border border-cyan-400/40 bg-cyan-400/10 text-cyan-300">
                  ⏯
                </div>
                <span className="mt-1 text-[10px] text-zinc-500">Vol − / +</span>
              </div>
            </div>
            <div className="grid w-64 grid-cols-3 gap-2">
              {baseRow1.map((k, i) => (
                <Cap key={`r1-${i}`} k={k} />
              ))}
              {baseRow2.map((k, i) => (
                <Cap key={`r2-${i}`} k={k} />
              ))}
            </div>
          </div>
          <ul className="space-y-3 text-sm text-zinc-400">
            <li><span className="text-zinc-200">Encoder turn</span> — volume down / up</li>
            <li><span className="text-zinc-200">Encoder press</span> — play / pause</li>
            <li><span className="text-zinc-200">FN layer</span> — RGB toggle, mode, hue/sat/val and <code className="text-emerald-300">QK_BOOT</code></li>
            <li><span className="text-zinc-200">OLED</span> — shows the active layer and device name</li>
          </ul>
        </div>
      </section>

      {/* Gallery */}
      <section id="gallery" className="border-y border-white/10 bg-[#0a0a0e]">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-3xl font-bold tracking-tight text-white">Design files</h2>
          <p className="mt-2 text-zinc-400">Schematic and 2-layer board, designed in KiCad.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { src: "/starboard.svg", title: "Schematic" },
              { src: "/pcb-front.svg", title: "PCB — front" },
              { src: "/pcb-back.svg", title: "PCB — back" },
            ].map((g) => (
              <figure key={g.title} className="overflow-hidden rounded-xl border border-white/10 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.src} alt={g.title} className="aspect-square w-full object-contain p-4" />
                <figcaption className="border-t border-black/10 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-700">
                  {g.title}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* BOM */}
      <section id="bom" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-3xl font-bold tracking-tight text-white">Bill of materials</h2>
        <p className="mt-2 text-zinc-400">Nine components — all from the Hackpad kit.</p>
        <div className="mt-10 overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#101015] text-zinc-400">
              <tr>
                <th className="px-5 py-3 font-medium">Part</th>
                <th className="px-5 py-3 text-right font-medium">Qty</th>
              </tr>
            </thead>
            <tbody>
              {bom.map((b, i) => (
                <tr key={b.part} className={i % 2 ? "bg-[#0c0c11]" : "bg-[#0a0a0e]"}>
                  <td className="border-t border-white/5 px-5 py-3 text-zinc-200">{b.part}</td>
                  <td className="border-t border-white/5 px-5 py-3 text-right font-mono text-emerald-300">×{b.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Downloads */}
      <section id="downloads" className="border-t border-white/10 bg-[#0a0a0e]">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-3xl font-bold tracking-tight text-white">Get the files</h2>
          <p className="mt-2 text-zinc-400">Everything is open-source and fabrication-ready.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {downloads.map((d) => (
              <a
                key={d.label}
                href={d.href}
                className="group flex items-center justify-between rounded-xl border border-white/10 bg-[#101015] p-5 transition hover:border-emerald-400/40 hover:bg-[#13131a]"
              >
                <div>
                  <div className="font-semibold text-white">{d.label}</div>
                  <div className="mt-0.5 text-sm text-zinc-500">{d.sub}</div>
                </div>
                <span className="text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-emerald-300">↗</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 text-sm text-zinc-500 sm:flex-row">
          <p>Starboard — compact RP2040 macropad. Open hardware.</p>
          <div className="flex gap-6">
            <a href={REPO} className="transition hover:text-white">GitHub</a>
            <a href={`${REPO}/tree/main/Firmware`} className="transition hover:text-white">Firmware</a>
            <a href={`${REPO}/tree/main/PCB`} className="transition hover:text-white">PCB</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
