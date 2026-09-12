# Make an image locally — no Codex required

**ComfyUI and FLUX.2 Klein 4B are already installed.** Generation runs on your GPU;
it does not need an OpenRouter key, a Comfy Cloud account, or a paid image service.

1. In File Explorer, open this repository's `tools/model-playground` folder and
   double-click **Open-Local-Images.cmd**. It starts the installed ComfyUI and opens
   your browser at **http://127.0.0.1:8188**. If the page opens before the server is
   ready, wait a few seconds and refresh. This launcher expects `.ch4os-tools`
   beside the orchestration repository, as installed on this PC.
2. Click **Workflows** on the left, then **Ch4oS - Local FLUX image**. Close the
   Templates dialog if it appears. If the workflow is missing, drag
   `tools/model-playground/flux-klein-ui.json` from File Explorer onto the canvas.
3. Find **1. WRITE YOUR PROMPT** and replace the sample text with what you want.
   Scroll to zoom; **Fit View (.)** shows the full workflow.
4. Leave the model selections, **4 steps**, **CFG 1**, **1024 × 1024**, and batch
   count **1** alone for your first image. Click the blue **Run** button.
5. The image appears at **3. GENERATED IMAGE** and is saved automatically under
   `.ch4os-tools/comfy/0.35.0/ComfyUI_windows_portable/ComfyUI/output/Ch4oS-pilot`.
   You can also right-click the preview to save a copy through the browser.

Example prompt:

> A small brass steam-powered mining robot, chunky readable silhouette, copper
> pipes and teal glass, front three-quarter view, industrial Minecraft mod concept,
> plain charcoal background, no lettering.

Change the **noise_seed** in **2. SEED** for another variation; keeping the seed
fixed helps compare prompt changes. To change dimensions, set the same width and
height in both **Flux2Scheduler** and **EmptyFlux2LatentImage**. Use **Save As** in
the workflow actions menu to keep your own version.

Use this supplied local workflow, rather than a template marked **API/Premium**.
Keep local text-model generation idle while generating images. Outputs are concept
art, not automatically exact Minecraft textures: inspect at the intended game size,
and check transparency and tiling when needed. Closing the browser does not stop
the background ComfyUI server.

The workflow was opened and its local model/node selections checked without
generating another image. Its underlying graph is the one used for the completed
image pilot. [Official model/workflow guide](https://docs.comfy.org/tutorials/flux/flux-2-klein).
