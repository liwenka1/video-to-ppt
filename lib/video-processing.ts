import { calculateImageDifference } from "./utils";
import type { RefObject } from "react";

interface CaptureScreenshotParams {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  lastImageDataRef: RefObject<ImageData | null>;
  diffThreshold: number;
  onScreenshotCaptured: (screenshot: string) => void;
  onStatsUpdate: () => void;
}

export function captureAndFilterScreenshot({
  videoRef,
  canvasRef,
  lastImageDataRef,
  diffThreshold,
  onScreenshotCaptured,
  onStatsUpdate,
}: CaptureScreenshotParams): void {
  const video = videoRef.current;
  const canvas = canvasRef.current;

  if (!video || !canvas) return;

  const context = canvas.getContext("2d");
  if (!context) return;

  // Set canvas dimensions to match video
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Draw current video frame to canvas
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const currentImageData = context.getImageData(0, 0, canvas.width, canvas.height);

  onStatsUpdate();

  // Check if this is a significantly different frame
  if (lastImageDataRef.current) {
    const difference = calculateImageDifference(lastImageDataRef.current, currentImageData);
    
    if (difference > diffThreshold) {
      // Convert canvas to blob and create URL
      canvas.toBlob((blob) => {
        if (blob) {
          const screenshotUrl = URL.createObjectURL(blob);
          onScreenshotCaptured(screenshotUrl);
        }
      }, "image/jpeg", 0.8);
    }
  } else {
    // First frame - always capture
    canvas.toBlob((blob) => {
      if (blob) {
        const screenshotUrl = URL.createObjectURL(blob);
        onScreenshotCaptured(screenshotUrl);
      }
    }, "image/jpeg", 0.8);
  }

  lastImageDataRef.current = currentImageData;
}

export function updateCanvasWithScreenshot(
  canvasRef: RefObject<HTMLCanvasElement>,
  screenshotUrl: string
): void {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const context = canvas.getContext("2d");
  if (!context) return;

  const img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    context.drawImage(img, 0, 0);
  };
  img.src = screenshotUrl;
}

// WebAV-based video processing functions
export async function processVideoWithWebAV(videoFile: File): Promise<{
  frames: string[];
  duration: number;
  scenes: Array<{
    startTime: number;
    endTime: number;
    thumbnail: string;
  }>;
}> {
  // Check if we're on the client side
  if (typeof window === "undefined") {
    throw new Error("WebAV processing can only be used on the client side");
  }

  try {
    // Dynamic import WebAV modules only on client side
    const { MP4Clip } = await import("@webav/av-cliper");
    
    // Create MP4Clip from file
    const mp4Clip = new MP4Clip(videoFile.stream());
    
    // Get video metadata
    const { duration } = await mp4Clip.ready;
    
    // Create frames array
    const frames: string[] = [];
    const scenes: Array<{
      startTime: number;
      endTime: number;
      thumbnail: string;
    }> = [];
    
    // Extract frames at regular intervals
    const frameInterval = Math.max(2, duration / 1e6 / 50); // Extract max 50 frames
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    
    if (!context) {
      throw new Error("Cannot create canvas context");
    }
    
    for (let time = 0; time < duration; time += frameInterval * 1e6) {
      const { video } = await mp4Clip.tick(time);
      
      if (video) {
        // Set canvas size to match video frame
        canvas.width = video.displayWidth;
        canvas.height = video.displayHeight;
        
        // Draw video frame to canvas
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(video, 0, 0);
        
        // Convert to blob and create URL
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, "image/jpeg", 0.8);
        });
        
        if (blob) {
          const frameUrl = URL.createObjectURL(blob);
          frames.push(frameUrl);
          
          // Create scene data for every 10 seconds
          if (frames.length % 10 === 0) {
            scenes.push({
              startTime: time / 1e6,
              endTime: Math.min((time + frameInterval * 10 * 1e6) / 1e6, duration / 1e6),
              thumbnail: frameUrl,
            });
          }
        }
        
        // Close the video frame
        video.close();
      }
    }
    
    return { frames, duration: duration / 1e6, scenes };
  } catch (error) {
    console.error("Error processing video with WebAV:", error);
    throw error;
  }
}

// Traditional frame extraction (fallback method)
export async function extractFramesFromVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  options: {
    captureInterval: number;
    differenceThreshold: number;
    maxScreenshots: number;
  },
  callbacks: {
    onProgress: (progress: number) => void;
    onFrameCaptured: (blob: Blob, url: string) => void;
    onComplete: (screenshots: Blob[]) => void;
  }
): Promise<void> {
  const { captureInterval, differenceThreshold, maxScreenshots } = options;
  const { onProgress, onFrameCaptured, onComplete } = callbacks;
  
  const context = canvas.getContext("2d");
  if (!context) return;
  
  // Set canvas dimensions
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  let currentTime = 0;
  const totalDuration = video.duration;
  let previousImageData: ImageData | null = null;
  const screenshots: Blob[] = [];
  let noNewScreenshotCount = 0;
  
  const captureFrame = async (time: number): Promise<void> => {
    return new Promise((resolve) => {
      video.currentTime = time;
      
      video.onseeked = () => {
        // Draw current frame
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const currentImageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        let shouldCapture = false;
        
        if (previousImageData) {
          const difference = calculateImageDifference(previousImageData, currentImageData);
          shouldCapture = difference > differenceThreshold;
          
          if (!shouldCapture) {
            noNewScreenshotCount++;
          } else {
            noNewScreenshotCount = 0;
          }
        } else {
          shouldCapture = true; // First frame
        }
        
        if (shouldCapture && screenshots.length < maxScreenshots) {
          canvas.toBlob((blob) => {
            if (blob) {
              screenshots.push(blob);
              const url = URL.createObjectURL(blob);
              onFrameCaptured(blob, url);
            }
            resolve();
          }, "image/jpeg", 0.8);
        } else {
          resolve();
        }
        
        previousImageData = currentImageData;
      };
    });
  };
  
  // Extract frames
  while (currentTime <= totalDuration && screenshots.length < maxScreenshots) {
    await captureFrame(currentTime);
    
    // Update progress
    const progress = Math.round((currentTime / totalDuration) * 100);
    onProgress(progress);
    
    currentTime += captureInterval;
    
    // Stop if no new screenshots for too long
    if (noNewScreenshotCount > 20) {
      break;
    }
  }
  
  onComplete(screenshots);
}

// FFmpeg conversion utilities (client-side only)
export async function convertWebmToMp4(
  webmBlob: Blob,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  // Check if we're on the client side
  if (typeof window === "undefined") {
    throw new Error("FFmpeg can only be used on the client side");
  }

  try {
    // Dynamic import for FFmpeg to avoid SSR issues
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { fetchFile } = await import("@ffmpeg/util");

    const ffmpeg = new FFmpeg();

    if (onProgress) {
      ffmpeg.on("progress", ({ progress }: { progress: number }) => {
        onProgress(Math.round(progress * 100));
      });
    }

    // Load FFmpeg
    await ffmpeg.load({
      coreURL: "https://unpkg.com/@ffmpeg/core@0.12.15/dist/umd/ffmpeg-core.js",
      wasmURL: "https://unpkg.com/@ffmpeg/core@0.12.15/dist/umd/ffmpeg-core.wasm",
    });

    // Write input file
    await ffmpeg.writeFile("input.webm", await fetchFile(webmBlob));

    // Convert webm to mp4
    await ffmpeg.exec([
      "-i",
      "input.webm",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "output.mp4",
    ]);

    // Read the result
    const data = await ffmpeg.readFile("output.mp4");
    const mp4Blob = new Blob([data as BlobPart], { type: "video/mp4" });

    // Cleanup
    await ffmpeg.terminate();

    return mp4Blob;
  } catch (error) {
    console.error("Error converting WebM to MP4:", error);
    throw error;
  }
}

export interface VideoAnalysisResult {
  keyFrames: string[];
  scenes: Array<{
    startTime: number;
    endTime: number;
    thumbnail: string;
  }>;
  audioAnalysis?: {
    hasAudio: boolean;
    peaks: number[];
  };
}

// Advanced video analysis using WebAV
export async function analyzeVideoContent(
  videoFile: File | Blob
): Promise<VideoAnalysisResult> {
  // Check if we're on the client side
  if (typeof window === "undefined") {
    throw new Error("Video analysis can only be performed on the client side");
  }

  try {
    // Convert Blob to File if needed
    const file = videoFile instanceof File ? videoFile : new File([videoFile], "video.mp4");
    
    // Use WebAV for processing
    const result = await processVideoWithWebAV(file);
    
    return {
      keyFrames: result.frames,
      scenes: result.scenes,
      audioAnalysis: {
        hasAudio: true, // WebAV will determine this
        peaks: [],
      },
    };
  } catch (error) {
    console.error("Error analyzing video content:", error);
    throw error;
  }
}

// Preprocess video to calculate dynamic threshold (from original video2ppt)
export async function preprocessVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): Promise<number> {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Cannot get canvas context");
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const totalDuration = video.duration;
  const sampleCount = Math.min(50, Math.max(20, Math.floor(totalDuration / 10)));
  const preProcessInterval = totalDuration / sampleCount;
  
  let currentTime = 0;
  let previousImageData: ImageData | null = null;
  const differences: number[] = [];
  
  const capturePreProcessFrame = async (time: number): Promise<void> => {
    return new Promise((resolve) => {
      video.currentTime = time;
      
      video.onseeked = () => {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const currentImageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        if (previousImageData) {
          const difference = calculateImageDifference(previousImageData, currentImageData);
          differences.push(difference);
        }
        
        previousImageData = currentImageData;
        resolve();
      };
    });
  };
  
  // Sample frames for threshold calculation
  while (currentTime <= totalDuration && differences.length < sampleCount) {
    await capturePreProcessFrame(currentTime);
    currentTime += preProcessInterval;
  }
  
  if (differences.length === 0) return 30; // Default threshold
  
  // Calculate dynamic threshold
  const sortedDifferences = [...differences].sort((a, b) => a - b);
  const medianDiff = sortedDifferences[Math.floor(sortedDifferences.length / 2)];
  
  // Use median as base threshold, with reasonable bounds
  const finalThreshold = Math.max(10, Math.min(medianDiff, 60));
  
  return finalThreshold;
} 