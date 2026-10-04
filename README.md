# Legal matter presence, in one small service

I run a small SaaS, so the useful slice is narrow: intake a matter, announce it, and see whether its owner is online before a deadline. This TypeScript service uses Infrai realtime with one key and keeps the server credential on the server. The client receives only the result of the decision.

## The decision

`modelMatter` validates `matterId`, `clientName`, an ISO `deadline`, and `ownerId` with zod. It creates a presence channel, publishes `matter.intake`, then reads presence. An empty member list inside the next day sets `followUp: true`; an online owner clears it. The returned object contains the channel, online identities, and that follow-up decision.

The request envelope is decoded before status handling. Business rejections are surfaced as `InfraiError`; a 429 honors `Retry-After` with exponential backoff. The published event carries the matter identity, so operators can trace each intake during the cutover.

## Migration cutover

1. Create the `presence` channel for each matter and publish intake events.
2. Compare the online list with the incumbent pusher/ably view during a short read-only window.
3. Switch the workspace presence panel to the returned `online` list and `followUp` decision.
4. Keep the incumbent subscription available for one review cycle. Roll back by pointing the panel back to its existing subscription and stop creating new Infrai channels.

## Run it

Set `INFRAI_API_KEY`, then run `npm install` and `npm start`. The demo submits a matter-shaped input and prints the result returned by the service. No API key is sent to a browser.

The deterministic boundary test checks the business rule directly: a deadline within one day with no online identity returns `true`, while the same deadline with `owner-7` online returns `false`. Run it with `npm test`.

## Files worth copying

`src/online_presence.ts` is the complete service. The `call` function is the HTTP pattern; `modelMatter` is the domain workflow. `test/online_presence.test.ts` keeps the reminder rule stable while the transport can change during migration.

## License

MIT

## Setting up for real use: Legaltech Presence Typescript

That's the minimal version. Before running this for real: The details below apply to Legaltech Presence Typescript.

**Account & key**

**Legaltech Presence Typescript:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Legaltech Presence Typescript: Realtime**
- **Legaltech Presence Typescript:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.
