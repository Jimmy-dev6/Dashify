"use client";

import type { ComponentType, SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Bars3Icon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ScaleIcon,
  HomeIcon,
  InboxIcon,
  Squares2X2Icon,
  TagIcon,
  MapPinIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

type NavIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;
type NavItem = { href: string; label: string; icon: NavIcon; indent?: boolean };

const nav: NavItem[] = [
  {
    href: "/dashboard",
    label: "Tableau de bord",
    icon: HomeIcon,
  },
  {
    href: "/dashboard/properties",
    label: "Logements",
    icon: BuildingOffice2Icon,
  },
  {
    href: "/dashboard/channels",
    label: "Channel Manager",
    icon: Squares2X2Icon,
  },
  {
    href: "/calendar",
    label: "Calendrier",
    icon: CalendarDaysIcon,
  },
  {
    href: "/dashboard/bookings",
    label: "Réservations",
    icon: ClipboardDocumentListIcon,
  },
  {
    href: "/dashboard/inbox",
    label: "Boîte de réception",
    icon: InboxIcon,
  },
  {
    href: "/dashboard/clients",
    label: "Clients",
    icon: UsersIcon,
  },
  {
    href: "/dashboard/quotes",
    label: "Devis",
    icon: DocumentTextIcon,
  },
  {
    href: "/dashboard/pricing",
    label: "Dynamic Pricing",
    icon: TagIcon,
  },
  {
    href: "/dashboard/events",
    label: "Événements",
    icon: MapPinIcon,
    indent: true,
  },
  {
    href: "/dashboard/policies",
    label: "Politiques",
    icon: ScaleIcon,
  },
];

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function DashboardFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [inboxUnread, setInboxUnread] = useState<number | null>(null);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/messages/unread-count");
        const json = (await res.json()) as { count?: number };
        if (!cancelled && res.ok) setInboxUnread(json.count ?? 0);
      } catch {
        if (!cancelled) setInboxUnread(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <div className="flex min-h-dvh bg-gray-950 text-white">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        id="dashboard-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(17rem,88vw)] flex-col border-r border-gray-800 bg-gray-900 shadow-xl transition-transform duration-200 ease-out md:static md:z-0 md:w-64 md:translate-x-0 md:shadow-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex h-14 shrink-0 items-center border-b border-gray-800 px-4">
          <Link
            href="/dashboard"
            className="text-lg font-semibold tracking-tight text-teal-400"
            onClick={closeMobile}
          >
            Dashify
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-4" aria-label="Navigation">
          <ul className="space-y-0.5">
            {nav.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
              const indent = "indent" in item && item.indent;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeMobile}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg py-2.5 text-sm font-medium",
                      indent ? "pl-9 pr-3 text-[13px] text-gray-400" : "px-3",
                      active
                        ? "bg-teal-500/10 text-teal-400"
                        : "text-gray-300 hover:bg-gray-800/60 hover:text-white",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5 shrink-0",
                        active
                          ? "text-teal-400"
                          : "text-gray-400",
                      )}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.href === "/dashboard/inbox" &&
                      inboxUnread !== null &&
                      inboxUnread > 0 && (
                        <span className="shrink-0 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                          {inboxUnread > 99 ? "99+" : inboxUnread}
                        </span>
                      )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="shrink-0 space-y-1 border-t border-gray-800 p-3">
          <Link
            href="/dashboard/settings"
            onClick={closeMobile}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
              pathname.startsWith("/dashboard/settings")
                ? "bg-teal-500/10 text-teal-400"
                : "text-gray-300 hover:bg-gray-800/60 hover:text-white",
            )}
          >
            <Cog6ToothIcon
              className={cn(
                "h-5 w-5 shrink-0",
                pathname.startsWith("/dashboard/settings") ? "text-teal-400" : "text-gray-400",
              )}
            />
            <span className="flex-1 truncate">Paramètres</span>
          </Link>
          <div className="space-y-0.5 border-l border-gray-800/80 pl-2 ml-3">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
              Tarification
            </div>
            <Link
              href="/dashboard/fees"
              onClick={closeMobile}
              className={cn(
                "flex w-full rounded-lg py-2 pl-2 pr-2 text-sm font-medium",
                pathname.startsWith("/dashboard/fees")
                  ? "bg-teal-500/10 text-teal-400"
                  : "text-gray-400 hover:bg-gray-800/60 hover:text-gray-200",
              )}
            >
              Frais
            </Link>
            <Link
              href="/dashboard/promotions"
              onClick={closeMobile}
              className={cn(
                "flex w-full rounded-lg py-2 pl-2 pr-2 text-sm font-medium",
                pathname.startsWith("/dashboard/promotions")
                  ? "bg-teal-500/10 text-teal-400"
                  : "text-gray-400 hover:bg-gray-800/60 hover:text-gray-200",
              )}
            >
              Promotions
            </Link>
            <Link
              href="/dashboard/supplements"
              onClick={closeMobile}
              className={cn(
                "flex w-full rounded-lg py-2 pl-2 pr-2 text-sm font-medium",
                pathname.startsWith("/dashboard/supplements")
                  ? "bg-teal-500/10 text-teal-400"
                  : "text-gray-400 hover:bg-gray-800/60 hover:text-gray-200",
              )}
            >
              Suppléments
            </Link>
          </div>
          <Link
            href="/auth/login"
            className="flex w-full items-center justify-center rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
            onClick={closeMobile}
          >
            Compte
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-gray-800 bg-gray-950/80 px-4 backdrop-blur md:hidden">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-300 hover:bg-gray-800/60 hover:text-white"
            aria-expanded={mobileOpen}
            aria-controls="dashboard-sidebar"
            onClick={() => setMobileOpen((o) => !o)}
          >
            <span className="sr-only">Menu</span>
            <Bars3Icon className="h-6 w-6" />
          </button>
          <span className="font-semibold text-white">Dashify</span>
        </header>

        <main
          id="dashboard-main"
          className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          <div className="mx-auto max-w-[88rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}
