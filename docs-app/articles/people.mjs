// Canonical operating chapters; static content only.
import {source} from './shared.mjs';
export default [
{
  "slug": "messages",
  "title": "Message someone and continue a call",
  "summary": "Start a direct or group conversation, recognize delivery states, call the participants and return to the same conversation.",
  "group": "People & meetings",
  "related": [
    "contacts",
    "calendar-booking",
    "meetings",
    "agents"
  ],
  "sections": [
    {
      "title": "Use the same identity",
      "blocks": [
        {
          "type": "paragraph",
          "text": "Use Messages when the discussion, person and next action should stay together. Conversations use your existing Receiz ID and its direct/group history. From your account, choose the message icon beside Account settings; its accessible name is Open your agent and messages. If shown, choose Enable messages. Select Messages to open the inbox; Your agent is the separate owner-Twin conversation. Messages and calls are included with the account. Business supplies its own optional agent access."
        }
      ]
    },
    {
      "title": "Start a conversation",
      "blocks": [
        {
          "type": "steps",
          "items": [
            [
              "Choose New conversation",
              "In Messages, select the compose icon labelled New conversation."
            ],
            [
              "Find the actual people",
              "Enter a Name or username, then select the intended profile. Choose one person for a direct conversation, or more for a group. Remove a selection by choosing its Remove control."
            ],
            [
              "Name the group if useful",
              "With several participants, enter Group name (optional), then choose Start conversation."
            ],
            [
              "Write and send",
              "Enter your message in the conversation composer and use its send control. Check the selected participants before sending."
            ]
          ]
        }
      ]
    },
    {
      "title": "Inspect the conversation and delivery result",
      "blocks": [
        {
          "type": "paragraph",
          "text": "Your outgoing message stays with its delivery state. Sending is in progress; Delivery not confirmed means its remote result is unknown; Not sent is a refusal. A local bubble alone does not establish delivery. Open the same conversation to inspect the recorded message and any available continuation before repeating it. Search messages filters conversation titles and participants. Load earlier messages opens earlier records in that thread. Select the other person’s header to open their contact where available; a group’s member control exposes its participant profiles. The money control prepares a separate payment, whose financial review remains required."
        }
      ]
    },
    {
      "title": "Start and manage a call",
      "blocks": [
        {
          "type": "steps",
          "items": [
            [
              "Select the conversation",
              "Use Voice call or Video call in its toolbar. These select the existing conversation’s participants."
            ],
            [
              "Start or join",
              "Choose Start call or Join call and allow the requested microphone/camera access. Use voice only if you do not want video."
            ],
            [
              "Use the controls",
              "Mute or unmute the microphone, enable or disable camera, and use Leave call when finished. End call for everyone is available only with that permission."
            ],
            [
              "Continue around the call",
              "Returning to Messages can retain compact call controls. Move call window by dragging or its arrow-key control, and use Return to call to reopen it."
            ]
          ]
        }
      ]
    },
    {
      "title": "Choose notifications deliberately",
      "blocks": [
        {
          "type": "steps",
          "items": [
            [
              "Open notification settings",
              "Select the bell labelled Message and call notifications."
            ],
            [
              "Enable on this device",
              "Choose Enable notifications and accept the browser permission when you want alerts. On iPhone use the installed Home Screen application where required."
            ],
            [
              "Return to the right context",
              "A supported message or call notification opens its conversation or invitation. Inspect the actual thread/call state there."
            ],
            [
              "Turn them off",
              "Reopen the bell and choose Notifications on · Turn off."
            ]
          ]
        }
      ]
    },
    {
      "title": "Continue an interrupted request",
      "blocks": [
        {
          "type": "paragraph",
          "text": "A microphone refusal, unsupported Web Push or interrupted network is a specific device/delivery boundary. Keep your identity and thread. An unknown message result does not mean another message must be sent; use its existing check or conversation result first. An active call uses its retained controls while supported in-app navigation continues; an operating-system suspension or closed process has its own media lifetime. Do not create a new account to recover a conversation."
        },
        {
          "type": "links",
          "items": [
            [
              "Keep people and context",
              "contacts"
            ],
            [
              "Review a financial payment",
              "payments"
            ],
            [
              "Use a meeting room",
              "meetings"
            ]
          ]
        }
      ]
    }
  ],
  "sources": [source("src/features/messages/MessagesPanel.tsx","Conversation entry, selection, delivery and recovery"), source("src/features/messages/CallPanel.tsx","Call controls and retained call lifetime"), source("src/features/messages/NotificationsControl.tsx","Opt-in message and call notifications")]
},
{
  "slug": "contacts",
  "title": "Keep contacts and their next steps",
  "summary": "Add, import, search and update people, then open the supported message, call or appointment from their contact.",
  "group": "People & meetings",
  "related": [
    "messages",
    "calendar-booking",
    "agents",
    "backup"
  ],
  "sections": [
    {
      "title": "Bring your people together",
      "blocks": [
        {
          "type": "paragraph",
          "text": "Contacts keeps useful names, communication details and next steps under the same Receiz ID. Open the message icon in your account, then the Contacts icon beside Calendar. People lists the retained contacts; Find someone searches names, email, phone, company, notes and tags. A linked Receiz person can open a message; an ordinary email or phone entry uses that address without inventing a Receiz account."
        }
      ]
    },
    {
      "title": "Save a contact",
      "blocks": [
        {
          "type": "steps",
          "items": [
            [
              "Choose Add contact",
              "Use the plus icon labelled Add contact, or Add a contact in an empty list."
            ],
            [
              "Enter the person",
              "Name is required. Enter Email and Phone when known; check the actual address or number before using it."
            ],
            [
              "Add useful context",
              "Expand More details for Company, Role, Location, Next step, comma-separated Tags and Notes. Keep facts and your own notes distinguishable."
            ],
            [
              "Choose Save contact",
              "The saved person opens with their details. Return to Contacts to find the same entry again."
            ]
          ]
        }
      ]
    },
    {
      "title": "Import existing contacts",
      "blocks": [
        {
          "type": "steps",
          "items": [
            [
              "Choose Import contacts",
              "Use the import icon in People."
            ],
            [
              "Choose a contacts file",
              "CSV, vCard or JSON is supported, up to 5 MiB. Select the existing file; the importer reads its supported name/email/phone fields."
            ],
            [
              "Use the device chooser when offered",
              "Choose from device contacts opens the browser’s supported contact picker. Select the people you intend to import."
            ],
            [
              "Inspect the result",
              "Contacts imported confirms the import. Search and open a person to inspect the actual retained fields rather than assuming every source field was supported."
            ]
          ]
        }
      ]
    },
    {
      "title": "Use a person’s contact",
      "blocks": [
        {
          "type": "table",
          "caption": "Actions follow the actual contact",
          "columns": [
            "Control",
            "What to enter or choose",
            "Result"
          ],
          "rows": [
            [
              "Message",
              "Use a contact linked to a Receiz participant.",
              "The existing direct conversation opens or is created for that participant."
            ],
            [
              "Email",
              "Select a retained email address.",
              "Your email application opens; this control does not itself confirm an email was sent."
            ],
            [
              "Call",
              "Select the retained phone number.",
              "The device telephone handler opens; an in-app voice call has its own conversation controls."
            ],
            [
              "Schedule",
              "Choose title, date, time and duration in the appointment form.",
              "The created appointment and its actual invitation result appear in Calendar."
            ],
            [
              "View profile",
              "Use the linked public username where supplied.",
              "The person’s public profile opens."
            ]
          ]
        }
      ]
    },
    {
      "title": "Inspect, edit or archive",
      "blocks": [
        {
          "type": "steps",
          "items": [
            [
              "Open the person",
              "Inspect email, phone, role/company, Notes and Coming up appointments. History shows retained interaction summaries and their recorded dates."
            ],
            [
              "Choose Edit contact",
              "Change the intended fields, then Save contact. The saved record is the result to inspect."
            ],
            [
              "Archive deliberately",
              "Choose Archive contact, then Confirm archive contact. This removes the contact from the active list under the actual organizer operation."
            ],
            [
              "Keep the conversation’s own history",
              "Archiving a contact does not establish deletion of delivered messages, appointments or original evidence. Those keep their own recorded sources."
            ]
          ]
        }
      ]
    },
    {
      "title": "If a save or import is unavailable",
      "blocks": [
        {
          "type": "paragraph",
          "text": "Keep the original import file and the intended identity. A parsing/capacity refusal must be corrected in the contact input; it does not authorize changing a proof Original or replacing the identity. If a write is not confirmed, inspect the same person/list before submitting another save. Contacts and Calendar use the same account organizer; reconnecting may add its admitted records without redefining a person already displayed."
        },
        {
          "type": "links",
          "items": [
            [
              "Schedule and share availability",
              "calendar-booking"
            ],
            [
              "Use conversations and calls",
              "messages"
            ]
          ]
        }
      ]
    }
  ],
  "sources": [source("src/features/messages/organizer/ContactViews.tsx","Contact fields, actions and history"), source("src/features/messages/organizer/OrganizerPanel.tsx","Import, save, archive and account binding"), source("src/receiz/contact-import.ts","Supported contact file parsing")]
},
{
  "slug": "calendar-booking",
  "title": "Plan appointments and share a booking link",
  "summary": "Set availability, choose free or priced appointments, book through Calendar or a Business Twin and inspect the same appointment, payment and record.",
  "group": "People & meetings",
  "related": [
    "contacts",
    "meetings",
    "messages",
    "payments",
    "funding",
    "records"
  ],
  "sections": [
    {
      "title": "Choose how people book you",
      "blocks": [
        {
          "type": "paragraph",
          "text": "Use Calendar to keep your appointments, people and meeting invitations together. Regular accounts keep the calendar-first flow. A Business host with an enabled booking Twin can offer a conversation first, with Choose a time opening the same calendar inside it. The host can choose Calendar only. Optional paid booking uses the same Calendar and existing account payment route; it is separate from whether a Twin is enabled. Ordinary appointments you create yourself retain their existing flow."
        },
        {
          "type": "note",
          "title": "Availability and qualification",
          "text": "These paid-booking instructions apply where the booking and payment services are enabled and qualified. This guide does not establish live financial qualification. If the host’s price cannot be saved or a payment review cannot be accepted, keep the actual error or saved request; that failure does not turn a priced appointment into a free or confirmed booking."
        }
      ]
    },
    {
      "title": "Find a day, create and invite",
      "blocks": [
        {
          "type": "paragraph",
          "text": "Open the account’s message icon, then Calendar. Choose Agenda, Week or Month; use Today, the date chooser and previous/next controls to move through the calendar. Select an appointment to inspect it. Check the displayed timezone before arranging a time."
        },
        {
          "type": "steps",
          "items": [
            [
              "Choose New appointment",
              "Use the plus icon. What’s the plan? supplies the appointment title."
            ],
            [
              "Set the time",
              "Enter Date, Time and Duration. Check the displayed timezone."
            ],
            [
              "Choose the attendees and meeting",
              "Enter Invite by email addresses separated by commas. Add meeting link includes a Bankeiz room; otherwise supply Place or video link. Enter Notes or Shared meeting details as appropriate."
            ],
            [
              "Choose Create appointment",
              "The actual saved event opens. Inspect its invitation result separately from the saved appointment; sent, pending and unknown delivery are different outcomes."
            ]
          ]
        }
      ]
    },
    {
      "title": "Save your availability and booking choices",
      "blocks": [
        {
          "type": "steps",
          "items": [
            [
              "Open Calendar → Your booking link → Availability",
              "Use the booking-link row or shortcut in Calendar. Choose a public username in Identity if prompted. These are the owner’s settings for the public booking page."
            ],
            [
              "Set the schedule",
              "Set Appointment length, Available days, Available start times and People can book ahead. Use the automatic device timezone or select the intended manual timezone."
            ],
            [
              "Choose the booking conversation when offered",
              "For Business with an enabled booking Twin, Booking experience offers Twin booking or Calendar only. Select the intended starting view. This owner-only choice is not an appearance or color editor."
            ],
            [
              "Choose an optional Appointment price",
              "Free is the default. Expand Appointment price, enter Price in USD with no more than two decimal places, or leave 0 for free appointments. Paid booking does not require a Twin. This is the saved appointment price, separate from the schedule and guest questions."
            ],
            [
              "Ask useful questions",
              "Expand Questions for your guest. Add a question, enter its label and mark Required only when needed. Remove unwanted questions."
            ],
            [
              "Choose Save availability",
              "Availability saved confirms the accepted settings. Reopen Availability to inspect the saved price and available Booking experience choice, then open the public link as a guest to inspect the offered schedule and questions."
            ]
          ]
        }
      ]
    },
    {
      "title": "Share a normal or custom link",
      "blocks": [
        {
          "type": "paragraph",
          "text": "Your booking link opens bankeiz.com/book/yourname. Copy it for the people you want to book. Add it to your website exposes Copy embed for the same booking page. Create a custom link changes schedule and guest questions for that link without changing your usual saved availability: choose Create link, then copy it or Preview booking page. A custom link cannot change the saved price or Booking experience. Inspect the actual public schedule, questions and price before distributing it."
        }
      ]
    },
    {
      "title": "Book through the calendar",
      "blocks": [
        {
          "type": "steps",
          "items": [
            [
              "Choose the time",
              "Open the host’s booking page. Check Your timezone, choose a day and available start time, then Continue. In a Twin conversation, Choose a time opens these same controls."
            ],
            [
              "Enter your details",
              "Enter Your name and Email, answer any required guest questions and add Anything you’d like to share? when useful. These are appointment details, not payment approval."
            ],
            [
              "Continue the free or priced path",
              "For a free appointment, choose Book this time and wait for You’re booked. For a positive price, choose Continue to payment and follow the payment review below. A selected time, submitted form or proposed appointment alone is not a confirmed booking."
            ],
            [
              "Keep the accepted result",
              "When confirmed, use Add to calendar for its calendar file and Join meeting where included. The host’s Calendar contains the same confirmed appointment."
            ]
          ]
        }
      ]
    },
    {
      "title": "Book through the host’s Twin",
      "blocks": [
        {
          "type": "steps",
          "items": [
            [
              "Start with the booking question",
              "For a Business host with an enabled booking Twin, the initial question asks when you and the displayed host can speak. It is static opening copy, not a generated reply or a booking. Enter your request in Your reply and choose Send reply."
            ],
            [
              "Supply only the missing details",
              "The owner’s actual Twin checks the owner’s availability and uses its existing conversation and booking tools. Give the requested name, email, timezone and required answers. Choose a time opens the calendar over the conversation; Conversation returns to the retained thread and draft."
            ],
            [
              "Inspect the accepted review, then later reply Yes",
              "Read the proposed host, time, guest details and any price. After that accepted review, explicitly confirm it in a later reply Yes. A proposed time, streamed text or generated success sentence alone does not establish an appointment or payment."
            ],
            [
              "Follow the actual free or paid result",
              "A free appointment is complete only when the accepted result says You’re booked. For a priced appointment, Your appointment is ready to review offers Review payment. Choose it to open the same account payment review used by the calendar path. The Twin does not approve or send payment; Pay remains your separate explicit action."
            ]
          ]
        },
        {
          "type": "paragraph",
          "text": "If a reply is interrupted, Retry message continues that same pending message. Keep the existing thread and inspect its accepted result. An unavailable Twin does not require a replacement booking: Choose a time keeps the manual calendar available."
        }
      ]
    },
    {
      "title": "Review and pay for a priced appointment",
      "blocks": [
        {
          "type": "steps",
          "items": [
            [
              "Open the payment review deliberately",
              "Account entry opens only after a positive-price Continue to payment, the Twin’s Review payment, or your explicit Resume booking after a checkout return. Opening the calendar or reading the conversation does not enter payment."
            ],
            [
              "Use the intended existing account",
              "Review Your account, on this device. Before starting an approval, Use existing Identity Record opens your original account on this device; unlock a protected record when asked. Save Identity Record retains the same account for another device. Your appointment email does not select or create your payment identity. Once a booking request is pending, continue with the same account that started it."
            ],
            [
              "Check the exact terms and contributions",
              "Read the host, date, time, timezone and appointment total. From balance shows the available account contribution when nonzero. At checkout shows the actual external funding amount when needed. Funding covers the shortfall; the minimum payment at checkout is $0.50. For example, a $1.00 appointment with $0.80 available needs $0.20 more: At checkout is $0.50 and $0.30 stays in your balance. Read the displayed amounts before approving."
            ],
            [
              "Choose Pay for the displayed appointment total",
              "Pay explicitly approves these exact terms for this saved booking. If secure checkout is needed, complete it using an available payment method for the same request. The external funding amount and appointment total can differ because of the minimum; funding alone does not confirm the appointment."
            ],
            [
              "Wait for the actual confirmation",
              "Keep the booking open or return through Resume booking, then Check booking when offered. Your booking is saved or a completed checkout page is progress, not You’re booked. Do not pay a second request to discover the first result."
            ]
          ]
        }
      ]
    },
    {
      "title": "Inspect the confirmed result and invitation",
      "blocks": [
        {
          "type": "paragraph",
          "text": "You’re booked identifies the accepted appointment. For a priced appointment, confirmation requires the accepted Wallet Original matched to this booking and the Calendar confirmed-paid result for the same event. An account funding receipt, checkout return, local status, time selection or Twin text cannot replace that evidence. Pending funding or payment does not confirm the appointment, issue its confirmation invitation or grant Join meeting."
        },
        {
          "type": "steps",
          "items": [
            [
              "Inspect the event and meeting",
              "Check the confirmed title, time and timezone. Use Join meeting when included. In the host’s Calendar, open that same appointment and inspect its actual attendees, location and notes."
            ],
            [
              "Retain the calendar file",
              "Add to calendar downloads the event’s ICS file. A calendar file carries that event; it does not independently prove payment or email delivery."
            ],
            [
              "Inspect the actual invitation status",
              "The booking invitation email’s primary action opens Messages; its secondary direct Bankeiz Join meeting link opens the room. The invitation includes the calendar/ICS event. The saved appointment does not guarantee email delivery: when the provider outcome is unknown, keep the confirmed on-screen event and inspect the actual pending or unknown delivery result."
            ],
            [
              "Inspect supported evidence",
              "Open Record continuity, View receipt and Download proof record where offered on the selected Calendar record. Retain the actual booking payment Original and event record. Record integrity is distinct from current ownership or available account funds."
            ]
          ]
        }
      ]
    },
    {
      "title": "Continue a saved booking or resolve an interruption",
      "blocks": [
        {
          "type": "steps",
          "items": [
            [
              "Check this booking",
              "Check booking checks the same saved request and same operation. If offered, Retry booking request resends that retained request rather than making another reservation. Use Try account again or the original Identity Record when account access needs attention; continue with the same account."
            ],
            [
              "Resume after checkout",
              "Use Resume booking on the original return page. It is visible in both the Twin and calendar views and resumes the retained appointment/payment request. A checkout return locates that request; it is not proof of payment or booking. If a return does not match, keep the original link and saved request."
            ],
            [
              "Close an unpaid request before choosing another time",
              "Cancel this booking asks to close that same unpaid request. A timeout, closed checkout tab or cancelled checkout does not prove an unpaid closure. Only an accepted cancelled-unpaid result closes it; Choose another time then starts a new operation and review. If the outcome remains unknown, continue Check booking instead of treating it as cancelled."
            ]
          ]
        },
        {
          "type": "paragraph",
          "text": "For the free calendar path, if a time is no longer available, choose a different offered time. If the result says it is not confirmed, check with the host before submitting another booking; the form retains your draft. A failed or unknown delivery is separate from the appointment and does not instruct you to book again."
        }
      ]
    },
    {
      "title": "Change or cancel the same appointment",
      "blocks": [
        {
          "type": "steps",
          "items": [
            [
              "Inspect before editing",
              "Select the appointment in Calendar. Use Copy meeting link for its actual room, or Invite people → email addresses → Send invitations and inspect the invitation result. An invitation does not grant host editing authority."
            ],
            [
              "Reschedule the existing event",
              "As the host, choose Edit appointment, change the date/time and choose Save changes. For a paid appointment, the accepted revision preserves the same event, price and actual payment; there is no second charge. A new time must still be available. An unpaid reservation must be closed through its own recovery before a new operation can review another time."
            ],
            [
              "Cancel deliberately",
              "Cancel appointment requires Confirm cancellation. A paid cancellation records cancelled-paid and retains the actual payment Original and history. It does not promise an automatic refund; arrange any refund through an actually supported payment route and keep its separate accepted result. Cancelled history remains preserved."
            ]
          ]
        },
        {
          "type": "links",
          "items": [
            [
              "Run the meeting",
              "meetings"
            ],
            [
              "Keep the person’s details",
              "contacts"
            ],
            [
              "Inspect the payment",
              "payments"
            ],
            [
              "Understand funding",
              "funding"
            ]
          ]
        }
      ]
    }
  ],
  "sources": [source("src/features/messages/organizer/CalendarViews.tsx","Calendar navigation, appointment and invitation controls"), source("src/features/messages/organizer/BookingSettings.tsx","Owner availability, booking mode, optional price and custom links"), source("src/features/booking/PublicBookingPage.tsx","Calendar booking, explicit payment entry and accepted confirmation"), source("src/features/booking/BookingLayout.tsx","Stable calendar or Business Twin starting view"), source("src/features/booking/BookingConversation.tsx","Owner Twin review, explicit payment handoff and retained conversation"), source("src/features/booking/BookingPayment.tsx","Exact payment review, account entry, checkout return and same-request recovery"), source("src/receiz/booking-settings.ts","Accepted saved booking settings and exact price parsing"), source("src/receiz/paid-booking.ts","Accepted Wallet Original, Calendar phases and retained payment operation"), source("src/checkout/CheckoutIdentity.tsx","Existing Identity Record import and save controls"), source("src/features/messages/organizer/CalendarRecordDetails.tsx","Selected event evidence and receipt inspection")]
},
{
  "slug": "meetings",
  "title": "Meet, pay and keep the meeting proof",
  "summary": "Start a room, invite people, use video and messages, make a payment and retain the meeting’s sealed record.",
  "group": "People & meetings",
  "related": [
    "calendar-booking",
    "messages",
    "credits",
    "verification"
  ],
  "sections": [
    {
      "title": "Bring the conversation together",
      "blocks": [
        {
          "type": "paragraph",
          "text": "Use a meeting when the discussion, people, agreement and payment should remain connected. Video, audio, chat, appointments, payments and your meeting record work with your account. Business adds the optional Twin and its actual plan/permissions. Start from Calendar’s Meet now, or include a meeting link in an appointment. The public meeting walkthrough is a labeled example; your own meeting starts through the account or actual invitation."
        }
      ]
    },
    {
      "title": "Start, invite and join",
      "blocks": [
        {
          "type": "steps",
          "items": [
            [
              "Create the room",
              "Account → message icon → Calendar → Meet now opens the saved live-meeting event. Choose Join meeting. For a planned room, create the appointment with Add meeting link."
            ],
            [
              "Invite the actual people",
              "Copy meeting link or use Invite people → email addresses → Send invitations. Anyone given the invitation can join with their own identity."
            ],
            [
              "Continue your own identity",
              "An invitation offers Use Identity Record or Use PBI for an existing account. Unlock a protected original with its original phrase. An unreadable saved identity must not be replaced to make entry continue."
            ],
            [
              "Choose how to join",
              "Use Join meeting or Join with audio, and allow the camera/microphone permissions you intend. Joining adds the meeting to your calendar."
            ]
          ]
        }
      ]
    },
    {
      "title": "Use the room controls",
      "blocks": [
        {
          "type": "table",
          "caption": "Controls during the meeting",
          "columns": [
            "Control",
            "Use",
            "Result"
          ],
          "rows": [
            [
              "Mic / Camera",
              "Mute/unmute or turn camera on/off.",
              "Your media choices change within the existing meeting."
            ],
            [
              "Chat",
              "Enter Message everyone and send. Earlier messages opens older chat.",
              "Messages stay with the meeting conversation."
            ],
            [
              "People",
              "Inspect participants, select a person to pin, or Invite with this link.",
              "Follow speaker returns to automatic speaker presentation."
            ],
            [
              "Share / Stop share",
              "Choose a screen/window using the browser’s permission dialog.",
              "The selected screen replaces its supported feed until stopped."
            ],
            [
              "Full view / Clear",
              "Expand the room or hide controls. Show controls restores them.",
              "The same room stays open."
            ],
            [
              "End / Leave",
              "The host ends; another participant leaves.",
              "The call closes immediately. The meeting record and private download continue through their retained result."
            ]
          ]
        }
      ]
    },
    {
      "title": "Send money without leaving",
      "blocks": [
        {
          "type": "steps",
          "items": [
            [
              "Open Money",
              "In Chat, select Send money in this meeting, the dollar icon."
            ],
            [
              "Enter the payment",
              "Select Payment recipient if there is more than one other participant, then Amount to send. Check the person and amount shown."
            ],
            [
              "Choose Send money",
              "Your balance goes first. If more is needed, complete the displayed secure checkout for this same payment. Extra provider-minimum funding remains in your account."
            ],
            [
              "Inspect the result",
              "Money sent shows the accepted amount and participant, recorded in this conversation. For an unknown result choose Check payment; do not create another transfer to discover what happened."
            ]
          ]
        }
      ]
    },
    {
      "title": "Choose shared or private Twin context",
      "blocks": [
        {
          "type": "paragraph",
          "text": "When Twin is offered, Ask the Twin uses its actual access and context. Shared replies are visible/audible to the meeting. Use my private context opens your private context; Bring the Twin into the room or Ask the host’s Twin returns to the applicable shared mode. Private Twin context is kept out of the shared meeting record. Generated interpretations and proposed follow-ups retain their own evidence and action permissions. If Business access is required, the meeting keeps working while you inspect that optional addition."
        }
      ]
    },
    {
      "title": "Keep and inspect the meeting proof",
      "blocks": [
        {"type": "paragraph", "text": "End or Leave closes the call immediately and automatically offers the private meeting-and-identity ZIP after preparing its actual record. A browser download request does not confirm that the operating system saved the file. Check your browser downloads and the ZIP you actually retained. The extracted playable files and identity travel beside the exact sealed proof; they do not replace or reseal it."},
        {
          "type": "steps",
          "items": [
            [
              "Open Record",
              "Recording starts only when the host chooses Start recording. Use Stop recording to finish capture; keep the recording tab open while capturing."
            ],
            [
              "Seal the actual record",
              "Choose Seal meeting history without captured media, or Seal & download meeting when capture is available. Captured files stay encrypted on the recording device."
            ],
            [
              "Save the Original",
              "Download meeting & ID prepares a private ZIP with playable captured meeting files, the exact sealed meeting proof Original and your current Identity Record. Generated notes are identified separately. Keep the Identity folder private; your unlock phrase is not included."
            ],
            [
              "Continue as yourself",
              "Save Identity Record remains available separately for the supported identity return path. Find the next step helps prepare a follow-up whose appointment/action has its own result."
            ]
          ]
        }
      ]
    },
    {
      "title": "Recover the same meeting or payment",
      "blocks": [
        {
          "type": "paragraph",
          "text": "Use Rejoin meeting or Join with audio when returning to an active room. If an instant meeting could not be confirmed, Try again continues its saved request. A pending payment uses Check payment or the saved checkout, while Cancel payment follows that attempt’s actual state. Inspect the recorded conversation/account result before Send another. If export preparation fails, reopen Record → Download meeting & ID to retry the same retained proof without pressing End or Leave again. Reopening a historical ended room does not automatically export your identity; choose Download meeting & ID deliberately when you want that private file. A sealed meeting proof is retained evidence; it does not execute its recorded payment again or grant a reader host or spending authority."
        },
        {
          "type": "links",
          "items": [
            [
              "Plan the follow-up",
              "calendar-booking"
            ],
            [
              "Inspect an Original",
              "verification"
            ]
          ]
        }
      ]
    }
  ],
  "sources": [source("src/features/meeting/StartMeetingPage.tsx","Instant meeting and identity entry"), source("src/features/meeting/MeetingPage.tsx","Invitation entry and join choices"), source("src/features/meeting/MeetingRoom.tsx","Meeting, shared/private Twin and recording controls"), source("src/features/meeting/MeetingMoneyView.tsx","In-meeting payment and exact-result recovery")]
}
];
