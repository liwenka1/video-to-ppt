"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Download,
  ExternalLink,
  Globe,
  Loader2,
  Play,
  Video,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { createAndDownloadPPT } from "@/lib/ppt-generation";
import { formatTime } from "@/lib/utils";
import { extractFramesFromVideo, preprocessVideo } from "@/lib/video-processing";

type ProcessingState = "idle" | "loading" | "analyzing" | "extracting" | "completed" | "error";

interface OnlineVideoPageProps {}

const OnlineVideoPage = ({}: OnlineVideoPageProps) => {
  // URL and video state
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string>("");
  const [processingState, setProcessingState] = useState<ProcessingState>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string>("");

  // Video analysis results
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [videoMetadata, setVideoMetadata] = useState<{
    title: string;
    duration: number;
    thumbnail: string;
  } | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Supported video platforms
  const supportedPlatforms = [
    { name: "YouTube", pattern: /(youtube\.com|youtu\.be)/, example: "https://www.youtube.com/watch?v=..." },
    { name: "Bilibili", pattern: /bilibili\.com/, example: "https://www.bilibili.com/video/BV..." },
    { name: "Vimeo", pattern: /vimeo\.com/, example: "https://vimeo.com/..." },
    { name: "直接链接", pattern: /\.(mp4|webm|ogg)$/i, example: "https://example.com/video.mp4" },
  ];

  // Validate URL
  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return supportedPlatforms.some((platform) => platform.pattern.test(url));
    } catch {
      return false;
    }
  };

  // Handle URL input
  const handleUrlSubmit = async () => {
    if (!videoUrl.trim()) {
      setError("请输入视频链接");
      return;
    }

    if (!validateUrl(videoUrl)) {
      setError("不支持的视频链接格式");
      return;
    }

    setError("");
    setProcessingState("loading");

    try {
      // For demo purposes, we'll simulate video loading
      // In production, this would involve:
      // 1. Using youtube-dl or similar for platform videos
      // 2. Proxy/CORS handling for direct video links
      // 3. Video conversion if needed

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock video metadata
      setVideoMetadata({
        title: "示例视频标题",
        duration: 300, // 5 minutes
        thumbnail: "/api/placeholder/400/225", // This would be the actual thumbnail
      });

      // For direct video links, we can try to load directly
      if (/\.(mp4|webm|ogg)$/i.test(videoUrl)) {
        setProcessedVideoUrl(videoUrl);
      } else {
        // For platform videos, this would be the processed/proxied URL
        setProcessedVideoUrl("/api/placeholder/video.mp4");
      }

      setProcessingState("idle");
    } catch (error) {
      console.error("Error loading video:", error);
      setError("视频加载失败，请检查链接是否有效");
      setProcessingState("error");
    }
  };

  // Process video frames
  const handleProcessVideo = async () => {
    if (!processedVideoUrl || !videoRef.current || !canvasRef.current) return;

    try {
      setProcessingState("analyzing");
      setProgress(0);
      setScreenshots([]);

      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Wait for video to load
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("Video load failed"));
      });

      // Preprocess to get dynamic threshold
      const dynamicThreshold = await preprocessVideo(video, canvas);

      setProcessingState("extracting");

      // Extract frames using improved method
      await extractFramesFromVideo(
        video,
        canvas,
        {
          captureInterval: 4, // Capture every 4 seconds for online videos
          differenceThreshold: dynamicThreshold,
          maxScreenshots: 200, // Slightly fewer for online videos
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
        title: videoMetadata?.title || "Online Video Analysis",
        maxSlides: 256,
      });
    } catch (error) {
      console.error("Error generating PPT:", error);
      setError("PPT生成失败，请重试");
    }
  };

  // Reset everything
  const handleReset = () => {
    setVideoUrl("");
    setProcessedVideoUrl("");
    setProcessingState("idle");
    setProgress(0);
    setError("");
    setScreenshots([]);
    setVideoMetadata(null);
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
              <Globe className="h-6 w-6 text-blue-400" />
              <span className="text-xl font-semibold">在线视频</span>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* URL Input Panel */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 border border-zinc-700/50 p-6 backdrop-blur-sm">
              {!processedVideoUrl ? (
                /* URL Input */
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold mb-4">输入视频链接</h2>
                    <p className="text-zinc-400 mb-6">支持YouTube、Bilibili、Vimeo等平台，以及直接视频文件链接</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="粘贴视频链接..."
                        className="w-full px-4 py-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-white placeholder-zinc-400 focus:border-blue-500/50 focus:outline-none transition-colors"
                        disabled={processingState === "loading"}
                      />
                    </div>

                    <Button
                      onClick={handleUrlSubmit}
                      disabled={!videoUrl.trim() || processingState === "loading"}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                      {processingState === "loading" ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          加载中...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="mr-2 h-5 w-5" />
                          加载视频
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Supported Platforms */}
                  <div className="border-t border-zinc-700/50 pt-6">
                    <h3 className="text-lg font-semibold mb-4">支持的平台</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {supportedPlatforms.map((platform, index) => (
                        <div key={index} className="p-4 rounded-lg bg-zinc-800/30 border border-zinc-700/30">
                          <h4 className="font-medium mb-2">{platform.name}</h4>
                          <p className="text-sm text-zinc-400">{platform.example}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Video Preview and Controls */
                <div className="space-y-6">
                  {/* Video Info */}
                  {videoMetadata && (
                    <div className="flex items-center space-x-4 p-4 bg-zinc-800/30 rounded-lg">
                      <div className="w-16 h-16 rounded-lg bg-zinc-700/50 flex items-center justify-center">
                        <Video className="h-8 w-8 text-zinc-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold truncate">{videoMetadata.title}</h3>
                        <p className="text-sm text-zinc-400">时长: {formatTime(videoMetadata.duration)}</p>
                      </div>
                      <ExternalLink className="h-5 w-5 text-zinc-400" />
                    </div>
                  )}

                  {/* Video Player */}
                  <div className="aspect-video rounded-lg bg-black overflow-hidden relative">
                    <video
                      ref={videoRef}
                      src={processedVideoUrl}
                      className="w-full h-full object-contain"
                      controls
                      preload="metadata"
                      crossOrigin="anonymous"
                    />

                    {/* Processing Overlay */}
                    {(processingState === "analyzing" || processingState === "extracting") && (
                      <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 animate-[fadeIn_0.3s_ease-in-out_forwards]">
                        <div className="text-center space-y-4">
                          <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-400" />
                          <div>
                            <p className="text-lg font-semibold">
                              {processingState === "analyzing" ? "分析视频中..." : "提取关键帧..."}
                            </p>
                            <div className="mt-2 w-64 bg-zinc-700 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <p className="text-sm text-zinc-400 mt-1">{progress}%</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

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
                    {processingState === "loading" && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
                    {processingState === "analyzing" && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
                    {processingState === "extracting" && <Loader2 className="h-4 w-4 animate-spin text-purple-400" />}
                    {processingState === "completed" && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {processingState === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
                    <span className="capitalize">
                      {processingState === "idle" && "等待处理"}
                      {processingState === "loading" && "加载中"}
                      {processingState === "analyzing" && "分析中"}
                      {processingState === "extracting" && "提取中"}
                      {processingState === "completed" && "已完成"}
                      {processingState === "error" && "出错"}
                    </span>
                  </div>
                </div>

                {(processingState === "analyzing" || processingState === "extracting") && (
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
              <h3 className="text-lg font-semibold mb-4 text-blue-300">使用说明</h3>

              <ul className="space-y-2 text-sm text-blue-200">
                <li>• 支持主流视频平台链接</li>
                <li>• 智能差异检测算法</li>
                <li>• 自动提取关键帧信息</li>
                <li>• 请确保视频链接有效且可访问</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Hidden canvas for frame processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default OnlineVideoPage;
