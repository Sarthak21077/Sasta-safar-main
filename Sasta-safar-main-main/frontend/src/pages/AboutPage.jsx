import { motion } from "framer-motion";

const teamMembers = [
  "Sarthak Pandey",
  "Uplakshya yadav",
  "Varshikey sharma",
  "Vibhav tiwari",
];

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8" data-testid="about-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-3xl border border-border bg-card p-8 shadow-sm"
      >
        <h1 className="font-heading text-4xl font-bold text-zinc-900" data-testid="about-heading">
          About Sasta Safar
        </h1>

        <h2 className="mt-6 text-lg font-semibold text-zinc-900" data-testid="about-vision-title">
          Vision
        </h2>
        <p className="mt-2 text-zinc-700" data-testid="about-vision-text">
          Our vision is to make intercity travel affordable for everyone by connecting riders with
          drivers who already have empty seats. We aim to reduce unnecessary travel costs for people
          while improving comfort and reliability in day-to-day mobility.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-zinc-900" data-testid="about-scope-title">
          Scope
        </h2>
        <p className="mt-2 text-zinc-700" data-testid="about-scope-text">
          Sasta Safar promotes efficient fuel utilization by increasing seat occupancy in vehicles that
          are already on the road. Through route matching, price negotiation, and structured booking,
          we support cleaner travel behavior, lower per-person fuel burn, and better mobility planning
          across Indian cities.
        </p>

        <h2 className="mt-8 text-lg font-semibold text-zinc-900" data-testid="about-team-title">
          Core Team
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2" data-testid="about-team-grid">
          {teamMembers.map((member) => (
            <div
              key={member}
              className="rounded-2xl border border-border bg-accent p-4 font-medium text-zinc-800"
              data-testid={`about-team-member-${member.replace(/\s+/g, "-").toLowerCase()}`}
            >
              {member}
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
