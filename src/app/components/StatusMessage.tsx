import {
  CheckCircle2,
  CircleAlert,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

export type StatusMessageTone = "error" | "success" | "info" | "warning";

type StatusMessageProps = {
  children: React.ReactNode;
  className?: string;
  title: string;
  tone: StatusMessageTone;
};

const toneStyles: Record<
  StatusMessageTone,
  {
    Icon: LucideIcon;
    iconClassName: string;
    panelClassName: string;
    titleClassName: string;
  }
> = {
  error: {
    Icon: CircleAlert,
    iconClassName: "bg-red-200 text-[#3a0710]",
    panelClassName:
      "border-red-300/32 bg-red-500/12 text-red-50 shadow-[0_18px_58px_rgba(220,38,38,0.16)]",
    titleClassName: "text-red-50",
  },
  info: {
    Icon: Info,
    iconClassName: "bg-sky-200 text-[#071b2a]",
    panelClassName:
      "border-sky-300/28 bg-sky-500/10 text-sky-50 shadow-[0_18px_58px_rgba(14,165,233,0.12)]",
    titleClassName: "text-sky-50",
  },
  success: {
    Icon: CheckCircle2,
    iconClassName: "bg-[#6ae3c0] text-[#062016]",
    panelClassName:
      "border-[#6ae3c0]/32 bg-[#6ae3c0]/12 text-emerald-50 shadow-[0_18px_58px_rgba(106,227,192,0.14)]",
    titleClassName: "text-emerald-50",
  },
  warning: {
    Icon: TriangleAlert,
    iconClassName: "bg-[#ffd166] text-[#2a1b04]",
    panelClassName:
      "border-[#ffd166]/36 bg-[#ffd166]/12 text-amber-50 shadow-[0_18px_58px_rgba(255,209,102,0.13)]",
    titleClassName: "text-amber-50",
  },
};

export default function StatusMessage({
  children,
  className,
  title,
  tone,
}: StatusMessageProps) {
  const { Icon, iconClassName, panelClassName, titleClassName } =
    toneStyles[tone];

  return (
    <div
      aria-live={tone === "error" ? "assertive" : "polite"}
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-[20px] border px-4 py-4 ${panelClassName} ${className ?? ""}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${iconClassName}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <strong
            className={`block text-sm font-black tracking-[-0.02em] ${titleClassName}`}
          >
            {title}
          </strong>
          <span className="mt-1 block text-sm font-semibold leading-6 text-white/78">
            {children}
          </span>
        </span>
      </div>
    </div>
  );
}
