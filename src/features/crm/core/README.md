# CRM core (client copy, display only)

A copy of the CRM's rules from circles-crm `core/src` (commit `a7b11e6`), taken from
circles-user-service `src/modules/crm/core/src`. The screens use it for labels, types, template
previews, segment counts and the CSV import preview.

**The server is the source of truth.** Every change goes through user-service
(`POST admin/crm/actions/:name`), which checks the role, the input and every consent and sending
rule again. Nothing here is trusted for security: `can()` only decides what to show.

The only difference from upstream: `from 'zod'` is `from 'zod/v4'` in five files
(`automations/schema.ts`, `consent/controls.ts`, `events/contract.ts`, `inbox/aiOutput.ts`,
`templates/manage.ts`), because the panel has zod 3.25, which ships the v4 API at `zod/v4`.

Don't edit these files here. Fix the rule in circles-crm, copy it to user-service, then copy it here.
