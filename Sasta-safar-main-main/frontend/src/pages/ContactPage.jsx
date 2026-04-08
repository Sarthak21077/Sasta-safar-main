import { motion } from "framer-motion";

const contacts = ["+91 9555979978", "+91 86017 82312", "+91 6393895919"];

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8" data-testid="contact-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-3xl border border-border bg-card p-8 shadow-sm"
      >
        <h1 className="font-heading text-4xl font-bold text-zinc-900" data-testid="contact-heading">
          Contact Us
        </h1>
        <p className="mt-3 text-zinc-700" data-testid="contact-description">
          For help with bookings, payments, or safety concerns, call us on:
        </p>

        <div className="mt-6 space-y-3" data-testid="contact-phone-list-container">
          {contacts.map((phone) => (
            <a
              key={phone}
              href={`tel:${phone.replace(/\s+/g, "")}`}
              className="block rounded-2xl border border-border bg-accent px-4 py-3 font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
              data-testid={`contact-number-${phone.replace(/\s+/g, "-")}`}
            >
              {phone}
            </a>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
