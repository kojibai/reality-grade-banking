# Digital value: accept, hold and transfer

Use the coordinated v129 SDK's edge-value lifecycle. These retained `V124`/`V125` method names are exported by `@receiz/sdk@129.0.0`; they are not package downgrades. Settlement is proof-native value. Reserve is proof-backed funds. Phi micro-units are moved; USD is a deterministic display projection.

## Exact lifecycle

1. Reopen complete sealed source and destination proof objects under canonical trust. Admit their ownership, current heads, participant identity, lawful value and permitted operation. Retain exact sources before proposing a transfer.
2. Create one explicit-rail edge plan with `client.value.edge.planSettlement(input)` or `planReserve(input)`. Input includes the verified source proof object/head, receiver subject/expected head, application, exact Phi amount, canonical price basis and stable attempt/idempotency coordinates. Never derive these from a public listing or an observed account balance.
3. Persist the exact SDK edge-plan wrapper. Independently call `inspect(wrapper.plan, { participantId, expectedRail })` for both the sender and receiver. The inspector accepts the nested canonical operation plan, not the outer edge-plan wrapper; the regression test exercises both rails against the actual installed SDK. Obtain exact operation consent at each required signing edge.
4. Build the portable execution transition set through the canonical source/signing workflow. `verifyTransitionSet(set, { audience })` must reopen every exact enclosing source, canonical roots, Kai proof and participant binding. `prepareCommitSet(verified)` supplies subordinate exact compare-and-swap mechanics.
5. Use an actually qualified local transition store to commit **all participant transitions or none**. It must return real SDK-issued committed-transition custody. Database success, caller-created receipts and copied property bags cannot supply this custody. A generic SQL callback is not a conforming store.
6. `createRecovery({ applicationId, transitionSet, committedTransitions })` packages only those actual committed transitions. Persist the exact canonical recovery before relying on a projection or optional remote synchronization.
7. The sender independently calls `confirmSettlementSend` or `confirmReserveSend`. The receiver independently calls the corresponding `receiveSettlement` or `receiveReserve` on the same recovery, binding the expected application and participant. Show success only from independently verified committed evidence.
8. Hold the exact committed source, proof-carried ownership, history and canonical recovery under protected custody. A later onward transfer starts from that verified current head. Optional global synchronization can publish the result without becoming transaction authority.

The type-checked [edge-payment adapter example](examples/edge-payments.ts) shows the SDK boundaries. It intentionally provides no fake funding, account, signing or commit-store implementation. Your institution must supply and qualify these actual capabilities. Bank ordinary Send, generic institution custody and onward execution are **not completed by this example**.

## Agents and MCP

The installed AI Skills provide the exact [SDK map](../node_modules/@receiz/ai-skills/receiz-value-execution/references/sdk-map.md) and [MCP map](../node_modules/@receiz/ai-skills/receiz-value-execution/references/mcp-map.md). These local package paths are available after `npm ci`.

The edge tools include `receiz_v125_edge_value_plan_settlement`, `plan_reserve`, `plan_inspect`, `transition_set_verify`, `commit_set_prepare`, `recovery_create`, the named rail send confirmations and receiving operations. They keep exact plans and SDK-issued handles in trusted-host custody; the model sees opaque references and safe review coordinates. Do not paste sealed private sources, grants, signing material, commit units or custody objects into prompts.

An MCP tool result, agent statement or successful plan is not financial execution evidence. Retain the exact intent outside model context and require the canonical SDK admission, qualified local commit and independently verified receipt. The hosted runtime fixes the application audience; model input cannot choose it.

## Recovery and refusal

For an ambiguous retained remote compatibility execution, use the original semantic idempotency coordinate and authenticated lookup before retry. Do not issue a replacement plan while the old outcome is unknown. Existing `execution.resolveByIdempotencyKey`, `value.executionByIdempotencyKey` and committed-recovery export are compatibility paths; the installed skills specify their exact grants and same-runtime session boundaries.

Refuse completion if either participant inspection is absent, the rail is implicit, predecessor heads differ, value is already allocated, commit is partial, recovery is unavailable or independent receipt verification fails. Never repair a refusal by lowering proof requirements, swapping the owner, substituting another rail or treating an API response as authority.
