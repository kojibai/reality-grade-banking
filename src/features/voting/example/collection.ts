import type {GovernanceRow} from '../../../receiz/governance-directory';

// Display projections of the fixed test-sealed files in originals/.
export const members: Readonly<Record<string, string>> = {
  "receiz_mndkhlsmhqgaydl8ek.receiz.id": "Mira Sol",
  "receiz_wxaigsv3phglofa9xs.receiz.id": "Cal Ward",
  "receiz_ooirdevfwmm5lbe0jm.receiz.id": "Jo Bell",
  "receiz_kx9kmxavzdmdjh4prt.receiz.id": "Ren Lake"
};

export const rows: readonly GovernanceRow[] = [
  {
    "digest": "4369e31e3779af0b5b2620490a6006de371fdc01cbfd157e412f002022bb1ca8",
    "pulse": "15221032",
    "profileUid": null,
    "document": {
      "schema": "receiz.app.bankeiz.governance.public-document.v1",
      "visibility": "public",
      "author": "receiz_mndkhlsmhqgaydl8ek.receiz.id",
      "accountUid": null,
      "terms": {
        "kind": "charter",
        "rules": {
          "electorate": [
            "receiz_mndkhlsmhqgaydl8ek.receiz.id",
            "receiz_wxaigsv3phglofa9xs.receiz.id",
            "receiz_ooirdevfwmm5lbe0jm.receiz.id",
            "receiz_kx9kmxavzdmdjh4prt.receiz.id"
          ],
          "offices": [
            {
              "name": "Library steward",
              "seats": 1,
              "selection": "Election",
              "eligibility": "Electorate",
              "powers": "Schedule repair clinics and coordinate volunteer shifts.",
              "term": "One six-month term.",
              "recall": "Two voters may petition for a recall election.",
              "procedure": "Members nominate themselves. Each voter chooses one candidate. A tie goes to a runoff."
            },
            {
              "name": "Safety reviewer",
              "seats": 2,
              "selection": "Custom",
              "eligibility": "Open",
              "powers": "Review equipment incidents and report maintenance needs.",
              "term": "One season.",
              "recall": "The assembly can replace a reviewer after an open hearing.",
              "procedure": "The assembly invites two trained volunteers and records their acceptance."
            }
          ],
          "articles": [
            {
              "title": "Borrowing and access",
              "text": "Hand tools may be borrowed for seven days. Members who cannot reach the depot may nominate a pickup partner."
            },
            {
              "title": "Repair reports",
              "text": "Volunteers mark a damaged tool out of circulation and attach a repair estimate before requesting reimbursement."
            }
          ],
          "name": "Harbor Tool Library",
          "purpose": "Neighbors share tools, teach safe repairs and keep borrowing affordable in Harbor Ward.",
          "founders": [
            "receiz_mndkhlsmhqgaydl8ek.receiz.id",
            "receiz_wxaigsv3phglofa9xs.receiz.id"
          ],
          "membership": "Mira Sol and Cal Ward founded the library. Jo Bell and Ren Lake join them in its four-member voting assembly. Membership changes require a charter amendment.",
          "decisions": "Each member has one vote. Policy and budget requests need at least two affirmative votes and 60% of the votes cast. Polls guide programming. In a single-seat election the highest count leads, with a fresh vote for a tie.",
          "representation": "A member may name one voting member to act for a single decision category. The mandate must precede the proposal and remain in force when the representative votes. A member’s own ballot takes precedence.",
          "amendments": "Any voting member may propose replacement text. Every founder must ratify the new charter before members use it.",
          "appeals": "During the three-day challenge period, any member may identify a disputed item and request a remedy. Two uninvolved members review the evidence before a decision can bind the library.",
          "treasury": "Tool repairs have a $900 quarterly limit. A payment needs an itemized quote, an approved budget and independent release by two authorized members. A request or ballot alone cannot release money.",
          "approvalPercent": 60,
          "minimumSupportPercent": 50,
          "voteDays": 7,
          "appealDays": 3,
          "allowMandates": true
        }
      }
    }
  },
  {
    "digest": "a62448baa025d6c17eaa8f0963cf65ab08305e2121c2e67ed5e0d1496d13d495",
    "pulse": "15221032",
    "profileUid": null,
    "document": {
      "schema": "receiz.app.bankeiz.governance.public-document.v1",
      "visibility": "public",
      "author": "receiz_mndkhlsmhqgaydl8ek.receiz.id",
      "accountUid": null,
      "terms": {
        "kind": "ratification",
        "charter": "4369e31e3779af0b5b2620490a6006de371fdc01cbfd157e412f002022bb1ca8"
      }
    }
  },
  {
    "digest": "f714d73d75ad1547960085a41e5b04bfff05dd2cf8f5cf52dcf6962fa4120c41",
    "pulse": "15221032",
    "profileUid": null,
    "document": {
      "schema": "receiz.app.bankeiz.governance.public-document.v1",
      "visibility": "public",
      "author": "receiz_wxaigsv3phglofa9xs.receiz.id",
      "accountUid": null,
      "terms": {
        "kind": "ratification",
        "charter": "4369e31e3779af0b5b2620490a6006de371fdc01cbfd157e412f002022bb1ca8"
      }
    }
  },
  {
    "digest": "3b91781fe3d9dcf9453c5a25ddfaa0244b74593f6a8d4a1d1d90b9309d3d5dc5",
    "pulse": "15221032",
    "profileUid": null,
    "document": {
      "schema": "receiz.app.bankeiz.governance.public-document.v1",
      "visibility": "public",
      "author": "receiz_wxaigsv3phglofa9xs.receiz.id",
      "accountUid": null,
      "terms": {
        "kind": "candidacy",
        "charter": "4369e31e3779af0b5b2620490a6006de371fdc01cbfd157e412f002022bb1ca8",
        "office": "Library steward",
        "statement": "I am Cal Ward. I will publish the volunteer rota a month ahead and keep one repair bench available for walk-ins."
      }
    }
  },
  {
    "digest": "9677a0a22326da0b88e3a1c067c72af8df334ab644fcfed944c97b0d08681df7",
    "pulse": "15221032",
    "profileUid": null,
    "document": {
      "schema": "receiz.app.bankeiz.governance.public-document.v1",
      "visibility": "public",
      "author": "receiz_ooirdevfwmm5lbe0jm.receiz.id",
      "accountUid": null,
      "terms": {
        "kind": "candidacy",
        "charter": "4369e31e3779af0b5b2620490a6006de371fdc01cbfd157e412f002022bb1ca8",
        "office": "Library steward",
        "statement": "I am Jo Bell. I will pair each first-time borrower with a volunteer and bring a repair clinic to the waterfront depot."
      }
    }
  },
  {
    "digest": "7443b445ca5aaece39e9fb228647e65c698e1388f0298d8ee19e0ffd79378e64",
    "pulse": "15221032",
    "profileUid": null,
    "document": {
      "schema": "receiz.app.bankeiz.governance.public-document.v1",
      "visibility": "public",
      "author": "receiz_kx9kmxavzdmdjh4prt.receiz.id",
      "accountUid": null,
      "terms": {
        "kind": "mandate",
        "charter": "4369e31e3779af0b5b2620490a6006de371fdc01cbfd157e412f002022bb1ca8",
        "delegate": "receiz_mndkhlsmhqgaydl8ek.receiz.id",
        "scope": "Policy",
        "untilKaiPulse": "15361032",
        "previous": null
      }
    }
  },
  {
    "digest": "58473220ad5448693c6d36f541a0a5307448ca24d3352b0fd7b950fb4387bf42",
    "pulse": "15221032",
    "profileUid": null,
    "document": {
      "schema": "receiz.app.bankeiz.governance.public-document.v1",
      "visibility": "public",
      "author": "receiz_mndkhlsmhqgaydl8ek.receiz.id",
      "accountUid": null,
      "terms": {
        "kind": "proposal",
        "charter": "4369e31e3779af0b5b2620490a6006de371fdc01cbfd157e412f002022bb1ca8",
        "office": "Library steward",
        "nominations": [
          "3b91781fe3d9dcf9453c5a25ddfaa0244b74593f6a8d4a1d1d90b9309d3d5dc5",
          "9677a0a22326da0b88e3a1c067c72af8df334ab644fcfed944c97b0d08681df7"
        ],
        "title": "Elect the library steward",
        "text": "Choose the member who will coordinate the next six months of repair clinics and volunteer shifts.",
        "decision": "Election",
        "choices": [
          "receiz_wxaigsv3phglofa9xs.receiz.id",
          "receiz_ooirdevfwmm5lbe0jm.receiz.id"
        ]
      }
    }
  },
  {
    "digest": "24241bcf4bd77fd26ac90d13b29e83e29b8e4db8037ed18094e10bb015d41dd7",
    "pulse": "15221032",
    "profileUid": null,
    "document": {
      "schema": "receiz.app.bankeiz.governance.public-document.v1",
      "visibility": "public",
      "author": "receiz_mndkhlsmhqgaydl8ek.receiz.id",
      "accountUid": null,
      "terms": {
        "kind": "ballot",
        "charter": "4369e31e3779af0b5b2620490a6006de371fdc01cbfd157e412f002022bb1ca8",
        "proposal": "58473220ad5448693c6d36f541a0a5307448ca24d3352b0fd7b950fb4387bf42",
        "choice": "receiz_ooirdevfwmm5lbe0jm.receiz.id",
        "previous": null
      }
    }
  },
  {
    "digest": "df11ba78cc6c9deaec6d8509e0086663cd8fc0e16cc20a46cb69c39ce8ddec6f",
    "pulse": "15221033",
    "profileUid": null,
    "document": {
      "schema": "receiz.app.bankeiz.governance.public-document.v1",
      "visibility": "public",
      "author": "receiz_wxaigsv3phglofa9xs.receiz.id",
      "accountUid": null,
      "terms": {
        "kind": "ballot",
        "charter": "4369e31e3779af0b5b2620490a6006de371fdc01cbfd157e412f002022bb1ca8",
        "proposal": "58473220ad5448693c6d36f541a0a5307448ca24d3352b0fd7b950fb4387bf42",
        "choice": "receiz_wxaigsv3phglofa9xs.receiz.id",
        "previous": null
      }
    }
  },
  {
    "digest": "a560b591e024eab41e7675a396534f7de2803a9cfa9f61d96e54573e25313dc7",
    "pulse": "15221033",
    "profileUid": null,
    "document": {
      "schema": "receiz.app.bankeiz.governance.public-document.v1",
      "visibility": "public",
      "author": "receiz_ooirdevfwmm5lbe0jm.receiz.id",
      "accountUid": null,
      "terms": {
        "kind": "ballot",
        "charter": "4369e31e3779af0b5b2620490a6006de371fdc01cbfd157e412f002022bb1ca8",
        "proposal": "58473220ad5448693c6d36f541a0a5307448ca24d3352b0fd7b950fb4387bf42",
        "choice": "receiz_ooirdevfwmm5lbe0jm.receiz.id",
        "previous": null
      }
    }
  },
  {
    "digest": "d5c941eeb743e0567273beec20c2ae26a542040da406104287fa74d6d0b5d5b6",
    "pulse": "15221033",
    "profileUid": null,
    "document": {
      "schema": "receiz.app.bankeiz.governance.public-document.v1",
      "visibility": "public",
      "author": "receiz_kx9kmxavzdmdjh4prt.receiz.id",
      "accountUid": null,
      "terms": {
        "kind": "ballot",
        "charter": "4369e31e3779af0b5b2620490a6006de371fdc01cbfd157e412f002022bb1ca8",
        "proposal": "58473220ad5448693c6d36f541a0a5307448ca24d3352b0fd7b950fb4387bf42",
        "choice": "receiz_ooirdevfwmm5lbe0jm.receiz.id",
        "previous": null
      }
    }
  },
  {
    "digest": "c50b140ead08ffbcfb9e9e9fb3816d224102679f9d18b130d608b3eafde02b67",
    "pulse": "15221033",
    "profileUid": null,
    "document": {
      "schema": "receiz.app.bankeiz.governance.public-document.v1",
      "visibility": "public",
      "author": "receiz_ooirdevfwmm5lbe0jm.receiz.id",
      "accountUid": null,
      "terms": {
        "kind": "proposal",
        "charter": "4369e31e3779af0b5b2620490a6006de371fdc01cbfd157e412f002022bb1ca8",
        "title": "Choose our next repair clinic",
        "text": "Which workshop would you attend next month? The program team will use this advisory poll to invite an instructor.",
        "decision": "Poll",
        "choices": [
          "Bicycle brakes",
          "Lamp rewiring",
          "Mending clothes"
        ]
      }
    }
  },
  {
    "digest": "ffd841babc8c257880d09e4cf443e338b053de3677e33004e244b00759578e95",
    "pulse": "15221033",
    "profileUid": null,
    "document": {
      "schema": "receiz.app.bankeiz.governance.public-document.v1",
      "visibility": "public",
      "author": "receiz_mndkhlsmhqgaydl8ek.receiz.id",
      "accountUid": null,
      "terms": {
        "kind": "ballot",
        "charter": "4369e31e3779af0b5b2620490a6006de371fdc01cbfd157e412f002022bb1ca8",
        "proposal": "c50b140ead08ffbcfb9e9e9fb3816d224102679f9d18b130d608b3eafde02b67",
        "choice": "Lamp rewiring",
        "previous": null
      }
    }
  },
  {
    "digest": "f95cb1388fb52826b3619ef5ab783dd6f5a0b0f58b388940de4377c1c9698c88",
    "pulse": "15221033",
    "profileUid": null,
    "document": {
      "schema": "receiz.app.bankeiz.governance.public-document.v1",
      "visibility": "public",
      "author": "receiz_mndkhlsmhqgaydl8ek.receiz.id",
      "accountUid": null,
      "terms": {
        "kind": "ballot",
        "charter": "4369e31e3779af0b5b2620490a6006de371fdc01cbfd157e412f002022bb1ca8",
        "proposal": "c50b140ead08ffbcfb9e9e9fb3816d224102679f9d18b130d608b3eafde02b67",
        "choice": "Bicycle brakes",
        "previous": "ffd841babc8c257880d09e4cf443e338b053de3677e33004e244b00759578e95"
      }
    }
  },
  {
    "digest": "657ac9e7506560c1d24189bc24b9f8d386fd84699363c16af5cf39c95448c68e",
    "pulse": "15221033",
    "profileUid": null,
    "document": {
      "schema": "receiz.app.bankeiz.governance.public-document.v1",
      "visibility": "public",
      "author": "receiz_wxaigsv3phglofa9xs.receiz.id",
      "accountUid": null,
      "terms": {
        "kind": "ballot",
        "charter": "4369e31e3779af0b5b2620490a6006de371fdc01cbfd157e412f002022bb1ca8",
        "proposal": "c50b140ead08ffbcfb9e9e9fb3816d224102679f9d18b130d608b3eafde02b67",
        "choice": "Lamp rewiring",
        "previous": null
      }
    }
  },
  {
    "digest": "f12e1353f39db5e1bf355d0a20907e047e6328d7a548e8ad1cf19d2b49de6f34",
    "pulse": "15221033",
    "profileUid": null,
    "document": {
      "schema": "receiz.app.bankeiz.governance.public-document.v1",
      "visibility": "public",
      "author": "receiz_ooirdevfwmm5lbe0jm.receiz.id",
      "accountUid": null,
      "terms": {
        "kind": "ballot",
        "charter": "4369e31e3779af0b5b2620490a6006de371fdc01cbfd157e412f002022bb1ca8",
        "proposal": "c50b140ead08ffbcfb9e9e9fb3816d224102679f9d18b130d608b3eafde02b67",
        "choice": "Bicycle brakes",
        "previous": null
      }
    }
  },
  {
    "digest": "0e220fdb32d27744f4151581ea13f9e2c6610a1a00cbfd76606ecb1e87f9e35b",
    "pulse": "15221033",
    "profileUid": null,
    "document": {
      "schema": "receiz.app.bankeiz.governance.public-document.v1",
      "visibility": "public",
      "author": "receiz_kx9kmxavzdmdjh4prt.receiz.id",
      "accountUid": null,
      "terms": {
        "kind": "ballot",
        "charter": "4369e31e3779af0b5b2620490a6006de371fdc01cbfd157e412f002022bb1ca8",
        "proposal": "c50b140ead08ffbcfb9e9e9fb3816d224102679f9d18b130d608b3eafde02b67",
        "choice": "Mending clothes",
        "previous": null
      }
    }
  },
  {
    "digest": "fb93bf6e44e686606e0a0f1b8b4805e76bea4120ea04b762accf85d4cc5ecee2",
    "pulse": "15221033",
    "profileUid": null,
    "document": {
      "schema": "receiz.app.bankeiz.governance.public-document.v1",
      "visibility": "public",
      "author": "receiz_wxaigsv3phglofa9xs.receiz.id",
      "accountUid": null,
      "terms": {
        "kind": "proposal",
        "charter": "4369e31e3779af0b5b2620490a6006de371fdc01cbfd157e412f002022bb1ca8",
        "title": "Pilot Saturday pickup hours",
        "text": "For four Saturdays, open the waterfront depot from 9 a.m. until noon. Record volunteer coverage and the number of pickups after each shift.",
        "decision": "Policy",
        "choices": [
          "Run the pilot",
          "Keep current hours"
        ]
      }
    }
  },
  {
    "digest": "a1ecf6c53f0f8a16f3ef6925d69ec50ec60adec23cc35178313303805e32b0ea",
    "pulse": "15221033",
    "profileUid": null,
    "document": {
      "schema": "receiz.app.bankeiz.governance.public-document.v1",
      "visibility": "public",
      "author": "receiz_mndkhlsmhqgaydl8ek.receiz.id",
      "accountUid": null,
      "terms": {
        "kind": "ballot",
        "charter": "4369e31e3779af0b5b2620490a6006de371fdc01cbfd157e412f002022bb1ca8",
        "proposal": "fb93bf6e44e686606e0a0f1b8b4805e76bea4120ea04b762accf85d4cc5ecee2",
        "choice": "Run the pilot",
        "previous": null
      }
    }
  },
  {
    "digest": "7eb1e29c3e96fdbb46b0846c3ad67eee0a8c2ce4356e179cd02fae8205e7434c",
    "pulse": "15221033",
    "profileUid": null,
    "document": {
      "schema": "receiz.app.bankeiz.governance.public-document.v1",
      "visibility": "public",
      "author": "receiz_wxaigsv3phglofa9xs.receiz.id",
      "accountUid": null,
      "terms": {
        "kind": "ballot",
        "charter": "4369e31e3779af0b5b2620490a6006de371fdc01cbfd157e412f002022bb1ca8",
        "proposal": "fb93bf6e44e686606e0a0f1b8b4805e76bea4120ea04b762accf85d4cc5ecee2",
        "choice": "Run the pilot",
        "previous": null
      }
    }
  },
  {
    "digest": "f376fc3ef1e82d38493c2477cc16c3ec6d756c490b662aa1a0d6f45588576802",
    "pulse": "15221033",
    "profileUid": null,
    "document": {
      "schema": "receiz.app.bankeiz.governance.public-document.v1",
      "visibility": "public",
      "author": "receiz_ooirdevfwmm5lbe0jm.receiz.id",
      "accountUid": null,
      "terms": {
        "kind": "ballot",
        "charter": "4369e31e3779af0b5b2620490a6006de371fdc01cbfd157e412f002022bb1ca8",
        "proposal": "fb93bf6e44e686606e0a0f1b8b4805e76bea4120ea04b762accf85d4cc5ecee2",
        "choice": "Keep current hours",
        "previous": null
      }
    }
  },
  {
    "digest": "6c1b36ec5c0070fbee8577f803c8fdb95e05d0c7f8a4e4fbdc3794e8de1f0a75",
    "pulse": "15221033",
    "profileUid": null,
    "document": {
      "schema": "receiz.app.bankeiz.governance.public-document.v1",
      "visibility": "public",
      "author": "receiz_kx9kmxavzdmdjh4prt.receiz.id",
      "accountUid": null,
      "terms": {
        "kind": "proposal",
        "charter": "4369e31e3779af0b5b2620490a6006de371fdc01cbfd157e412f002022bb1ca8",
        "title": "Request $240 for two drill repairs",
        "text": "Request one payment of $240 to East Quay Repair from the quarterly tool-repair budget for two replacement drill chucks. The submitted quote groups parts and labor into one total.",
        "decision": "Treasury",
        "choices": [
          "Approve the request",
          "Request a revised quote"
        ]
      }
    }
  },
  {
    "digest": "b518d3df57c347ccbc6dcac0e00384b888255b3763ae72b30cd36a5822714f37",
    "pulse": "15221033",
    "profileUid": null,
    "document": {
      "schema": "receiz.app.bankeiz.governance.public-document.v1",
      "visibility": "public",
      "author": "receiz_kx9kmxavzdmdjh4prt.receiz.id",
      "accountUid": null,
      "terms": {
        "kind": "ballot",
        "charter": "4369e31e3779af0b5b2620490a6006de371fdc01cbfd157e412f002022bb1ca8",
        "proposal": "6c1b36ec5c0070fbee8577f803c8fdb95e05d0c7f8a4e4fbdc3794e8de1f0a75",
        "choice": "Approve the request",
        "previous": null
      }
    }
  },
  {
    "digest": "d8f6edf11ab42198181c70e0250fce236451124dfcfa2c003162acd33c6ead71",
    "pulse": "15221033",
    "profileUid": null,
    "document": {
      "schema": "receiz.app.bankeiz.governance.public-document.v1",
      "visibility": "public",
      "author": "receiz_ooirdevfwmm5lbe0jm.receiz.id",
      "accountUid": null,
      "terms": {
        "kind": "ballot",
        "charter": "4369e31e3779af0b5b2620490a6006de371fdc01cbfd157e412f002022bb1ca8",
        "proposal": "6c1b36ec5c0070fbee8577f803c8fdb95e05d0c7f8a4e4fbdc3794e8de1f0a75",
        "choice": "Request a revised quote",
        "previous": null
      }
    }
  },
  {
    "digest": "231f2502145d5dcbb8abd2f4a9fd3b626a272480c01c11e74c340915e0ee21d3",
    "pulse": "15221033",
    "profileUid": null,
    "document": {
      "schema": "receiz.app.bankeiz.governance.public-document.v1",
      "visibility": "public",
      "author": "receiz_ooirdevfwmm5lbe0jm.receiz.id",
      "accountUid": null,
      "terms": {
        "kind": "challenge",
        "charter": "4369e31e3779af0b5b2620490a6006de371fdc01cbfd157e412f002022bb1ca8",
        "proposal": "6c1b36ec5c0070fbee8577f803c8fdb95e05d0c7f8a4e4fbdc3794e8de1f0a75",
        "text": "The quote combines parts and labor, while our charter requires an itemized quote. Please request a breakdown from East Quay Repair and hold the payment for independent review."
      }
    }
  },
  {
    "digest": "62e44508d21570056a69793d1f2f27379e56fd1705d150ebaa178994a83a26ac",
    "pulse": "15221033",
    "profileUid": null,
    "document": {
      "schema": "receiz.app.bankeiz.governance.public-document.v1",
      "visibility": "public",
      "author": "receiz_mndkhlsmhqgaydl8ek.receiz.id",
      "accountUid": null,
      "terms": {
        "kind": "proposal",
        "charter": "4369e31e3779af0b5b2620490a6006de371fdc01cbfd157e412f002022bb1ca8",
        "title": "Add an annual inventory review",
        "text": "Add an article requiring two members to check the tool register each spring and publish a list of repairs before the next budget vote. This proposal opens discussion of the wording.",
        "decision": "Amendment",
        "choices": [
          "Adopt the wording",
          "Return for revision"
        ]
      }
    }
  }
];
