"use client";

import React from "react";
import { usePortalTransition } from "@/shared/context/PortalTransitionContext";

interface TransitionLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export default function TransitionLink({
  href,
  children,
  className,
  onClick,
  ...props
}: TransitionLinkProps) {
  const { navigateTo } = usePortalTransition();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // If modifier keys pressed, let default browser behavior handle new tabs
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      if (onClick) onClick(e);
      return;
    }

    e.preventDefault();
    if (onClick) onClick(e);
    navigateTo(href);
  };

  return (
    <a href={href} onClick={handleClick} className={className} {...props}>
      {children}
    </a>
  );
}
