// Video format diagnostics and utilities

export interface VideoFormatInfo {
	fileName: string;
	fileSize: number;
	mimeType: string;
	detectedFormat: string;
	isSupported: boolean;
	recommendations: string[];
}

export interface BrowserCapabilities {
	hasSharedArrayBuffer: boolean;
	hasWebAssembly: boolean;
	isSecureContext: boolean;
	userAgent: string;
}

// Check browser capabilities for video processing
export function checkBrowserCapabilities(): BrowserCapabilities {
	const hasSharedArrayBuffer = typeof SharedArrayBuffer !== "undefined";
	const hasWebAssembly = typeof WebAssembly !== "undefined";
	const isSecureContext = typeof window !== "undefined" ? window.isSecureContext : false;
	const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";

	return {
		hasSharedArrayBuffer,
		hasWebAssembly,
		isSecureContext,
		userAgent,
	};
}

// Detect video format from MIME type and extension
function detectFormat(mimeType: string, extension: string): string {
	// Priority: MIME type first, then extension
	if (mimeType) {
		const mimeFormatMap: Record<string, string> = {
			"video/mp4": "MP4",
			"video/webm": "WebM",
			"video/quicktime": "QuickTime (MOV)",
			"video/x-msvideo": "AVI",
			"video/x-matroska": "Matroska (MKV)",
			"video/3gpp": "3GP",
			"video/x-flv": "Flash Video (FLV)",
			"video/x-ms-wmv": "Windows Media Video (WMV)",
			"video/ogg": "Ogg Video",
			"video/x-ms-asf": "Advanced Systems Format (ASF)",
			"video/x-f4v": "Flash Video (F4V)",
			"video/x-m4v": "iTunes Video (M4V)",
		};

		if (mimeFormatMap[mimeType.toLowerCase()]) {
			return mimeFormatMap[mimeType.toLowerCase()];
		}
	}

	// Fallback to extension
	const extensionFormatMap: Record<string, string> = {
		mp4: "MP4",
		webm: "WebM",
		mov: "QuickTime (MOV)",
		avi: "AVI",
		mkv: "Matroska (MKV)",
		"3gp": "3GP",
		flv: "Flash Video (FLV)",
		wmv: "Windows Media Video (WMV)",
		ogv: "Ogg Video",
		asf: "Advanced Systems Format (ASF)",
		f4v: "Flash Video (F4V)",
		m4v: "iTunes Video (M4V)",
	};

	return extensionFormatMap[extension] || `Unknown (${extension || "no extension"})`;
}

// Check if video format is supported
function isSupportedVideoFormat(mimeType: string, extension: string): boolean {
	const supportedMimeTypes = [
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

	const supportedExtensions = ["mp4", "webm", "mov", "avi", "mkv", "3gp", "flv", "wmv", "ogv", "asf", "f4v", "m4v"];

	return supportedMimeTypes.includes(mimeType.toLowerCase()) || supportedExtensions.includes(extension.toLowerCase());
}

// Generate recommendations based on file analysis
function generateRecommendations(file: File, format: string, fileSize: number): string[] {
	const recommendations: string[] = [];
	const sizeMB = fileSize / (1024 * 1024);

	// File size recommendations
	if (sizeMB > 100) {
		recommendations.push("文件较大，转换可能需要较长时间");
	}

	// Format-specific recommendations
	if (format.includes("MP4")) {
		recommendations.push("MP4格式可能支持直接复制，转换速度很快");
	} else if (format.includes("WMV") || format.includes("ASF")) {
		recommendations.push("WMV格式需要重新编码，转换可能需要更长时间");
	} else if (format.includes("Unknown")) {
		recommendations.push("无法识别的格式，转换可能失败。建议使用常见格式如MP4、AVI等");
	} else {
		recommendations.push("将尝试直接复制，如失败则重新编码");
	}

	// Browser compatibility recommendations
	const capabilities = checkBrowserCapabilities();

	if (!capabilities.hasSharedArrayBuffer) {
		recommendations.push("浏览器不支持SharedArrayBuffer，可能影响转换性能。建议使用最新版Chrome或Firefox");
	}

	if (!capabilities.isSecureContext) {
		recommendations.push("当前不在安全上下文(HTTPS)中，可能影响某些功能。建议使用HTTPS访问");
	}

	return recommendations;
}

// Diagnose video file format and compatibility
export function diagnoseVideoFile(file: File): VideoFormatInfo {
	const fileName = file.name;
	const fileSize = file.size;
	const mimeType = file.type;

	// Detect format from file extension and MIME type
	const extension = fileName.split(".").pop()?.toLowerCase() || "";
	const detectedFormat = detectFormat(mimeType, extension);

	// Check if format is supported
	const isSupported = isSupportedVideoFormat(mimeType, extension);

	// Generate recommendations
	const recommendations = generateRecommendations(file, detectedFormat, fileSize);

	return {
		fileName,
		fileSize,
		mimeType,
		detectedFormat,
		isSupported,
		recommendations,
	};
}

// Generate diagnostic report
export function generateDiagnosticReport(file: File): string {
	const videoInfo = diagnoseVideoFile(file);
	const browserInfo = checkBrowserCapabilities();

	const report = `
=== 视频文件诊断报告 ===

文件信息：
- 文件名：${videoInfo.fileName}
- 文件大小：${(videoInfo.fileSize / 1024 / 1024).toFixed(2)} MB
- MIME类型：${videoInfo.mimeType || "未知"}
- 检测格式：${videoInfo.detectedFormat}
- 是否支持：${videoInfo.isSupported ? "是" : "否"}

浏览器兼容性：
- SharedArrayBuffer：${browserInfo.hasSharedArrayBuffer ? "支持" : "不支持"}
- WebAssembly：${browserInfo.hasWebAssembly ? "支持" : "不支持"}
- 安全上下文：${browserInfo.isSecureContext ? "是" : "否"}

建议：
${videoInfo.recommendations.map((rec) => `- ${rec}`).join("\n")}

=== 报告结束 ===
	`.trim();

	return report;
}
