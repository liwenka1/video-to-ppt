"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
	ArrowRight,
	Download,
	FileText,
	Globe,
	Monitor,
	Play,
	Shield,
	Sparkles,
	Upload,
	Video,
	Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";

interface FeatureCardProps {
	icon: React.ReactNode;
	title: string;
	description: string;
	delay: number;
}

const FeatureCard = ({ icon, title, description, delay }: FeatureCardProps) => (
	<div
		className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 border border-zinc-700/50 p-8 backdrop-blur-sm hover:border-blue-500/50 transition-all duration-300 opacity-0 animate-[fadeInUp_0.6s_ease-out_forwards]"
		style={{ animationDelay: `${delay}s` }}
	>
		<div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
		<div className="relative z-10">
			<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 transform group-hover:scale-110 transition-transform duration-300">
				{icon}
			</div>
			<h3 className="mb-3 text-xl font-semibold text-white group-hover:text-blue-300 transition-colors duration-300">
				{title}
			</h3>
			<p className="text-zinc-400 group-hover:text-zinc-300 transition-colors duration-300">{description}</p>
		</div>
	</div>
);

const AnimatedBackground = () => {
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			setMousePosition({ x: e.clientX, y: e.clientY });
		};

		window.addEventListener("mousemove", handleMouseMove);
		return () => window.removeEventListener("mousemove", handleMouseMove);
	}, []);

	return (
		<div className="fixed inset-0 overflow-hidden">
			{/* Gradient overlays */}
			<div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-teal-900/20" />
			<div className="absolute inset-0 bg-gradient-to-tr from-zinc-900 via-zinc-900/80 to-zinc-900/60" />

			{/* Animated cursor follower */}
			<div
				className="pointer-events-none absolute h-96 w-96 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-3xl transition-all duration-300"
				style={{
					transform: `translate(${mousePosition.x - 192}px, ${mousePosition.y - 192}px)`,
				}}
			/>

			{/* Grid pattern - covers entire viewport */}
			<div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
		</div>
	);
};

const HomePage = () => {
	const [currentFeature, setCurrentFeature] = useState(0);

	const features = ["智能视频分析", "实时内容提取", "自动PPT生成", "多格式支持"];

	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentFeature((prev) => (prev + 1) % features.length);
		}, 3000);
		return () => clearInterval(interval);
	}, [features.length]);

	return (
		<div className="min-h-screen bg-zinc-950 text-white overflow-hidden relative">
			<AnimatedBackground />

			{/* Header */}
			<header className="relative z-10 border-b border-zinc-800/50 backdrop-blur-sm">
				<div className="container mx-auto px-6 py-4">
					<nav className="flex items-center justify-between">
						<div className="flex items-center space-x-2">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
								<Video className="h-4 w-4" />
							</div>
							<span className="text-xl font-bold">Video2PPT</span>
						</div>

						<div className="flex items-center space-x-6">
							<Link href="#features" className="text-zinc-400 hover:text-white transition-colors">
								功能
							</Link>
							<Link href="#how-it-works" className="text-zinc-400 hover:text-white transition-colors">
								使用方法
							</Link>
							<Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
								开始使用
							</Button>
						</div>
					</nav>
				</div>
			</header>

			{/* Hero Section */}
			<section className="relative z-10 pt-20 pb-32">
				<div className="container mx-auto px-6">
					<div className="grid lg:grid-cols-2 gap-12 items-center">
						<div>
							<div className="mb-6">
								<div className="inline-flex items-center space-x-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 px-4 py-2 text-sm">
									<Sparkles className="h-4 w-4 text-blue-400" />
									<span className="text-blue-300">AI驱动的视频转换技术</span>
								</div>
							</div>

							<h1 className="text-5xl lg:text-7xl font-bold mb-6 leading-tight">
								将任意视频
								<br />
								<span className="bg-gradient-to-r from-blue-400 via-purple-400 to-teal-400 bg-clip-text text-transparent">
									智能转换
								</span>
								<br />
								为精美PPT
							</h1>

							<p className="text-xl text-zinc-400 mb-8 leading-relaxed">
								基于WebAV和FFmpeg的先进技术，自动识别视频关键内容， 生成专业幻灯片。支持本地视频、在线链接和实时录屏。
							</p>

							<div className="flex flex-col sm:flex-row gap-4 mb-8">
								<Link href="/screen-recording">
									<Button
										size="lg"
										className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
									>
										<Monitor className="mr-2 h-5 w-5" />
										开始录屏
										<ArrowRight className="ml-2 h-5 w-5" />
									</Button>
								</Link>

								<Link href="/local-video">
									<Button size="lg" variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800">
										<Upload className="mr-2 h-5 w-5" />
										上传视频
									</Button>
								</Link>
							</div>

							<div className="text-sm text-zinc-500">
								当前正在处理:
								<span className="ml-2 text-blue-400 font-medium">{features[currentFeature]}</span>
							</div>
						</div>

						<div className="relative">
							<div className="relative">
								{/* Main demo card */}
								<div className="relative rounded-2xl bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 border border-zinc-700/50 p-8 backdrop-blur-sm">
									<div className="aspect-video rounded-lg bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-zinc-600/30 overflow-hidden mb-6">
										<div className="flex h-full items-center justify-center">
											<Play className="h-16 w-16 text-zinc-400" />
										</div>
									</div>

									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<span className="text-sm text-zinc-400">处理进度</span>
											<span className="text-sm text-blue-400">85%</span>
										</div>
										<div className="h-2 rounded-full bg-zinc-800">
											<div className="h-full w-[85%] rounded-full bg-gradient-to-r from-blue-500 to-purple-600" />
										</div>
									</div>
								</div>

								{/* Floating elements */}
								<div className="absolute -top-4 -right-4 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 p-3 animate-bounce">
									<FileText className="h-6 w-6 text-white" />
								</div>

								<div className="absolute -bottom-4 -left-4 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 p-3 animate-pulse">
									<Zap className="h-6 w-6 text-white" />
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section id="features" className="relative z-10 py-32">
				<div className="container mx-auto px-6">
					<div className="text-center mb-16">
						<h2 className="text-4xl lg:text-5xl font-bold mb-6">
							<span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
								强大功能
							</span>
						</h2>
						<p className="text-xl text-zinc-400 max-w-2xl mx-auto">
							集成最新的WebAV和FFmpeg技术，为您提供专业级的视频处理能力
						</p>
					</div>

					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
						<FeatureCard
							icon={<Video className="h-6 w-6 text-white" />}
							title="智能视频分析"
							description="使用WebAV技术进行深度视频分析，自动识别关键帧和重要内容节点"
							delay={0.1}
						/>

						<FeatureCard
							icon={<Zap className="h-6 w-6 text-white" />}
							title="高效内容提取"
							description="基于FFmpeg的视频处理引擎，快速提取高质量图像和关键信息"
							delay={0.2}
						/>

						<FeatureCard
							icon={<FileText className="h-6 w-6 text-white" />}
							title="自动PPT生成"
							description="智能布局算法，自动生成专业美观的PowerPoint演示文稿"
							delay={0.3}
						/>

						<FeatureCard
							icon={<Globe className="h-6 w-6 text-white" />}
							title="多平台支持"
							description="支持YouTube、Bilibili等主流视频平台，一键导入在线视频"
							delay={0.4}
						/>

						<FeatureCard
							icon={<Monitor className="h-6 w-6 text-white" />}
							title="实时录屏"
							description="内置高清录屏功能，边录制边处理，实时生成演示内容"
							delay={0.5}
						/>

						<FeatureCard
							icon={<Shield className="h-6 w-6 text-white" />}
							title="隐私保护"
							description="本地处理技术，数据不上传服务器，确保您的隐私安全"
							delay={0.6}
						/>
					</div>
				</div>
			</section>

			{/* How it works */}
			<section id="how-it-works" className="relative z-10 py-32">
				<div className="container mx-auto px-6">
					<div className="text-center mb-16">
						<h2 className="text-4xl lg:text-5xl font-bold mb-6">
							<span className="bg-gradient-to-r from-purple-400 to-teal-400 bg-clip-text text-transparent">
								使用方法
							</span>
						</h2>
						<p className="text-xl text-zinc-400">三步完成视频到PPT的智能转换</p>
					</div>

					<div className="grid md:grid-cols-3 gap-12">
						{[
							{
								step: "01",
								title: "上传或录制",
								description: "选择本地视频文件、输入在线视频链接，或直接开始屏幕录制",
								icon: <Upload className="h-8 w-8" />,
							},
							{
								step: "02",
								title: "智能处理",
								description: "AI系统自动分析视频内容，识别关键帧，提取重要信息和文字",
								icon: <Zap className="h-8 w-8" />,
							},
							{
								step: "03",
								title: "生成下载",
								description: "系统自动生成专业PPT文件，支持多种格式导出和在线预览",
								icon: <Download className="h-8 w-8" />,
							},
						].map((item, index) => (
							<div key={index} className="text-center">
								<div className="relative mb-8">
									<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white">
										{item.icon}
									</div>
									<div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-sm font-bold">
										{item.step}
									</div>
								</div>
								<h3 className="text-2xl font-semibold mb-4">{item.title}</h3>
								<p className="text-zinc-400">{item.description}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="relative z-10 py-32">
				<div className="container mx-auto px-6">
					<div className="text-center">
						<div className="rounded-2xl bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-zinc-700/50 p-12 backdrop-blur-sm">
							<h2 className="text-4xl lg:text-5xl font-bold mb-6">准备好开始了吗？</h2>
							<p className="text-xl text-zinc-400 mb-8 max-w-2xl mx-auto">
								立即体验Video2PPT的强大功能，将您的视频内容转换为专业演示文稿
							</p>

							<div className="flex flex-col sm:flex-row gap-4 justify-center">
								<Link href="/screen-recording">
									<Button
										size="lg"
										className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
									>
										<Monitor className="mr-2 h-5 w-5" />
										开始录屏转换
									</Button>
								</Link>

								<Link href="/local-video">
									<Button size="lg" variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800">
										<Upload className="mr-2 h-5 w-5" />
										上传本地视频
									</Button>
								</Link>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="relative z-10 border-t border-zinc-800/50 py-12">
				<div className="container mx-auto px-6">
					<div className="flex flex-col md:flex-row justify-between items-center">
						<div className="flex items-center space-x-2 mb-4 md:mb-0">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
								<Video className="h-4 w-4" />
							</div>
							<span className="text-xl font-bold">Video2PPT</span>
						</div>

						<div className="text-zinc-400 text-sm">© 2024 Video2PPT. 基于WebAV和FFmpeg技术构建</div>
					</div>
				</div>
			</footer>
		</div>
	);
};

export default HomePage;
