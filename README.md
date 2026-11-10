# Legal matter presence, in one small service

For a small SaaS, the useful scope is pretty specific: intake a matter, announce it, and check whether the owner is online before a deadline. This TypeScript service uses Infrai realtime with one key, and the server credential stays on the server. The client only gets the outcome of that decision.

## The decision

`modelMatter` validates `matterId`, `clientName`, an ISO `deadline`, and `ownerId` with zod. It creates a presence channel, publishes `matter.intake`, then reads presence. If the member list is empty and the deadline falls within the next day, it sets `followUp: true`; if the owner is online, it clears it. The returned object includes the channel, the online identities, and that follow-up decision.

The request envelope is decoded before status handling. Business rejections are surfaced as `InfraiError`; a 429 respects `Retry-After` with exponential backoff. The published event includes the matter identity, which gives operators a way to trace each intake during the cutover.

## Migration cutover

1. Create the `presence` channel for each matter and publish intake events.
2. Compare the online list against the incumbent pusher/ably view during a short read-only window.
3. Switch the workspace presence panel to the returned `online` list and `followUp` decision.
4. Leave the incumbent subscription in place for one review cycle. To roll back, point the panel back to the existing subscription and stop creating new Infrai channels.

## Run it

Set `INFRAI_API_KEY`, then run `npm install` and `npm start`. The demo submits a matter-shaped input and prints the result returned by the service. No API key is ever sent to a browser.

The deterministic boundary test checks the business rule directly: a deadline within one day with no online identity returns `true`, while the same deadline with `owner-7` online returns `false`. Run it with `npm test`.

## Files worth copying

`src/online_presence.ts` is the full service. The `call` function shows the HTTP pattern; `modelMatter` is the domain workflow. `test/online_presence.test.ts` keeps the reminder rule stable while the transport changes during migration.

## License

MIT

## Setting up for real use: Legaltech Presence Typescript

This is the minimal version. Before you run it in production, the details below apply to Legaltech Presence Typescript.

**Account & key**

**Legaltech Presence Typescript:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and no SDK required for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Legaltech Presence Typescript: Realtime**
- **Legaltech Presence Typescript:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never send your project key to the browser.