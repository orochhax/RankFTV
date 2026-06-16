// Avatar de iniciais (sem foto real ainda — ver lib/mock/athletes.ts).
// Ex.: "Ana Beatriz Santos" -> "AB".
function initials(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

const SIZE_CLASSES = {
  sm: "size-8 text-xs",
  md: "size-11 text-sm",
  lg: "size-20 text-2xl",
} as const;

export function Avatar({
  nome,
  color,
  size = "md",
}: {
  nome: string;
  color: string;
  size?: keyof typeof SIZE_CLASSES;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${color} ${SIZE_CLASSES[size]}`}
      aria-hidden="true"
    >
      {initials(nome)}
    </span>
  );
}
