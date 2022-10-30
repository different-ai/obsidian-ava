import {grpc} from "@improbable-eng/grpc-web";
import {NodeHttpTransport} from "@improbable-eng/grpc-web-node-http-transport";
import {EventEmitter} from "events";
import fs from "fs";
import mime from "mime";
import path from "path";
import {
  Answer,
  ArtifactType, ClassifierParameters, DiffusionSampler,
  ImageParameters, Prompt, Request, SamplerParameters, StepParameter,
  TransformType,
} from "stability-sdk/gooseai/generation/generation_pb";
import {GenerationService} from
  "stability-sdk/gooseai/generation/generation_pb_service";
import TypedEmitter from "typed-emitter";
import uuid4 from "uuid4";


export const range = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const diffusionMap = {
  ddim: DiffusionSampler.SAMPLER_DDIM,
  plms: DiffusionSampler.SAMPLER_DDPM,
  k_euler: DiffusionSampler.SAMPLER_K_EULER,
  k_euler_ancestral: DiffusionSampler.SAMPLER_K_EULER_ANCESTRAL,
  k_heun: DiffusionSampler.SAMPLER_K_HEUN,
  k_dpm_2: DiffusionSampler.SAMPLER_K_DPM_2,
  k_dpm_2_ancestral: DiffusionSampler.SAMPLER_K_DPM_2_ANCESTRAL,
  k_lms: DiffusionSampler.SAMPLER_K_LMS,
};

export type DraftStabilityOptions = Partial<{
    outDir: string;
    debug: boolean;
    requestId: string;
    samples: number;
    engine: "stable-diffusion-v1";
    host: string;
    seed: number;
    width: number;
    height: number;
    diffusion: keyof typeof diffusionMap;
    steps: number;
    cfgScale: number;
    noStore: boolean;
}>

export type RequiredStabilityOptions = {
    apiKey: string;
    prompt: string;
}

type StabilityOptions = RequiredStabilityOptions &
    Required<DraftStabilityOptions>

type ImageData = { buffer: Buffer; filePath: string }
export type ResponseData = {
    isOk: boolean;
    status: keyof grpc.Code;
    code: grpc.Code;
    message: string;
    trailers: grpc.Metadata;
}

type StabilityApi = TypedEmitter<{
    image: (data: ImageData) => void;
    end: (data: ResponseData) => void;
}>

const withDefaults: (
    draftOptions: DraftStabilityOptions & RequiredStabilityOptions
) => StabilityOptions = (draft) => {
  if (!draft.prompt) throw new Error("Prompt is required");

  const requestId = draft.requestId ?? uuid4();
  return {
    ...draft,
    host: draft.host ?? "https://grpc.stability.ai:443",
    engine: draft.engine ?? "stable-diffusion-v1",
    requestId,
    seed: draft.seed ?? range(0, 4294967295),
    width: draft.width ?? 512,
    height: draft.height ?? 512,
    diffusion: draft.diffusion ?? "k_lms",
    steps: draft.steps ?? 50,
    cfgScale: draft.cfgScale ?? 7,
    samples: draft.samples ?? 1,
    outDir: draft.outDir ?? path.join(process.cwd(), ".out", requestId),
    debug: Boolean(draft.debug),
    noStore: Boolean(draft.noStore),
  };
};

export const generate: (
    opts: DraftStabilityOptions & RequiredStabilityOptions
) => StabilityApi = (opts) => {
  const {
    host,
    engine,
    requestId,
    seed,
    width,
    height,
    diffusion,
    steps,
    cfgScale,
    samples,
    outDir,
    prompt: promptText,
    apiKey,
    noStore,
    debug,
  } = withDefaults(opts);

  if (!promptText) throw new Error("Prompt text is required");

  const api = new EventEmitter() as StabilityApi;

  // if (!noStore) mkdirp.sync(outDir)

  /** Build Request **/
  const request = new Request();
  request.setEngineId(engine);
  request.setRequestId(requestId);

  const prompt = new Prompt();
  prompt.setText(promptText);
  request.addPrompt(prompt);

  const image = new ImageParameters();
  image.setWidth(width);
  image.setHeight(height);
  image.setSeedList([seed]);

  image.setSteps(steps);
  image.setSamples(samples);

  const transform = new TransformType();
  transform.setDiffusion(diffusionMap[diffusion]);
  image.setTransform(transform);

  const step = new StepParameter();
  step.setScaledStep(0);

  const sampler = new SamplerParameters();
  sampler.setCfgScale(cfgScale);
  step.setSampler(sampler);

  image.addParameters(step);

  request.setImage(image);

  // eslint-disable-next-line no-unused-vars
  const classifier = new ClassifierParameters();
  // TODO: hack
  // request.setClassifier(classifier)
  /** End Build Request **/

  if (debug) {
    console.log(
        "[stability - request]",
        JSON.stringify(request.toObject(), null, 2)
    );
  }

  grpc.invoke(GenerationService.Generate, {
    request,
    host,
    metadata: new grpc.Metadata({Authorization: `Bearer ${apiKey}`}),
    // eslint-disable-next-line new-cap
    transport: NodeHttpTransport(),
    onEnd: (code, message, trailers) => {
      api.emit("end", {
        isOk: code === grpc.Code.OK,
        status: grpc.Code[code] as keyof grpc.Code,
        code,
        message,
        trailers,
      });
    },
    onMessage: (message: Answer) => {
      const answer = message.toObject();

      if (answer.artifactsList) {
        answer.artifactsList.forEach(
            ({id, type, mime: mimeType, binary, seed: innerSeed}) => {
              if (type === ArtifactType.ARTIFACT_IMAGE) {
                // @ts-ignore
                const buffer = Buffer.from(binary, "base64");
                const filePath = path.resolve(
                    path.join(
                        outDir,
                        // eslint-disable-next-line max-len
                        `${answer.answerId}-${id}-${innerSeed}.${mime.getExtension(
                            mimeType
                        )}`
                    )
                );

                if (!noStore) fs.writeFileSync(filePath, buffer);

                api.emit("image", {
                  buffer,
                  filePath,
                });
              }
            }
        );
      }
    },
    debug,
  });

  return api;
};

export const generateAsync: (
    opts: DraftStabilityOptions & RequiredStabilityOptions
) => {
    images: ImageData[];
    res: ResponseData;
} = (opts) =>
// @ts-ignore
  new Promise<{
            images: ImageData[];
            res: ResponseData;
        }>((resolve, reject) => {
          const api = generate(opts);
          let images: Array<ImageData> = [];
          api.on("image", (payload) => {
            images = [...images, payload];
          });
          api.on("end", (data) => {
            if (!data.isOk) console.error(data);
            // return reject(new Error(data.message))
            resolve({
              res: data,
              images,
            });
          });
        });
