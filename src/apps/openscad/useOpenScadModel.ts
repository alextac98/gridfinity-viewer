"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OpenScadDefineValue } from "@/lib/openscad/defines";
import { createOpenScadWorker } from "@/lib/openscad/workerClient";
import type {
  OpenScadWorkerRequest,
  OpenScadWorkerResponse,
} from "@/lib/openscad/workerTypes";

type R2CacheResponse =
  | {
      enabled: false;
      reason: string;
      settingsHash: string;
      objectKey: string;
    }
  | {
      enabled: true;
      hit: boolean;
      settingsHash: string;
      objectKey: string;
      downloadUrl: string;
      uploadUrl?: string;
    };

type UseOpenScadModelOptions<TParams> = {
  params: TParams;
  entryFile: string;
  outputBaseName: string;
  cacheModelId?: string;
  createDefines: (params: TParams) => Record<string, OpenScadDefineValue>;
  createParamsKey: (params: TParams) => string;
  createScadSnippet: (params: TParams) => string;
  renderErrorMessage: string;
  workerErrorMessage: string;
};

function toArrayBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadUrl(name: string, url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.rel = "noopener";
  link.click();
}

function writeOpenScadErrorToConsole(message: string, logs: string[]) {
  console.error("OpenSCAD render failed.", message);

  if (logs.length > 0) {
    console.groupCollapsed("OpenSCAD logs");
    console.info(logs.join("\n"));
    console.groupEnd();
  }
}

async function lookupR2Cache<TParams>(modelId: string, params: TParams) {
  const response = await fetch(`/api/openscad-models/${modelId}/r2-cache`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ params }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`R2 cache lookup failed with status ${response.status}: ${details}`);
  }

  return (await response.json()) as R2CacheResponse;
}

async function fetchStlFromUrl(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Could not load cached STL: ${response.status}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

async function uploadStlToR2(uploadUrl: string, stlBytes: Uint8Array) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "model/stl",
    },
    body: toArrayBuffer(stlBytes),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`R2 cache upload failed with status ${response.status}: ${details}`);
  }
}

async function uploadStlThroughApi(
  modelId: string,
  objectKey: string,
  stlBytes: Uint8Array,
) {
  const response = await fetch(`/api/openscad-models/${modelId}/r2-cache/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "model/stl",
      "x-r2-object-key": objectKey,
    },
    body: toArrayBuffer(stlBytes),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`R2 cache API upload failed with status ${response.status}: ${details}`);
  }
}

async function cacheGeneratedStl(
  modelId: string | undefined,
  cache: R2CacheResponse,
  stlBytes: Uint8Array,
) {
  if (!modelId || !cache.enabled || cache.hit) {
    return;
  }

  if (!cache.uploadUrl) {
    console.warn(
      "R2 cache upload skipped because no upload URL was returned.",
      {
        objectKey: cache.objectKey,
        settingsHash: cache.settingsHash,
      },
    );
    return;
  }

  try {
    try {
      await uploadStlToR2(cache.uploadUrl, stlBytes);
      console.info("R2 cache upload completed directly.", {
        objectKey: cache.objectKey,
        settingsHash: cache.settingsHash,
      });
    } catch (directUploadError) {
      console.warn(
        "Direct R2 upload failed; retrying through API.",
        directUploadError,
      );
      await uploadStlThroughApi(modelId, cache.objectKey, stlBytes);
      console.info("R2 cache upload completed through API fallback.", {
        objectKey: cache.objectKey,
        settingsHash: cache.settingsHash,
      });
    }
  } catch (error) {
    console.warn("R2 cache upload failed; keeping local STL.", error);
    throw error;
  }
}

export function useOpenScadModel<TParams>({
  params,
  entryFile,
  outputBaseName,
  cacheModelId,
  createDefines,
  createParamsKey,
  createScadSnippet,
  renderErrorMessage,
  workerErrorMessage,
}: UseOpenScadModelOptions<TParams>) {
  const [hasMounted, setHasMounted] = useState(false);
  const [stl, setStl] = useState<Uint8Array>();
  const [generatedParamsKey, setGeneratedParamsKey] = useState("");
  const [renderStatus, setRenderStatus] = useState("Preparing OpenSCAD Worker");
  const [renderError, setRenderError] = useState("");
  const [isRendering, setIsRendering] = useState(true);
  const [cachedDownloadUrl, setCachedDownloadUrl] = useState("");
  const [cachedDownloadParamsKey, setCachedDownloadParamsKey] = useState("");
  const renderSequenceRef = useRef(0);
  const workerRef = useRef<Worker | null>(null);
  const latestParamsRef = useRef(params);
  const activeRequestRef = useRef<number | null>(null);
  const activeParamsKeyRef = useRef("");
  const isWorkerRenderingRef = useRef(false);
  const queuedRenderRef = useRef(false);
  const activeCacheRef = useRef<R2CacheResponse | null>(null);

  const currentParamsKey = useMemo(
    () => createParamsKey(params),
    [createParamsKey, params],
  );
  const isPreviewCurrent = Boolean(
    stl && generatedParamsKey === currentParamsKey && !renderError,
  );
  const previewStatus = renderError
    ? "Render Failed"
    : isRendering
      ? "Rendering"
      : isPreviewCurrent
        ? "OpenSCAD Preview Ready"
        : stl
          ? "Changes Pending"
          : "Ready To Generate";
  const currentModelUrl =
    isPreviewCurrent &&
    cachedDownloadUrl &&
    cachedDownloadParamsKey === currentParamsKey &&
    typeof window !== "undefined"
      ? new URL(cachedDownloadUrl, window.location.origin).toString()
      : "";

  useEffect(() => {
    const mountTimer = window.setTimeout(() => setHasMounted(true), 0);

    return () => window.clearTimeout(mountTimer);
  }, []);

  const startRender = useCallback(
    (nextParams: TParams) => {
      const worker = workerRef.current;

      if (!worker) {
        return;
      }

      const renderSequence = renderSequenceRef.current + 1;
      renderSequenceRef.current = renderSequence;
      activeRequestRef.current = renderSequence;
      activeParamsKeyRef.current = createParamsKey(nextParams);
      isWorkerRenderingRef.current = true;
      queuedRenderRef.current = false;
      setIsRendering(true);
      setRenderError("");
      setRenderStatus("Rendering OpenSCAD STL");

      const request: OpenScadWorkerRequest = {
        type: "render",
        requestId: renderSequence,
        entryFile,
        defines: createDefines(nextParams),
        outputName: `${outputBaseName}.stl`,
      };

      worker.postMessage(request);
    },
    [createDefines, createParamsKey, entryFile, outputBaseName],
  );

  const requestRender = useCallback(
    async (nextParams: TParams) => {
      const nextParamsKey = createParamsKey(nextParams);
      latestParamsRef.current = nextParams;
      activeCacheRef.current = null;
      setRenderError("");

      if (!workerRef.current) {
        setIsRendering(false);
        setRenderStatus("Preparing OpenSCAD Worker");
        return;
      }

      if (isWorkerRenderingRef.current) {
        queuedRenderRef.current = true;
        setIsRendering(true);
        setRenderStatus("Rendering Updated OpenSCAD STL");
        return;
      }

      if (cacheModelId) {
        setIsRendering(true);
        setRenderStatus("Checking Model Cache");

        try {
          const cache = await lookupR2Cache(cacheModelId, nextParams);

          if (!cache.enabled) {
            console.warn("R2 cache disabled; rendering locally.", {
              reason: cache.reason,
              objectKey: cache.objectKey,
              settingsHash: cache.settingsHash,
            });
          }

          if (cache.enabled && cache.hit) {
            console.info("R2 cache hit.", {
              objectKey: cache.objectKey,
              settingsHash: cache.settingsHash,
            });
            setRenderStatus("Loading Cached STL");
            const cachedStl = await fetchStlFromUrl(cache.downloadUrl);
            setStl(cachedStl);
            setGeneratedParamsKey(nextParamsKey);
            setCachedDownloadUrl(cache.downloadUrl);
            setCachedDownloadParamsKey(nextParamsKey);
            setRenderStatus("Cached OpenSCAD Preview Ready");
            setIsRendering(false);
            return;
          }

          if (cache.enabled) {
            console.info(
              "R2 cache miss; rendering locally and uploading in the background.",
              {
                objectKey: cache.objectKey,
                settingsHash: cache.settingsHash,
                hasUploadUrl: Boolean(cache.uploadUrl),
              },
            );
            activeCacheRef.current = cache;
          }
        } catch (error) {
          console.warn("R2 cache lookup failed; rendering locally.", error);
        }
      }

      setIsRendering(true);
      setRenderStatus("Rendering OpenSCAD STL");
      startRender(latestParamsRef.current);
    },
    [cacheModelId, createParamsKey, startRender],
  );

  useEffect(() => {
    if (!hasMounted) {
      return;
    }

    const worker = createOpenScadWorker();
    workerRef.current = worker;

    const startQueuedRenderIfNeeded = () => {
      isWorkerRenderingRef.current = false;
      activeRequestRef.current = null;

      if (queuedRenderRef.current) {
        queuedRenderRef.current = false;
        startRender(latestParamsRef.current);
        return true;
      }

      return false;
    };

    const handleWorkerMessage = async (
      event: MessageEvent<OpenScadWorkerResponse>,
    ) => {
      const message = event.data;

      if (message.type === "render-started") {
        return;
      }

      if (message.requestId !== activeRequestRef.current) {
        return;
      }

      if (message.type === "render-done") {
        if (startQueuedRenderIfNeeded()) {
          return;
        }

        const stlBytes = new Uint8Array(message.stl);
        const cache = activeCacheRef.current;
        const renderedParamsKey = activeParamsKeyRef.current;
        activeCacheRef.current = null;
        setStl(stlBytes);
        setGeneratedParamsKey(renderedParamsKey);
        setRenderStatus("OpenSCAD Preview Ready");
        setRenderError("");
        setIsRendering(false);

        if (cache?.enabled && !cache.hit && cache.uploadUrl) {
          setCachedDownloadUrl("");
          setCachedDownloadParamsKey("");
          void cacheGeneratedStl(cacheModelId, cache, stlBytes)
            .then(() => {
              setCachedDownloadUrl(cache.downloadUrl);
              setCachedDownloadParamsKey(renderedParamsKey);
            })
            .catch(() => {
              setCachedDownloadUrl("");
              setCachedDownloadParamsKey("");
            });
        } else {
          setCachedDownloadUrl("");
          setCachedDownloadParamsKey("");
        }

        return;
      }

      writeOpenScadErrorToConsole(message.message, message.logs);
      activeCacheRef.current = null;

      if (startQueuedRenderIfNeeded()) {
        return;
      }

      setRenderError(renderErrorMessage);
      setRenderStatus("OpenSCAD Render Failed");
      setIsRendering(false);
    };

    const handleMessage = (event: MessageEvent<OpenScadWorkerResponse>) => {
      void handleWorkerMessage(event);
    };

    const handleWorkerError = (event: ErrorEvent) => {
      console.error("OpenSCAD worker failed.", event.error ?? event.message);
      isWorkerRenderingRef.current = false;
      activeRequestRef.current = null;
      setStl(undefined);
      setRenderError(workerErrorMessage);
      setRenderStatus("OpenSCAD Worker Failed");
      setIsRendering(false);
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleWorkerError);
    const initialRenderTimer = window.setTimeout(() => {
      void requestRender(latestParamsRef.current);
    }, 0);

    return () => {
      window.clearTimeout(initialRenderTimer);
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleWorkerError);
      worker.terminate();
      workerRef.current = null;
      isWorkerRenderingRef.current = false;
      activeRequestRef.current = null;
      activeCacheRef.current = null;
    };
  }, [
    cacheModelId,
    hasMounted,
    requestRender,
    renderErrorMessage,
    startRender,
    workerErrorMessage,
  ]);

  const clearRenderError = () => setRenderError("");

  const clearGeneratedModel = () => {
    setStl(undefined);
    setGeneratedParamsKey("");
    setCachedDownloadUrl("");
    setCachedDownloadParamsKey("");
  };

  const markCheckingCache = () => setRenderStatus("Checking Model Cache");

  const downloadStl = () => {
    if (!stl || !isPreviewCurrent) {
      return;
    }

    if (cachedDownloadUrl && cachedDownloadParamsKey === currentParamsKey) {
      downloadUrl(`${outputBaseName}.stl`, cachedDownloadUrl);
      return;
    }

    downloadBlob(
      `${outputBaseName}.stl`,
      new Blob([toArrayBuffer(stl)], { type: "model/stl" }),
    );
  };

  const downloadScad = () => {
    downloadBlob(
      `${outputBaseName}.scad`,
      new Blob([createScadSnippet(params)], { type: "text/plain" }),
    );
  };

  return {
    clearGeneratedModel,
    clearRenderError,
    currentModelUrl,
    currentParamsKey,
    downloadScad,
    downloadStl,
    hasMounted,
    isPreviewCurrent,
    isRendering,
    markCheckingCache,
    previewStatus,
    renderError,
    renderStatus,
    requestRender,
    stl,
  };
}
