"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
	ArrowLeft,
	Camera,
	CheckCircle,
	Download,
	Loader2,
	Mic,
	MicOff,
	Monitor,
	Pause,
	Play,
	Settings,
	Square,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { createAndDownloadPPT } from "@/lib/ppt-generation";
import { formatTime } from "@/lib/utils";
import { captureAndFilterScreenshot } from "@/lib/video-processing";

type RecordingState = "idle" | "ready" | "recording" | "paused" | "processing" | "completed";

interface ScreenshotStats {
	total: number;
	saved: number;
}

const ScreenRecordingPage = () => {
	// Recording state
	const [recordingState, setRecordingState] = useState<RecordingState>("idle");
	const [recordingTime, setRecordingTime] = useState<number>(0);
	const [withAudio, setWithAudio] = useState<boolean>(false);

	// State ref for timeout callbacks
	const recordingStateRef = useRef<RecordingState>("idle");

	// Update ref when state changes
	useEffect(() => {
		recordingStateRef.current = recordingState;
	}, [recordingState]);

	// Media stream and recording
	const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const recordedChunksRef = useRef<Blob[]>([]);
	const videoRef = useRef<HTMLVideoElement>(null);
	const timerRef = useRef<NodeJS.Timeout | null>(null);

	// Screenshot capture
	const [screenshots, setScreenshots] = useState<string[]>([]);
	const [screenshotStats, setScreenshotStats] = useState<ScreenshotStats>({ total: 0, saved: 0 });
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const lastImageDataRef = useRef<ImageData | null>(null);
	const diffThreshold = 30;

	// Video output
	const [videoUrl, setVideoUrl] = useState<string>("");

	// Cleanup function
	const cleanup = useCallback(() => {
		if (mediaStream) {
			mediaStream.getTracks().forEach((track) => track.stop());
			setMediaStream(null);
		}
		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}
		if (videoRef.current) {
			videoRef.current.srcObject = null;
		}
	}, [mediaStream]);

	// Timer functions
	const startTimer = useCallback(() => {
		const startTime = Date.now() - recordingTime * 1000;
		timerRef.current = setInterval(() => {
			setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
		}, 1000);
	}, [recordingTime]);

	const stopTimer = useCallback(() => {
		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	// Screenshot capture function
	const captureScreenshot = useCallback(() => {
		const video = videoRef.current;
		const canvas = canvasRef.current;

		if (!video || !canvas) {
			console.warn("视频或画布元素不可用");
			return;
		}

		// 检查视频是否已加载并且有内容
		if (video.videoWidth === 0 || video.videoHeight === 0) {
			console.warn(`视频尺寸为0 (${video.videoWidth}x${video.videoHeight})，跳过截图`);
			console.warn(`视频状态: readyState=${video.readyState}, currentTime=${video.currentTime}`);
			return;
		}

		if (video.readyState < 2) {
			console.warn(`视频未准备好 (readyState=${video.readyState})，跳过截图`);
			return;
		}

		console.log(`捕获截图，视频尺寸: ${video.videoWidth}x${video.videoHeight}, readyState: ${video.readyState}`);

		try {
			captureAndFilterScreenshot({
				videoRef: videoRef as React.RefObject<HTMLVideoElement>,
				canvasRef: canvasRef as React.RefObject<HTMLCanvasElement>,
				lastImageDataRef,
				diffThreshold,
				onScreenshotCaptured: (screenshot) => {
					console.log("新截图已保存");
					setScreenshots((prev) => {
						const newScreenshots = [...prev, screenshot];
						return newScreenshots;
					});
					setScreenshotStats((prev) => ({ ...prev, saved: prev.saved + 1 }));
				},
				onStatsUpdate: () => {
					setScreenshotStats((prev) => ({ ...prev, total: prev.total + 1 }));
				},
			});
		} catch (error) {
			console.error("截图捕获失败:", error);
		}
	}, [diffThreshold]);

	// Screenshot capture during recording
	const startScreenshotCapture = useCallback(() => {
		console.log("开始截图捕获...");

		// 延迟启动截图，等待视频完全准备好
		setTimeout(() => {
			const captureInterval = setInterval(() => {
				if (recordingStateRef.current === "recording") {
					captureScreenshot();
				} else {
					console.log("停止截图捕获，当前状态:", recordingStateRef.current);
					clearInterval(captureInterval);
				}
			}, 3000); // 每3秒捕获一次
		}, 2000); // 等待2秒让视频完全准备好
	}, [captureScreenshot]);

	// Start recording preparation
	const handleStartPrepare = useCallback(async () => {
		try {
			console.log("开始准备录制屏幕...");

			// 检查浏览器支持
			if (!navigator.mediaDevices?.getDisplayMedia) {
				throw new Error("您的浏览器不支持屏幕录制功能");
			}

			const displayMediaOptions: DisplayMediaStreamOptions = {
				video: {
					cursor: "always",
					displaySurface: "monitor",
					width: { ideal: 1920 },
					height: { ideal: 1080 },
					frameRate: { ideal: 30 },
				} as MediaTrackConstraints,
				audio: true,
			};

			console.log("请求屏幕录制权限...");
			const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
			console.log(
				"获得屏幕录制权限，视频轨道:",
				stream.getVideoTracks().length,
				"音频轨道:",
				stream.getAudioTracks().length
			);

			let finalStream = stream;

			if (withAudio) {
				try {
					console.log("请求麦克风权限...");
					const micStream = await navigator.mediaDevices.getUserMedia({
						audio: {
							echoCancellation: true,
							noiseSuppression: true,
							autoGainControl: true,
						},
					});

					console.log("获得麦克风权限，合并音频流...");
					// 合并音频轨道
					const audioTracks = [...stream.getAudioTracks(), ...micStream.getAudioTracks()];
					finalStream = new MediaStream([...stream.getVideoTracks(), ...audioTracks]);
				} catch (error) {
					console.warn("麦克风权限获取失败，仅使用系统音频:", error);
					// Continue with system audio only
				}
			}

			setMediaStream(finalStream);
			setRecordingState("ready");

			// 等待组件重新渲染后再设置视频元素
			setTimeout(() => {
				if (videoRef.current) {
					console.log("设置视频元素...");
					videoRef.current.srcObject = finalStream;
					videoRef.current.muted = true; // 避免音频反馈

					// 播放视频
					const playVideo = async () => {
						try {
							console.log("尝试播放视频...");
							await videoRef.current!.play();
							console.log("视频播放成功");
						} catch (error) {
							console.error("视频播放失败:", error);
						}
					};

					// 监听多个事件确保视频加载
					videoRef.current.onloadedmetadata = () => {
						console.log(
							"视频元数据加载完成, 视频尺寸:",
							videoRef.current!.videoWidth,
							"x",
							videoRef.current!.videoHeight
						);
						playVideo();
					};

					videoRef.current.oncanplay = () => {
						console.log("视频可以播放, 视频尺寸:", videoRef.current!.videoWidth, "x", videoRef.current!.videoHeight);
					};

					// 立即尝试播放（如果元数据已经加载）
					if (videoRef.current.readyState >= 1) {
						console.log("视频已有元数据，立即播放");
						playVideo();
					}

					// 监听流结束事件
					const videoTrack = finalStream.getVideoTracks()[0];
					if (videoTrack) {
						videoTrack.addEventListener("ended", () => {
							console.log("屏幕共享已停止");
							setRecordingState("idle");
							setMediaStream(null);
						});
					}
				} else {
					console.log("视频元素仍未找到");
				}
			}, 200);

			// 重置截图相关状态
			setScreenshots([]);
			setScreenshotStats({ total: 0, saved: 0 });
			lastImageDataRef.current = null;
		} catch (error) {
			console.error("录制准备失败:", error);
			if (error instanceof Error) {
				if (error.name === "NotAllowedError") {
					alert("用户拒绝了屏幕录制权限。请重新尝试并允许屏幕共享。");
				} else if (error.name === "NotSupportedError") {
					alert("您的浏览器不支持屏幕录制功能。请使用Chrome、Edge或Firefox浏览器。");
				} else {
					alert(`录制准备失败: ${error.message}`);
				}
			} else {
				alert("录制准备失败，请检查浏览器权限设置。");
			}
		}
	}, [withAudio]);

	// Start recording with stream
	const handleStartRecording = useCallback(
		(stream?: MediaStream) => {
			const recordingStream = stream || mediaStream;

			if (!recordingStream) {
				alert("媒体流未准备好，请先点击准备录制");
				return;
			}

			try {
				console.log("开始录制...");

				// 重置数据
				recordedChunksRef.current = [];
				setRecordingTime(0);

				// 检查录制格式支持
				const mimeTypes = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];

				let supportedMimeType = "";
				for (const mimeType of mimeTypes) {
					if (MediaRecorder.isTypeSupported(mimeType)) {
						supportedMimeType = mimeType;
						console.log("使用录制格式:", mimeType);
						break;
					}
				}

				if (!supportedMimeType) {
					throw new Error("浏览器不支持视频录制格式");
				}

				const mediaRecorder = new MediaRecorder(recordingStream, {
					mimeType: supportedMimeType,
					videoBitsPerSecond: 2500000, // 2.5 Mbps
				});

				mediaRecorderRef.current = mediaRecorder;

				mediaRecorder.ondataavailable = (event) => {
					console.log("录制数据可用:", event.data.size, "bytes");
					if (event.data.size > 0) {
						recordedChunksRef.current.push(event.data);
					}
				};

				mediaRecorder.onstop = () => {
					console.log("录制停止，生成视频文件...");
					const blob = new Blob(recordedChunksRef.current, {
						type: supportedMimeType.split(";")[0],
					});
					setVideoUrl(URL.createObjectURL(blob));
					console.log("视频文件生成完成，大小:", blob.size, "bytes");
					console.log("截图数量:", screenshots.length);

					// 清理视频预览，停止媒体流
					if (videoRef.current) {
						videoRef.current.srcObject = null;
					}
					if (recordingStream) {
						recordingStream.getTracks().forEach((track) => track.stop());
					}
					setMediaStream(null);

					setRecordingState("completed");
				};

				mediaRecorder.onerror = (event) => {
					console.error("录制出错:", event);
					alert("录制过程中出现错误");
					setRecordingState("ready");
				};

				mediaRecorder.start(1000); // 每秒收集一次数据
				setRecordingState("recording");
				startTimer();
				startScreenshotCapture();
				console.log("录制已开始");
			} catch (error) {
				console.error("录制启动失败:", error);
				alert(`录制启动失败: ${error instanceof Error ? error.message : "未知错误"}`);
			}
		},
		[mediaStream, screenshots.length, startTimer, startScreenshotCapture]
	);

	// Pause/Resume recording
	const handlePauseResume = useCallback(() => {
		if (!mediaRecorderRef.current) return;

		if (recordingState === "recording") {
			mediaRecorderRef.current.pause();
			setRecordingState("paused");
			stopTimer();
		} else if (recordingState === "paused") {
			mediaRecorderRef.current.resume();
			setRecordingState("recording");
			startTimer();
		}
	}, [recordingState, stopTimer, startTimer]);

	// Stop recording
	const handleStopRecording = useCallback(() => {
		if (mediaRecorderRef.current) {
			mediaRecorderRef.current.stop();
		}

		stopTimer();
		setRecordingState("processing");
	}, [stopTimer]);

	// Download PPT
	const handleDownloadPPT = useCallback(async () => {
		try {
			await createAndDownloadPPT(screenshots, {
				title: "Screen Recording Analysis",
				maxSlides: 256,
			});
		} catch (error) {
			console.error("Error generating PPT:", error);
			alert("PPT生成失败，请重试。");
		}
	}, [screenshots]);

	// Download video
	const handleDownloadVideo = useCallback(() => {
		if (videoUrl) {
			const a = document.createElement("a");
			a.href = videoUrl;
			a.download = `screen-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.webm`;
			a.click();
		}
	}, [videoUrl]);

	// Reset everything
	const handleReset = useCallback(() => {
		setRecordingState("idle");
		setRecordingTime(0);
		setScreenshots([]);
		setScreenshotStats({ total: 0, saved: 0 });
		setVideoUrl("");

		cleanup();
	}, [cleanup]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			cleanup();
		};
	}, [cleanup]);

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
				<div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full bg-gradient-to-r from-red-500/10 to-orange-500/10 blur-3xl animate-pulse" />
				<div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 blur-3xl animate-pulse [animation-delay:3s]" />
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
							<Monitor className="h-6 w-6 text-blue-400" />
							<span className="text-xl font-semibold">屏幕录制</span>
						</div>
					</nav>
				</div>
			</header>

			{/* Main Content */}
			<main className="relative z-10 container mx-auto px-6 py-8">
				<div className="grid lg:grid-cols-3 gap-8">
					{/* Recording Panel */}
					<div className="lg:col-span-2">
						<div className="rounded-2xl bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 border border-zinc-700/50 p-6 backdrop-blur-sm hover:border-zinc-600/70 transition-all duration-300">
							{/* Video Preview */}
							<div className="aspect-video rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-700 border border-zinc-600/30 overflow-hidden mb-6 relative">
								{recordingState === "idle" ? (
									<div className="flex h-full items-center justify-center flex-col space-y-4">
										<Monitor className="h-16 w-16 text-zinc-500" />
										<p className="text-zinc-400">点击开始准备录制屏幕</p>
										<p className="text-xs text-zinc-500">确保使用 Chrome、Edge 或 Firefox 浏览器获得最佳体验</p>
									</div>
								) : recordingState === "completed" && videoUrl ? (
									// 录制完成后显示录制的视频
									<>
										<video src={videoUrl} className="w-full h-full object-cover" controls playsInline />

										{/* Completed indicator */}
										<div className="absolute top-4 left-4 flex items-center space-x-2 bg-green-500/90 backdrop-blur-sm rounded-full px-3 py-1">
											<CheckCircle className="w-3 h-3" />
											<span className="text-sm font-medium">录制完成</span>
										</div>
									</>
								) : (
									// 录制过程中显示实时预览 - 视频元素始终存在
									<>
										<video ref={videoRef} className="w-full h-full object-contain" muted playsInline autoPlay />
									</>
								)}

								{/* 状态指示器 - 覆盖在视频上方 */}
								{recordingState === "recording" && (
									<div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-500/90 backdrop-blur-sm rounded-full px-3 py-1 animate-pulse">
										<div className="w-2 h-2 bg-white rounded-full animate-pulse" />
										<span className="text-sm font-medium">录制中</span>
									</div>
								)}

								{recordingState === "paused" && (
									<div className="absolute top-4 left-4 flex items-center space-x-2 bg-yellow-500/90 backdrop-blur-sm rounded-full px-3 py-1">
										<Pause className="w-3 h-3" />
										<span className="text-sm font-medium">已暂停</span>
									</div>
								)}

								{recordingState === "ready" && (
									<div className="absolute top-4 left-4 flex items-center space-x-2 bg-green-500/90 backdrop-blur-sm rounded-full px-3 py-1">
										<CheckCircle className="w-3 h-3" />
										<span className="text-sm font-medium">准备就绪</span>
									</div>
								)}

								{recordingState === "processing" && (
									<div className="absolute inset-0 flex items-center justify-center bg-black/50">
										<div className="flex items-center space-x-3 text-white">
											<Loader2 className="h-8 w-8 animate-spin" />
											<span className="text-lg">处理中...</span>
										</div>
									</div>
								)}

								{/* Timer - 显示在所有状态 */}
								{(recordingState === "recording" || recordingState === "paused") && (
									<div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded px-3 py-1">
										<span className="font-mono text-lg text-white">{formatTime(recordingTime)}</span>
									</div>
								)}

								{/* Screenshot counter */}
								{screenshots.length > 0 && (recordingState === "recording" || recordingState === "paused") && (
									<div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm rounded px-3 py-1">
										<span className="text-sm text-white">{screenshots.length} 张截图</span>
									</div>
								)}
							</div>

							{/* Controls */}
							<div className="flex flex-col space-y-4">
								{/* Audio Settings */}
								<div className="flex items-center justify-between">
									<div className="flex items-center space-x-2">
										<Settings className="h-5 w-5 text-zinc-400" />
										<span className="text-sm text-zinc-300">录制设置</span>
									</div>

									<Button
										variant="outline"
										size="sm"
										onClick={() => setWithAudio(!withAudio)}
										className="border-zinc-700 text-white hover:bg-zinc-800"
										disabled={recordingState !== "idle"}
									>
										{withAudio ? <Mic className="h-4 w-4 mr-2" /> : <MicOff className="h-4 w-4 mr-2" />}
										{withAudio ? "包含麦克风" : "仅系统音频"}
									</Button>
								</div>

								{/* Action Buttons */}
								<div className="flex space-x-4">
									{recordingState === "idle" && (
										<Button
											onClick={handleStartPrepare}
											className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
										>
											<Monitor className="mr-2 h-5 w-5" />
											准备录制
										</Button>
									)}

									{recordingState === "ready" && (
										<Button
											onClick={() => handleStartRecording()}
											className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
										>
											<Play className="mr-2 h-5 w-5" />
											开始录制
										</Button>
									)}

									{(recordingState === "recording" || recordingState === "paused") && (
										<>
											<Button
												onClick={handlePauseResume}
												variant="outline"
												className="border-zinc-700 text-white hover:bg-zinc-800"
											>
												{recordingState === "recording" ? (
													<>
														<Pause className="mr-2 h-4 w-4" />
														暂停
													</>
												) : (
													<>
														<Play className="mr-2 h-4 w-4" />
														继续
													</>
												)}
											</Button>

											<Button
												onClick={captureScreenshot}
												variant="outline"
												className="border-zinc-700 text-white hover:bg-zinc-800"
												title="手动截图"
											>
												<Camera className="mr-2 h-4 w-4" />
												截图
											</Button>

											<Button onClick={handleStopRecording} variant="destructive" className="flex-1">
												<Square className="mr-2 h-4 w-4" />
												停止录制
											</Button>
										</>
									)}

									{recordingState === "processing" && (
										<Button disabled className="flex-1">
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											处理中...
										</Button>
									)}

									{recordingState === "completed" && (
										<>
											<Button
												onClick={handleDownloadPPT}
												className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
												disabled={screenshots.length === 0}
											>
												<Download className="mr-2 h-5 w-5" />
												生成PPT ({screenshots.length}张)
											</Button>

											<Button
												onClick={handleDownloadVideo}
												variant="outline"
												className="border-zinc-700 text-white hover:bg-zinc-800"
											>
												<Download className="mr-2 h-4 w-4" />
												下载视频
											</Button>

											<Button
												onClick={handleReset}
												variant="outline"
												className="border-zinc-700 text-white hover:bg-zinc-800"
											>
												重新录制
											</Button>
										</>
									)}
								</div>
							</div>
						</div>
					</div>

					{/* Info Panel */}
					<div className="space-y-6">
						{/* Status */}
						<div className="rounded-2xl bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 border border-zinc-700/50 p-6 backdrop-blur-sm hover:border-zinc-600/70 transition-all duration-300">
							<h3 className="text-lg font-semibold mb-4">录制状态</h3>

							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<span className="text-zinc-400">当前状态</span>
									<div className="flex items-center space-x-2">
										{recordingState === "recording" && (
											<div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
										)}
										{recordingState === "paused" && <div className="w-2 h-2 bg-yellow-500 rounded-full" />}
										{recordingState === "completed" && <CheckCircle className="h-4 w-4 text-green-500" />}
										<span className="capitalize">
											{recordingState === "idle" && "等待开始"}
											{recordingState === "ready" && "准备就绪"}
											{recordingState === "recording" && "录制中"}
											{recordingState === "paused" && "已暂停"}
											{recordingState === "processing" && "处理中"}
											{recordingState === "completed" && "已完成"}
										</span>
									</div>
								</div>

								<div className="flex items-center justify-between">
									<span className="text-zinc-400">录制时长</span>
									<span className="font-mono">{formatTime(recordingTime)}</span>
								</div>

								<div className="flex items-center justify-between">
									<span className="text-zinc-400">截图数量</span>
									<span>{screenshots.length}</span>
								</div>

								{screenshotStats.total > 0 && (
									<div className="flex items-center justify-between">
										<span className="text-zinc-400">截图统计</span>
										<span className="text-sm">
											已保存 {screenshotStats.saved} / 检测 {screenshotStats.total}
										</span>
									</div>
								)}
							</div>
						</div>

						{/* Screenshots Preview */}
						{screenshots.length > 0 && (
							<div className="rounded-2xl bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 border border-zinc-700/50 p-6 backdrop-blur-sm hover:border-zinc-600/70 transition-all duration-300">
								<h3 className="text-lg font-semibold mb-4">截图预览</h3>

								<div className="space-y-3">
									{screenshots.slice(-3).map((screenshot, index) => (
										<div key={index} className="aspect-video rounded-lg overflow-hidden border border-zinc-600/30">
											<Image
												src={screenshot}
												alt={`Screenshot ${index + 1}`}
												className="w-full h-full object-cover"
												width={320}
												height={180}
												unoptimized
											/>
										</div>
									))}
								</div>

								{screenshots.length > 3 && (
									<p className="text-sm text-zinc-400 mt-3 text-center">还有 {screenshots.length - 3} 张截图...</p>
								)}
							</div>
						)}

						{/* Tips */}
						<div className="rounded-2xl bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 p-6 backdrop-blur-sm hover:border-blue-500/50 hover:bg-gradient-to-br hover:from-blue-900/30 hover:to-purple-900/30 transition-all duration-300">
							<h3 className="text-lg font-semibold mb-4 text-blue-300">使用提示</h3>

							<ul className="space-y-2 text-sm text-blue-200">
								<li>• 系统会自动检测画面变化并截图</li>
								<li>• 建议录制前关闭不必要的通知</li>
								<li>• 支持暂停和继续录制功能</li>
								<li>• 录制完成后可直接生成PPT</li>
							</ul>
						</div>
					</div>
				</div>
			</main>

			{/* Hidden canvas for screenshot processing */}
			<canvas ref={canvasRef} className="hidden" />
		</div>
	);
};

export default ScreenRecordingPage;
