# OpenRouter free endpoints

Implementation authorized 2026-09-12. This record provides source and routing
context rather than qualification. Worker service 0.1.6 admits the exact
owner-selected `nvidia/nemotron-3-ultra-550b-a55b:free` model without qualification.
NVIDIA describes 550 billion total parameters, 55 billion active parameters,
one-million-token context and the OpenMDW-1.1 license. The published release is
2026-06-04. These are upstream capabilities, not demonstrated task adequacy.

The inspected OpenRouter endpoint has tag `nvidia`, provider `Nvidia`, one-million
token context and a 65,536 token completion ceiling. Its advertised structured
interface is forced function calling; it does not advertise JSON-schema response
format. The worker uses a single forced `worker_action` call for this endpoint.
The endpoint does not establish its quantization, and this record makes no claim
about it. Remote worker limits are 256K context, 128KiB serialized input and 2K
generation; local profiles retain 8K context and 16KiB input. Catalog identity and pricing must be verified again
when registering and using an endpoint.

This NVIDIA free endpoint is an evaluation candidate only. Its linked API Trial
Terms sections 1.2–1.4 limit access and generated content to internal testing and
evaluation, excluding production use without a separate subscription. Sections
2.6 and 3.3 prohibit confidential/personal inputs and permit collection of inputs
and outputs for product/model improvement. The endpoint notice says improvement
session logs are not tied to an identity or persistent identifier. These terms do
not establish suitability for production service use, even if synthetic cases pass.

Inspect the exact model's endpoints, supported parameters, context, pricing,
provider data policy and upstream license before registration. Do not select
`openrouter/free`, automatic aliases or fallback lists: changing models leaves the
exact Ultra exemption and selects a qualification-required model. A selected
endpoint must support the worker's structured action protocol and zero-price
routing constraints.

For models that require qualification, records include the model slug,
endpoint/provider identity, catalog fingerprint, complete settings, data policy,
reviewed cases and optional expiration. Nemotron Ultra eligibility instead comes
from its exact configured identity and `qualificationRequired: false`; stale,
expired or withdrawn qualification evidence does not gate it. Zero-price pinning,
scope, consent, limits, current endpoint checks and Codex verification still apply.
Its jobs and results have no age-based expiry but remain subject to count and
storage-size bounds. Other models retain the 24-hour lifetime.
An API model is not a content-addressed local weight artifact; an unchanged slug
or catalog fingerprint cannot guarantee unchanged remote weights.

Primary sources retrieved 2026-09-12:
[public model catalog](https://openrouter.ai/api/v1/models),
[free variants](https://openrouter.ai/docs/guides/routing/model-variants/free),
[provider routing](https://openrouter.ai/docs/guides/routing/provider-selection),
[API setup](https://openrouter.ai/docs/quickstart).

[NVIDIA model card](https://build.nvidia.com/nvidia/nemotron-3-ultra-550b-a55b/modelcard),
[selected OpenRouter model](https://openrouter.ai/nvidia/nemotron-3-ultra-550b-a55b:free).
[NVIDIA API Trial Terms](https://assets.ngc.nvidia.com/products/api-catalog/legal/NVIDIA%20API%20Trial%20Terms%20of%20Service.pdf).
