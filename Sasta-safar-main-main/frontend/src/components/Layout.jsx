import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  CarFront,
  LogOut,
  MapPinned,
  Menu,
  PlusSquare,
  ReceiptText,
  Shield,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const navClass = ({ isActive }) =>
  `rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
    isActive
      ? "bg-primary text-primary-foreground"
      : "text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900"
  }`;

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const authPage = location.pathname === "/auth";
  const isLanding = location.pathname === "/";
  const [showLandingMenu, setShowLandingMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const closeMenus = () => {
    setShowLandingMenu(false);
    setShowMobileMenu(false);
  };
  const displayName = user?.name?.trim() || "Account";
  const compactName =
    displayName.length > 14 ? `${displayName.slice(0, 14)}…` : displayName;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-2"
            onClick={closeMenus}
            data-testid="app-brand-link"
          >
            <div className="rounded-2xl bg-primary p-2 text-primary-foreground">
              <CarFront size={20} />
            </div>
            <div>
              <p className="font-heading text-lg font-bold text-zinc-900" data-testid="brand-name">
                Sasta Safar
              </p>
              <p className="text-xs text-zinc-600" data-testid="brand-tagline">
                Travel cheap, earn extra
              </p>
            </div>
          </Link>

          {!authPage && (
            <nav className="hidden items-center gap-2 md:flex" data-testid="main-navigation">
              <NavLink to="/search" className={navClass} data-testid="nav-search-link">
                <MapPinned size={16} className="mr-1 inline" /> Search rides
              </NavLink>
              {user && (
                <>
                  <NavLink to="/post-ride" className={navClass} data-testid="nav-post-link">
                    <PlusSquare size={16} className="mr-1 inline" /> Post ride
                  </NavLink>
                  <NavLink
                    to="/incoming-requests"
                    className={navClass}
                    data-testid="nav-incoming-link"
                  >
                    Incoming requests
                  </NavLink>
                  <NavLink
                    to="/my-bookings"
                    className={navClass}
                    data-testid="nav-bookings-link"
                  >
                    <ReceiptText size={16} className="mr-1 inline" /> My bookings
                  </NavLink>
                  <NavLink to="/safety" className={navClass} data-testid="nav-safety-link">
                    <Shield size={16} className="mr-1 inline" /> Safety
                  </NavLink>
                </>
              )}
            </nav>
          )}

          <div className="flex items-center gap-2">
            {!authPage && (
              <Button
                variant="outline"
                className="rounded-full md:hidden"
                onClick={() => setShowMobileMenu((prev) => !prev)}
                data-testid="mobile-nav-toggle"
              >
                {showMobileMenu ? <X size={16} /> : <Menu size={16} />}
              </Button>
            )}

            {isLanding && (
              <div className="relative">
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setShowLandingMenu((prev) => !prev)}
                  data-testid="landing-hamburger-button"
                >
                  <Menu size={16} className="mr-2" /> Menu
                </Button>
                {showLandingMenu && (
                  <div
                    className="absolute right-0 top-12 w-48 rounded-2xl border border-border bg-white p-2 shadow-xl"
                    data-testid="landing-hamburger-panel"
                  >
                    <Link
                      to="/about"
                      onClick={() => setShowLandingMenu(false)}
                      className="block rounded-xl px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-accent"
                      data-testid="hamburger-about-link"
                    >
                      About us
                    </Link>
                    <Link
                      to="/contact"
                      onClick={() => setShowLandingMenu(false)}
                      className="block rounded-xl px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-accent"
                      data-testid="hamburger-contact-link"
                    >
                      Contact us
                    </Link>
                  </div>
                )}
              </div>
            )}

            {user ? (
              <>
                <Link to="/dashboard" onClick={closeMenus} data-testid="dashboard-link">
                  <Button className="rounded-full px-4 sm:px-6" data-testid="dashboard-button">
                    <span className="max-w-[120px] truncate" data-testid="dashboard-user-name">
                      {compactName}
                    </span>
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="hidden rounded-full sm:flex"
                  onClick={logout}
                  data-testid="logout-button"
                >
                  <LogOut size={16} className="mr-2" /> Logout
                </Button>
              </>
            ) : (
              <Link to="/auth" onClick={closeMenus} data-testid="auth-page-link">
                <Button className="rounded-full px-4 sm:px-6" data-testid="header-login-button">
                  Sign in
                </Button>
              </Link>
            )}
          </div>
        </div>

        {!authPage && showMobileMenu && (
          <div className="border-t border-border bg-white md:hidden" data-testid="mobile-menu-panel">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 sm:px-6">
              <NavLink to="/search" onClick={closeMenus} className={navClass} data-testid="mobile-nav-search-link">
                <MapPinned size={16} className="mr-1 inline" /> Search rides
              </NavLink>

              {user && (
                <>
                  <NavLink to="/post-ride" onClick={closeMenus} className={navClass} data-testid="mobile-nav-post-link">
                    <PlusSquare size={16} className="mr-1 inline" /> Post ride
                  </NavLink>
                  <NavLink
                    to="/incoming-requests"
                    onClick={closeMenus}
                    className={navClass}
                    data-testid="mobile-nav-incoming-link"
                  >
                    Incoming requests
                  </NavLink>
                  <NavLink
                    to="/my-bookings"
                    onClick={closeMenus}
                    className={navClass}
                    data-testid="mobile-nav-bookings-link"
                  >
                    <ReceiptText size={16} className="mr-1 inline" /> My bookings
                  </NavLink>
                  <NavLink to="/safety" onClick={closeMenus} className={navClass} data-testid="mobile-nav-safety-link">
                    <Shield size={16} className="mr-1 inline" /> Safety
                  </NavLink>
                </>
              )}

              <div className="my-2 h-px bg-border" />

              <Link
                to="/about"
                onClick={closeMenus}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-accent"
                data-testid="mobile-about-link"
              >
                About us
              </Link>
              <Link
                to="/contact"
                onClick={closeMenus}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-accent"
                data-testid="mobile-contact-link"
              >
                Contact us
              </Link>

              {user && (
                <Button
                  variant="outline"
                  className="mt-2 rounded-full"
                  onClick={() => {
                    closeMenus();
                    logout();
                  }}
                  data-testid="mobile-logout-button"
                >
                  <LogOut size={16} className="mr-2" /> Logout
                </Button>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="pb-20">{children}</main>

      <footer className="border-t border-border bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-zinc-600 sm:px-6 lg:px-8">
          <p data-testid="footer-copy">© {new Date().getFullYear()} Sasta Safar</p>
          <p data-testid="footer-note">City-to-city carpool booking with live map visibility</p>
        </div>
      </footer>
    </div>
  );
};
