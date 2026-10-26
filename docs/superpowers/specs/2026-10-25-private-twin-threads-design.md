# Private Twin conversations

The signed-in owner can explicitly start a new Twin chat, inspect past conversations, and switch back without losing the current chat. Compact New chat and Past conversations controls sit inside Your agent. Existing message, financial checkpoint, credit-pause and review-display behavior stays intact. First paint uses held conversation state; history requests run only after the owner opens Past conversations or a specific older thread.

The existing native memory table remains the source. The legacy private key api:<owner uid> remains valid; explicit New chat allocates api:<owner uid>:<UUID>. The existing authenticated owner and execute scope govern reads and writes. Public visitor keys never enter the private history API. The current agent memory scope stays attached to each original row. No new table, signer, grant, or account selector is introduced.

The selected approach is a compact thread picker and existing memory source. A permanent second sidebar would consume mobile space; a new conversation database would duplicate established memory and its authority. The picker keeps the current settled conversation visible until the owner selects another chat. Pending money work blocks switching, so a paused task cannot move to another human conversation.

The owner-only native endpoint lists conversation descriptors and pages exact original memory records. The model's read_previous_conversations tool can search all of this owner's authorized private threads or select one exact thread, following bound cursors. It returns bodies, source IDs, thread keys and digest references. Earlier text is historical context, never current human consent or payment authority.

Acceptance requires legacy continuity, explicit-only creation, selected-thread ask wiring, stable switchback, complete paginated original history, same-owner enforcement, cursor binding, preserved money pause/review controls, and desktop/mobile rendered evidence.
