import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  alt?: string;
}

/** Jeevan Raksha brand mark */
export const Logo = ({ className, alt = "Jeevan Raksha logo" }: LogoProps) => (
  <img
    src="/jeevan-raksha-logo.png"
    alt={alt}
    loading="lazy"
    className={cn("object-contain rounded-xl bg-foreground", className)}
  />
);

export default Logo;
