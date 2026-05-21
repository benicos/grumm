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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(255,209,102,0.18),transparent_44%),radial-gradient(ellipse_at_15%_20%,rgba(106,227,192,0.16),transparent_34%),radial-gradient(ellipse_at_88%_8%,rgba(255,122,144,0.11),transparent_30%),radial-gradient(ellipse_at_70%_96%,rgba(80,132,255,0.13),transparent_38%)]" />
      <div className="absolute left-1/2 top-0 h-[58rem] w-[72rem] -translate-x-1/2 -translate-y-[42%] rounded-[48%] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.105),rgba(255,255,255,0.035)_36%,transparent_70%)] blur-3xl" />
      <div className="absolute -left-48 top-[18%] h-[36rem] w-[38rem] rotate-[-18deg] rounded-[42%] bg-[linear-gradient(135deg,rgba(106,227,192,0.16),transparent_66%)] blur-3xl" />
      <div className="absolute -right-52 top-[12%] h-[34rem] w-[42rem] rotate-[22deg] rounded-[46%] bg-[linear-gradient(145deg,rgba(255,209,102,0.16),transparent_65%)] blur-3xl" />
      <div className="absolute inset-x-0 bottom-[-14rem] h-[32rem] bg-[radial-gradient(ellipse_at_50%_100%,rgba(106,227,192,0.13),transparent_68%)] blur-2xl" />
      <div className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,0.75)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.75)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,31,0.08),rgba(7,17,31,0.38))]" />
    </div>
  );
}
