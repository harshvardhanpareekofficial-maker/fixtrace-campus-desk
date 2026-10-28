# FIXTRACE

A working browser demonstration of school repair reporting, human-controlled report linking, and maintenance history. All school assets, observations, teams, and repair evidence are synthetic.

## Run locally

Install Node.js 22 or later, open a terminal in this folder, then run:

```sh
npm start
```

Open http://127.0.0.1:4178. No package installation is needed. The local server uses Node's built-in libraries. Stop it with Ctrl+C. To choose another port in PowerShell, set `$env:PORT='4180'` before running the command.

```sh
npm test
npm run check
```

Tested with Node.js 24.18.0 and npm 11.16.0. There are no application or development package dependencies. The `dist/` folder is the authored browser source, ready for static hosting; it is not generated or minified output. Open it through HTTP/HTTPS, not by double-clicking `index.html`, because browser modules and safe storage coordination need an appropriate origin.

## Try the complete journey

1. Switch the demo role to Reporter and select Report a problem.
2. Choose DESK-01 and add a fictional observation.
3. Switch to Coordinator, open Repair queue, and review the observation.
4. Create a repair job with an explicit priority reason.
5. Open the job, assign a team, then start work.
6. Complete it with both a work summary and a verification observation.
7. Select Completed in the queue and inspect the retained reports and history. Reload to verify persistence.
8. Report FAN-01 again and explicitly link the observation to its active repair. The observation is retained; no automatic merge occurs.

Campus history lets you step backward through the event log. History mode is read-only. Return to Now to edit. About this demo provides export and reset controls.

## Source map

| File | Responsibility |
|---|---|
| `dist/core.js` | Asset registry, validation, workflow commands, event projection, elapsed time, synthetic fixtures |
| `dist/storage.js` | Versioned browser storage, stale-write checks, save-before-success behavior |
| `dist/app.js` | Screens, dialogs, simulated roles, keyboard-friendly forms, history controls, Web Locks integration |
| `dist/styles.css` | Responsive layout, focus styling, floor-plan presentation, reduced motion |
| `dist/index.html` | Semantic document shell and app entry point |
| `tests/workflow.test.mjs` | 20 domain and storage regression tests |
| `server.mjs` | Local static server; not a production application backend |

## How state works

Every accepted command appends an event. Events contain the new records resulting from that decision. `project()` folds those records into the current reports and jobs. Replaying a prefix of events reconstructs the earlier state, including the report links that existed then.

Commands validate the simulated role and permitted transition. A completion requires both repair and verification notes. Assignment precedes work. Reopening retains completion history and clears the current assignee. Asset IDs find candidate related reports; the coordinator decides the relationship.

The full document is saved in one localStorage write, guarded by a browser Web Lock and an exact current-document comparison. The UI advances only after saving succeeds. Web Locks serialize cooperative app tabs; the document comparison rejects stale drafts. This is not tamper-proof storage or server authorization.

Elapsed time runs from the earliest linked observation (or job creation when no report remains linked) to the latest completion/cancellation or current observation time. It includes nights and weekends. A duplicate report does not raise priority automatically.

## Limits

- A synthetic single-device demonstration, not a deployed school management system.
- Demo roles are not authentication. Browser data and client code are editable by the device user.
- No multi-device synchronization, real accounts, cloud database, real school maps, uploads, notifications, or emergency monitoring.
- Data is separate for each browser origin and is removed if browser data is cleared. Export is a JSON backup; import/restore is not implemented.
- Web Locks must be supported on HTTPS or localhost. Unsupported storage produces an explicit error rather than silent data loss.
- No measured customer savings, interviews, or independent student implementation are claimed.
- Accessibility checks are partial; screen-reader testing, full 200% zoom testing, and a complete WCAG audit remain outstanding.
- An automated browser action that reloads before the save completes can interrupt it. Wait for the saved confirmation, as the UI does before reporting success.

## Provenance and disclosure

Initial research/specification: 27 October 2026. Implementation began 28 October 2026 after the user explicitly requested building despite unresolved competition eligibility and timing. This does not certify competition eligibility or compliance with any later clarified rule.

Codex assisted with the specification and authored this implementation and its tests. Student and teammate coding contributions have not yet been independently demonstrated. No AI model runs inside the product, no third-party source or imagery was copied, and no external application API is called. The floor plan and icons are original schematic SVG; fonts use installed system fallbacks.

Code is provided under the MIT license in `LICENSE`. Existing maintenance systems already support related workflows; no claim of invention is made.
