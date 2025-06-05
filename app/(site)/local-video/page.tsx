"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import {
	AlertCircle,
	ArrowLeft,
	CheckCircle,
	Download,
	FileVideo,
	Loader2,
	Pause,
	Play,
	RotateCcw,
	Upload,
	Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { createAndDownloadPPT } from "@/lib/ppt-generation";
import { formatTime } from "@/lib/utils";
import { convertToMp4, extractFramesFromVideo, preprocessVideo } from "@/lib/video-processing";

type ProcessingState = "idle" | "uploading" | "analyzing" | "extracting" | "completed" | "error" | "converting";

interface LocalVideoPageProps {}

const LocalVideoPage = ({}: LocalVideoPageProps) => {
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

	// Check if file is MP4 format
	const isMP4Format = (file: File): boolean => {
		return file.type === "video/mp4" || file.name.toLowerCase().endsWith(".mp4");
	};

	// Convert non-MP4 video to MP4 format
	const convertVideoToMp4 = async (file: File): Promise<File> => {
		setProcessingState("converting");
		setProgress(0);

		try {
			console.log(`Converting ${file.name} to MP4...`);

			// Get file extension for format detection
			const fileExtension = file.name.split(".").pop()?.toLowerCase();

			// Convert using the new convertToMp4 method
			const convertedBlob = await convertToMp4(
				file,
				(progressValue) => {
					// Validate and clamp progress value
					const validProgress = Math.max(0, Math.min(100, Math.round(progressValue || 0)));
					console.log(`Conversion progress: ${validProgress}%`);
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
			throw new Error("视频格式转换失败，请尝试使用MP4格式的视频");
		}
	};

	// Handle file selection
	const handleFileSelect = useCallback(async (file: File) => {
		// Validate file type
		if (!file.type.startsWith("video/")) {
			setError("请选择有效的视频文件");
			return;
		}

		// Validate file size (100MB limit for original, 200MB for larger files that need conversion)
		const maxSize = 200 * 1024 * 1024; // 200MB to accommodate conversion
		if (file.size > maxSize) {
			setError("文件大小不能超过200MB");
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

			// Check if file is MP4, if not convert it
			if (!isMP4Format(file)) {
				console.log("Non-MP4 format detected, converting to MP4...");
				setError("检测到非MP4格式，正在转换为MP4以确保兼容性...");

				finalFile = await convertVideoToMp4(file);
				setSelectedFile(finalFile);
				setError(""); // Clear conversion message

				console.log("Format conversion completed successfully");
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
	}, []);

	// Get video metadata
	const getVideoMetadata = (file: File, url: string) => {
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
	};

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
	const handleProcessVideo = async () => {
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
	};

	// Download PPT
	const handleDownloadPPT = async () => {
		try {
			await createAndDownloadPPT(screenshots, {
				title: selectedFile?.name || "Video Analysis",
				maxSlides: 256,
			});
		} catch (error) {
			console.error("Error generating PPT:", error);
			setError("PPT生成失败，请重试");
		}
	};

	// Reset everything
	const handleReset = () => {
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
	};

	// File input change handler
	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0) {
			handleFileSelect(files[0]);
		}
	};

	return (
		<div className="min-h-screen bg-zinc-950 text-white">
			{/* Background */}
			<div className="absolute inset-0">
				<div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-teal-900/20" />
				<div className="absolute inset-0 bg-gradient-to-tr from-zinc-900 via-zinc-900/80 to-zinc-900/60" />
				<div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
			</div>

			{/* Header */}
			<header className="relative z-20 border-b border-zinc-800/50 backdrop-blur-sm">
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
						<div className="rounded-2xl bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 border border-zinc-700/50 p-6 backdrop-blur-sm">
							{!selectedFile ? (
								/* Upload Area */
								<div
									className="border-2 border-dashed border-zinc-600/50 rounded-xl p-12 text-center hover:border-blue-500/50 transition-colors cursor-pointer"
									onDragOver={handleDragOver}
									onDrop={handleDrop}
									onClick={() => fileInputRef.current?.click()}
								>
									<div className="space-y-6 opacity-0 animate-[fadeIn_0.5s_ease-in-out_forwards]">
										<div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
											<Upload className="h-10 w-10 text-blue-400" />
										</div>

										<div>
											<h3 className="text-2xl font-semibold mb-2">选择视频文件</h3>
											<p className="text-zinc-400 mb-4">拖拽视频文件到这里，或点击选择文件</p>
											<p className="text-sm text-zinc-500">支持 MP4, AVI, MOV, WMV 等格式，最大100MB</p>
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
														<div className="mt-2 w-64 bg-zinc-700 rounded-full h-2">
															<div
																className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
																style={{ width: `${progress}%` }}
															/>
														</div>
														<p className="text-sm text-zinc-400 mt-1">{progress}%</p>
														{processingState === "converting" && (
															<p className="text-xs text-zinc-500 mt-2">
																使用FFmpeg转换为MP4格式，确保@webav/av-cliper兼容性
															</p>
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
						{/* Status */}
						<div className="rounded-2xl bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 border border-zinc-700/50 p-6 backdrop-blur-sm">
							<h3 className="text-lg font-semibold mb-4">处理状态</h3>

							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<span className="text-zinc-400">当前状态</span>
									<div className="flex items-center space-x-2">
										{processingState === "analyzing" && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
										{processingState === "extracting" && <Loader2 className="h-4 w-4 animate-spin text-purple-400" />}
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

								{(processingState === "analyzing" ||
									processingState === "extracting" ||
									processingState === "converting") && (
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
							<div className="rounded-2xl bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 border border-zinc-700/50 p-6 backdrop-blur-sm">
								<h3 className="text-lg font-semibold mb-4">预览</h3>

								<div className="space-y-3">
									{screenshots.slice(0, 3).map((screenshot, index) => (
										<div key={index} className="aspect-video rounded-lg overflow-hidden border border-zinc-600/30">
											<img src={screenshot} alt={`Frame ${index + 1}`} className="w-full h-full object-cover" />
										</div>
									))}
								</div>

								{screenshots.length > 3 && (
									<p className="text-sm text-zinc-400 mt-3 text-center">还有 {screenshots.length - 3} 帧...</p>
								)}
							</div>
						)}

						{/* Tips */}
						<div className="rounded-2xl bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 p-6 backdrop-blur-sm">
							<h3 className="text-lg font-semibold mb-4 text-blue-300">处理说明</h3>

							<ul className="space-y-2 text-sm text-blue-200">
								<li>• 自动检测视频格式，非MP4自动转换</li>
								<li>• 确保@webav/av-cliper兼容性</li>
								<li>• 使用智能差异检测算法</li>
								<li>• 自动计算最佳阈值</li>
								<li>• 过滤相似帧，提取关键内容</li>
								<li>• 本地处理，保护隐私安全</li>
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
