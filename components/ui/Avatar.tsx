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
  xl: "size-[92px] text-3xl",
} as const;

const IMAGE_SIZE = { sm: 32, md: 44, lg: 80, xl: 92 } as const;

export function Avatar({
  nome,
  color,
  size = "md",
  fotoUrl,
}: {
  nome: string;
  color: string;
  size?: keyof typeof SIZE_CLASSES;
  fotoUrl?: string | null;
}) {
  if (fotoUrl) {
    return (
      <Image
        src={fotoUrl}
        alt={nome}
        width={IMAGE_SIZE[size]}
        height={IMAGE_SIZE[size]}
        className={`shrink-0 rounded-full object-cover ${SIZE_CLASSES[size]}`}
      />
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${color} ${SIZE_CLASSES[size]}`}
      aria-hidden="true"
    >
      {initials(nome)}
    </span>
  );
}
import Image from "next/image";
