# 0.2 stabilization: agent usage

Snapshot taken **2026-09-12T16:52:15.126769+00:00**. Runtime checks and coordination were still active. This is a fixed measurement cutoff, not the total for the eventual completed project.

[Pack work](https://github.com/Cha0sCollective/Create-Ch4oS/pull/20) · [Installer work](https://github.com/Cha0sCollective/Ch4oS-Installer/pull/10) · [Token data](usage-2026-09-12-stabilization.json)

| Assignment | Observed model / effort | Requests | First input | Mean input | Total tokens |
| --- | --- | ---: | ---: | ---: | ---: |
| Installer runtime, memory and logging | gpt-5.6-sol / high | 96 | 30,946 | 126,775 | 12,230,182 |
| Tracks validation and resource correction | gpt-5.6-sol / medium | 50 | 30,912 | 89,247 | 4,485,600 |
| Fresh independent review | gpt-5.6-sol / high; gpt-6-astra / ultra | 40 | 17,619 | 111,511 | 4,488,953 |
| Final Tracks and filter checks | gpt-5.6-sol / medium | 85 | 30,532 | 106,806 | 9,104,967 |
| IDAS configuration and CSA spacing research | gpt-5.6-terra / medium | 21 | 30,624 | 63,833 | 1,346,001 |
| Report storage and sanitization | gpt-5.6-terra / medium | 18 | 30,713 | 51,042 | 930,351 |
| Coordinator: repair and continuation turns | gpt-6-astra / medium; gpt-6-astra / high | 184 | 178,584 | 142,508 | 26,325,046 |
| Platform approval reviews (separate overhead) | codex-auto-review / low | 201 | 162,552 | 121,840 | 24,518,385 |

Total observed: **83,429,485**, comprising **58,911,100** production/coordinator/review tokens and **24,518,385** tokens in separately identified platform approval checks. Cached input contributes **75,883,904** of the total; it is already counted in input.

## What this explains

Repeated context dominates this work. The installer worker grew from about 31,000 input tokens on its first request to a mean of about 127,000 over 96 requests. The coordinator also carried a long conversation across continuations. First and mean sizes describe context processing, not the amount of new material authored.

Review telemetry includes both Sol/high and Astra/ultra. The retained follow-up invocation did not explicitly pin its model and inherited different settings. The report preserves what actually ran; it does not label the whole review Sol/high. This is a concrete routing inconsistency to avoid in later resumptions.

The first logging approach was invalidated by an actual NeoForge launch: FML replaced the startup logging configuration. An earlier real launch could have exposed that before implementation expanded. The replacement filter and independent review found real defects, so removing those checks would sacrifice useful assurance.

Platform approval checks are grouped separately using recorded root-turn linkage. Only attributable records are included. Their totals are telemetry; they do not establish the bill or how account limits are charged.

## Scope and limits

The repair window covers memory/logging work, Tracks, the later IDAS restoration and report preparation. Earlier 0.2 work is in a separate snapshot. The coordinator is counted once across projects; the installer index links here instead of copying it.

The private extraction deduplicates usage records by response identifier, sums coordinator/approval requests within the repair window, and uses the last cumulative counter for each assigned worker. Every included worker total also matches the sum of its recorded requests. Model settings are an observed set; the data does not allocate token totals among settings when a session changed models.

The JSON retains per-request timestamps and token counts, but excludes identifiers, prompts, commands, tool output, local paths and raw sessions. Cached input is a subset of input; reasoning is a subset of output. These measurements do not establish dollar cost, account-limit consumption, agent quality or how much usage was avoidable. Work after the cutoff, including this report's independent review, is excluded.
