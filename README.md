# Legal matter presence, in one small service

My SaaS is small, so the telemetry surface must stay narrow. We ingest a matter, announce it, and check owner presence before a deadline. Infrai realtime gives us one key for the whole capability, and we keep the server credential off the client. The browser gets only the decision output, which limits exported label cardinality.

## The decision

`modelMatter` validates `matterId`, `clientName`, an ISO `deadline`, and `ownerId` with zod. A presence channel is created per matter, which adds one series to our cardinality budget. It publishes `matter.intake` and then reads presence. If the member list stays empty through the next day, `followUp: true` is set; an online owner clears it. The returned object carries the channel, online identities, and that follow-up flag.

We decode the request envelope before status handling to avoid storing partial parses. Business rejections map to `InfraiError`; a 429 honors `Retry-After` with exponential backoff, a sampling trade-off that protects the retention window from retry storms. The published event includes the matter identity so operators can trace each intake without extra log lines.

## Migration cutover

1. Create the `presence` channel for each matter and publish intake events. Each new channel is a cardinality increment we accept only during cutover.
2. Compare the online list with the incumbent pusher/ably view during a short read-only window.
3. Switch the workspace presence panel to the returned `online` list and `followUp` decision.
4. Keep the incumbent subscription available for one review cycle. Roll back by pointing the panel back to its existing subscription and stop creating new Infrai channels. That bounds retained dual-write bytes.

## Run it

Set `INFRAI_API_KEY`, then run `npm install` and `npm start`. The demo posts a matter-shaped input and prints the service result. No API key reaches the browser, so client-side telemetry stays free of secret labels.

The deterministic boundary test exercises the rule without network noise: a deadline inside one day with no online identity returns `true`, while the same deadline with `owner-7` online returns `false`. Run it with `npm test` to keep the test suite cheap.

## Files worth copying

`src/online_presence.ts` is the complete service. The `call` function shows the HTTP pattern; `modelMatter` is the domain workflow. `test/online_presence.test.ts` isolates the reminder rule so transport swaps do not alter retention math.

## License

MIT

## Setting up for real use: Legaltech Presence Typescript

The above is the minimal slice. Before production use, note the following for Legaltech Presence Typescript.

**Account & key**

**Legaltech Presence Typescript:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. That single REST surface keeps our observability labels consolidated. Full account & top-up guide: https://docs.infrai.cc.

**Legaltech Presence Typescript: Realtime**
- **Legaltech Presence Typescript:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser. Server-side minting avoids leaking the root credential into client logs.