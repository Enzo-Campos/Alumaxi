import Image from "next/image";

const SRC = {
  full: { src: "/alumaxi-logo.png", w: 674, h: 361, alt: "Alumaxi — Esquadrias e Vidros" },
  mark: { src: "/alumaxi-mark.png", w: 382, h: 414, alt: "Alumaxi" },
  // versao azul-marinho (para fundo claro)
  fullDark: { src: "/alumaxi-logo-dark.png", w: 688, h: 368, alt: "Alumaxi — Esquadrias e Vidros" },
} as const;

/**
 * Logo Alumaxi. `full`/`mark` sao prata (fundo escuro); `fullDark` e marinho (fundo claro).
 * Em fundo claro com as versoes prata, use `onLight` para escurecer via filtro.
 */
export function Logo({
  variant = "full",
  className = "",
  onLight = false,
  priority = false,
}: {
  variant?: "full" | "mark" | "fullDark";
  className?: string;
  onLight?: boolean;
  priority?: boolean;
}) {
  const { src, w, h, alt } = SRC[variant];
  return (
    <Image
      src={src}
      width={w}
      height={h}
      alt={alt}
      priority={priority}
      className={className}
      style={onLight ? { filter: "brightness(0.28) contrast(1.15)" } : undefined}
    />
  );
}
