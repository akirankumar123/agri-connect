import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  CircleAlert,
  ImagePlus,
  Leaf,
  Trash2,
  Upload,
  X,
} from "lucide-react";

type Ripeness = "ripe" | "unripe";

type ModelStatus = "checking" | "ready" | "missing" | "offline";

interface RipenessPrediction {
  crop: string;
  ripeness: Ripeness;
  confidence: number;
}

interface RipenessObservation {
  id: string;
  crop: string;
  ripeness: Ripeness;
  count: number;
  createdAt: string;
}

const STORAGE_KEY = "agri-assist-ripeness-observations";
const ROVER_CAMERA_URL_STORAGE_KEY = "agri-assist-rover-camera-url";
const RIPENESS_API_URL = (import.meta.env.VITE_RIPENESS_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
const CROPS = [
  "Tomato",
  "Chili",
  "Mango",
  "Banana",
  "Apple",
  "Orange",
  "Bell pepper",
  "Cucumber",
  "Eggplant",
  "Other",
];

function isObservation(value: unknown): value is RipenessObservation {
  if (typeof value !== "object" || value === null) return false;

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.crop === "string" &&
    (record.ripeness === "ripe" || record.ripeness === "unripe") &&
    typeof record.count === "number" &&
    Number.isInteger(record.count) &&
    record.count > 0 &&
    typeof record.createdAt === "string" &&
    Number.isFinite(Date.parse(record.createdAt))
  );
}

const RipenessTracker: React.FC = () => {
  const [observations, setObservations] = useState<RipenessObservation[]>([]);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [crop, setCrop] = useState(CROPS[0]);
  const [ripeness, setRipeness] = useState<Ripeness>("ripe");
  const [count, setCount] = useState(1);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [roverCameraUrl, setRoverCameraUrl] = useState(import.meta.env.VITE_ROVER_CAMERA_URL ?? "");
  const [roverCameraConnected, setRoverCameraConnected] = useState(false);
  const [roverCameraFrame, setRoverCameraFrame] = useState<string | null>(null);
  const [roverCameraStatus, setRoverCameraStatus] = useState<"disconnected" | "connecting" | "connected" | "offline">("disconnected");
  const [roverCameraError, setRoverCameraError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [modelStatus, setModelStatus] = useState<ModelStatus>("checking");
  const [isPredicting, setIsPredicting] = useState(false);
  const [prediction, setPrediction] = useState<RipenessPrediction | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const latestRoverFrameRef = useRef<Blob | null>(null);
  const roverFrameUrlRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const savedUrl = window.localStorage.getItem(ROVER_CAMERA_URL_STORAGE_KEY);
      if (savedUrl) setRoverCameraUrl(savedUrl);
    } catch (storageError) {
      console.error("Unable to load the saved rover camera URL:", storageError);
      setRoverCameraError("The saved rover camera URL could not be loaded from this browser.");
    }
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (!Array.isArray(parsed) || !parsed.every(isObservation)) {
          throw new Error("Saved ripeness records have an invalid format.");
        }
        setObservations(parsed);
      }
      setStorageLoaded(true);
    } catch (loadError) {
      console.error("Unable to load saved ripeness records:", loadError);
      setStorageError("Saved harvest records could not be loaded on this device.");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const checkModel = async () => {
      try {
        const response = await fetch(`${RIPENESS_API_URL}/health`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Model health check failed (${response.status}).`);
        const health: unknown = await response.json();
        if (typeof health !== "object" || health === null || !("model_loaded" in health)) {
          throw new Error("Model health response is invalid.");
        }
        setModelStatus(health.model_loaded === true ? "ready" : "missing");
      } catch (healthError) {
        if (controller.signal.aborted) return;
        console.error("Unable to check ripeness model status:", healthError);
        setModelStatus("offline");
      }
    };
    void checkModel();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!storageLoaded) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(observations));
      setStorageError("");
    } catch (saveError) {
      console.error("Unable to save ripeness records:", saveError);
      setStorageError("Harvest records could not be saved. Check this browser's storage settings.");
    }
  }, [observations, storageLoaded]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }, []);

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (roverFrameUrlRef.current) URL.revokeObjectURL(roverFrameUrlRef.current);
  }, []);

  useEffect(() => {
    if (!roverCameraConnected) return;

    let active = true;
    let retryTimer: ReturnType<typeof setTimeout>;
    let controller: AbortController | null = null;

    const pollRoverCamera = async () => {
      controller = new AbortController();
      try {
        const response = await fetch(roverCameraUrl, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Rover camera request failed (${response.status}).`);
        if (!response.headers.get("content-type")?.toLowerCase().startsWith("image/")) {
          throw new Error("The rover camera endpoint must return a JPEG or other image.");
        }

        const frame = await response.blob();
        if (!active) return;
        latestRoverFrameRef.current = frame;
        if (roverFrameUrlRef.current) URL.revokeObjectURL(roverFrameUrlRef.current);
        roverFrameUrlRef.current = URL.createObjectURL(frame);
        setRoverCameraFrame(roverFrameUrlRef.current);
        setRoverCameraStatus("connected");
        setRoverCameraError("");
      } catch (cameraError) {
        if (!active || controller.signal.aborted) return;
        console.error("Unable to read a frame from the rover camera:", cameraError);
        setRoverCameraStatus("offline");
        setRoverCameraError(
          cameraError instanceof Error
            ? `${cameraError.message} Check the URL, network connection, and camera CORS settings.`
            : "Unable to read a frame from the rover camera.",
        );
      } finally {
        if (active) retryTimer = setTimeout(pollRoverCamera, 2000);
      }
    };

    setRoverCameraStatus("connecting");
    void pollRoverCamera();
    return () => {
      active = false;
      clearTimeout(retryTimer);
      controller?.abort();
    };
  }, [roverCameraConnected, roverCameraUrl]);

  const startCamera = async () => {
    setError("");
    setMessage("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access is unavailable. Use a secure connection or upload a photo instead.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch (cameraError) {
      console.error("Unable to start the ripeness camera:", cameraError);
      setError("Unable to access the camera. Check browser permissions or upload a photo.");
    }
  };

  const captureImage = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setError("The camera image is not ready yet. Please try again in a moment.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("Unable to capture the camera image in this browser.");
      return;
    }

    context.drawImage(video, 0, 0);
    setImagePreview(canvas.toDataURL("image/jpeg", 0.85));
    setPrediction(null);
    setError("");
    setMessage("Photo captured. Confirm the crop and ripeness label before saving.");
    stopCamera();
  };

  const connectRoverCamera = () => {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(roverCameraUrl);
    } catch {
      setRoverCameraError("Enter a complete rover camera URL, such as http://192.168.4.1/capture.");
      return;
    }
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      setRoverCameraError("The rover camera URL must use HTTP or HTTPS.");
      return;
    }

    try {
      window.localStorage.setItem(ROVER_CAMERA_URL_STORAGE_KEY, parsedUrl.toString());
    } catch (storageError) {
      console.error("Unable to save the rover camera URL:", storageError);
      setRoverCameraError("The rover camera URL could not be saved in this browser.");
      return;
    }

    setRoverCameraUrl(parsedUrl.toString());
    setRoverCameraError("");
    setRoverCameraConnected(true);
  };

  const captureRoverFrame = () => {
    const frame = latestRoverFrameRef.current;
    if (!frame) {
      setError("Wait for a rover camera frame before capturing it.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setError("Unable to prepare the rover camera frame. Please try again.");
        return;
      }
      stopCamera();
      setImagePreview(reader.result);
      setPrediction(null);
      setError("");
      setMessage("Rover field frame captured. Confirm the crop and ripeness before saving.");
    };
    reader.onerror = () => setError("Unable to read the rover camera frame. Please try again.");
    reader.readAsDataURL(frame);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file to review.");
      event.target.value = "";
      return;
    }

    stopCamera();
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setError("Unable to read this image. Please try another file.");
        return;
      }
      setImagePreview(reader.result);
      setPrediction(null);
      setError("");
      setMessage("Photo uploaded. Confirm the crop and ripeness label before saving.");
    };
    reader.onerror = () => setError("Unable to read this image. Please try another file.");
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const analyzeImage = async () => {
    if (!imagePreview) {
      setError("Capture or upload a photo before requesting a model prediction.");
      return;
    }

    setIsPredicting(true);
    setError("");
    setMessage("");
    setPrediction(null);
    try {
      const imageBlob = await (await fetch(imagePreview)).blob();
      const formData = new FormData();
      formData.append("image", imageBlob, "crop-photo.jpg");
      const response = await fetch(`${RIPENESS_API_URL}/predict`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const detail =
          typeof body === "object" &&
          body !== null &&
          "detail" in body &&
          typeof body.detail === "string"
            ? body.detail
            : `Model request failed (${response.status}).`;
        if (response.status === 503) setModelStatus("missing");
        throw new Error(detail);
      }

      const result: unknown = await response.json();
      if (
        typeof result !== "object" ||
        result === null ||
        !("crop" in result) ||
        typeof result.crop !== "string" ||
        !("ripeness" in result) ||
        (result.ripeness !== "ripe" && result.ripeness !== "unripe") ||
        !("confidence" in result) ||
        typeof result.confidence !== "number" ||
        !Number.isFinite(result.confidence) ||
        result.confidence < 0 ||
        result.confidence > 1
      ) {
        throw new Error("The model returned an invalid prediction.");
      }

      const modelPrediction: RipenessPrediction = {
        crop: result.crop,
        ripeness: result.ripeness,
        confidence: result.confidence,
      };
      setPrediction(modelPrediction);
      setModelStatus("ready");
      setMessage("Model suggestion received. Review the crop and ripeness labels before saving.");

      const predictedCrop = CROPS.find(
        (item) =>
          item.replace(/[^a-z0-9]/gi, "").toLowerCase() ===
          modelPrediction.crop.replace(/[^a-z0-9]/gi, "").toLowerCase(),
      );
      if (predictedCrop) setCrop(predictedCrop);
      setRipeness(modelPrediction.ripeness);
    } catch (predictionError) {
      console.error("Ripeness model prediction failed:", predictionError);
      setError(
        predictionError instanceof Error
          ? predictionError.message
          : "Unable to get a ripeness prediction. Check the model API and try again.",
      );
    } finally {
      setIsPredicting(false);
    }
  };

  const addObservation = () => {
    if (!imagePreview) {
      setError("Capture or upload a photo before saving an observation.");
      return;
    }
    if (!Number.isInteger(count) || count < 1 || count > 1_000_000) {
      setError("Enter a whole-number fruit or vegetable count between 1 and 1,000,000.");
      return;
    }

    const observation: RipenessObservation = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      crop,
      ripeness,
      count,
      createdAt: new Date().toISOString(),
    };
    setObservations((current) => [observation, ...current]);
    setImagePreview(null);
    setCount(1);
    setError("");
    setMessage(`${count} ${crop} item${count === 1 ? "" : "s"} recorded as ${ripeness}.`);
  };

  const removeObservation = (id: string) => {
    setObservations((current) => current.filter((observation) => observation.id !== id));
  };

  const hasSampleData = observations.some((observation) => observation.id.startsWith("sample-"));
  const addSampleData = () => {
    const samples: Omit<RipenessObservation, "createdAt">[] = [
      { id: "sample-tomato-ripe", crop: "Tomato", ripeness: "ripe", count: 18 },
      { id: "sample-tomato-unripe", crop: "Tomato", ripeness: "unripe", count: 7 },
      { id: "sample-mango-ripe", crop: "Mango", ripeness: "ripe", count: 12 },
      { id: "sample-mango-unripe", crop: "Mango", ripeness: "unripe", count: 5 },
      { id: "sample-banana-ripe", crop: "Banana", ripeness: "ripe", count: 15 },
      { id: "sample-banana-unripe", crop: "Banana", ripeness: "unripe", count: 9 },
      { id: "sample-chili-ripe", crop: "Chili", ripeness: "ripe", count: 10 },
      { id: "sample-chili-unripe", crop: "Chili", ripeness: "unripe", count: 6 },
    ];
    const createdAt = new Date().toISOString();
    setObservations((current) => [
      ...samples
        .filter((sample) => !current.some((observation) => observation.id === sample.id))
        .map((sample) => ({ ...sample, createdAt })),
      ...current,
    ]);
    setMessage("Demo sample observations added. They are labeled as sample data and included in field totals.");
  };

  const removeSampleData = () => {
    setObservations((current) => current.filter((observation) => !observation.id.startsWith("sample-")));
    setMessage("Demo sample observations removed. Farmer-confirmed observations were kept.");
  };

  const cropObservations = observations.filter((observation) => observation.crop === crop);
  const ripeCount = cropObservations
    .filter((observation) => observation.ripeness === "ripe")
    .reduce((total, observation) => total + observation.count, 0);
  const unripeCount = cropObservations
    .filter((observation) => observation.ripeness === "unripe")
    .reduce((total, observation) => total + observation.count, 0);
  const cropTotals = observations.reduce<Record<string, { ripe: number; unripe: number }>>(
    (totals, observation) => {
      const current = totals[observation.crop] ?? { ripe: 0, unripe: 0 };
      current[observation.ripeness] += observation.count;
      totals[observation.crop] = current;
      return totals;
    },
    {},
  );

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8" aria-labelledby="ripeness-heading">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-green-700">
            <Leaf size={17} />
            Harvest readiness
          </div>
          <h2 id="ripeness-heading" className="text-2xl font-bold text-gray-900">
            Fruit &amp; vegetable ripeness
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-gray-600">
            Review a camera photo, confirm its crop and ripeness, and keep a running harvest count for each crop.
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
          modelStatus === "ready"
            ? "border-green-200 bg-green-50 text-green-800"
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}>
          {modelStatus === "ready"
            ? "Trained model connected · confirm each result"
            : modelStatus === "checking"
              ? "Checking ripeness model…"
              : modelStatus === "missing"
                ? "No trained model · manual labels active"
                : "Model API offline · manual labels active"}
        </span>
      </div>

      <div className="mb-5 flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <CircleAlert className="mt-0.5 shrink-0" size={18} />
        <p>
          Predictions require a trained model and a running inference API. Always confirm the suggested crop and
          ripeness before saving; predictions classify one image and do not count individual produce. Rover camera
          snapshots and harvest records are handled by this dashboard and saved records stay in this browser.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Review a crop photo</h3>

          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-semibold text-green-950">Rover field camera</h4>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                roverCameraStatus === "connected"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-700"
              }`}>
                {roverCameraStatus === "connected"
                  ? "Receiving field frames"
                  : roverCameraStatus === "connecting"
                    ? "Connecting…"
                    : roverCameraStatus === "offline"
                      ? "Camera unavailable"
                      : "Not connected"}
              </span>
            </div>
            <label htmlFor="rover-camera-url" className="text-sm font-medium text-gray-700">
              Rover JPEG snapshot URL
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              <input
                id="rover-camera-url"
                type="url"
                value={roverCameraUrl}
                disabled={roverCameraConnected}
                onChange={(event) => setRoverCameraUrl(event.target.value)}
                placeholder="http://192.168.4.1/capture"
                className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100"
              />
              {roverCameraConnected ? (
                <button
                  type="button"
                  onClick={() => {
                    setRoverCameraConnected(false);
                    setRoverCameraStatus("disconnected");
                    setRoverCameraFrame(null);
                    if (roverFrameUrlRef.current) URL.revokeObjectURL(roverFrameUrlRef.current);
                    roverFrameUrlRef.current = null;
                    latestRoverFrameRef.current = null;
                  }}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  onClick={connectRoverCamera}
                  className="rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800"
                >
                  Connect rover camera
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-600">
              Enter an endpoint that returns one JPEG image; the dashboard checks for a new frame every 2 seconds.
              The rover camera must allow browser CORS requests.
            </p>
            {roverCameraError && <p role="alert" className="mt-2 text-sm text-red-700">{roverCameraError}</p>}
            {roverCameraFrame ? (
              <div className="mt-3 space-y-2">
                <img
                  src={roverCameraFrame}
                  alt="Latest image received from the rover field camera"
                  className="max-h-72 w-full rounded-lg bg-gray-900 object-contain"
                />
                <button
                  type="button"
                  onClick={captureRoverFrame}
                  className="inline-flex items-center gap-2 rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
                >
                  <Camera size={16} />
                  Use latest rover frame
                </button>
              </div>
            ) : (
              <div className="mt-3 flex min-h-28 items-center justify-center rounded-lg border border-dashed border-green-300 bg-white text-center text-sm text-gray-500">
                {roverCameraConnected ? "Waiting for the first rover frame…" : "Connect to display the latest field image here."}
              </div>
            )}
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startCamera}
              disabled={cameraActive}
              className="inline-flex items-center gap-2 rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Camera size={16} />
              Open camera
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Upload size={16} />
              Upload photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              aria-label="Upload a fruit or vegetable photo"
            />
          </div>

          {cameraActive && (
            <div className="mb-4 space-y-3">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="max-h-72 w-full rounded-lg bg-gray-900 object-contain"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={captureImage}
                  className="inline-flex items-center gap-2 rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
                >
                  <Camera size={16} />
                  Capture photo
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <X size={16} />
                  Close camera
                </button>
              </div>
            </div>
          )}

          {!cameraActive && imagePreview ? (
            <div className="relative mb-4">
              <img src={imagePreview} alt="Photo awaiting farmer ripeness confirmation" className="max-h-72 w-full rounded-lg bg-gray-50 object-contain" />
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                aria-label="Remove photo"
                className="absolute right-2 top-2 rounded-full bg-white p-2 text-gray-700 shadow hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>
          ) : !cameraActive && (
            <div className="mb-4 flex min-h-36 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 text-center text-sm text-gray-500">
              <div>
                <ImagePlus className="mx-auto mb-2" size={24} />
                Capture or upload a photo to start a farmer-reviewed record.
              </div>
            </div>
          )}

          {imagePreview && (
            <div className="mb-4">
              <button
                type="button"
                onClick={analyzeImage}
                disabled={isPredicting || modelStatus === "checking"}
                className="inline-flex items-center gap-2 rounded-md border border-green-700 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Leaf size={16} />
                {isPredicting ? "Analyzing photo…" : "Analyze with trained model"}
              </button>
              {prediction && (
                <p role="status" className="mt-2 text-sm text-gray-700">
                  Model suggestion: <strong>{prediction.crop.replaceAll("_", " ")}</strong>,{" "}
                  <strong className="capitalize">{prediction.ripeness}</strong>
                  {" "}({(prediction.confidence * 100).toFixed(1)}% model confidence).
                  Confirm or change these labels below.
                </p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-medium text-gray-700">
              Crop
              <select
                value={crop}
                onChange={(event) => setCrop(event.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {CROPS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700">
              Number of items
              <input
                type="number"
                min={1}
                max={1_000_000}
                step={1}
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <fieldset>
              <legend className="text-sm font-medium text-gray-700">Ripeness</legend>
              <div className="mt-1 flex gap-2">
                {(["ripe", "unripe"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={ripeness === item}
                    onClick={() => setRipeness(item)}
                    className={`flex-1 rounded-md border px-2 py-2 text-sm font-medium capitalize ${
                      ripeness === item
                        ? item === "ripe" ? "border-green-700 bg-green-50 text-green-800" : "border-orange-600 bg-orange-50 text-orange-800"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <button
            type="button"
            onClick={addObservation}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
          >
            <Check size={16} />
            Save confirmed count
          </button>
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          {message && !error && <p role="status" className="mt-3 text-sm text-green-700">{message}</p>}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <label htmlFor="ripeness-crop-filter" className="text-sm font-medium text-gray-700">Crop information</label>
            <select
              id="ripeness-crop-filter"
              value={crop}
              onChange={(event) => setCrop(event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              {CROPS.map((item) => <option key={item}>{item}</option>)}
            </select>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-sm font-medium text-green-800">Ripe · {crop}</p>
                <p className="mt-1 text-3xl font-bold text-green-900">{ripeCount}</p>
                <p className="text-xs text-green-800">ready for farmer review</p>
              </div>
              <div className="rounded-lg bg-orange-50 p-4">
                <p className="text-sm font-medium text-orange-800">Unripe · {crop}</p>
                <p className="mt-1 text-3xl font-bold text-orange-900">{unripeCount}</p>
                <p className="text-xs text-orange-800">leave to mature</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-lg font-semibold text-gray-900">Field totals by crop</h3>
            <p className="mb-4 text-sm text-gray-600">Counts include farmer-confirmed observations and any clearly marked demo samples saved in this browser.</p>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={addSampleData}
                className="rounded-md border border-green-700 px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-50"
              >
                {hasSampleData ? "Restore sample data" : "Load sample data"}
              </button>
              {hasSampleData && (
                <button
                  type="button"
                  onClick={removeSampleData}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Remove sample data
                </button>
              )}
              {!hasSampleData && <span className="text-xs text-gray-500">Demo counts are labeled and can be removed.</span>}
            </div>
            {Object.keys(cropTotals).length === 0 ? (
              <p className="text-sm text-gray-500">No crop counts recorded yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(cropTotals).sort(([a], [b]) => a.localeCompare(b)).map(([name, totals]) => (
                  <article key={name} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h4 className="mb-3 font-semibold text-gray-900">{name}</h4>
                    <dl className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-md bg-green-50 p-2">
                        <dt className="text-xs font-medium text-green-800">Ripe</dt>
                        <dd className="mt-1 text-xl font-bold text-green-900">{totals.ripe}</dd>
                      </div>
                      <div className="rounded-md bg-orange-50 p-2">
                        <dt className="text-xs font-medium text-orange-800">Unripe</dt>
                        <dd className="mt-1 text-xl font-bold text-orange-900">{totals.unripe}</dd>
                      </div>
                      <div className="rounded-md bg-white p-2">
                        <dt className="text-xs font-medium text-gray-600">Total</dt>
                        <dd className="mt-1 text-xl font-bold text-gray-900">{totals.ripe + totals.unripe}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold text-gray-900">Recent farmer-confirmed observations</h3>
        {storageError && <p role="alert" className="mb-3 flex items-center gap-2 text-sm text-amber-800"><CircleAlert size={16} />{storageError}</p>}
        {observations.length === 0 ? (
          <p className="text-sm text-gray-500">Saved observations will appear here and remain available in this browser.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {observations.slice(0, 10).map((observation) => (
              <li key={observation.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-gray-900">
                    {observation.count} {observation.crop} · <span className={observation.ripeness === "ripe" ? "text-green-700" : "text-orange-700"}>{observation.ripeness}</span>
                  </p>
                  {observation.id.startsWith("sample-") && (
                    <span className="text-xs font-medium text-blue-700">Demo sample data</span>
                  )}
                  <time dateTime={observation.createdAt} className="text-xs text-gray-500">
                    {new Date(observation.createdAt).toLocaleString()}
                  </time>
                </div>
                <button
                  type="button"
                  onClick={() => removeObservation(observation.id)}
                  aria-label={`Delete ${observation.crop} ${observation.ripeness} observation`}
                  className="rounded-md p-2 text-gray-500 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default RipenessTracker;
