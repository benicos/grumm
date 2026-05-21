type GrummBackgroundProps = {
  intensity?: "standard" | "hero" | "subtle";
};

const intensityClasses = {
  hero: "opacity-100",
  standard: "opacity-90",
  subtle: "opacity-70",
} satisfies Record<NonNullable<GrummBackgroundProps["intensity"]>, string>;

export default function GrummBackground({
  intensity = "standard",
}: GrummBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#07111f] ${intensityClasses[intensity]}`}
    >
      {/* Grumm global background: edit these gradients, abstract shapes and opacity values here to adjust the brand atmosphere later. */}
      <div className="absolute inset-0 bg-[linear-gradient(145deg,#07111f_0%,#102038_42%,#07111f_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-12%,rgba(255,209,102,0.18),transparent_42%),radial-gradient(ellipse_at_12%_22%,rgba(106,227,192,0.14),transparent_32%),radial-gradient(ellipse_at_88%_12%,rgba(255,122,144,0.10),transparent_28%),radial-gradient(ellipse_at_70%_96%,rgba(80,132,255,0.10),transparent_36%)]" />
      <div className="absolute left-1/2 top-0 h-[36rem] w-[48rem] -translate-x-1/2 -translate-y-[42%] rounded-full bg-white/[0.055] blur-xl" />
      <div className="absolute -left-32 top-[18%] h-[22rem] w-[24rem] rotate-[-18deg] rounded-full bg-[#6ae3c0]/10 blur-xl" />
      <div className="absolute -right-36 top-[14%] h-[22rem] w-[26rem] rotate-[22deg] rounded-full bg-[#ffd166]/10 blur-xl" />
      <div className="absolute inset-x-0 bottom-[-10rem] h-[24rem] bg-[radial-gradient(ellipse_at_50%_100%,rgba(106,227,192,0.11),transparent_70%)]" />
      <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,0.75)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.75)_1px,transparent_1px)] [background-size:88px_88px]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,31,0.08),rgba(7,17,31,0.38))]" />
    </div>
  );
}
