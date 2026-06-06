# Philosophy & Principles

Everything in this guide flows from a few core beliefs:

- **Automation over documentation.** If a rule can be enforced by a linter, a CI check, or a bot, it must be.
- **Convention over configuration.** Standardised structures reduce cognitive load for every contributor.
- **Security by default.** Every dependency, secret, and line of code is treated as a potential attack surface.
- **Trunk-based simplicity.** Short-lived branches, small changes, and continuous integration keep velocity high.
- **The repository is the product.** A well-maintained repository signals quality, attracts contributors, and reduces onboarding time.
- **Spec‑driven development.** Specification (contract, behavior, API) is the primary artifact; code is a verified secondary artifact. This inversion ensures AI‑augmented and human teams align on "what" before "how".
- **Behavior‑driven collaboration.** Business‑readable scenarios (Given/When/Then) bridge stakeholders and developers, serving as living acceptance tests and documentation.
- **Operational responsibility.** Delivery teams own reliability. Production is not a separate domain; it is the final stage of the pipeline.
