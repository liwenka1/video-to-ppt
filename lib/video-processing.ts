import type { RefObject } from "react";

import { calculateImageDifference } from "./utils";

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
			canvas.toBlob(
				(blob) => {
					if (blob) {
						const screenshotUrl = URL.createObjectURL(blob);
						onScreenshotCaptured(screenshotUrl);
					}
				},
				"image/jpeg",
				0.8
			);
		}
	} else {
		// First frame - always capture
		canvas.toBlob(
			(blob) => {
				if (blob) {
					const screenshotUrl = URL.createObjectURL(blob);
					onScreenshotCaptured(screenshotUrl);
				}
			},
			"image/jpeg",
			0.8
		);
	}

	lastImageDataRef.current = currentImageData;
}

export function updateCanvasWithScreenshot(canvasRef: RefObject<HTMLCanvasElement>, screenshotUrl: string): void {
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
					canvas.toBlob(
						(blob) => {
							if (blob) {
								screenshots.push(blob);
								const url = URL.createObjectURL(blob);
								onFrameCaptured(blob, url);
							}
							resolve();
						},
						"image/jpeg",
						0.8
					);
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
export async function convertToMp4(
	inputBlob: Blob,
	onProgress?: (progress: number) => void,
	inputFormat?: string
): Promise<Blob> {
	// Check if we're on the client side
	if (typeof window === "undefined") {
		throw new Error("FFmpeg can only be used on the client side");
	}

	try {
		// Dynamic import for FFmpeg to avoid SSR issues
		const { FFmpeg } = await import("@ffmpeg/ffmpeg");
		const { fetchFile, toBlobURL } = await import("@ffmpeg/util");

		const ffmpeg = new FFmpeg();

		// Enhanced logging and progress parsing
		
		ffmpeg.on("log", ({ message }) => {
			console.log("FFmpeg log:", message);
			
			// Simple activity indicator instead of complex progress calculation
			if (message.includes("frame=") && onProgress) {
				const frameMatch = message.match(/frame=\s*(\d+)/);
				if (frameMatch) {
					frameCount = parseInt(frameMatch[1]);
					
					// Simple activity indicator - just show we're working
					// Progress stages: 20% -> 40% -> 60% -> 80% based on activity
					const now = Date.now();
					if (now - lastProgressUpdate > 2000) { // Update every 2 seconds
						if (frameCount > 0 && frameCount < 100) {
							onProgress(20); // Starting
						} else if (frameCount >= 100 && frameCount < 300) {
							onProgress(40); // Processing
						} else if (frameCount >= 300 && frameCount < 600) {
							onProgress(60); // Continuing
						} else if (frameCount >= 600) {
							onProgress(80); // Almost done
						}
						lastProgressUpdate = now;
						console.log(`Processing frames: ${frameCount}`);
					}
				}
			}
		});

		if (onProgress) {
			ffmpeg.on("progress", ({ progress }: { progress: number }) => {
				// Fallback progress handling if the log parsing doesn't work
				const progressPercent =
					typeof progress === "number" && isFinite(progress)
						? Math.max(0, Math.min(100, Math.round(progress * 100)))
						: 0;
				if (progressPercent > 0) {
					onProgress(progressPercent);
				}
			});
		}

		// Load FFmpeg with enhanced error handling
		console.log("Loading FFmpeg...");
		const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
		
		try {
			await ffmpeg.load({
				coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
				wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
			});
		} catch (loadError) {
			console.error("Failed to load from unpkg, trying alternative CDN...");
			// Fallback to alternative CDN
			const altBaseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";
			await ffmpeg.load({
				coreURL: await toBlobURL(`${altBaseURL}/ffmpeg-core.js`, "text/javascript"),
				wasmURL: await toBlobURL(`${altBaseURL}/ffmpeg-core.wasm`, "application/wasm"),
			});
		}

		console.log("FFmpeg loaded successfully");

		// Enhanced format detection
		const inputExt = inputFormat || getExtensionFromMime(inputBlob.type) || getExtensionFromBlob(inputBlob) || "webm";
		const inputFileName = `input.${inputExt}`;
		const outputFileName = "output.mp4";

		console.log(`Converting ${inputFileName} to ${outputFileName}, size: ${inputBlob.size} bytes`);
		
		// Performance monitoring
		const startTime = Date.now();

		// Initialize duration tracking variables in outer scope
		let totalDuration: number | null = null;
		let estimatedDuration: number | null = null;
		let lastCurrentTime = 0;
		let frameCount = 0;
		let lastProgressUpdate = 0;

		// Try to get video metadata from blob before conversion
		try {
			const videoElement = document.createElement('video');
			const blobUrl = URL.createObjectURL(inputBlob);
			videoElement.src = blobUrl;
			
			await new Promise<void>((resolve) => {
				videoElement.addEventListener('loadedmetadata', () => {
					if (videoElement.duration && isFinite(videoElement.duration)) {
						totalDuration = videoElement.duration;
						console.log(`Video duration from metadata: ${totalDuration} seconds`);
					}
					URL.revokeObjectURL(blobUrl);
					resolve();
				});
				
				videoElement.addEventListener('error', () => {
					console.log('Could not load video metadata, will estimate during conversion');
					URL.revokeObjectURL(blobUrl);
					resolve();
				});
				
				// Timeout after 2 seconds
				setTimeout(() => {
					console.log('Metadata loading timeout, proceeding with conversion');
					URL.revokeObjectURL(blobUrl);
					resolve();
				}, 2000);
			});
		} catch (error) {
			console.log('Error getting video metadata:', error);
		}

		// Write input file
		await ffmpeg.writeFile(inputFileName, await fetchFile(inputBlob));

		// Strategy: Try copy first for maximum speed, simple fallback if needed
		const timeoutPromise = new Promise((_, reject) => {
			setTimeout(() => reject(new Error("Conversion timeout after 5 minutes")), 5 * 60 * 1000);
		});

		// First attempt: Try copy for maximum speed
		let copyCommand = ["-i", inputFileName, "-c", "copy", "-movflags", "+faststart", "-f", "mp4", outputFileName];
		
		console.log(`⚡ Trying fast copy:`, copyCommand.join(" "));

		let copySucceeded = false;
		try {
			const copyPromise = ffmpeg.exec(copyCommand);
			await Promise.race([copyPromise, timeoutPromise]);
			copySucceeded = true;
			console.log("✅ Copy conversion succeeded!");
		} catch (copyError) {
			console.log("❌ Copy failed, falling back to re-encoding...");
		}

		// If copy failed, use simple re-encoding
		if (!copySucceeded) {
			// Simple, fast re-encoding as fallback
			let fallbackCommand = [
				"-i", inputFileName,
				"-c:v", "libx264",
				"-preset", "fast",
				"-crf", "23",
				"-c:a", "aac",
				"-b:a", "128k",
				"-movflags", "+faststart",
				outputFileName
			];
			
			console.log(`🔄 Re-encoding fallback:`, fallbackCommand.join(" "));

			try {
				const conversionPromise = ffmpeg.exec(fallbackCommand);
				await Promise.race([conversionPromise, timeoutPromise]);
				console.log("✅ Fallback conversion succeeded!");
			} catch (error) {
				console.log("❌ Fallback failed:", error);
				throw error;
			}
		}

		// Read the result
		const data = await ffmpeg.readFile(outputFileName);
		
		if (!data || (data as Uint8Array).length === 0) {
			throw new Error("Conversion produced empty output");
		}

		const mp4Blob = new Blob([data as BlobPart], { type: "video/mp4" });

		// Final progress update
		if (onProgress) {
			onProgress(100);
			console.log("Progress: 100% (conversion completed)");
		}

		const endTime = Date.now();
		const conversionTime = (endTime - startTime) / 1000;
		const compressionRatio = ((inputBlob.size - mp4Blob.size) / inputBlob.size * 100).toFixed(1);
		
		console.log(`Conversion completed in ${conversionTime.toFixed(1)}s`);
		console.log(`Input: ${(inputBlob.size / 1024 / 1024).toFixed(2)}MB → Output: ${(mp4Blob.size / 1024 / 1024).toFixed(2)}MB`);
		console.log(`Compression: ${compressionRatio}% size reduction`);

		// Cleanup
		try {
			await ffmpeg.deleteFile(inputFileName);
			await ffmpeg.deleteFile(outputFileName);
		} catch (cleanupError) {
			console.warn("Cleanup error:", cleanupError);
		}

		await ffmpeg.terminate();

		return mp4Blob;
	} catch (error) {
		console.error("Error converting to MP4:", error);
		
		// Enhanced error messages
		if (error instanceof Error) {
			if (error.message.includes("SharedArrayBuffer")) {
				throw new Error("浏览器不支持SharedArrayBuffer，请在HTTPS环境下使用或启用相关浏览器特性");
			} else if (error.message.includes("network")) {
				throw new Error("网络错误：无法下载FFmpeg组件，请检查网络连接");
			} else if (error.message.includes("memory")) {
				throw new Error("内存不足：文件太大，请尝试较小的文件或刷新页面重试");
			} else if (error.message.includes("timeout")) {
				throw new Error("转换超时：文件处理时间过长，请尝试较小的文件");
			}
		}
		
		throw error;
	}
}

// Enhanced helper to get file extension from MIME type
function getExtensionFromMime(mimeType: string): string | null {
	const mimeMap: Record<string, string> = {
		"video/webm": "webm",
		"video/quicktime": "mov",
		"video/x-msvideo": "avi",
		"video/mp4": "mp4",
		"video/x-matroska": "mkv",
		"video/3gpp": "3gp",
		"video/x-flv": "flv",
		"video/x-ms-wmv": "wmv",
		"video/ogg": "ogv",
		"video/x-ms-asf": "asf",
		"video/x-f4v": "f4v",
		"video/x-m4v": "m4v",
		"audio/mp4": "m4a",
		"audio/webm": "weba",
		"audio/ogg": "ogg",
		"audio/mpeg": "mp3",
		"audio/wav": "wav",
		"audio/x-flac": "flac",
		"audio/aac": "aac",
	};

	return mimeMap[mimeType.toLowerCase()] || null;
}

// New helper to detect format from file content
function getExtensionFromBlob(blob: Blob): string | null {
	// This is a basic implementation - in a real scenario, you might want to read file headers
	const name = (blob as any).name;
	if (name && typeof name === 'string') {
		const ext = name.split('.').pop()?.toLowerCase();
		if (ext) return ext;
	}
	return null;
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
export async function analyzeVideoContent(videoFile: File | Blob): Promise<VideoAnalysisResult> {
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
export async function preprocessVideo(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<number> {
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
