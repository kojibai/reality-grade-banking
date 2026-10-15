/** Source-route evidence, never live deployment qualification or proof authority.
 * Historical Connect contracts are preserved explicitly; the default server has
 * no implementation for their absent routes. Read siblings are evidenced by
 * the v106 source; the v107 write inventory records the compatibility disposition.
 */
export type ReceizHttpOperationSupport = Readonly<{
  executionMode: "current-http" | "historical-http";
  currentRouteImplemented: boolean;
  routes: readonly Readonly<{ pathPattern: string; routeFile: string | null }>[];
  evidence: readonly string[];
  semanticLimit?: string;
}>;
const entries: Record<string, ReceizHttpOperationSupport> = {
  "connect.wallet": {
    executionMode: "current-http", currentRouteImplemented: true,
    routes: [{ pathPattern: "/api/connect/wallet/me", routeFile: "app/api/connect/wallet/me/route.ts" }],
    evidence: ["packages/receiz-sdk/src/index.ts", "app/api/connect/wallet/me/route.ts"],
  },
  "connect.transfer": {
    executionMode: "current-http", currentRouteImplemented: true,
    routes: [{ pathPattern: "/api/connect/transfers", routeFile: "app/api/connect/transfers/route.ts" }],
    evidence: ["packages/receiz-sdk/src/index.ts", "app/api/connect/transfers/route.ts"],
  },
  "connect.checkout": {
    executionMode: "current-http", currentRouteImplemented: true,
    routes: [{ pathPattern: "/api/connect/payments/checkout", routeFile: "app/api/connect/payments/checkout/route.ts" }],
    evidence: ["packages/receiz-sdk/src/index.ts", "app/api/connect/payments/checkout/route.ts"],
    semanticLimit: "Creates a card checkout session; session creation is not completed payment or Settlement.",
  },
  "connect.checkoutSession": {
    executionMode: "current-http", currentRouteImplemented: true,
    routes: [{ pathPattern: "/api/connect/payments/session", routeFile: "app/api/connect/payments/session/route.ts" }],
    evidence: ["packages/receiz-sdk/src/index.ts", "app/api/connect/payments/session/route.ts"],
    semanticLimit: "Projects provider session status and receipt identity; an open session is not completed payment or Settlement.",
  },
  "connect.mintNote": {
    executionMode: "current-http", currentRouteImplemented: true,
    routes: [{ pathPattern: "/api/connect/payments/notes/mint", routeFile: "app/api/connect/payments/notes/mint/route.ts" }],
    evidence: ["packages/receiz-sdk/src/index.ts", "app/api/connect/payments/notes/mint/route.ts"],
    semanticLimit: "Disabled legacy bearer mint always returns wallet_note_receiving_seal_required after scope admission. Current issue requires receiver-bound portable wallet_note and Custody Seal; this method does not issue a note.",
  },
  "connect.claimNote": {
    executionMode: "current-http", currentRouteImplemented: true,
    routes: [{ pathPattern: "/api/connect/payments/notes/claim", routeFile: "app/api/connect/payments/notes/claim/route.ts" }],
    evidence: ["packages/receiz-sdk/src/index.ts", "app/api/connect/payments/notes/claim/route.ts"],
    semanticLimit: "Legacy wallet-note token claim; does not replace canonical receiver-bound portable artifact custody admission.",
  },
  "connect.downloadNote": {
    executionMode: "current-http", currentRouteImplemented: true,
    routes: [{ pathPattern: "/api/connect/payments/notes/[id]/download", routeFile: "app/api/connect/payments/notes/[noteId]/download/route.ts" }],
    evidence: ["packages/receiz-sdk/src/index.ts", "app/api/connect/payments/notes/[noteId]/download/route.ts"],
    semanticLimit: "Returns the exact sealed image/png artifact bytes; download is not note issue, claim, or proof admission.",
  },
  "payments.embeddedCheckout": {
    executionMode: "current-http", currentRouteImplemented: true,
    routes: [{ pathPattern: "/api/payments/embed/checkout", routeFile: "app/api/payments/embed/checkout/route.ts" }],
    evidence: ["packages/receiz-sdk/src/index.ts", "app/api/payments/embed/checkout/route.ts"],
    semanticLimit: "Creates a merchant card checkout session; session creation is not completed payment or Settlement.",
  },
  "payments.embeddedNoteClaim": {
    executionMode: "current-http", currentRouteImplemented: true,
    routes: [{ pathPattern: "/api/payments/embed/note-claim", routeFile: "app/api/payments/embed/note-claim/route.ts" }],
    evidence: ["packages/receiz-sdk/src/index.ts", "app/api/payments/embed/note-claim/route.ts"],
    semanticLimit: "Legacy wallet-note token claim for a named merchant; does not replace canonical receiver-bound portable artifact custody admission.",
  },
  "twin.marketMandate": {
    "executionMode": "current-http",
    "currentRouteImplemented": true,
    "routes": [
      {
        "pathPattern": "/api/connect/twin/market/mandate",
        "routeFile": "app/api/connect/twin/market/mandate/route.ts"
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts"
    ]
  },
  "twin.marketIntents": {
    "executionMode": "current-http",
    "currentRouteImplemented": true,
    "routes": [
      {
        "pathPattern": "/api/connect/twin/market/intents",
        "routeFile": "app/api/connect/twin/market/intents/route.ts"
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts"
    ]
  },
  "twin.importMindSummary": {
    "executionMode": "current-http",
    "currentRouteImplemented": true,
    "routes": [
      {
        "pathPattern": "/api/connect/twin/mind/import",
        "routeFile": "app/api/connect/twin/mind/import/route.ts"
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts"
    ]
  },
  "twin.approval": {
    "executionMode": "current-http",
    "currentRouteImplemented": true,
    "routes": [
      {
        "pathPattern": "/api/connect/twin/approval",
        "routeFile": "app/api/connect/twin/approval/route.ts"
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts"
    ]
  },
  "twin.saveMarketMandate": {
    "executionMode": "current-http",
    "currentRouteImplemented": true,
    "routes": [
      {
        "pathPattern": "/api/connect/twin/market/mandate",
        "routeFile": "app/api/connect/twin/market/mandate/route.ts"
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts"
    ]
  },
  "twin.createMarketIntent": {
    "executionMode": "current-http",
    "currentRouteImplemented": true,
    "routes": [
      {
        "pathPattern": "/api/connect/twin/market/intents",
        "routeFile": "app/api/connect/twin/market/intents/route.ts"
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts"
    ]
  },
  "twin.approveMarketIntent": {
    "executionMode": "current-http",
    "currentRouteImplemented": true,
    "routes": [
      {
        "pathPattern": "/api/connect/twin/market/intents/[id]/approve",
        "routeFile": "app/api/connect/twin/market/intents/[intentId]/approve/route.ts"
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts"
    ]
  },
  "twin.approvePromotion": {
    "executionMode": "current-http",
    "currentRouteImplemented": true,
    "routes": [
      {
        "pathPattern": "/api/connect/twin/approval",
        "routeFile": "app/api/connect/twin/approval/route.ts"
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts"
    ]
  },
  "customers.bootstrapSession": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/customers/session",
        "routeFile": null
      },
      {
        "pathPattern": "/api/connect/wallet/me",
        "routeFile": "app/api/connect/wallet/me/route.ts"
      },
      {
        "pathPattern": "/api/connect/customers/portal",
        "routeFile": null
      },
      {
        "pathPattern": "/api/connect/permissions/roles",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "customers.bootstrap": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/customers/session",
        "routeFile": null
      },
      {
        "pathPattern": "/api/connect/wallet/me",
        "routeFile": "app/api/connect/wallet/me/route.ts"
      },
      {
        "pathPattern": "/api/connect/customers/portal",
        "routeFile": null
      },
      {
        "pathPattern": "/api/connect/permissions/roles",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "customers.session": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/customers/session",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "customers.portal": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/customers/portal",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "customers.orders": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/customers/orders",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "customers.rewards": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/customers/rewards",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "customers.assets": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/customers/assets",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "merchants.onboard": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/merchants/onboard",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "merchants.profile": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/merchants/profile",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "merchants.capabilities": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/merchants/capabilities",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "commerce.oneClickCheckout": {
    "executionMode": "current-http",
    "currentRouteImplemented": true,
    "routes": [
      {
        "pathPattern": "/api/connect/wallet/me",
        "routeFile": "app/api/connect/wallet/me/route.ts"
      },
      {
        "pathPattern": "/api/connect/payments/checkout",
        "routeFile": "app/api/connect/payments/checkout/route.ts"
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts"
    ],
    "semanticLimit": "Checkout session creation only. Proposed wallet use requires admitted settlement execution."
  },
  "commerce.refunds.create": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/commerce/refunds",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "commerce.subscriptions.create": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/commerce/subscriptions",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "commerce.shipping.update": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/commerce/shipping/update",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "commerce.discounts.create": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/commerce/discounts",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "commerce.discounts.redeem": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/commerce/discounts/redeem",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "commerce.giftCards.issue": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/commerce/gift-cards",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "commerce.giftCards.redeem": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/commerce/gift-cards/redeem",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "commerce.accessPasses.issue": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/commerce/access-passes",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "commerce.inventory.reserve": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/commerce/inventory/reserve",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "commerce.inventory.adjust": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/commerce/inventory/adjust",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "commerce.fulfillment.update": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/commerce/fulfillment",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "commerce.payouts.create": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/commerce/payouts",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "commerce.subscriptions.cancel": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/commerce/subscriptions/[id]/cancel",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "commerce.shipping.quote": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/commerce/shipping/quote",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "commerce.tax.quote": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/commerce/tax/quote",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "commerce.accessPasses.verify": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/commerce/access-passes/verify",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "commerce.payouts.status": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/commerce/payouts/status",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "domains.reserveSubdomain": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/domains/subdomains/reserve",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "domains.verifyCustomDomain": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/domains/custom/verify",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "domains.status": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/domains/status",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "events.subscribe": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/events/subscribe",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "events.replay": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/events/replay",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "events.list": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/events",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "events.ack": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/events/[id]/ack",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "jobs.enqueue": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/jobs",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "jobs.status": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/jobs/[id]",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "jobs.cancel": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/jobs/[id]/cancel",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "jobs.list": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/jobs",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "permissions.grant": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/permissions/grants",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "permissions.revoke": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/permissions/revoke",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "permissions.check": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/permissions/check",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "permissions.roles": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/permissions/roles",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "audit.append": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/audit/events",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "audit.query": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/audit/events",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "audit.export": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/audit/export",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "risk.scorePayment": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/risk/payment",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "risk.scoreAccountRecovery": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/risk/account-recovery",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "risk.velocity": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/risk/velocity",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "risk.proofActivity": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/risk/proof-activity",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "compliance.exportOrders": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/compliance/orders",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "compliance.exportTaxes": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/compliance/taxes",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "compliance.exportPayouts": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/compliance/payouts",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "compliance.exportCustomers": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/compliance/customers",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "compliance.exportAudit": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/compliance/audit",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "portability.exportStore": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/portability/store/export",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "portability.importStore": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/portability/store/import",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "search.query": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/search/query",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "search.products": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/search/products",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "search.pages": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/search/pages",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "search.blog": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/search/blog",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "search.orders": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/search/orders",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "search.customers": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/search/customers",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "search.proofObjects": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/search/proof-objects",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "notifications.send": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/notifications/send",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "notifications.subscribe": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/notifications/subscribe",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "notifications.templates": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/notifications/templates",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "releases.pin": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/releases/pin",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "releases.check": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/releases/check",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "releases.supported": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/releases/rails/supported",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "webhookEndpoints.list": {
    "executionMode": "current-http",
    "currentRouteImplemented": true,
    "routes": [
      {
        "pathPattern": "/api/developers/webhooks",
        "routeFile": "app/api/developers/webhooks/route.ts"
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts"
    ]
  },
  "webhookEndpoints.update": {
    "executionMode": "current-http",
    "currentRouteImplemented": true,
    "routes": [
      {
        "pathPattern": "/api/developers/webhooks/[id]",
        "routeFile": "app/api/developers/webhooks/[endpointId]/route.ts"
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts"
    ]
  },
  "webhookEndpoints.delete": {
    "executionMode": "current-http",
    "currentRouteImplemented": true,
    "routes": [
      {
        "pathPattern": "/api/developers/webhooks/[id]",
        "routeFile": "app/api/developers/webhooks/[endpointId]/route.ts"
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts"
    ]
  },
  "media.upload": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/media/upload",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "media.transform": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/media/transform",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  },
  "proof.query": {
    "executionMode": "historical-http",
    "currentRouteImplemented": false,
    "routes": [
      {
        "pathPattern": "/api/connect/proof/query",
        "routeFile": null
      }
    ],
    "evidence": [
      "477713ae2:packages/receiz-sdk/src/index.ts",
      "packages/receiz-sdk/docs/v107.0.0-v106-sdk-write-inventory.json"
    ]
  }
};
export const RECEIZ_HTTP_OPERATION_SUPPORT: Readonly<Record<string, ReceizHttpOperationSupport>> = Object.freeze(Object.fromEntries(
  Object.entries(entries).map(([method, entry]) => [method, Object.freeze({ ...entry,
    routes: Object.freeze(entry.routes.map(route => Object.freeze(route))), evidence: Object.freeze([...entry.evidence]),
  })]),
));
