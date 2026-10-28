// Canonical operating chapters; static content only.
import {source} from './shared.mjs';
export default [
{
  "slug": "twin-workspace",
  "title": "Configure your Twin and inspect its work",
  "summary": "Set the existing agent’s behavior, inspect available continuity and task results, and add the same Twin to your website.",
  "group": "Agents",
  "related": [
    "agents",
    "business-setup",
    "credits",
    "permissions"
  ],
  "sections": [
    {
      "title": "Open your existing Twin",
      "blocks": [
        {
          "type": "paragraph",
          "text": "Use the workspace to configure the Twin you already have and inspect what its work actually produced. In the account’s message panel choose Your agent, then the brain icon labelled Your Twin settings and mind. Settings, Mind, Work and Add to website are views of this same owner-bound Twin. Conversation returns to the agent thread. Your public username, actual Business access and service permissions govern the corresponding available actions."
        }
      ]
    },
    {
      "title": "Save behavior and permissions",
      "blocks": [
        {
          "type": "steps",
          "items": [
            [
              "Set the core behavior",
              "In Settings enter Name, How your Twin should help and Memory: None, Session, Relationship or Venture."
            ],
            [
              "Choose capabilities and permissions",
              "Expand Capabilities and Permissions. Choose the intended reply, outreach, scheduling, payment-link, business-intake, routing, team-handoff and commerce permissions. Set Actions per session and the high-risk owner-review choice."
            ],
            [
              "Describe the offer",
              "Your offer contains Offer name, What you provide, Who it helps, Why choose you and What happens next. Business skills selects the supported lead, offer, deposit, quote, follow-up and team-routing behavior."
            ],
            [
              "Choose Save changes",
              "Inspect Your Twin settings are saved. Existing plan, connected services and exact consequential-action approvals still apply; a settings checkbox does not manufacture financial authority."
            ]
          ]
        }
      ]
    },
    {
      "title": "Set portrait, voice and presence",
      "blocks": [
        {
          "type": "paragraph",
          "text": "Set Twin image selects an image separately from your account profile portrait. Choose Portrait style and optional Direction, if you like, then Create Twin portrait. This uses existing plan/usage credits. Voice & presence offers Presence, Portrait display, Voice, Voice style, Offer to share and Preferred voice, with optional Show captions and Play replies automatically. Save changes applies the selected settings. A selected image or local preview is not the saved portrait result."
        }
      ]
    },
    {
      "title": "Inspect Mind and its source",
      "blocks": [
        {
          "type": "steps",
          "items": [
            [
              "Choose Mind",
              "Your continuity shows the available retained sources and conversations. Graph and Continuity offer two presentations of the same selected records."
            ],
            [
              "Select a record",
              "Use Sources or Memory turns, then select an entry for accessible detail. Zoom in/out and Fit mind adjust only the view."
            ],
            [
              "Read Source continuity",
              "Inspect the available subject/head, Showcase/history and complete-history coordinates. Show more reveals additional listed records."
            ],
            [
              "Keep the authority with the Original",
              "This view indexes saved sources. Their original proof objects carry their evidence; a graph node or generated memory does not replace ownership, funding or a financial result."
            ]
          ]
        }
      ]
    },
    {
      "title": "Inspect Work and the result",
      "blocks": [
        {
          "type": "paragraph",
          "text": "Ask your agent in Conversation to find leads, prepare a campaign or organize next steps. Your work has started establishes a started task. Open Work for the actual task/campaign status, summary, stages, recent logs, imported/updated contacts, appointments and next action where returned. Planning/running are underway; completed, blocked and failed retain their distinct meanings. Refresh agent work reads the current work result without starting another task. Keep the task’s recorded source and use Contacts/Calendar to inspect the produced person or appointment."
        }
      ]
    },
    {
      "title": "Add the same Twin to a website",
      "blocks": [
        {
          "type": "steps",
          "items": [
            [
              "Choose Add to website",
              "The existing Twin embed and its website preview appear."
            ],
            [
              "Choose Copy Twin embed",
              "Paste that supplied embed into your website’s supported HTML area. Use the same public username and retained Twin."
            ],
            [
              "Try the actual preview",
              "Inspect the public experience and configured presentation before distributing the website. The preview uses the existing Receiz embed."
            ],
            [
              "Check the intended scope",
              "Public replies use the configured public/client-facing context. Private owner records and financial authority do not become public merely because an iframe is installed."
            ]
          ]
        }
      ]
    },
    {
      "title": "If a save is not confirmed",
      "blocks": [
        {
          "type": "paragraph",
          "text": "An unknown settings or portrait result keeps its exact request. Choose Check portrait request for the retained portrait operation, or Review current settings to inspect the current saved configuration before saving another change. Reopen Work to inspect an interrupted task rather than asking it to start again. Keep the existing identity, conversation and sources; an unavailable settings read does not erase them."
        },
        {
          "type": "links",
          "items": [
            [
              "Work in the conversation",
              "agents"
            ],
            [
              "Add usage and resume",
              "credits"
            ]
          ]
        }
      ]
    }
  ],
  "sources": [source("src/features/messages/TwinWorkspacePanel.tsx","Settings, portrait, work and embed controls"), source("src/features/messages/twin-mind/TwinMindView.tsx","Mind sources and continuity inspection"), source("src/receiz/twin-workspace.ts","Settings, task and retained-result contract")]
},
{
  "slug": "business-setup",
  "title": "Set up your business and connect its domain",
  "summary": "Use the owner conversation to configure the offer, profile, client routing and native domain delivery, then inspect the actual result.",
  "group": "Agents",
  "related": [
    "agents",
    "twin-workspace",
    "credits",
    "publication"
  ],
  "sections": [
    {
      "title": "Begin with the work you want done",
      "blocks": [
        {
          "type": "paragraph",
          "text": "Business setup happens in your existing Your agent conversation. State the change you want: your offer and client answers, profile details, booking/payment routing, supported team handoff, a work output or your domain. Supply the relevant business context rather than rebuilding another identity. Business access and actual configured service capabilities still apply. Settings offers direct editing of the supported Twin fields; the conversation composes its existing native actions."
        }
      ]
    },
    {
      "title": "Configure the existing business",
      "blocks": [
        {
          "type": "steps",
          "items": [
            [
              "Explain the desired change",
              "For example: set my offer to a 30-minute consultation, explain who it helps, and prepare my existing booking and payment routes. Name actual team destinations when requesting supported handoff."
            ],
            [
              "Attach the exact work when needed",
              "Use Attach work or an image for the image or Original you intend to use. Do not imply an attachment exists when it has not been selected."
            ],
            [
              "Review the proposed action",
              "An action card may expose Action details and Run this action. Inspect the actual tool and arguments before choosing it. Read-only inspection and a proposed change remain distinct."
            ],
            [
              "Inspect the result",
              "Setup updated, Profile saved, Image saved or the actual native result names the completed action. View native result exposes the returned detail. Check the profile, Settings, Contacts or Calendar that the result changed."
            ]
          ]
        }
      ]
    },
    {
      "title": "Connect the intended domain",
      "blocks": [
        {
          "type": "steps",
          "items": [
            [
              "Name the exact domain",
              "Ask the agent to connect the hostname you own, then inspect the hostname shown in its returned domain result. Saving a hostname alone does not make it live."
            ],
            [
              "Connect the existing provider",
              "If required, use Connect your provider and approve its actual provider access. Return to this conversation to continue the same connection. Provider credentials stay in the supported connection flow."
            ],
            [
              "Use automatic or manual instructions",
              "When automatic setup is supported, the result reports actual applied DNS. Otherwise open Domain instructions and copy the shown record type, name and value into your domain provider. Use the exact returned values."
            ],
            [
              "Inspect delivery",
              "DNS saved means records were applied. Profile verified and Domain is live establish the accepted delivery state. Open your domain appears for the actual verified live URL."
            ]
          ]
        }
      ]
    },
    {
      "title": "Inspect domain progress and result",
      "blocks": [
        {
          "type": "table",
          "caption": "The connection result retains its scope",
          "columns": [
            "Display",
            "Meaning",
            "Next step"
          ],
          "rows": [
            [
              "Connect your provider",
              "Provider approval is required.",
              "Complete that connection, then continue the same setup."
            ],
            [
              "DNS saved",
              "The provider accepted the shown records.",
              "Keep chatting while delivery is checked; inspect the separate profile result."
            ],
            [
              "Waiting for delivery",
              "Live delivery is not confirmed yet.",
              "Ask to check the same domain later."
            ],
            [
              "Profile verified / Domain is live",
              "The checked domain and profile route match.",
              "Open your domain and inspect it."
            ],
            [
              "Domain changed / Checks stopped",
              "The saved target changed while another check was running.",
              "Review the current hostname before another request."
            ]
          ]
        }
      ]
    },
    {
      "title": "Create, seal and publish the intended work",
      "blocks": [
        {
          "type": "paragraph",
          "text": "For supported creation, state the output and useful brand/audience/offer context. Inspect the actual creation workspace/run result; accepting a request does not establish a rendered asset. To seal attached work, choose the actual file(s) and ask to seal their exact bytes. The conversation’s Original sealed result retains the proof privately; ask explicitly to publish that selected sealed Original when public delivery is intended. Publishing is a separate native action in this conversation path. Inspect Published or Publication needs checking, then open the actual source/profile. The asset composer’s Create asset route has its own automatic public-sealing sequence."
        }
      ]
    },
    {
      "title": "Check an interrupted action",
      "blocks": [
        {
          "type": "paragraph",
          "text": "A result marked unknown or Result not confirmed is retained and has not been repeated. Ask to inspect current setup, creation, work or domain before another write. Check result on a pending Receiz action continues the same admitted attempt. Public DNS propagation, file selection, profile delivery, generated work and financial execution each have their own result. A successful setup reply cannot stand in for a payment receipt, ownership transfer or new spending permission."
        },
        {
          "type": "links",
          "items": [
            [
              "Configure the Twin controls",
              "twin-workspace"
            ],
            [
              "Preserve the publication result",
              "publication"
            ]
          ]
        }
      ]
    }
  ],
  "sources": [source("src/receiz/business-chat.ts","Owner chat actions, attached files and native result retention"), source("src/receiz/business-setup.ts","Existing agent configuration and creation operations"), source("src/features/messages/BusinessReceipts.tsx","Setup approval, DNS details and delivery evidence"), source("src/receiz/business-dns-tools.ts","Domain instructions, provider connection and exact checks")]
},
{
  "slug": "credits",
  "title": "Activate Business, add credits and resume work",
  "summary": "Review the actual plan, fund metered usage and return to the same conversation or retained money task.",
  "group": "Agents",
  "related": [
    "agents",
    "twin-workspace",
    "business-setup",
    "recovery"
  ],
  "sections": [
    {
      "title": "Choose the addition you need",
      "blocks": [
        {
          "type": "paragraph",
          "text": "Messages, calls, core banking, proof objects, ownership and supported value remain available without Business. Business adds the agent’s extra intelligence, automation and business tools. The current authored offer is $149/month or $1,499/year, with 7,500 monthly AI usage credits; use is metered. Read the exact secure-payment terms before paying. An existing Receiz identity and subscription remain the same throughout this flow."
        }
      ]
    },
    {
      "title": "Activate or manage the plan",
      "blocks": [
        {
          "type": "steps",
          "items": [
            [
              "Open the review",
              "Choose Explore Business from the agent/Business entry. Read the intended task and plan."
            ],
            [
              "Choose the billing period",
              "Use Monthly or Yearly. Review its price and monthly/yearly renewal until cancelled."
            ],
            [
              "Continue to secure payment",
              "Use the existing Receiz secure checkout. Payment submission and confirmed Business access are separate results."
            ],
            [
              "Inspect access",
              "Business is active confirms the accepted access. For an existing subscription, use Manage existing plan to manage or cancel it; Refresh billing access refreshes that access rather than creating a second subscription."
            ]
          ]
        }
      ]
    },
    {
      "title": "Add usage for the next task",
      "blocks": [
        {
          "type": "steps",
          "items": [
            [
              "Choose Add credits",
              "Use the offered Add credits action in Your agent when usage is needed. The conversation remains retained."
            ],
            [
              "Choose the amount",
              "Select $10, $25, $50 or $100. Inspect the displayed credit count and one-time funding quote. Purchased credits do not expire."
            ],
            [
              "Use the actual funding choice",
              "Add credits from your balance appears for its eligible fully covered quote; otherwise Continue to secure payment completes the supported funding path. Check funding options or Refresh funding quote obtains the applicable current review."
            ],
            [
              "Return to the conversation",
              "The confirmed top-up says Ready to keep going. Choose Continue your conversation. Add another top-up is a separate deliberate purchase."
            ]
          ]
        }
      ]
    },
    {
      "title": "Inspect payment and credit results",
      "blocks": [
        {
          "type": "paragraph",
          "text": "A card form, redirect or local success message alone does not confirm usage credit. The retained session confirms the exact account and accepted top-up. Included monthly credits and purchased credits have their actual plan terms; a dollar value in a task is not automatically available usage. Review the actual amount, credit count and funding source in the current flow. A confirmed usage purchase does not move money to a message recipient or finish a separate money task by itself."
        }
      ]
    },
    {
      "title": "Resume an interrupted attempt",
      "blocks": [
        {
          "type": "steps",
          "items": [
            [
              "Check the original purchase",
              "If a top-up is uncertain, choose Check this same top-up. Check this top-up inspects an already-started funding attempt. Do not start another purchase to find its outcome."
            ],
            [
              "Check plan access",
              "For an uncertain upgrade choose Check account access. Continue the existing checkout/session where offered."
            ],
            [
              "Resume the saved work",
              "A paused money task says Your money task is saved. Add credits, then continue. After confirmed funding choose Resume money task."
            ],
            [
              "Inspect its own result",
              "Return to the same conversation and actual task/financial result. Confirmed usage does not establish that the original task completed."
            ]
          ]
        }
      ]
    },
    {
      "title": "Keep identity and authority continuous",
      "blocks": [
        {
          "type": "paragraph",
          "text": "Your plan and usage are attached to the intended existing account. If access is temporarily unavailable, keep the Identity Record and original purchase/session; do not create another person or subscription to continue. Changes to plan, usage and hosted service availability retain their specific scope. Your Twin still uses actual tool permissions and exact-action approval; buying credits does not grant an automatic financial mandate."
        },
        {
          "type": "links",
          "items": [
            [
              "Use the agent",
              "agents"
            ],
            [
              "Recover an existing operation",
              "recovery"
            ]
          ]
        }
      ]
    }
  ],
  "sources": [source("src/features/messages/TwinUpgradePanel.tsx","Plan review, checkout and existing subscription management"), source("src/features/messages/TwinCreditsPanel.tsx","Credit amounts, funding and same-top-up recovery"), source("src/receiz/twin-credits-session.ts","Retained credit purchase and confirmed access"), source("src/content/business-offer.mjs","Authored plan and included usage terms")]
}
];
