interface Props {
  online: boolean | null;
  modelReady?: boolean;
}

export default function StatusDot({ online, modelReady }: Props) {
  let label = "Connecting";
  let color = "bg-dawn";
  let ring = "";

  if (online === false) {
    label = "Offline";
    color = "bg-red-400";
  } else if (online === true) {
    if (modelReady === false) {
      label = "Model idle";
      color = "bg-dawn";
    } else {
      label = "Present";
      color = "bg-jade";
      ring = "animate-pulse shadow-[0_0_8px_1px_rgba(111,174,147,0.7)]";
    }
  }

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-ui text-[11px] text-ash backdrop-blur-sm">
      <span className={`h-1.5 w-1.5 rounded-full ${color} ${ring}`} />
      {label}
    </div>
  );
}
