import Viewer from "./Viewer";
import Gallery from "./Gallery";

const REPO = "https://github.com/deveworld/starboard";
const RAW = "https://github.com/deveworld/starboard/raw/main";

const hardware: { title: string; desc: string }[] = [
  { title: "Switches", desc: "Six MX-style switches on a 3×2 matrix with 1N4148 through-hole diodes." },
  { title: "Encoder", desc: "EC11 rotary with push-switch — volume by default, lighting on the FN layer." },
  { title: "Display", desc: "0.91-inch 128×32 SSD1306 OLED over I²C, showing layer and device name." },
  { title: "Lighting", desc: "Six SK6812 MINI-E addressable LEDs, edge-mounted for diffused underglow." },
  { title: "Controller", desc: "Seeed XIAO RP2040, dual-core with native USB-C and no extra support parts." },
  { title: "Firmware", desc: "QMK with layers and encoder maps; a prebuilt UF2 is ready to flash." },
];

const specs: { label: string; value: string }[] = [
  { label: "Board", value: "63.0 × 63.0 mm" },
  { label: "Layers", value: "2" },
  { label: "Enclosure", value: "83.8 × 83.8 × 18.5 mm" },
  { label: "Controller", value: "Seeed XIAO RP2040" },
  { label: "Inputs", value: "6 keys + encoder" },
  { label: "Lighting", value: "6 × SK6812 MINI-E" },
  { label: "Display", value: "0.91-in 128×32 OLED" },
  { label: "Fasteners", value: "4 × M3×16 / heatset" },
];

const bom: { part: string; qty: number }[] = [
  { part: "Seeed XIAO RP2040", qty: 1 },
  { part: "MX-style mechanical switch", qty: 6 },
  { part: "Blank DSA keycap", qty: 6 },
  { part: "EC11 rotary encoder, 20 mm D-shaft", qty: 1 },
  { part: "0.91-inch 128×32 OLED display", qty: 1 },
  { part: "SK6812 MINI-E RGB LED", qty: 6 },
  { part: "1N4148 through-hole diode", qty: 6 },
  { part: "M3×16 mm screw", qty: 4 },
  { part: "M3×5×4 mm heatset insert", qty: 4 },
];

const files: { name: string; sub: string; ext: string; href: string }[] = [
  { name: "Firmware", sub: "flash-ready QMK build", ext: "UF2", href: `${RAW}/production/firmware.uf2` },
  { name: "Gerbers", sub: "fabrication output", ext: "ZIP", href: `${RAW}/production/gerbers.zip` },
  { name: "Enclosure, top", sub: "top plate", ext: "STEP", href: `${RAW}/production/Top.STEP` },
  { name: "Enclosure, bottom", sub: "bottom shell", ext: "STEP", href: `${RAW}/production/Bottom.STEP` },
  { name: "KiCad project", sub: "schematic + board", ext: "DIR", href: `${REPO}/tree/main/PCB` },
  { name: "Full source", sub: "everything", ext: "GIT", href: REPO },
];

function SectionHead({ n, title }: { n: string; title: string }) {
  return (
    <div className="mb-9 flex items-baseline justify-between border-b border-ink/20 pb-3">
      <h2 className="display text-2xl font-bold md:text-3xl">{title}</h2>
      <span className="label text-faint">{n}</span>
    </div>
  );
}

export default function Home() {
  const row1 = ["Esc", "↑", "Mute"];
  const row2 = ["←", "↓", "→"];

  return (
    <div id="top" className="mx-auto max-w-5xl border-ink/15 md:border-x">
      {/* Masthead */}
      <header className="flex items-center justify-between border-b border-ink/20 px-6 py-4 md:px-10">
        <a href="#top" className="text-[15px] font-bold tracking-tight">
          Starboard<span className="text-accent">.</span>
        </a>
        <nav className="label hidden items-center gap-7 text-faint sm:flex">
          <a href="#hardware" className="transition-colors hover:text-ink">Hardware</a>
          <a href="#specs" className="transition-colors hover:text-ink">Specs</a>
          <a href="#keymap" className="transition-colors hover:text-ink">Keymap</a>
          <a href="#bom" className="transition-colors hover:text-ink">BOM</a>
          <a href={REPO} className="transition-colors hover:text-accent">GitHub ↗</a>
        </nav>
      </header>

      {/* Hero */}
      <section className="px-6 pb-12 pt-14 md:px-10 md:pb-16 md:pt-20">
        <p className="label text-faint">Open-source mechanical macropad — rev. V5, 2026</p>
        <h1 className="display mt-6 text-6xl font-bold md:text-8xl">Starboard</h1>
        <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink/80">
          A compact six-key macropad with a rotary encoder, OLED and addressable RGB —
          designed entirely around kit parts and a Seeed XIAO&nbsp;RP2040.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3">
          <a
            href={`${RAW}/production/firmware.uf2`}
            className="bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-accent"
          >
            Download firmware
          </a>
          <a href={REPO} className="text-sm font-medium underline decoration-1 underline-offset-4 hover:text-accent">
            Source on GitHub →
          </a>
        </div>
        <p className="label mt-10 text-faint">
          XIAO RP2040 &nbsp;/&nbsp; QMK &nbsp;/&nbsp; KiCad &nbsp;/&nbsp; 3D-printed enclosure
        </p>
      </section>

      {/* Figure 1 — interactive 3D model */}
      <figure className="border-y border-ink/20 bg-card">
        <Viewer />
        <figcaption className="label flex items-center justify-between border-t border-ink/20 px-6 py-2.5 text-faint md:px-10">
          <span>Fig. 01</span>
          <span>Assembled enclosure — interactive</span>
        </figcaption>
      </figure>

      {/* 01 — Hardware */}
      <section id="hardware" className="px-6 py-14 md:px-10">
        <SectionHead n="01" title="Hardware" />
        <ol>
          {hardware.map((f, i) => (
            <li
              key={f.title}
              className="grid grid-cols-[2.5rem_1fr] items-baseline gap-x-5 gap-y-1 border-b border-ink/10 py-5 last:border-b-0 md:grid-cols-[3rem_11rem_1fr]"
            >
              <span className="label text-faint">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="col-start-2 text-[15px] leading-relaxed text-ink/70 md:col-start-3">
                {f.desc}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* 02 — Specifications */}
      <section id="specs" className="border-t border-ink/20 px-6 py-14 md:px-10">
        <SectionHead n="02" title="Specifications" />
        <dl className="grid grid-cols-2 border-l border-t border-ink/15 md:grid-cols-4">
          {specs.map((s) => (
            <div key={s.label} className="border-b border-r border-ink/15 px-4 py-5">
              <dt className="label text-faint">{s.label}</dt>
              <dd className="mt-2 text-[15px] font-medium">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 03 — Keymap */}
      <section id="keymap" className="border-t border-ink/20 px-6 py-14 md:px-10">
        <SectionHead n="03" title="Default keymap" />
        <div className="grid gap-10 md:grid-cols-[auto_1fr] md:items-start md:gap-16">
          <div>
            <div className="mb-3 flex justify-end">
              <div className="flex flex-col items-end">
                <div className="grid h-11 w-11 place-items-center rounded-full border border-ink/40 text-sm">⏯</div>
                <span className="label mt-1.5 text-faint">vol −/+</span>
              </div>
            </div>
            <div className="grid w-60 grid-cols-3 gap-1.5">
              {[...row1, ...row2].map((k, i) => {
                const fn = i === 5;
                return (
                  <div
                    key={i}
                    className={`flex h-14 items-center justify-center border text-sm font-medium ${
                      fn ? "border-ink bg-ink text-paper" : "border-ink/30 bg-card"
                    }`}
                  >
                    {k}
                  </div>
                );
              })}
            </div>
            <p className="label mt-3 text-faint">filled key = FN (hold)</p>
          </div>
          <dl className="divide-y divide-ink/10 border-t border-ink/10 text-[15px]">
            {[
              ["Encoder turn", "Volume down / up"],
              ["Encoder press", "Play / pause"],
              ["FN layer", "RGB toggle, mode, hue / sat / val, and QK_BOOT"],
              ["OLED", "Shows the active layer and device name"],
            ].map(([t, d]) => (
              <div key={t} className="grid grid-cols-[8rem_1fr] gap-4 py-3">
                <dt className="label pt-0.5 text-faint">{t}</dt>
                <dd className="text-ink/80">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 04 — Design files */}
      <section id="design" className="border-t border-ink/20 px-6 py-14 md:px-10">
        <SectionHead n="04" title="Design files" />
        <p className="label mb-6 text-faint">Click any figure to enlarge</p>
        <Gallery />
      </section>

      {/* 05 — Bill of materials */}
      <section id="bom" className="border-t border-ink/20 px-6 py-14 md:px-10">
        <SectionHead n="05" title="Bill of materials" />
        <table className="w-full text-[15px]">
          <thead>
            <tr className="label border-b-2 border-ink text-faint">
              <th className="py-2 text-left font-normal">Component</th>
              <th className="py-2 text-right font-normal">Qty</th>
            </tr>
          </thead>
          <tbody>
            {bom.map((b) => (
              <tr key={b.part} className="border-b border-ink/10">
                <td className="py-3 pr-4">{b.part}</td>
                <td className="py-3 text-right font-mono tabular-nums text-ink/70">{b.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 06 — Files */}
      <section id="files" className="border-t border-ink/20 px-6 py-14 md:px-10">
        <SectionHead n="06" title="Files" />
        <ul>
          {files.map((d) => (
            <li key={d.name}>
              <a
                href={d.href}
                className="group flex items-baseline justify-between gap-4 border-b border-ink/10 py-4 transition-colors hover:text-accent"
              >
                <span className="text-[15px]">
                  <span className="font-medium">{d.name}</span>
                  <span className="text-faint"> — {d.sub}</span>
                </span>
                <span className="label whitespace-nowrap text-faint group-hover:text-accent">
                  {d.ext} ↗
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* Footer */}
      <footer className="flex flex-col gap-2 border-t-2 border-ink px-6 py-8 text-faint md:flex-row md:items-center md:justify-between md:px-10">
        <p className="label">Starboard — open hardware · CC / GPL</p>
        <p className="label">Built with KiCad, QMK &amp; a 3D printer</p>
      </footer>
    </div>
  );
}
