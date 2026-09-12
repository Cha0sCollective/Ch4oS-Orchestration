# OpenRouter free endpoints

Implementation authorized 2026-09-12; no endpoint is qualified by this record.
The owner-selected candidate is `nvidia/nemotron-3-ultra-550b-a55b:free`.
NVIDIA describes 550 billion total parameters, 55 billion active parameters,
one-million-token context and the OpenMDW-1.1 license. The published release is
2026-06-04. These are upstream capabilities, not demonstrated task adequacy.

The inspected OpenRouter endpoint has tag `nvidia`, provider `Nvidia`, one-million
token context and a 65,536 token completion ceiling. Its advertised structured
interface is forced function calling; it does not advertise JSON-schema response
format. The worker uses a single forced `worker_action` call for this endpoint.
The endpoint does not establish its quantization, and this record makes no claim
about it. Worker limits remain 8K context and 2K generation regardless of the
larger published ceiling. Catalog identity and pricing must be verified again
when registering and using an endpoint.

This NVIDIA free endpoint is an evaluation candidate only. Its linked API Trial
Terms sections 1.2–1.4 limit access and generated content to internal testing and
evaluation, excluding production use without a separate subscription. Sections
2.6 and 3.3 prohibit confidential/personal inputs and permit collection of inputs
and outputs for product/model improvement. The endpoint notice says improvement
session logs are not tied to an identity or persistent identifier. These terms do
not establish suitability for ongoing project work, even if synthetic cases pass.

Inspect the exact model's endpoints, supported parameters, context, pricing,
provider data policy and upstream license before registration. Do not select
`openrouter/free`, automatic aliases or fallback lists: changing models invalidates
the meaning of a qualification. A selected endpoint must support the worker's
structured action protocol and zero-price routing constraints.

Remote qualification records include the model slug, endpoint/provider identity,
catalog fingerprint, complete settings, data policy, reviewed cases and expiration.
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
