"use client";

import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import Webcam from "react-webcam";
import {load as cocoSSDLoad} from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs";
import {renderPredictions} from "@/utils/render-predictions";

const DETECTION_PROFILES = {
  desktop: {
    label: "Accuracy",
    modelBase: "mobilenet_v2",
    confidence: 0.5,
    maxDetections: 50,
    interval: 220,
    videoConstraints: {
      width: {ideal: 1280},
      height: {ideal: 720},
      facingMode: {ideal: "environment"},
    },
  },
  mobile: {
    label: "Mobile",
    modelBase: "lite_mobilenet_v2",
    confidence: 0.55,
    maxDetections: 20,
    interval: 550,
    videoConstraints: {
      width: {ideal: 640},
      height: {ideal: 480},
      facingMode: {ideal: "environment"},
    },
  },
};

const initializeTensorflowBackend = async () => {
  try {
    await tf.setBackend("webgl");
  } catch {
    await tf.setBackend("cpu");
  }

  await tf.ready();
  return tf.getBackend();
};

const getDetectionProfile = () => {
  if (typeof window === "undefined") {
    return DETECTION_PROFILES.desktop;
  }

  const isSmallScreen = window.matchMedia("(max-width: 767px)").matches;
  const hasLimitedCores =
    typeof navigator !== "undefined" && navigator.hardwareConcurrency <= 4;

  return isSmallScreen || hasLimitedCores
    ? DETECTION_PROFILES.mobile
    : DETECTION_PROFILES.desktop;
};

const ObjectDetection = () => {
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [backend, setBackend] = useState("");
  const [error, setError] = useState("");
  const [detectionProfile, setDetectionProfile] = useState(
    DETECTION_PROFILES.desktop
  );

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const modelCacheRef = useRef({});
  const detectIntervalRef = useRef(null);
  const isDetectingRef = useRef(false);

  const objectCounts = useMemo(() => {
    const counts = predictions.reduce((items, prediction) => {
      items[prediction.class] = (items[prediction.class] || 0) + 1;
      return items;
    }, {});

    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [predictions]);

  const topPredictions = useMemo(
    () => [...predictions].sort((a, b) => b.score - a.score).slice(0, 5),
    [predictions]
  );

  const clearDetectionFrame = useCallback(() => {
    if (detectIntervalRef.current) {
      clearInterval(detectIntervalRef.current);
      detectIntervalRef.current = null;
    }

    isDetectingRef.current = false;

    const context = canvasRef.current?.getContext("2d");

    if (context) {
      context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    }
  }, []);

  const stopCameraStream = useCallback(() => {
    const stream =
      webcamRef.current?.stream || webcamRef.current?.video?.srcObject;

    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  const syncCanvasSize = useCallback(() => {
    const video = webcamRef.current?.video;
    const canvas = canvasRef.current;

    if (video?.readyState === 4 && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
  }, []);

  const runObjectDetection = useCallback(
    async (net) => {
      if (!net || isDetectingRef.current) {
        return;
      }

      if (
        canvasRef.current &&
        webcamRef.current !== null &&
        webcamRef.current.video?.readyState === 4
      ) {
        isDetectingRef.current = true;

        try {
          syncCanvasSize();

          const detectedObjects = await net.detect(
            webcamRef.current.video,
            detectionProfile.maxDetections,
            detectionProfile.confidence
          );

          const context = canvasRef.current.getContext("2d");
          renderPredictions(detectedObjects, context);
          setPredictions(detectedObjects);
        } catch {
          setError("Detection paused. Please restart the camera.");
        } finally {
          isDetectingRef.current = false;
        }
      }
    },
    [detectionProfile.confidence, detectionProfile.maxDetections, syncCanvasSize]
  );

  const loadModel = useCallback(async (profile) => {
    if (!modelCacheRef.current[profile.modelBase]) {
      modelCacheRef.current[profile.modelBase] = initializeTensorflowBackend()
        .then((activeBackend) => {
          setBackend(activeBackend);
          return cocoSSDLoad({base: profile.modelBase});
        })
        .catch((loadError) => {
          delete modelCacheRef.current[profile.modelBase];
          throw loadError;
        });
    }

    return modelCacheRef.current[profile.modelBase];
  }, []);

  const toggleCamera = useCallback(() => {
    if (isCameraOn) {
      setIsLoading(false);
      setPredictions([]);
      setIsCameraOn(false);
      return;
    }

    const nextProfile = getDetectionProfile();
    setDetectionProfile(nextProfile);
    setError("");
    setIsLoading(true);
    setIsCameraOn(true);
  }, [isCameraOn]);

  useEffect(() => {
    if (!isCameraOn) {
      clearDetectionFrame();
      stopCameraStream();
      return;
    }

    let isMounted = true;

    const startDetection = async () => {
      try {
        const model = await loadModel(detectionProfile);

        if (!isMounted) {
          return;
        }

        setIsLoading(false);
        syncCanvasSize();

        detectIntervalRef.current = setInterval(() => {
          runObjectDetection(model);
        }, detectionProfile.interval);
      } catch {
        if (isMounted) {
          setError("Could not start the detector. Check permissions and try again.");
          setIsLoading(false);
          setIsCameraOn(false);
        }
      }
    };

    startDetection();

    return () => {
      isMounted = false;
      clearDetectionFrame();
      stopCameraStream();
    };
  }, [
    clearDetectionFrame,
    detectionProfile,
    isCameraOn,
    loadModel,
    runObjectDetection,
    stopCameraStream,
    syncCanvasSize,
  ]);

  const detectorStatus = isLoading ? "Loading" : isCameraOn ? "Scanning" : "Idle";
  const confidencePercent = Math.round(detectionProfile.confidence * 100);

  return (
    <section className="w-full">
      <div className="mb-3 flex flex-col gap-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-3 shadow-2xl shadow-black/30 backdrop-blur sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div>
          <p className="text-xs font-semibold uppercase text-cyan-200">
            TensorFlow {backend || "ready"} / {detectionProfile.label}
          </p>
          <p className="text-sm text-white/65">
            {predictions.length} objects in frame
          </p>
        </div>

        <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
          <span className="flex items-center gap-2 text-sm font-medium text-white/80">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isCameraOn ? "bg-emerald-400" : "bg-zinc-500"
              }`}
            />
            {detectorStatus}
          </span>
          <button
            type="button"
            onClick={toggleCamera}
            className={`rounded-md px-4 py-2.5 text-sm font-semibold text-black transition sm:px-5 sm:py-3 sm:text-base ${
              isCameraOn
                ? "bg-red-500 hover:bg-red-400"
                : "bg-cyan-400 hover:bg-cyan-300"
            }`}
          >
            {isCameraOn ? "Stop Camera" : "Start Camera"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="overflow-hidden rounded-md border border-white/10 bg-zinc-950 shadow-2xl shadow-black/40">
          <div className="relative aspect-[4/3] w-full sm:aspect-video">
            {isCameraOn ? (
              <>
                <Webcam
                  ref={webcamRef}
                  className="absolute inset-0 h-full w-full object-contain"
                  videoConstraints={detectionProfile.videoConstraints}
                  onUserMedia={syncCanvasSize}
                  onUserMediaError={() => {
                    setError("Camera permission is blocked or unavailable.");
                    setIsCameraOn(false);
                  }}
                  muted
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 z-10 h-full w-full object-contain"
                />
              </>
            ) : (
              <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#111827,#020617)] text-sm text-white/60">
                Camera is off
              </div>
            )}

            {isLoading ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 text-sm font-semibold text-cyan-100 backdrop-blur-sm">
                Loading high accuracy model...
              </div>
            ) : null}
          </div>
        </div>

        <aside className="rounded-md border border-white/10 bg-white/[0.04] p-3 shadow-2xl shadow-black/30 backdrop-blur sm:p-4">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Live Objects</h2>
              <p className="text-xs text-white/55">
                Confidence {confidencePercent}%+
              </p>
            </div>
            <span className="text-3xl font-black text-cyan-300">
              {predictions.length}
            </span>
          </div>

          <div className="space-y-2">
            {objectCounts.length ? (
              objectCounts.map(([name, count]) => (
                <div
                  key={name}
                  className="flex items-center justify-between border-b border-white/10 py-2 text-sm"
                >
                  <span className="capitalize text-white/85">{name}</span>
                  <span className="font-semibold text-emerald-300">{count}</span>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-white/45">
                No objects detected
              </p>
            )}
          </div>

          <div className="mt-5 border-t border-white/10 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-white/80">
              Top Matches
            </h3>
            <div className="space-y-2">
              {topPredictions.length ? (
                topPredictions.map((prediction, index) => (
                  <div key={`${prediction.class}-${index}`}>
                    <div className="mb-1 flex justify-between text-xs text-white/70">
                      <span className="capitalize">{prediction.class}</span>
                      <span>{Math.round(prediction.score * 100)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-amber-300"
                        style={{
                          width: `${Math.round(prediction.score * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/45">Waiting for a frame</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default ObjectDetection;
