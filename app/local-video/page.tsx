"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
	AlertCircle,
	ArrowLeft,
	CheckCircle,
	Download,
	Eye,
	FileVideo,
	Images,
	Loader2,
	RotateCcw,
	Upload,
	Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { createAndDownloadPPT } from "@/lib/ppt-generation";
import { formatTime } from "@/lib/utils";
import { diagnoseVideoFile, generateDiagnosticReport } from "@/lib/video-diagnostics";
import { convertToMp4, extractFramesFromVideo, preprocessVideo } from "@/lib/video-processing";

type ProcessingState = "idle" | "uploading" | "analyzing" | "extracting" | "completed" | "error" | "converting";

const LocalVideoPage = () => {
	// File and video state
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [videoUrl, setVideoUrl] = useState<string>("");
	const [processingState, setProcessingState] = useState<ProcessingState>("idle");
	const [progress, setProgress] = useState<number>(0);
	const [error, setError] = useState<string>("");

	// Video analysis results
	const [screenshots, setScreenshots] = useState<string[]>([]);
	const [videoMetadata, setVideoMetadata] = useState<{
		duration: number;
		width: number;
		height: number;
		size: number;
	} | null>(null);

	// Refs
	const fileInputRef = useRef<HTMLInputElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	// Enhanced format checking
	const isMP4Format = useCallback((file: File): boolean => {
		return file.type === "video/mp4" || file.name.toLowerCase().endsWith(".mp4");
	}, []);

	// Check if format is supported for conversion
	const isSupportedFormat = useCallback((file: File): boolean => {
		const supportedTypes = [
			"video/mp4",
			"video/webm",
			"video/quicktime",
			"video/x-msvideo",
			"video/x-matroska",
			"video/3gpp",
			"video/x-flv",
			"video/x-ms-wmv",
			"video/ogg",
			"video/x-ms-asf",
			"video/x-f4v",
			"video/x-m4v",
		];
		const supportedExtensions = [
			".mp4",
			".webm",
			".mov",
			".avi",
			".mkv",
			".3gp",
			".flv",
			".wmv",
			".ogv",
			".asf",
			".f4v",
			".m4v",
		];

		const fileName = file.name.toLowerCase();
		return supportedTypes.includes(file.type) || supportedExtensions.some((ext) => fileName.endsWith(ext));
	}, []);

	// Get video metadata
	const getVideoMetadata = useCallback((file: File, url: string) => {
		const video = document.createElement("video");
		video.preload = "metadata";

		video.onloadedmetadata = () => {
			setVideoMetadata({
				duration: video.duration,
				width: video.videoWidth,
				height: video.videoHeight,
				size: file.size,
			});
			setProcessingState("idle");
		};

		video.onerror = () => {
			setError("无法读取视频文件信息");
			setProcessingState("error");
		};

		video.src = url;
	}, []);

	// Convert non-MP4 video to MP4 format
	const convertVideoToMp4 = useCallback(async (file: File): Promise<File> => {
		setProcessingState("converting");
		setProgress(0);

		try {
			console.log(`Converting ${file.name} to MP4...`);

			// Get file extension for format detection
			const fileExtension = file.name.split(".").pop()?.toLowerCase();

			// Convert using copy-first strategy
			const convertedBlob = await convertToMp4(
				file,
				(progressValue) => {
					// Simple progress indicator
					const validProgress = Math.max(0, Math.min(100, Math.round(progressValue || 0)));
					console.log(`Conversion activity: ${validProgress}%`);
					setProgress(validProgress);
				},
				fileExtension
			);

			// Create new file with MP4 extension
			const convertedFileName = file.name.replace(/\.[^/.]+$/, "_converted.mp4");
			const convertedFile = new File([convertedBlob], convertedFileName, {
				type: "video/mp4",
			});

			console.log(`Conversion completed: ${convertedFile.name}`);
			return convertedFile;
		} catch (error) {
			console.error("Error converting video:", error);

			// Generate diagnostic report for troubleshooting
			const diagnosticReport = generateDiagnosticReport(file);
			console.error("Diagnostic Report:", diagnosticReport);

			// User-friendly error message based on diagnostic
			const videoInfo = diagnoseVideoFile(file);
			let errorMessage = "视频格式转换失败";

			if (!videoInfo.isSupported) {
				errorMessage = `不支持的视频格式：${videoInfo.detectedFormat}。请使用支持的格式。`;
			} else if (videoInfo.recommendations.length > 0) {
				errorMessage = `转换失败。建议：${videoInfo.recommendations[0]}`;
			}

			throw new Error(errorMessage);
		}
	}, []);

	// Handle file selection
	const handleFileSelect = useCallback(
		async (file: File) => {
			// Validate file type
			if (!file.type.startsWith("video/") && !isSupportedFormat(file)) {
				setError("请选择有效的视频文件格式");
				return;
			}

			// Check if format is supported
			if (!isSupportedFormat(file)) {
				setError(`不支持的视频格式：${file.name.split(".").pop()}。支持的格式：MP4, WebM, MOV, AVI, MKV, WMV等`);
				return;
			}

			// Validate file size (200MB limit with ultra-fast conversion optimizations)
			const maxSize = 200 * 1024 * 1024; // 200MB with speed optimizations
			if (file.size > maxSize) {
				setError("文件大小不能超过200MB（已启用速度优化模式）");
				return;
			}

			// Reset states
			setError("");
			setProgress(0);
			setScreenshots([]);
			setVideoMetadata(null);
			setVideoUrl(""); // Clear previous video URL

			setSelectedFile(file);
			setProcessingState("uploading");

			try {
				let finalFile = file;

				// Diagnose file format and show information
				const videoInfo = diagnoseVideoFile(file);
				console.log("Video diagnosis:", videoInfo);

				// Check if file is MP4, if not convert it
				if (!isMP4Format(file)) {
					console.log("Non-MP4 format detected, converting to MP4...");
					setError(`检测到${videoInfo.detectedFormat}格式，正在转换为MP4（优先copy，快速转换）...`);

					finalFile = await convertVideoToMp4(file);
					setSelectedFile(finalFile);
					setError(""); // Clear conversion message

					console.log("Ultra-fast format conversion completed successfully");
				}

				// Create video URL for preview only after conversion is complete
				const url = URL.createObjectURL(finalFile);
				setVideoUrl(url);

				// Get video metadata
				getVideoMetadata(finalFile, url);
			} catch (error) {
				console.error("Error processing file:", error);
				setError(error instanceof Error ? error.message : "文件处理失败");
				setProcessingState("error");
				// Ensure video URL is cleared on error
				setVideoUrl("");
			}
		},
		[isSupportedFormat, isMP4Format, convertVideoToMp4, getVideoMetadata]
	);

	// Handle drag and drop
	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();

			const files = e.dataTransfer.files;
			if (files.length > 0) {
				handleFileSelect(files[0]);
			}
		},
		[handleFileSelect]
	);

	// Process video using traditional method with WebAV enhancements
	const handleProcessVideo = useCallback(async () => {
		if (!selectedFile || !videoRef.current || !canvasRef.current) return;

		try {
			setProcessingState("analyzing");
			setProgress(0);
			setScreenshots([]);

			const video = videoRef.current;
			const canvas = canvasRef.current;

			// Wait for video to be ready
			if (video.readyState < 2) {
				await new Promise<void>((resolve, reject) => {
					video.onloadedmetadata = () => resolve();
					video.onerror = () => reject(new Error("Video load failed"));
				});
			}

			// Preprocess to get dynamic threshold
			setProcessingState("analyzing");
			const dynamicThreshold = await preprocessVideo(video, canvas);

			console.log(`Using dynamic threshold: ${dynamicThreshold}`);

			setProcessingState("extracting");

			// Extract frames using the traditional method with improvements
			await extractFramesFromVideo(
				video,
				canvas,
				{
					captureInterval: 3, // Capture every 3 seconds
					differenceThreshold: dynamicThreshold,
					maxScreenshots: 256,
				},
				{
					onProgress: (progressPercent) => {
						setProgress(progressPercent);
					},
					onFrameCaptured: (blob, url) => {
						setScreenshots((prev) => [...prev, url]);
					},
					onComplete: () => {
						setProcessingState("completed");
						setProgress(100);
					},
				}
			);
		} catch (error) {
			console.error("Error processing video:", error);
			setError("视频处理失败，请重试");
			setProcessingState("error");
		}
	}, [selectedFile]);

	// Download PPT
	const handleDownloadPPT = useCallback(async () => {
		try {
			await createAndDownloadPPT(screenshots, {
				title: selectedFile?.name || "Video Analysis",
				maxSlides: 256,
			});
		} catch (error) {
			console.error("Error generating PPT:", error);
			setError("PPT生成失败，请重试");
		}
	}, [screenshots, selectedFile?.name]);

	// Reset everything
	const handleReset = useCallback(() => {
		// Clean up video URL to prevent memory leaks
		if (videoUrl) {
			URL.revokeObjectURL(videoUrl);
		}

		setSelectedFile(null);
		setVideoUrl("");
		setProcessingState("idle");
		setProgress(0);
		setError("");
		setScreenshots([]);
		setVideoMetadata(null);

		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}, [videoUrl]);

	// File input change handler
	const handleFileInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files;
			if (files && files.length > 0) {
				handleFileSelect(files[0]);
			}
		},
		[handleFileSelect]
	);

	return (
		<div className="min-h-screen bg-zinc-950 text-white relative">
			{/* Background - Fixed to cover entire page */}
			<div className="fixed inset-0 z-0 overflow-hidden">
				{/* Gradient overlays */}
				<div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-teal-900/20" />
				<div className="absolute inset-0 bg-gradient-to-tr from-zinc-900 via-zinc-900/80 to-zinc-900/60" />

				{/* Grid pattern - covers entire viewport */}
				<div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] opacity-100" />

				{/* Subtle animated elements */}
				<div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-3xl animate-pulse" />
				<div className="absolute bottom-1/4 left-1/4 w-80 h-80 rounded-full bg-gradient-to-r from-purple-500/10 to-teal-500/10 blur-3xl animate-pulse [animation-delay:2s]" />
			</div>

			{/* Header */}
			<header className="relative z-10 border-b border-zinc-800/50 backdrop-blur-sm">
				<div className="container mx-auto px-6 py-4">
					<nav className="flex items-center justify-between">
						<Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
							<ArrowLeft className="h-5 w-5" />
							<span>返回首页</span>
						</Link>

						<div className="flex items-center space-x-2">
							<FileVideo className="h-6 w-6 text-blue-400" />
							<span className="text-xl font-semibold">本地视频</span>
						</div>
					</nav>
				</div>
			</header>

			{/* Main Content */}
			<main className="relative z-10 container mx-auto px-6 py-8">
				<div className="grid lg:grid-cols-3 gap-8">
					{/* Upload Panel */}
					<div className="lg:col-span-2">
						<div className="rounded-2xl bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 border border-zinc-700/50 p-6 backdrop-blur-sm hover:border-zinc-600/70 transition-all duration-300">
							{!selectedFile ? (
								/* Upload Area */
								<div
									className="border-2 border-dashed border-zinc-600/50 rounded-xl p-12 text-center hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-300 cursor-pointer group"
									onDragOver={handleDragOver}
									onDrop={handleDrop}
									onClick={() => fileInputRef.current?.click()}
								>
									<div className="space-y-6 opacity-0 animate-[fadeIn_0.5s_ease-in-out_forwards]">
										<div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center group-hover:scale-110 group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-all duration-300">
											<Upload className="h-10 w-10 text-blue-400 group-hover:text-blue-300 transition-colors duration-300" />
										</div>

										<div>
											<h3 className="text-2xl font-semibold mb-2">选择视频文件</h3>
											<p className="text-zinc-400 mb-4">拖拽视频文件到这里，或点击选择文件</p>
											<p className="text-sm text-zinc-500">
												支持 MP4, WebM, MOV, AVI, MKV, WMV, FLV, OGV 等格式，最大200MB
											</p>
											<p className="text-xs text-zinc-600 mt-1">非MP4格式将自动转换为MP4以确保兼容性</p>
										</div>

										<Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
											<Upload className="mr-2 h-5 w-5" />
											选择文件
										</Button>
									</div>
								</div>
							) : (
								/* Video Preview and Controls */
								<div className="space-y-6">
									{/* Video Player */}
									<div className="aspect-video rounded-lg bg-black overflow-hidden relative">
										<video
											ref={videoRef}
											src={videoUrl || undefined}
											className="w-full h-full object-contain"
											controls
											preload="metadata"
										/>

										{/* Processing Overlay */}
										{(processingState === "analyzing" ||
											processingState === "extracting" ||
											processingState === "converting") && (
											<div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 animate-[fadeIn_0.3s_ease-in-out_forwards]">
												<div className="text-center space-y-4">
													<Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-400" />
													<div>
														<p className="text-lg font-semibold">
															{processingState === "converting" && "转换视频格式中..."}
															{processingState === "analyzing" && "分析视频中..."}
															{processingState === "extracting" && "提取关键帧..."}
														</p>
														<p className="text-sm text-zinc-400 mt-2">
															{processingState === "converting" && "正在转换..."}
															{processingState === "analyzing" && "正在分析..."}
															{processingState === "extracting" && "正在提取..."}
														</p>
														{processingState === "converting" && (
															<p className="text-xs text-zinc-500 mt-2">优先尝试快速copy，如需要则重新编码</p>
														)}
													</div>
												</div>
											</div>
										)}
									</div>

									{/* File Info */}
									{videoMetadata && (
										<div className="grid md:grid-cols-2 gap-4 p-4 bg-zinc-800/30 rounded-lg">
											<div>
												<p className="text-sm text-zinc-400">文件名</p>
												<p className="font-medium truncate">{selectedFile.name}</p>
											</div>
											<div>
												<p className="text-sm text-zinc-400">文件大小</p>
												<p className="font-medium">{(videoMetadata.size / 1024 / 1024).toFixed(1)} MB</p>
											</div>
											<div>
												<p className="text-sm text-zinc-400">时长</p>
												<p className="font-medium">{formatTime(Math.floor(videoMetadata.duration))}</p>
											</div>
											<div>
												<p className="text-sm text-zinc-400">分辨率</p>
												<p className="font-medium">
													{videoMetadata.width} × {videoMetadata.height}
												</p>
											</div>
										</div>
									)}

									{/* Action Buttons */}
									<div className="flex space-x-4">
										{processingState === "idle" && (
											<Button
												onClick={handleProcessVideo}
												className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
											>
												<Zap className="mr-2 h-5 w-5" />
												开始处理
											</Button>
										)}

										{processingState === "completed" && (
											<>
												<Button
													onClick={handleDownloadPPT}
													className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
													disabled={screenshots.length === 0}
												>
													<Download className="mr-2 h-5 w-5" />
													下载PPT ({screenshots.length}张)
												</Button>

												<Button
													onClick={handleProcessVideo}
													variant="outline"
													className="border-zinc-700 text-white hover:bg-zinc-800"
												>
													<RotateCcw className="mr-2 h-4 w-4" />
													重新处理
												</Button>
											</>
										)}

										<Button
											onClick={handleReset}
											variant="outline"
											className="border-zinc-700 text-white hover:bg-zinc-800"
										>
											重新选择
										</Button>
									</div>

									{/* Error Display */}
									{error && (
										<div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center space-x-3 opacity-0 animate-[fadeIn_0.3s_ease-in-out_forwards]">
											<AlertCircle className="h-5 w-5 text-red-400" />
											<p className="text-red-300">{error}</p>
										</div>
									)}
								</div>
							)}
						</div>
					</div>

					{/* Info Panel */}
					<div className="space-y-6">
						{/* Conversion Info */}
						<div className="rounded-2xl bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 border border-zinc-700/50 p-6 backdrop-blur-sm hover:border-zinc-600/70 transition-all duration-300">
							<h3 className="text-lg font-semibold mb-4">转换策略</h3>

							<div className="space-y-3">
								<div className="p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg">
									<div className="flex items-center gap-2 mb-1">
										<Zap className="h-4 w-4 text-blue-400" />
										<span className="font-medium text-blue-300">智能Copy优先</span>
									</div>
									<p className="text-xs text-blue-200/80">优先尝试直接复制流（极速），如失败则智能重新编码</p>
								</div>
							</div>

							<div className="mt-4 p-3 bg-zinc-800/20 border border-zinc-700/30 rounded-lg">
								<p className="text-xs text-zinc-400">大多数视频可以直接copy，速度提升10-50倍，零质量损失</p>
							</div>
						</div>

						{/* Status */}
						<div className="rounded-2xl bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 border border-zinc-700/50 p-6 backdrop-blur-sm hover:border-zinc-600/70 transition-all duration-300">
							<h3 className="text-lg font-semibold mb-4">处理状态</h3>

							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<span className="text-zinc-400">当前状态</span>
									<div className="flex items-center space-x-2">
										{processingState === "analyzing" && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
										{processingState === "extracting" && <Loader2 className="h-4 w-4 animate-spin text-purple-400" />}
										{processingState === "converting" && <Loader2 className="h-4 w-4 animate-spin text-orange-400" />}
										{processingState === "completed" && <CheckCircle className="h-4 w-4 text-green-500" />}
										{processingState === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
										<span className="capitalize">
											{processingState === "idle" && "等待处理"}
											{processingState === "uploading" && "上传中"}
											{processingState === "converting" && "格式转换中"}
											{processingState === "analyzing" && "分析中"}
											{processingState === "extracting" && "提取中"}
											{processingState === "completed" && "已完成"}
											{processingState === "error" && "出错"}
										</span>
									</div>
								</div>

								{(processingState === "converting" ||
									processingState === "analyzing" ||
									processingState === "extracting") && (
									<div className="flex items-center justify-between">
										<span className="text-zinc-400">进度</span>
										<span>{progress}%</span>
									</div>
								)}

								<div className="flex items-center justify-between">
									<span className="text-zinc-400">提取帧数</span>
									<span>{screenshots.length}</span>
								</div>
							</div>
						</div>

						{/* Screenshots Preview */}
						{screenshots.length > 0 && (
							<div className="rounded-2xl bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 border border-zinc-700/50 p-6 backdrop-blur-sm hover:border-zinc-600/70 transition-all duration-300">
								<div className="flex items-center justify-between mb-4">
									<h3 className="text-lg font-semibold">预览 ({screenshots.length}张)</h3>
									<div className="flex gap-2">
										<Button
											onClick={() => {
												// 批量下载功能
												screenshots.forEach((screenshot, index) => {
													const link = document.createElement("a");
													link.href = screenshot;
													link.download = `video_frame_${String(index + 1).padStart(3, "0")}.png`;
													document.body.appendChild(link);
													link.click();
													document.body.removeChild(link);
												});
											}}
											variant="outline"
											size="sm"
											className="border-zinc-700 text-white hover:bg-zinc-800"
										>
											<Images className="mr-1 h-4 w-4" />
											下载全部
										</Button>
									</div>
								</div>

								{/* 滚动预览区域 */}
								<div className="max-h-96 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-zinc-600 scrollbar-track-zinc-800">
									{screenshots.map((screenshot, index) => (
										<div
											key={index}
											className="aspect-video rounded-lg overflow-hidden border border-zinc-600/30 group relative"
										>
											<Image
												src={screenshot}
												alt={`Frame ${index + 1}`}
												width={300}
												height={200}
												className="w-full h-full object-cover"
												unoptimized
											/>
											<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
												<div className="flex gap-2">
													<Button
														onClick={() => {
															const link = document.createElement("a");
															link.href = screenshot;
															link.download = `video_frame_${String(index + 1).padStart(3, "0")}.png`;
															document.body.appendChild(link);
															link.click();
															document.body.removeChild(link);
														}}
														size="sm"
														variant="secondary"
													>
														<Download className="h-4 w-4" />
													</Button>
													<Button
														onClick={() => {
															window.open(screenshot, "_blank");
														}}
														size="sm"
														variant="secondary"
													>
														<Eye className="h-4 w-4" />
													</Button>
												</div>
											</div>
											<div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
												#{index + 1}
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Tips */}
						<div className="rounded-2xl bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 p-6 backdrop-blur-sm hover:border-blue-500/50 hover:bg-gradient-to-br hover:from-blue-900/30 hover:to-purple-900/30 transition-all duration-300">
							<h3 className="text-lg font-semibold mb-4 text-blue-300">处理说明</h3>

							<ul className="space-y-2 text-sm text-blue-200">
								<li>• 支持多种视频格式：MP4, WebM, MOV, AVI, MKV, WMV, FLV等</li>
								<li>• 自动检测格式，非MP4自动转换确保兼容性</li>
								<li>• 使用FFmpeg.wasm进行高质量格式转换</li>
								<li>• 智能差异检测算法，自动计算最佳阈值</li>
								<li>• 过滤相似帧，提取关键内容生成PPT</li>
								<li>• 本地处理，保护隐私安全，无服务器上传</li>
							</ul>
						</div>
					</div>
				</div>
			</main>

			{/* Hidden Elements */}
			<input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileInputChange} className="hidden" />

			<canvas ref={canvasRef} className="hidden" />
		</div>
	);
};

export default LocalVideoPage;
