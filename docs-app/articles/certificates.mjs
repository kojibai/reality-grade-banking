// Canonical operating chapters; static content only.
import {source} from './shared.mjs';
export default [
{
  "slug": "certificates",
  "title": "Create, share and deposit a share certificate",
  "summary": "Carry existing investment shares in an original certificate, let others buy through its public link and inspect the remaining ownership.",
  "group": "Assets & market",
  "related": [
    "ownership",
    "market-trading",
    "market-records",
    "verification"
  ],
  "sections": [
    {
      "title": "Carry shares with their proof",
      "blocks": [
        {
          "type": "paragraph",
          "text": "Use a share certificate to save supported investment shares as an Original and offer a public purchase route. Creating it moves shares from Investments into the certificate; your total ownership stays the same. Purchases through its link pay the certificate’s owner and move the purchased shares into the buyer’s account. Only the issuing owner can deposit this certificate. Possessing a public copy or link is not the owner’s deposit authority."
        }
      ]
    },
    {
      "title": "Create and save the certificate",
      "blocks": [
        {
          "type": "steps",
          "items": [
            [
              "Open the holding",
              "Choose Assets → Investments, select the supported holding, then the icon labelled Create share certificate."
            ],
            [
              "Choose the quantity",
              "Enter Shares in this certificate, within the displayed available shares and supported six-decimal precision."
            ],
            [
              "Review the movement",
              "Choose Review certificate. Check the exact quantity moving from your investments; Edit quantity changes it before creation."
            ],
            [
              "Create and retain",
              "Choose Create certificate, then Save certificate to retain the sealed original. Open live page shows its actual public page; Copy purchase link copies the page for buyers."
            ]
          ]
        }
      ]
    },
    {
      "title": "Buy through the public page",
      "blocks": [
        {
          "type": "steps",
          "items": [
            [
              "Inspect the certificate",
              "Open its complete purchase link. Read title, Shares remaining, Current certificate value and per-share deterministic projection. Ownership & transaction history retains issued quantity and recorded updates."
            ],
            [
              "Choose Buy shares",
              "Continue with your intended identity, then enter Purchase amount or a preset."
            ],
            [
              "Review purchase",
              "Inspect the budget and available shares. Confirm purchase submits the supported exact certificate purchase."
            ],
            [
              "Inspect completion",
              "Purchase complete and Your shares are in your account establish the accepted result. Open investments shows the resulting holding and its recorded trades."
            ]
          ]
        }
      ]
    },
    {
      "title": "Use the issuing owner’s tools",
      "blocks": [
        {
          "type": "paragraph",
          "text": "From Assets → Investments choose Share certificates to view the list or Deposit a certificate to open its original file. The complete unchanged artifact verifies before its projection; another owner’s file cannot be deposited as yours. Open your certificate, enter Shares to deposit and choose Deposit shares to return that quantity to your account. Save updated certificate retains the current original. Add shares and Sell shares use the current supported review/execution. The public page’s Owner tools opens the actual owner-bound route; a public link does not bypass identity or ownership checks."
        }
      ]
    },
    {
      "title": "Inspect ownership, value and history",
      "blocks": [
        {
          "type": "paragraph",
          "text": "The public page exposes Copy purchase link, QR, Refresh certificate and Ownership & transaction history. Read originally issued shares, remaining quantity, issue time and recorded certificate events. The original carries its issued source; completed transactions and remaining quantity use the actual live share records. Current certificate value is remaining shares multiplied by supported current unit value, with its deterministic-projection label. A calculated value is distinct from sale proceeds, available liquidity and permission for a new operation. Exporting/depositing partitions the same shares; it does not duplicate supply or market cap."
        }
      ]
    },
    {
      "title": "Continue the saved operation",
      "blocks": [
        {
          "type": "paragraph",
          "text": "A pending export, deposit or trade offers Continue saved operation. Cancel unsubmitted operation closes only the original unsubmitted attempt under its actual result; uncertainty must resolve before another request. If another certificate’s operation is pending, open Share certificates in Assets to continue that exact target. Confirmed deposit reports Your shares are back in your account; confirmed purchase/sale reports its own result. Keep the original, exact operation and current owner identity through recovery."
        },
        {
          "type": "links",
          "items": [
            [
              "Read held shares and trades",
              "market-records"
            ],
            [
              "Understand shares and available capacity",
              "market-value"
            ]
          ]
        }
      ]
    }
  ],
  "sources": [source("src/features/certificates/CertificateManager.tsx","Export, owner deposit and saved-operation controls"), source("src/features/certificates/CertificateTrade.tsx","Certificate purchase/sale and exact-request recovery"), source("src/features/certificates/PublicCertificatePage.tsx","Public value, remaining shares and transaction history"), source("src/receiz/share-certificates.ts","Existing certificate verification and owner-bound operations")]
}
];
