# Work Packet Protocol

A work packet is the amount of production work one orchestrator should be able to own without also carrying the whole roadmap in its head.

A roadmap can describe months of work. A work packet should describe what we are actually doing now.

## A good packet answers a few practical questions

- What are we trying to accomplish?
- What is explicitly out of scope?
- Where are we starting from?
- What has to be true before we begin?
- What should we validate before handing it off?
- Where do we stop and ask the owner?
- What does "done" mean for this packet?

Prefer one issue to one bounded PR or one clearly defined acceptance result.

## One active packet per production lane

A production lane should normally have one active packet.

Queued work can exist, but finishing the current issue does not mean the agent gets to pick the next interesting thing and keep going. The workflow or owner advances the lane.

If we later run truly independent production lanes in parallel, each one needs its own worktree, issue, branch boundary, and integration owner.

## Lifecycle

```text
queued
  -> active
  -> implementation / validation
  -> exact candidate revision
  -> production handoff
  -> ready for independent review
```

If the packet hits something only the owner can do, stop at the owner gate instead of expanding into unrelated work.

## Production handoff

Keep the handoff compact. GitHub already has the diff, CI, artifacts, and history; do not paste the project back into the conversation.

A useful handoff can look like:

```text
[production-agent] HANDOFF

Issue: #<issue>
PR: #<pr or none>
Base: <exact revision>
Head: <exact candidate revision>

What changed:
- ...

What I validated:
- <check/workflow reference>
- ...

What is still unproven or limited:
- ...

What I need review to decide:
- ...
```

Use normal language inside the structure. The point is to make the important facts easy to find, not to make every handoff sound identical.

## Context stays context

The packet may include background about future goals, tradeoffs, or constraints. That helps production make better choices, but it is not permission to implement, document, or preserve everything mentioned.

If the owner says, "we may support another loader later, so don't paint us into a corner," that is context unless the packet actually includes multi-loader work.

Do not create roadmap items, architecture docs, TODOs, compatibility layers, or comments just to preserve useful conversation context.

## Call out a change that makes the project meaningfully bigger

Stop and surface the decision if the implementation starts to materially change:

- where the project is headed;
- long-term maintenance complexity;
- compatibility surface;
- validation or acceptance burden;
- operational burden;
- implementation resources or expected effort.

Explain the downstream tradeoff before quietly building around it. A significant path-changing decision is not a routine implementation detail.

## Other stop conditions

Production should also stop when:

- required live/human acceptance is reached;
- solving the problem would cross an explicit non-goal;
- a prerequisite turns out to be wrong or missing;
- a secret, permission, destructive action, or owner-only decision is required;
- the claimed evidence cannot be tied reliably to the candidate.

Being blocked is not permission to pull the next roadmap item into scope.

## Roadmaps versus packets

A roadmap answers: **where are we going?**

A work packet answers: **what may I change now, what do I need to prove, and where do I stop?**
