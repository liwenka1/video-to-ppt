import type { Metadata } from "next";
import { Github, Mail, Twitter, Video } from "lucide-react";

// 网站元数据配置
export const SiteMetadata: Metadata = {
	title: "VideoToPPT - 智能视频转PPT工具",
	description: "基于 WebAV 和 FFmpeg 的现代化视频分析与 PPT 生成工具，支持屏幕录制、本地视频处理和在线视频分析",
	keywords: ["视频转PPT", "WebAV", "FFmpeg", "屏幕录制", "视频分析", "PPT生成", "智能转换"],
	authors: [{ name: "liwenka1" }],
	creator: "liwenka1",
	publisher: "liwenka1",
	openGraph: {
		title: "VideoToPPT - 智能视频转PPT工具",
		description: "基于 WebAV 和 FFmpeg 的现代化视频分析与 PPT 生成工具",
		type: "website",
		locale: "zh_CN",
	},
	twitter: {
		card: "summary_large_image",
		title: "VideoToPPT - 智能视频转PPT工具",
		description: "基于 WebAV 和 FFmpeg 的现代化视频分析与 PPT 生成工具",
		creator: "@liwenka1",
	},
	robots: {
		index: true,
		follow: true,
	},
};

// 项目信息配置
export const ProjectInfo = {
	name: "VideoToPPT",
	tagline: "智能视频转PPT工具",
	description: "基于 WebAV 和 FFmpeg 的现代化视频分析与 PPT 生成工具，支持屏幕录制、本地视频处理和在线视频分析",
	version: "1.0.0",
	repository: {
		type: "github",
		url: "https://github.com/liwenka1/video-to-ppt",
		name: "video-to-ppt",
	},
	features: ["智能视频分析", "实时内容提取", "自动PPT生成", "多格式支持", "屏幕录制", "本地处理", "隐私保护"],
	technologies: ["TypeScript", "Next.js 15", "WebAV", "FFmpeg.wasm", "Tailwind CSS", "Shadcn/ui"],
	license: "MIT",
} as const;

// 个人信息配置
export const ResumeData = {
	personal: {
		name: "liwenka1",
		title: "Full Stack Developer",
		bio: "专注于现代化 Web 技术开发，热衷于视频处理和 AI 应用开发",
	},
	contact: {
		email: "2020583117@qq.com",
		social: {
			GitHub: {
				name: "GitHub",
				url: "https://github.com/liwenka1",
				icon: Github,
				username: "@liwenka1",
			},
			X: {
				name: "Twitter",
				url: "https://x.com/liwenka1",
				icon: Twitter,
				username: "@liwenka1",
			},
			email: {
				name: "Send Email",
				url: "mailto:2020583117@qq.com",
				icon: Mail,
			},
		},
	},
	projects: {
		featured: {
			name: ProjectInfo.name,
			description: ProjectInfo.description,
			url: ProjectInfo.repository.url,
			icon: Video,
			technologies: ProjectInfo.technologies,
			features: ProjectInfo.features,
		},
	},
} as const;

// 导出类型定义
export type ProjectInfoType = typeof ProjectInfo;
export type ResumeDataType = typeof ResumeData;
