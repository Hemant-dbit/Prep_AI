import { useEffect, useRef, useState, useCallback } from "react";
import toast from "react-hot-toast";

interface MonitoringOptions {
  onWarning: (
    type: "tab-switch" | "camera-look-away" | "multiple-faces",
    count: number
  ) => void;
  onInterviewTerminated: () => void;
  // maximum number of warnings before termination
  maxWarnings?: number;
  // whether monitoring is enabled
  enabled?: boolean;
  // threshold in milliseconds for long continuous look-away to be considered a warning
  continuousLookAwayThresholdMs?: number;
}

export const useInterviewMonitoring = ({
  onWarning,
  onInterviewTerminated,
  maxWarnings = 3,
  enabled = true,
  continuousLookAwayThresholdMs = 60 * 1000,
}: MonitoringOptions) => {
  const [warningCount, setWarningCount] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [hasStream, setHasStream] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(true);
  const [detectionStatus, setDetectionStatus] = useState({
    faceDetected: false,
    eyesDetected: false,
    lookingAtCamera: false,
    faceCount: 0,
  });

  // Refs for camera and detection
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const unloadCleanupRef = useRef<(() => void) | null>(null);
  // Small smoothing counter to avoid rapid flicker between looking/away
  const lookAtConfidenceRef = useRef<number>(0);
  const lookAwayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const multipleFacesTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track last toast times per warning type to prevent duplicate toasts of the same
  // type while allowing different warning types to be shown independently.
  const lastToastMapRef = useRef<Record<string, number>>({});
  const lastResultTimeRef = useRef<number | null>(null);
  const noResultsWarnedRef = useRef<boolean>(false);
  const tabSwitchTimeRef = useRef<number>(Date.now());
  const isTabAwayRef = useRef<boolean>(false);
  // Track start time of a continuous look-away (long-duration)
  const continuousLookAwayStartRef = useRef<number | null>(null);
  const continuousLookAwayWarnedRef = useRef<boolean>(false);
  // Refs to track current boolean state to avoid unnecessary setState calls
  const isMonitoringRef = useRef<boolean>(false);
  const hasStreamRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);

  // Defensive: force-stop any MediaStreams attached to video elements in the page.
  const forceReleaseAllVideoStreams = useCallback(() => {
    try {
      if (typeof window === "undefined" || !document) return;
      const videos = Array.from(
        document.querySelectorAll("video")
      ) as HTMLVideoElement[];
      videos.forEach((video) => {
        try {
          const so = video.srcObject as MediaStream | null;
          if (so) {
            try {
              so.getTracks().forEach((t) => {
                try {
                  t.stop();
                } catch (e) {
                  // ignore
                }
              });
            } catch (e) {
              // ignore
            }
            try {
              video.srcObject = null;
            } catch (e) {
              // ignore
            }
            // stopped tracks for this video element
          }
        } catch (err) {
          // ignore per-video errors
        }
      });
    } catch (err) {
      console.warn("forceReleaseAllVideoStreams failed", err);
    }
  }, []);

  const addWarning = useCallback(
    (type: "tab-switch" | "camera-look-away" | "multiple-faces") => {
      // Prevent duplicate warnings of the same type within a short window
      const now = Date.now();
      const last = lastToastMapRef.current[type];
      if (last && now - last < 3000) {
        return; // Skip if this same warning type was shown in the last 3 seconds
      }

      // Record this warning's timestamp keyed by its type so other warning types
      // (e.g. tab-switch) don't suppress a multiple-faces warning.
      lastToastMapRef.current[type] = now;

      setWarningCount((currentCount) => {
        const newCount = currentCount + 1;

        // Schedule side-effects after state update to avoid calling setState during render
        Promise.resolve().then(() => {
          try {
            onWarning(type, newCount); // Only let InterviewUI handle the toast
            if (newCount >= maxWarnings) {
              onInterviewTerminated();
            }
          } catch (e) {
            // swallow errors from user-provided callbacks
            console.error("onWarning callback error", e);
          }
        });

        return newCount;
      });
    },
    [maxWarnings, onWarning, onInterviewTerminated]
  );

  // Keep refs in sync with state to avoid unneeded setState() calls
  useEffect(() => {
    isMonitoringRef.current = isMonitoring;
  }, [isMonitoring]);

  useEffect(() => {
    hasStreamRef.current = hasStream;
  }, [hasStream]);

  // MediaPipe-based face and eye detection
  const initializeMediaPipe = useCallback(async () => {
    // Only initialize on the client
    if (typeof window === "undefined") {
      console.warn("MediaPipe initialization skipped on server-side");
      return;
    }

    if (faceMeshRef.current) return;

    // Helper: attempt explicit imports in sequence (avoids dynamic import-of-variable warnings)
    const tryExplicitImports = async () => {
      // 1) Try package ESM
      try {
        const mod = await import("@mediapipe/face_mesh");
        if (mod && (Object.keys(mod).length > 0 || (mod as any).default))
          return mod;
      } catch (e) {
        console.warn("Import @mediapipe/face_mesh failed:", e);
      }

      // // 2) Try specific path
      // try {
      //   const mod = await import('@mediapipe/face_mesh/face_mesh.js');
      //   if (mod && (Object.keys(mod).length > 0 || (mod as any).default)) return mod;
      // } catch (e) {
      //   console.warn('Import @mediapipe/face_mesh/face_mesh.js failed:', e);
      // }

      // 3) No further static imports available in-bundle; return null to trigger script tag fallback
      return null;
    };

    try {
      // console.log("🔧 Initializing MediaPipe FaceMesh (robust loader)...");

      // Try common import entry points
      const FaceMeshModule = await tryExplicitImports();
      // console.log(
      //   "ℹ️ FaceMeshModule result:",
      //   FaceMeshModule ? Object.keys(FaceMeshModule) : FaceMeshModule
      // );

      // If still null, fall back to script tag loader
      let faceMeshConstructor: any = null;

      if (FaceMeshModule) {
        // Various export shapes
        if ((FaceMeshModule as any).FaceMesh) {
          faceMeshConstructor = (FaceMeshModule as any).FaceMesh;
        } else if ((FaceMeshModule as any).default?.FaceMesh) {
          faceMeshConstructor = (FaceMeshModule as any).default.FaceMesh;
        } else if (typeof (FaceMeshModule as any).default === "function") {
          faceMeshConstructor = (FaceMeshModule as any).default;
        } else if (typeof FaceMeshModule === "function") {
          faceMeshConstructor = FaceMeshModule as any;
        }
      }

      // If constructor still not found, try to load the global script
      if (!faceMeshConstructor) {
        console.warn(
          "FaceMesh constructor not found in dynamic imports, trying script tag fallback..."
        );

        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector(
            "script[data-mediapipe-face_mesh]"
          );
          if (existing) return resolve();

          const s = document.createElement("script");
          s.src =
            "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js";
          s.setAttribute("data-mediapipe-face_mesh", "1");
          s.onload = () => resolve();
          s.onerror = (ev) =>
            reject(new Error("Failed to load MediaPipe script"));
          document.head.appendChild(s);
          // safety timeout
          setTimeout(() => {
            // If global still not present, reject
            if (!(window as any).FaceMesh && !(window as any).faceMesh) {
              reject(
                new Error("MediaPipe script loaded but global not available")
              );
            } else {
              resolve();
            }
          }, 8000);
        }).catch((scriptErr) => {
          console.warn("Script fallback failed:", scriptErr);
        });

        // try to read global now
        faceMeshConstructor =
          (window as any).FaceMesh ||
          (window as any).face_mesh ||
          (window as any).faceMeshModule ||
          null;
        // Sometimes CDN exposes a namespace where constructor is at FaceMesh.FaceMesh
        if (
          !faceMeshConstructor &&
          (window as any).FaceMesh &&
          (window as any).FaceMesh.FaceMesh
        ) {
          faceMeshConstructor = (window as any).FaceMesh.FaceMesh;
        }
      }

      if (!faceMeshConstructor || typeof faceMeshConstructor !== "function") {
        console.error("❌ FaceMesh constructor not found after all attempts", {
          faceMeshConstructor,
        });
        throw new Error("FaceMesh constructor not found");
      }

      // console.log("✅ FaceMesh constructor resolved, creating instance...");

      const faceMesh = new faceMeshConstructor({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        // Allow multiple faces so we can detect if >1 person in frame
        maxNumFaces: 4,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      // console.log("⚙️ Setting up FaceMesh configuration...");

      faceMesh.onResults((results: any) => {
        // update last result timestamp
        lastResultTimeRef.current = Date.now();
        noResultsWarnedRef.current = false;
        // Debug first few results
        if (Math.random() < 0.02) {
          // 2% of the time - debug output suppressed
          // console.log("📊 MediaPipe Results:", {
          //   hasFaces: !!(
          //     results.multiFaceLandmarks &&
          //     results.multiFaceLandmarks.length > 0
          //   ),
          //   faceCount: results.multiFaceLandmarks
          //     ? results.multiFaceLandmarks.length
          //     : 0,
          //   imageSize: results.image
          //     ? { width: results.image.width, height: results.image.height }
          //     : null,
          // });
        }

        if (
          results.multiFaceLandmarks &&
          results.multiFaceLandmarks.length > 0
        ) {
          const faceCount = results.multiFaceLandmarks.length;
          const landmarks = results.multiFaceLandmarks[0];

          // Face detection
          const faceDetected = Array.isArray(landmarks) && landmarks.length > 0;

          // Safe getters (some builds may omit certain landmark indices)
          const get = (i: number) =>
            landmarks[i] ? landmarks[i] : { x: 0.5, y: 0.5, z: 0 };

          // Eye detection - check specific eye landmark points (use safe getters)
          const leftEyeTop = get(159);
          const leftEyeBottom = get(145);
          const rightEyeTop = get(386);
          const rightEyeBottom = get(374);

          // Calculate eye openness (make threshold more lenient)
          const leftEyeHeight = Math.abs(leftEyeTop.y - leftEyeBottom.y);
          const rightEyeHeight = Math.abs(rightEyeTop.y - rightEyeBottom.y);
          const eyeOpenThreshold = 0.006; // relaxed threshold to treat slight eye openness as open

          const eyesDetected =
            faceDetected &&
            leftEyeHeight > eyeOpenThreshold &&
            rightEyeHeight > eyeOpenThreshold;

          // Gaze detection - relaxed approach that treats looking at the screen as acceptable
          const noseTip = get(1);
          const leftCheek = get(234);
          const rightCheek = get(454);

          // Calculate face center and orientation (normalized coords)
          const faceCenter = {
            x: (leftCheek.x + rightCheek.x) / 2,
            y: (leftCheek.y + rightCheek.y) / 2,
          };

          const noseOffset = {
            x: Math.abs(noseTip.x - faceCenter.x),
            y: Math.abs(noseTip.y - faceCenter.y),
          };

          // Relaxed thresholds: allow some horizontal offset (looking at screen instead of camera)
          const noseOffsetXThreshold = 0.12; // wider allowance horizontally
          const noseOffsetYThreshold = 0.1; // vertical tolerance

          // Consider user looking if eyes are open AND either nose is near center OR face center is reasonably centered
          const centeredEnough = Math.abs(faceCenter.x - 0.5) < 0.12;
          const localLooking =
            eyesDetected &&
            ((noseOffset.x < noseOffsetXThreshold &&
              noseOffset.y < noseOffsetYThreshold) ||
              centeredEnough);

          // Smoothing: small counter to avoid flicker on brief glances away
          if (localLooking) {
            lookAtConfidenceRef.current = Math.min(
              5,
              lookAtConfidenceRef.current + 1
            );
          } else {
            lookAtConfidenceRef.current = Math.max(
              0,
              lookAtConfidenceRef.current - 1
            );
          }

          const lookingAtCamera = lookAtConfidenceRef.current >= 2;

          // Update detection status (include faceCount)
          setDetectionStatus({
            faceDetected,
            eyesDetected,
            lookingAtCamera,
            faceCount,
          });

          // Multiple faces detection: warn if more than one face is present
          try {
            if (faceCount > 1) {
              // Multiple faces detected. We warn immediately (with a cooldown)
              // so the user is notified even during calibration. A 10s cooldown
              // prevents repeated spam while the condition persists.
              try {
                console.debug(
                  "useInterviewMonitoring: multiple faces detected",
                  { faceCount }
                );
              } catch (e) {}
              if (!multipleFacesTimeoutRef.current) {
                addWarning("multiple-faces");
                multipleFacesTimeoutRef.current = setTimeout(() => {
                  multipleFacesTimeoutRef.current = null;
                }, 10000);
              }
            } else {
              // When faceCount returns to 1 or 0, clear any cooldown so future
              // multiple-face events can be detected again.
              if (multipleFacesTimeoutRef.current) {
                clearTimeout(multipleFacesTimeoutRef.current);
                multipleFacesTimeoutRef.current = null;
              }
            }
          } catch (err) {
            console.error("Multiple-faces detection check failed", err);
          }

          // Debug logging
          if (Math.random() < 0.05) {
            // 5% - debug detection logs suppressed
            // console.log("🎯 MediaPipe Detection:", {
            //   face: faceDetected ? "✅" : "❌",
            //   eyes: eyesDetected ? "👀" : "❌",
            //   gaze: lookingAtCamera ? "🎯" : "↗️",
            //   eyeHeights: {
            //     left: leftEyeHeight.toFixed(4),
            //     right: rightEyeHeight.toFixed(4),
            //   },
            //   noseOffset: {
            //     x: noseOffset.x.toFixed(4),
            //     y: noseOffset.y.toFixed(4),
            //   },
            // });
          }

          // Handle violations
          if (!faceDetected) {
            if (!lookAwayTimeoutRef.current && !isCalibrating) {
              lookAwayTimeoutRef.current = setTimeout(() => {
                addWarning("camera-look-away");
                lookAwayTimeoutRef.current = null;
              }, 8000);
            }
          } else if (!eyesDetected) {
            if (!lookAwayTimeoutRef.current && !isCalibrating) {
              lookAwayTimeoutRef.current = setTimeout(() => {
                addWarning("camera-look-away");
                lookAwayTimeoutRef.current = null;
              }, 12000);
            }
          } else if (!lookingAtCamera) {
            if (!lookAwayTimeoutRef.current && !isCalibrating) {
              lookAwayTimeoutRef.current = setTimeout(() => {
                addWarning("camera-look-away");
                lookAwayTimeoutRef.current = null;
              }, 15000);
            }
          } else {
            // Clear timeout if everything is detected properly
            if (lookAwayTimeoutRef.current) {
              clearTimeout(lookAwayTimeoutRef.current);
              lookAwayTimeoutRef.current = null;
            }
          }

          // Continuous look-away detection: if the user is continuously away (missing face or not
          // looking at camera) for longer than the configured threshold, issue a single warning
          // for that long-away period. This is separate from short-lived timeouts above.
          try {
            const isAwayLong = !faceDetected || !lookingAtCamera;
            if (isAwayLong) {
              if (continuousLookAwayStartRef.current === null) {
                continuousLookAwayStartRef.current = Date.now();
                continuousLookAwayWarnedRef.current = false;
              } else {
                const elapsed = Date.now() - continuousLookAwayStartRef.current;
                if (
                  !continuousLookAwayWarnedRef.current &&
                  elapsed >= continuousLookAwayThresholdMs
                ) {
                  continuousLookAwayWarnedRef.current = true;
                  addWarning("camera-look-away");
                }
              }
            } else {
              // user returned to camera — reset continuous-away tracking
              if (continuousLookAwayStartRef.current !== null) {
                continuousLookAwayStartRef.current = null;
                continuousLookAwayWarnedRef.current = false;
              }
            }
          } catch (err) {
            // Defensive: don't let detection logic crash the handler
            console.error("Continuous look-away check failed", err);
          }
        } else {
          // No face detected
          setDetectionStatus({
            faceDetected: false,
            eyesDetected: false,
            lookingAtCamera: false,
            faceCount: 0,
          });

          if (multipleFacesTimeoutRef.current) {
            clearTimeout(multipleFacesTimeoutRef.current);
            multipleFacesTimeoutRef.current = null;
          }

          if (!lookAwayTimeoutRef.current && !isCalibrating) {
            lookAwayTimeoutRef.current = setTimeout(() => {
              addWarning("camera-look-away");
              lookAwayTimeoutRef.current = null;
            }, 5000);
          }

          // When there's no face detected at all, start the continuous-away timer if not already
          // running so that long periods of no face will trigger a single long-away warning.
          try {
            if (continuousLookAwayStartRef.current === null) {
              continuousLookAwayStartRef.current = Date.now();
              continuousLookAwayWarnedRef.current = false;
            } else {
              const elapsed = Date.now() - continuousLookAwayStartRef.current;
              if (
                !continuousLookAwayWarnedRef.current &&
                elapsed >= continuousLookAwayThresholdMs
              ) {
                continuousLookAwayWarnedRef.current = true;
                addWarning("camera-look-away");
              }
            }
          } catch (err) {
            console.error("Continuous look-away (no-face) check failed", err);
          }
        }
      });

      faceMeshRef.current = faceMesh;
      // console.log("✅ MediaPipe FaceMesh initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize MediaPipe:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : typeof error,
      });

      // Try alternative approach using script loading
      // console.log("🔄 Attempting alternative MediaPipe loading...");
      try {
        // Alternative: Load MediaPipe via global script approach
        const faceMeshScript = document.createElement("script");
        faceMeshScript.src =
          "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js";
        document.head.appendChild(faceMeshScript);

        await new Promise((resolve, reject) => {
          faceMeshScript.onload = resolve;
          faceMeshScript.onerror = reject;
          setTimeout(reject, 10000); // 10 second timeout
        });

        // Check if MediaPipe is available globally
        if ((window as any).FaceMesh) {
          // console.log("✅ MediaPipe loaded via script tag");
          const faceMesh = new (window as any).FaceMesh({
            locateFile: (file: string) =>
              `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
          });

          faceMesh.setOptions({
            maxNumFaces: 4,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });

          // Set up the same onResults handler
          faceMesh.onResults((results: any) => {
            // update last result timestamp
            lastResultTimeRef.current = Date.now();
            noResultsWarnedRef.current = false;
            // Same detection logic as before
            if (
              results.multiFaceLandmarks &&
              results.multiFaceLandmarks.length > 0
            ) {
              const landmarks = results.multiFaceLandmarks[0];
              const faceDetected = landmarks && landmarks.length > 0;
              setDetectionStatus({
                faceDetected,
                eyesDetected: faceDetected,
                lookingAtCamera: faceDetected,
                faceCount: 1,
              });
            } else {
              setDetectionStatus({
                faceDetected: false,
                eyesDetected: false,
                lookingAtCamera: false,
                faceCount: 0,
              });
            }
          });

          faceMeshRef.current = faceMesh;
          // console.log("✅ Alternative MediaPipe initialization successful");
          return; // Exit successfully
        }
      } catch (scriptError) {
        console.error("❌ Alternative MediaPipe loading failed:", scriptError);
      }

      // Deduplicated toast informing user about face-detection fallback
      toast.error(
        "Face detection unavailable. Using monitoring without face tracking.",
        { id: "face-detection-unavailable" }
      );

      // Set up a basic fallback detection
      faceMeshRef.current = {
        send: () => {
          // Basic fallback - assume face is present if video is working
          setDetectionStatus({
            faceDetected: true,
            eyesDetected: true,
            lookingAtCamera: true,
            faceCount: 1,
          });
        },
        close: () => {},
      };
    }
  }, [isCalibrating, addWarning]);

  // Enhanced tab switching detection with proper state management
  useEffect(() => {
    if (!enabled) return;

    let warningTimeoutId: NodeJS.Timeout | null = null;

    const handleVisibilityChange = () => {
      // console.log(
      //   "👁️ Visibility changed:",
      //   document.hidden ? "HIDDEN" : "VISIBLE"
      // );

      if (document.hidden) {
        // Tab became hidden
        if (!isTabAwayRef.current) {
          isTabAwayRef.current = true;
          tabSwitchTimeRef.current = Date.now();
          // console.log("⚠️ Tab switched away - issuing immediate warning");
          addWarning("tab-switch");
        }
      } else {
        // Tab became visible again
        const wasAway = isTabAwayRef.current;
        isTabAwayRef.current = false;

        if (warningTimeoutId) {
          clearTimeout(warningTimeoutId);
          warningTimeoutId = null;
        }

        if (wasAway) {
          const awayDuration = Date.now() - tabSwitchTimeRef.current;
          // console.log(`👁️ Tab was away for ${awayDuration}ms`);

          // Also record an additional warning for long away durations
          if (awayDuration > 2000) {
            // console.log("⚠️ Long tab switch violation (additional)");
            addWarning("tab-switch");
          }
        }
      }
    };

    const handleFocus = () => {
      // console.log("🔍 Window focused");
      isTabAwayRef.current = false;

      if (warningTimeoutId) {
        clearTimeout(warningTimeoutId);
        warningTimeoutId = null;
      }
    };

    const handleBlur = () => {
      // console.log("😵‍💫 Window blurred");
      // Treat blur as an immediate tab-away event
      if (!isTabAwayRef.current) {
        isTabAwayRef.current = true;
        tabSwitchTimeRef.current = Date.now();
        // console.log("⚠️ Window blurred - issuing immediate warning");
        addWarning("tab-switch");
      }
    };

    // Enhanced keyboard shortcut prevention
    const handleKeyDown = (e: KeyboardEvent) => {
      // console.log("⌨️ Key pressed:", e.code, {
      //   alt: e.altKey,
      //   ctrl: e.ctrlKey,
      //   shift: e.shiftKey,
      // });

      // Prevent DevTools, split screen, minimize, and other restricted actions
      const blockedKeys = [
        // Tab switching and window management
        e.altKey && e.code === "Tab",
        e.ctrlKey && e.code === "Tab",
        e.ctrlKey && e.shiftKey && e.code === "Tab",
        e.altKey && e.code === "F4", // Close Window

        // DevTools access (all possible combinations)
        e.code === "F12",
        e.ctrlKey && e.shiftKey && e.code === "KeyI", // DevTools
        e.ctrlKey && e.shiftKey && e.code === "KeyJ", // DevTools Console
        e.ctrlKey && e.shiftKey && e.code === "KeyC", // DevTools Inspect
        e.ctrlKey && e.shiftKey && e.code === "KeyK", // DevTools (alternative)
        e.ctrlKey && e.code === "KeyU", // View Source

        // Window management and minimize
        e.metaKey && e.code === "KeyM", // Minimize (Mac)
        e.altKey && e.code === "Space", // Window menu (Windows)
        e.metaKey && e.code === "KeyH", // Hide window (Mac)
        e.metaKey && e.code === "KeyD", // Show desktop (Mac)
        e.metaKey && e.code === "F3", // Mission Control (Mac)

        // Split screen shortcuts
        e.metaKey && e.code === "ArrowLeft", // Snap left (Mac)
        e.metaKey && e.code === "ArrowRight", // Snap right (Mac)
        e.metaKey && e.code === "ArrowUp", // Fullscreen (Mac)
        e.metaKey && e.code === "ArrowDown", // Minimize (Mac)

        // Windows snap shortcuts
        e.metaKey && e.shiftKey && e.code === "ArrowLeft", // Move to left monitor
        e.metaKey && e.shiftKey && e.code === "ArrowRight", // Move to right monitor
        e.metaKey && e.shiftKey && e.code === "ArrowUp", // Maximize vertically
        e.metaKey && e.shiftKey && e.code === "ArrowDown", // Restore/minimize

        // Additional browser and system shortcuts
        e.ctrlKey && e.code === "KeyS", // Save Page
        e.ctrlKey && e.code === "KeyP", // Print
        e.ctrlKey && e.code === "KeyR", // Refresh
        e.ctrlKey && e.shiftKey && e.code === "KeyR", // Hard Refresh
        e.code === "F5", // Refresh
        e.ctrlKey && e.code === "F5", // Hard refresh
        e.ctrlKey && e.shiftKey && e.code === "Delete", // Clear Data
        e.ctrlKey && e.code === "KeyN", // New window
        e.ctrlKey && e.shiftKey && e.code === "KeyN", // New incognito
        e.ctrlKey && e.code === "KeyT", // New tab
        e.ctrlKey && e.shiftKey && e.code === "KeyT", // Reopen closed tab
        e.ctrlKey && e.code === "KeyW", // Close tab

        // Function keys that might cause issues
        e.code === "F1", // Help
        e.code === "F11", // Fullscreen toggle
        e.altKey && e.code === "Enter", // Properties

        // Console access attempts
        e.ctrlKey && e.code === "Semicolon", // Console shortcut in some IDEs
        e.ctrlKey && e.code === "Backquote", // Console toggle in some applications
      ];

      if (blockedKeys.some((blocked) => blocked)) {
        // console.log("🚫 Blocked key combination detected");
        e.preventDefault();
        e.stopPropagation();
        addWarning("tab-switch");
        toast.error("⚠️ This action is not allowed during the interview!");
        return false;
      }
    };

    // Enhanced context menu prevention
    const handleContextMenu = (e: MouseEvent) => {
      // console.log("🖱️ Right-click blocked");
      e.preventDefault();
      e.stopPropagation();
      addWarning("tab-switch");
      toast.error("⚠️ Right-click is disabled during interview!");
      return false;
    };

    // Window resize monitoring to detect split screen attempts
    let initialWindowSize = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;

      // Check for significant size reduction that might indicate split screen or minimize
      const widthReduction =
        (initialWindowSize.width - currentWidth) / initialWindowSize.width;
      const heightReduction =
        (initialWindowSize.height - currentHeight) / initialWindowSize.height;

      // If window size is reduced by more than 25%, it's likely split screen or minimized
      if (widthReduction > 0.25 || heightReduction > 0.25) {
        addWarning("tab-switch");
        toast.error(
          "⚠️ Window resizing/split screen is not allowed during interview!"
        );

        // Try to restore fullscreen
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {
            // Fullscreen request failed, just log the warning
            console.warn("Could not restore fullscreen during interview");
          });
        }
      }
    };

    // Fullscreen exit monitoring
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        // User exited fullscreen
        addWarning("tab-switch");
        toast.error("⚠️ Exiting fullscreen is not allowed during interview!");

        // Try to re-enter fullscreen
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {
            console.warn("Could not re-enter fullscreen during interview");
          });
        }
      }
    };

    // Prevent common minimize actions
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "⚠️ Leaving the interview page is not allowed!";
      addWarning("tab-switch");
      return "⚠️ Leaving the interview page is not allowed!";
    };

    // Request fullscreen on start (optional - can be enabled if desired)
    const requestFullscreen = () => {
      if (
        document.documentElement.requestFullscreen &&
        !document.fullscreenElement
      ) {
        document.documentElement.requestFullscreen().catch(() => {
          console.warn("Could not enter fullscreen mode");
        });
      }
    };

    // Add all event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("resize", handleResize);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("keydown", handleKeyDown, true); // Use capture phase
    document.addEventListener("contextmenu", handleContextMenu, true);

    // Optional: Request fullscreen when monitoring starts
    // requestFullscreen();

    // Cleanup
    return () => {
      if (warningTimeoutId) clearTimeout(warningTimeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("contextmenu", handleContextMenu, true);
    };
  }, [enabled, addWarning]);

  // MediaPipe-powered camera monitoring
  const startCameraMonitoring = useCallback(async () => {
    if (!enabled || isMonitoring) {
      // console.log("📹 Camera start skipped:", { enabled, isMonitoring });
      return;
    }

    // console.log("📹 Starting MediaPipe camera initialization...");

    try {
      // Initialize MediaPipe
      await initializeMediaPipe();

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia not supported");
      }

      // console.log("📹 Requesting camera access...");

      // Get camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
        },
        audio: false,
      });

      // console.log(
      //   "📹 Camera stream obtained:",
      //   stream.getVideoTracks().length,
      //   "video tracks"
      // );

      streamRef.current = stream;
      setHasStream(true);

      // Synchronous cleanup to stop tracks on refresh/unload so camera is released immediately
      try {
        const syncCleanup = () => {
          try {
            if (streamRef.current) {
              streamRef.current.getTracks().forEach((t) => {
                try {
                  t.stop();
                } catch (e) {
                  // ignore
                }
              });
            }
          } catch (e) {
            // ignore
          }
          try {
            forceReleaseAllVideoStreams();
          } catch (e) {
            // ignore
          }
        };

        window.addEventListener("beforeunload", syncCleanup, true);
        window.addEventListener("pagehide", syncCleanup, true);

        // Store for removal when stopping monitoring
        unloadCleanupRef.current = () => {
          try {
            window.removeEventListener("beforeunload", syncCleanup, true);
          } catch (e) {}
          try {
            window.removeEventListener("pagehide", syncCleanup, true);
          } catch (e) {}
        };
      } catch (e) {
        // ignore if window not available
      }

      if (videoRef.current && faceMeshRef.current) {
        // console.log("📹 Setting up video element with MediaPipe...");
        const video = videoRef.current;
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;

        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Video timeout"));
          }, 10000);

          video.onloadedmetadata = () => {
            // console.log("📹 Video metadata loaded:", {
            //   width: video.videoWidth,
            //   height: video.videoHeight,
            //   readyState: video.readyState,
            // });
            clearTimeout(timeout);
            resolve();
          };

          video.onerror = (error) => {
            console.error("Video element error:", error);
            clearTimeout(timeout);
            reject(new Error("Video error"));
          };
        });

        // console.log("📹 Playing video...");
        await video.play();
        // console.log("📹 Video playing successfully");
        setIsMonitoring(true);
        setIsCalibrating(true);

        // End calibration period after 5 seconds
        setTimeout(() => {
          setIsCalibrating(false);
          // console.log("🎯 Calibration period ended - full monitoring active");
        }, 5000);

        // Initialize Camera utility for MediaPipe
        try {
          // console.log("📷 Initializing MediaPipe Camera utility...");
          const CameraModule = await import("@mediapipe/camera_utils");

          // console.log("📦 Camera module loaded:", {
          //   module: CameraModule,
          //   hasDefault: "default" in CameraModule,
          //   hasCamera: "Camera" in CameraModule,
          //   keys: Object.keys(CameraModule),
          //   defaultKeys: CameraModule.default
          //     ? Object.keys(CameraModule.default)
          //     : null,
          // });

          // Helper to resolve constructor from various export shapes
          const resolveCameraConstructor = (mod: any) => {
            if (!mod) return null;
            if (mod.Camera) return mod.Camera;
            if (mod.default?.Camera) return mod.default.Camera;
            if (typeof mod.default === "function") return mod.default;
            if (typeof mod === "function") return mod;

            // Try nested keys in case library wraps exports
            try {
              for (const k of Object.keys(mod)) {
                const v = mod[k];
                if (!v) continue;
                if (v.Camera) return v.Camera;
                if (typeof v === "function") return v;
              }
            } catch (e) {
              // ignore
            }

            // Check window globals (script tag fallback might expose this)
            if ((window as any).Camera) return (window as any).Camera;
            if (
              (window as any).cameraUtils &&
              (window as any).cameraUtils.Camera
            )
              return (window as any).cameraUtils.Camera;
            return null;
          };

          let camera: any = null;
          const CameraConstructor = resolveCameraConstructor(CameraModule);

          if (CameraConstructor && typeof CameraConstructor === "function") {
            try {
              // console.log(
              //   "✅ Camera constructor resolved, creating instance..."
              // );
              camera = new CameraConstructor(video, {
                onFrame: async () => {
                  if (
                    faceMeshRef.current &&
                    typeof faceMeshRef.current.send === "function"
                  ) {
                    try {
                      await faceMeshRef.current.send({ image: video });
                    } catch (sendError) {
                      console.error(
                        "Error sending frame to FaceMesh:",
                        sendError
                      );
                    }
                  }
                },
                width: 640,
                height: 480,
              });

              // start may be async or sync
              if (typeof camera.start === "function") {
                await camera.start();
              }
              cameraRef.current = camera;
              // console.log("✅ MediaPipe Camera started successfully");
            } catch (instErr) {
              console.error(
                "❌ Error instantiating Camera constructor:",
                instErr
              );
              camera = null;
            }
          } else {
            // console.warn(
            //   "⚠️ Camera constructor not resolved; will use manual frame processing fallback."
            // );
          }

          // If camera wasn't created, fallback to manual frame processing
          if (!camera) {
            // console.log("🔄 Using manual frame processing fallback...");

            const processFrame = () => {
              if (
                faceMeshRef.current &&
                video.readyState >= 2 &&
                typeof faceMeshRef.current.send === "function"
              ) {
                try {
                  faceMeshRef.current.send({ image: video });
                } catch (sendError) {
                  console.error(
                    "❌ Error in manual frame processing:",
                    sendError
                  );
                }
              }

              // Continue processing until explicitly stopped
              if (cameraRef.current !== null) {
                requestAnimationFrame(processFrame);
              }
            };

            // marker object with stop method to signal loop termination
            cameraRef.current = {
              stop: () => {
                cameraRef.current = null;
              },
            };
            requestAnimationFrame(processFrame);
          }
        } catch (cameraError) {
          console.error(
            "❌ Failed to initialize MediaPipe Camera:",
            cameraError
          );

          // Fallback: Use requestAnimationFrame for manual frame processing
          // console.log(
          //   "🔄 Using manual frame processing fallback due to error..."
          // );

          const processFrame = () => {
            if (
              faceMeshRef.current &&
              video.readyState >= 2 &&
              typeof faceMeshRef.current.send === "function"
            ) {
              try {
                faceMeshRef.current.send({ image: video });
              } catch (sendError) {
                console.error(
                  "❌ Error in manual frame processing:",
                  sendError
                );
              }
            }

            if (cameraRef.current !== null) {
              // Continue if not stopped
              requestAnimationFrame(processFrame);
            }
          };

          // Start manual processing
          cameraRef.current = {
            stop: () => {
              cameraRef.current = null;
            },
          };
          requestAnimationFrame(processFrame);
        }

        // console.log("📹 MediaPipe camera monitoring started successfully");
        // Start a watchdog to detect if FaceMesh isn't producing results
        const watchdogInterval = setInterval(() => {
          try {
            const last = lastResultTimeRef.current;
            if (!last) {
              // no results yet: warn after initial 5s (but only once)
              if (
                !noResultsWarnedRef.current &&
                Date.now() - (streamRef.current ? Date.now() : 0) > 5000
              ) {
                noResultsWarnedRef.current = true;
                toast.error(
                  "Face detection not producing results. Please check camera/permissions.",
                  { id: "face-results-watchdog" }
                );
              }
              return;
            }
            if (Date.now() - last > 5000) {
              if (!noResultsWarnedRef.current) {
                noResultsWarnedRef.current = true;
                toast.error(
                  "Face detection inactive — make sure camera view is clear.",
                  { id: "face-results-inactive" }
                );
              }
            }
          } catch (e) {
            // ignore watchdog errors
          }
        }, 2000);

        // Store cleanup so it can be cleared on stopCameraMonitoring
        const oldUnload = unloadCleanupRef.current;
        unloadCleanupRef.current = () => {
          try {
            clearInterval(watchdogInterval);
          } catch (e) {}
          if (oldUnload) oldUnload();
        };
      } else {
        console.error("❌ Video element or MediaPipe not ready");
        setHasStream(false);
        throw new Error("Video element or MediaPipe not found");
      }
    } catch (error) {
      console.error("❌ Camera error:", error);

      const errorName = (error as any)?.name || "";
      console.warn("⚠️ Camera initialization failed:", errorName);

      // Set hasStream to false on error
      setHasStream(false);

      // Provide specific error messages for different camera issues
      if (errorName === "NotAllowedError") {
        toast.error(
          "📷 Camera permission denied. Please allow camera access and retry.",
          { id: "camera-permission-denied" }
        );
      } else if (errorName === "NotFoundError") {
        toast.error("📷 No camera found. Please connect a camera and retry.", {
          id: "camera-not-found",
        });
      } else if (errorName === "NotReadableError") {
        toast.error(
          "📷 Camera is being used by another application. Please close other apps and retry.",
          { id: "camera-in-use" }
        );
      } else {
        toast.error(
          "📷 Camera access failed. Please check your camera settings and retry.",
          { id: "camera-access-failed" }
        );
      }

      setIsMonitoring(true); // Enable tab monitoring anyway
    }
  }, [enabled, initializeMediaPipe]); // Add initializeMediaPipe dependency

  const stopCameraMonitoring = useCallback(() => {
    // console.log("🛑 Stopping MediaPipe camera monitoring...");

    // Prevent re-entrant calls
    if (isStoppingRef.current) {
      // console.log("🛑 stopCameraMonitoring already running, skipping re-entry");
      return;
    }
    isStoppingRef.current = true;

    // Stop MediaPipe camera
    try {
      // (pre-stop debug logs removed)
      if (cameraRef.current && typeof cameraRef.current.stop === "function") {
        try {
          cameraRef.current.stop();
        } catch (e) {
          console.warn("⚠️ Error stopping cameraRef:", e);
        }
        cameraRef.current = null;
      }

      // Clear MediaPipe FaceMesh
      if (faceMeshRef.current) {
        try {
          if (typeof faceMeshRef.current.close === "function") {
            faceMeshRef.current.close();
          }
        } catch (e) {
          console.warn("⚠️ Error closing faceMeshRef:", e);
        }
        faceMeshRef.current = null;
      }

      if (lookAwayTimeoutRef.current) {
        clearTimeout(lookAwayTimeoutRef.current);
        lookAwayTimeoutRef.current = null;
      }

      if (streamRef.current) {
        try {
          streamRef.current
            .getTracks()
            .forEach((track: MediaStreamTrack) => track.stop());
        } catch (e) {
          console.warn("⚠️ Error stopping stream tracks:", e);
        }
        streamRef.current = null;
      }

      // Remove synchronous unload handlers if registered
      try {
        if (unloadCleanupRef.current) {
          unloadCleanupRef.current();
          unloadCleanupRef.current = null;
        }
      } catch (e) {
        // ignore
      }

      // Also defensively clear any video element streams that might still exist
      try {
        forceReleaseAllVideoStreams();
      } catch (e) {
        // ignore
      }

      // (post-stop debug logs removed)

      // Only update React state when the new value differs from the current one
      if (isMonitoringRef.current) {
        setIsMonitoring(false);
      }
      if (hasStreamRef.current) {
        setHasStream(false);
      }
      // Always reset calibration flag so next start can recalibrate
      setIsCalibrating(true); // Reset calibration for next time
      setDetectionStatus((prev) => {
        if (
          prev.faceDetected === false &&
          prev.eyesDetected === false &&
          prev.lookingAtCamera === false
        ) {
          return prev; // no change
        }
        return {
          faceDetected: false,
          eyesDetected: false,
          lookingAtCamera: false,
          faceCount: 0,
        };
      });
    } catch (e) {
      console.error("❌ Error during stopCameraMonitoring:", e);
    } finally {
      isStoppingRef.current = false;
    }
  }, []); // No dependencies to avoid loops

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      // Direct cleanup without calling the callback
      try {
        if (cameraRef.current && typeof cameraRef.current.stop === "function") {
          cameraRef.current.stop();
        }
      } catch (e) {
        console.warn("⚠️ Error stopping camera on unmount:", e);
      }

      try {
        if (
          faceMeshRef.current &&
          typeof faceMeshRef.current.close === "function"
        ) {
          faceMeshRef.current.close();
        }
      } catch (e) {
        console.warn("⚠️ Error closing faceMesh on unmount:", e);
      }

      if (lookAwayTimeoutRef.current) {
        clearTimeout(lookAwayTimeoutRef.current);
      }

      if (streamRef.current) {
        try {
          streamRef.current
            .getTracks()
            .forEach((track: MediaStreamTrack) => track.stop());
        } catch (e) {
          console.warn("⚠️ Error stopping stream tracks on unmount:", e);
        }
      }
      try {
        forceReleaseAllVideoStreams();
      } catch (e) {
        // ignore
      }
      try {
        if (unloadCleanupRef.current) {
          unloadCleanupRef.current();
          unloadCleanupRef.current = null;
        }
      } catch (e) {
        // ignore
      }
    };
  }, []); // Empty dependency array for cleanup only

  return {
    warningCount,
    isMonitoring,
    detectionStatus,
    videoRef,
    canvasRef,
    startCameraMonitoring,
    stopCameraMonitoring,
    hasStream,
    isCalibrating,
  };
};
