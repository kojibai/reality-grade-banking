# Calendar and appointment guide at /book/

Extend the existing Bankeiz public suite with a complete calendar and appointments page. Use the established light background, navy type, cobalt actions, shared mark/navigation/footer, real source-rendered product walkthroughs and restrained looping motion. The user has already established this visual direction and requested execution of the full page; reuse it without adding a separate design approval flow.

Lead with the result: make time and keep the appointment, invitation, conversation, payment and meeting connected. Show the guest's calendar booking and the host's actual Calendar, appointment, booking-link and settings controls. Explain free and paid offers, per-guest prices, balance-first checkout with the shortfall funded, timezones, questions, email/calendar invitations, meeting entry, optional Business Twin booking, calendar-only choice, follow-up and the record retained. Keep deeper operational details in questions and link to /guide/, /meet/, /your-twin/ and the calendar documentation.

Alternatives: a text-only guide would hide the product; a new live booking form on the generic guide would obscure whose calendar is being booked. Chosen implementation: static explanatory page plus source-rendered inert walkthroughs, with explicit example labels and existing account/booking links. It creates no account, appointment, payment, recording or proof.

/book/ is the guide. Preserve /book/:username and its personalized sharing endpoint exactly. Move only their internal static booking entry to /booking/index.html so the guide has its own route. Keep crawler metadata and query parameters, current public booking behavior and all entry/identity code unchanged.

First paint is prebuilt HTML and inline page/preview styling. Browser script only operates local walkthrough data; code and timers run only for this page, respect manual exploration, visibility, reduced motion and navigation cleanup. No data request is needed for the guide. Reuse the existing appointment/booking components rather than inventing a second product interface.

Source-bound contracts: booking route isolation and crawler metadata; actual-component rendering with zero transport; guide feature/copy and deep links; autoplay/manual controls/reduced motion; build metadata, sitemap and source archive. Confirm phone, tablet and desktop presentation in the browser. Preserve other agents' 21 dirty paths byte-for-byte.
