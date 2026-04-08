import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    ridesPosted: 0,
    incomingRequests: 0,
    myRequests: 0,
  });

  useEffect(() => {
    const loadDashboard = async () => {
      const [rides, incoming, mine] = await Promise.all([
        api.get("/rides/mine"),
        api.get("/requests/incoming"),
        api.get("/requests/mine"),
      ]);

      setStats({
        ridesPosted: rides.data.length,
        incomingRequests: incoming.data.length,
        myRequests: mine.data.length,
      });
    };

    loadDashboard();
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" data-testid="dashboard-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-8"
      >
        <div>
          <h1
            className="font-heading text-4xl font-bold text-zinc-900 sm:text-5xl"
            data-testid="dashboard-heading"
          >
            Your travel command center
          </h1>
          <p className="mt-2 text-sm text-zinc-600" data-testid="dashboard-subheading">
            Manage rides, review offers, and complete bookings in one place.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3" data-testid="dashboard-stats-grid">
          <div className="rounded-3xl border border-border bg-card p-6" data-testid="stats-rides-card">
            <p className="text-xs uppercase tracking-widest text-zinc-600">Rides Posted</p>
            <p className="font-heading mt-2 text-4xl font-bold text-zinc-900" data-testid="stats-rides-value">
              {stats.ridesPosted}
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6" data-testid="stats-incoming-card">
            <p className="text-xs uppercase tracking-widest text-zinc-600">Incoming Requests</p>
            <p className="font-heading mt-2 text-4xl font-bold text-zinc-900" data-testid="stats-incoming-value">
              {stats.incomingRequests}
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6" data-testid="stats-myrequests-card">
            <p className="text-xs uppercase tracking-widest text-zinc-600">My Booking Requests</p>
            <p className="font-heading mt-2 text-4xl font-bold text-zinc-900" data-testid="stats-myrequests-value">
              {stats.myRequests}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="dashboard-actions-grid">
          <Link to="/post-ride" data-testid="dashboard-action-post-link">
            <Button className="h-12 w-full rounded-full" data-testid="dashboard-action-post-button">
              Post New Ride
            </Button>
          </Link>
          <Link to="/search" data-testid="dashboard-action-search-link">
            <Button
              variant="outline"
              className="h-12 w-full rounded-full border-2"
              data-testid="dashboard-action-search-button"
            >
              Search Rides
            </Button>
          </Link>
          <Link to="/incoming-requests" data-testid="dashboard-action-incoming-link">
            <Button
              variant="outline"
              className="h-12 w-full rounded-full border-2"
              data-testid="dashboard-action-incoming-button"
            >
              Incoming Requests
            </Button>
          </Link>
          <Link to="/my-bookings" data-testid="dashboard-action-bookings-link">
            <Button
              variant="outline"
              className="h-12 w-full rounded-full border-2"
              data-testid="dashboard-action-bookings-button"
            >
              My Bookings
            </Button>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
