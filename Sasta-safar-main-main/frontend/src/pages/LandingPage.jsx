import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BadgeCheck, IndianRupee, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const heroImage =
  "https://images.unsplash.com/photo-1722438475609-98268982db82?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwxfHxoYXBweSUyMGZyaWVuZHMlMjByb2FkJTIwdHJpcCUyMGNhcnxlbnwwfHx8fDE3NzM0OTU1MTh8MA&ixlib=rb-4.1.0&q=85";

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" data-testid="landing-page">
      <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-6"
        >
          <p
            className="inline-flex rounded-full bg-accent px-4 py-1 text-xs font-semibold uppercase tracking-widest text-zinc-600"
            data-testid="landing-tagline"
          >
            City to city carpool booking
          </p>

          <h1
            className="font-heading text-4xl font-bold leading-tight text-zinc-900 sm:text-5xl lg:text-6xl"
            data-testid="landing-heading"
          >
            Post your route, negotiate a price, and travel smarter.
          </h1>

          <p className="max-w-2xl text-base text-zinc-700 sm:text-lg" data-testid="landing-description">
            Sasta Safar helps drivers fill empty seats and riders book affordable intercity trips
            with route-matching, live map visibility, and secure Stripe checkout.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to={user ? "/post-ride" : "/auth"} data-testid="landing-post-ride-link">
              <Button
                className="h-12 w-full rounded-full px-8 text-base font-bold shadow-lg shadow-primary/20 sm:w-auto"
                data-testid="landing-post-ride-button"
              >
                Post a ride
              </Button>
            </Link>
            <Link to="/search" data-testid="landing-search-rides-link">
              <Button
                variant="outline"
                className="h-12 w-full rounded-full border-2 px-8 text-base font-bold sm:w-auto"
                data-testid="landing-search-rides-button"
              >
                Search rides
              </Button>
            </Link>
          </div>

          <div className="grid gap-4 pt-3 sm:grid-cols-3">
            <motion.div
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              data-testid="feature-negotiate-card"
            >
              <IndianRupee className="mb-2 text-primary" size={20} />
              <p className="font-heading font-semibold text-zinc-900">Flexible price offers</p>
              <p className="text-sm text-zinc-600">Riders offer the price they like.</p>
            </motion.div>
            <motion.div
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              data-testid="feature-route-card"
            >
              <Route className="mb-2 text-primary" size={20} />
              <p className="font-heading font-semibold text-zinc-900">GPS-friendly routes</p>
              <p className="text-sm text-zinc-600">See routes on OpenStreetMap.</p>
            </motion.div>
            <motion.div
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              data-testid="feature-payment-card"
            >
              <BadgeCheck className="mb-2 text-primary" size={20} />
              <p className="font-heading font-semibold text-zinc-900">Secure checkout</p>
              <p className="text-sm text-zinc-600">Pay only after driver approval.</p>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="relative"
        >
          <div className="overflow-hidden rounded-3xl border border-border bg-white p-3 shadow-xl">
            <div className="aspect-[4/5] overflow-hidden rounded-2xl" data-testid="landing-hero-image-wrap">
              <img
                src={heroImage}
                alt="Happy friends on a carpool road trip"
                className="h-full w-full object-cover"
                data-testid="landing-hero-image"
              />
            </div>
          </div>

          <div
            className="absolute -bottom-4 -left-4 rounded-2xl border border-border bg-white px-4 py-3 shadow-md"
            data-testid="landing-floating-price-card"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Average saves</p>
            <p className="font-heading text-2xl font-bold text-zinc-900">30-45%</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
