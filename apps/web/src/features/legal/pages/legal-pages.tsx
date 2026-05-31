import { Link } from "react-router"
import { Page, Stack } from "@/components/v2"
import { BrandLogo } from "@/shared/components/brand-logo"
import { useDocumentTitle } from "@/shared/hooks/use-document-title"

const CONTACT_EMAIL = "support@family-events.org"
const LAST_UPDATED = "May 29, 2026"

type LegalSection = {
  title: string
  body: string[]
}

const privacySections: LegalSection[] = [
  {
    title: "Information we collect",
    body: [
      "We collect account information you provide, including your email address, display name, profile settings, and authentication provider details.",
      "When you use Family Events, we may collect activity such as saved events, ratings, comments, city preferences, event-review submissions, and other choices you make in the app.",
      "If you sign in with Google, we receive the information Google shares for authentication, such as your name, email address, profile image, and Google account identifier.",
      "We also collect technical information such as device and browser details, IP address, log data, cookie or local-storage identifiers, and crash or performance diagnostics.",
    ],
  },
  {
    title: "How we use information",
    body: [
      "We use information to provide and secure your account, show relevant family-friendly events, save your preferences, operate maps and planning features, and respond to support requests.",
      "We use diagnostics and analytics to understand reliability, prevent abuse, troubleshoot errors, and improve the product.",
      "We may use your email address to send account, security, support, invite, and service-related messages.",
    ],
  },
  {
    title: "Service providers",
    body: [
      "We use trusted service providers to host the app, authenticate users, send email, store data, monitor errors, and support event discovery features.",
      "These providers may include Supabase, Railway, Resend, Sentry, Google, and mapping, geocoding, weather, or event-data providers as needed to operate the service.",
      "We do not sell your personal information.",
    ],
  },
  {
    title: "Location and event data",
    body: [
      "Family Events is built around local event discovery. We may use selected city, neighborhood, distance, map, or approximate location information to show useful results.",
      "Event listings may link to third-party organizers, ticketing pages, venues, or other external websites. Their privacy practices are governed by their own policies.",
    ],
  },
  {
    title: "Data retention and choices",
    body: [
      "We keep account and activity information for as long as needed to provide the service, comply with legal obligations, resolve disputes, prevent abuse, and maintain business records.",
      "You may contact us to request access, correction, deletion, or export of your account information. Some records may be retained where required for security, legal, or operational reasons.",
    ],
  },
  {
    title: "Children",
    body: [
      "Family Events is intended for parents and caregivers. It is not directed to children under 13, and children should not create accounts or submit personal information.",
      "If you believe a child has provided personal information, contact us and we will review the request.",
    ],
  },
  {
    title: "Changes",
    body: [
      "We may update this Privacy Policy as the service changes. When we make material changes, we will update the date on this page and take additional steps where required.",
    ],
  },
]

const termsSections: LegalSection[] = [
  {
    title: "Using Family Events",
    body: [
      "Family Events helps parents and caregivers discover, save, and plan family-friendly events. You may use the service only in compliance with these Terms and applicable law.",
      "You are responsible for keeping your account information accurate and for protecting access to your account.",
    ],
  },
  {
    title: "Event listings",
    body: [
      "Event information may come from public sources, organizers, venues, third-party providers, and editorial review. We work to keep listings useful, but event times, prices, availability, age suitability, and details can change.",
      "Before attending or purchasing tickets, confirm details with the event organizer, venue, or ticketing provider.",
      "Family Events is not responsible for third-party events, venues, organizer actions, ticketing terms, cancellations, injuries, losses, or disputes.",
    ],
  },
  {
    title: "Acceptable use",
    body: [
      "Do not misuse the service, attempt to access accounts or systems without permission, interfere with security, scrape or copy data at scale, submit false or harmful content, or use Family Events for unlawful activity.",
      "We may suspend or terminate accounts that violate these Terms, create risk for other users, or threaten the reliability or security of the service.",
    ],
  },
  {
    title: "Content you submit",
    body: [
      "If you submit ratings, comments, suggestions, event corrections, or other content, you remain responsible for that content.",
      "You grant Family Events permission to host, copy, display, modify, and use submitted content as needed to operate, improve, and promote the service.",
      "Do not submit content that is unlawful, misleading, infringing, abusive, or otherwise harmful.",
    ],
  },
  {
    title: "Third-party services",
    body: [
      "The service may include links, maps, authentication, email, analytics, event sources, ticketing pages, and other third-party services.",
      "Those services are governed by their own terms and policies. We are not responsible for third-party content, availability, or practices.",
    ],
  },
  {
    title: "Disclaimers",
    body: [
      "Family Events is provided as is and as available. We do not guarantee that the service will be uninterrupted, error-free, or that event information will always be complete or current.",
      "To the fullest extent allowed by law, Family Events disclaims warranties of merchantability, fitness for a particular purpose, and non-infringement.",
    ],
  },
  {
    title: "Limitation of liability",
    body: [
      "To the fullest extent allowed by law, Family Events will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, data, goodwill, or other intangible losses.",
    ],
  },
  {
    title: "Changes",
    body: [
      "We may update these Terms as the service changes. Continued use of Family Events after changes become effective means you accept the updated Terms.",
    ],
  },
]

function LegalPageShell({
  title,
  intro,
  sections,
}: {
  title: string
  intro: string
  sections: LegalSection[]
}) {
  useDocumentTitle(title)

  return (
    <main className="min-h-screen bg-background">
      <Page className="py-6 md:py-8">
        <Stack gap="7">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
            <BrandLogo />
            <nav className="flex min-h-[44px] items-center gap-4 text-sm font-medium text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
              <Link to="/terms" className="hover:text-foreground">
                Terms
              </Link>
              <Link to="/sign-in" className="text-primary hover:underline">
                Sign in
              </Link>
            </nav>
          </header>

          <section className="max-w-3xl">
            <p className="mb-3 font-mono text-xs uppercase tracking-normal text-muted-foreground">
              Last updated {LAST_UPDATED}
            </p>
            <h1 className="font-display text-2xl font-medium tracking-tight text-foreground md:text-[44px] md:leading-[1.1]">
              {title}
            </h1>
            <p className="mt-4 text-md leading-relaxed text-muted-foreground">{intro}</p>
          </section>

          <Stack as="article" gap="6" className="max-w-3xl pb-12">
            {sections.map((section) => (
              <section key={section.title} className="border-t border-border/60 pt-6">
                <h2 className="font-display text-lg font-medium text-foreground">
                  {section.title}
                </h2>
                <Stack gap="3" className="mt-3 text-base leading-relaxed text-muted-foreground">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </Stack>
              </section>
            ))}

            <section className="border-t border-border/60 pt-6">
              <h2 className="font-display text-lg font-medium text-foreground">Contact</h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                Questions can be sent to{" "}
                <a
                  className="font-medium text-primary hover:underline"
                  href={`mailto:${CONTACT_EMAIL}`}
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </section>
          </Stack>
        </Stack>
      </Page>
    </main>
  )
}

export function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      intro="This Privacy Policy explains how Family Events collects, uses, shares, and protects information when you use our website and related services."
      sections={privacySections}
    />
  )
}

export function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Service"
      intro="These Terms of Service govern your access to and use of Family Events. By using the service, you agree to these Terms."
      sections={termsSections}
    />
  )
}
