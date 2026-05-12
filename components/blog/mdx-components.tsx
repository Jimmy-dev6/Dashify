import Link from "next/link";
import { Callout } from "./Callout";

type AnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href?: string;
};

export const mdxComponents = {
  Callout,
  a: ({ href, children, ...props }: AnchorProps) => {
    if (!href) {
      return <a {...props}>{children}</a>;
    }
    const isInternal = href.startsWith("/") || href.startsWith("#");
    if (isInternal) {
      return (
        <Link href={href} {...props}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
};