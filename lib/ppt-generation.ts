import { generateTimestamp } from "./utils";

interface PPTSlideData {
	image: string;
	title?: string;
	description?: string;
}

export async function createAndDownloadPPT(
	screenshots: string[],
	options: {
		title?: string;
		maxSlides?: number;
		sortByImportance?: boolean;
	} = {}
): Promise<void> {
	try {
		// Dynamic import to avoid SSR issues
		const PptxGenJS = (await import("pptxgenjs")).default;

		if (screenshots.length === 0) {
			throw new Error("No screenshots available to create PPT");
		}

		const pptx = new PptxGenJS();

		// Set presentation properties
		pptx.author = "Video2PPT";
		pptx.company = "Video2PPT";
		pptx.title = options.title || "Video Analysis Presentation";

		const maxSlides = options.maxSlides || 256;
		const slidesToProcess = screenshots.slice(0, maxSlides);

		// Add title slide
		const titleSlide = pptx.addSlide();
		titleSlide.addText(options.title || "Video Analysis", {
			x: 1,
			y: 1,
			w: 8,
			h: 1,
			fontSize: 32,
			fontFace: "Arial",
			color: "363636",
			align: "center",
			bold: true,
		});

		titleSlide.addText(`Generated on ${new Date().toLocaleDateString()}`, {
			x: 1,
			y: 6,
			w: 8,
			h: 0.5,
			fontSize: 16,
			fontFace: "Arial",
			color: "666666",
			align: "center",
		});

		// Add screenshot slides
		for (let i = 0; i < slidesToProcess.length; i++) {
			const slide = pptx.addSlide();
			const screenshotUrl = slidesToProcess[i];

			try {
				// Add the screenshot image
				slide.addImage({
					path: screenshotUrl,
					x: 0.5,
					y: 0.5,
					w: 9,
					h: 6.75,
					sizing: {
						type: "contain",
						w: 9,
						h: 6.75,
					},
				});

				// Add slide number
				slide.addText(`${i + 1} / ${slidesToProcess.length}`, {
					x: 8.5,
					y: 7,
					w: 1,
					h: 0.3,
					fontSize: 10,
					fontFace: "Arial",
					color: "999999",
					align: "right",
				});
			} catch (error) {
				console.error(`Error adding slide ${i + 1}:`, error);
				// Add error slide instead
				slide.addText(`Error loading slide ${i + 1}`, {
					x: 1,
					y: 3,
					w: 8,
					h: 1,
					fontSize: 24,
					fontFace: "Arial",
					color: "FF0000",
					align: "center",
				});
			}
		}

		// Generate filename with timestamp
		const timestamp = generateTimestamp();
		const fileName = `Video2PPT_${timestamp}.pptx`;

		// Download the file
		await pptx.writeFile({ fileName });

		console.log(`PPT generated successfully: ${fileName}`);
	} catch (error) {
		console.error("Error creating PPT:", error);
		throw error;
	}
}

export async function createPPTFromVideoAnalysis(
	analysisResult: {
		keyFrames: string[];
		scenes: Array<{
			startTime: number;
			endTime: number;
			thumbnail: string;
		}>;
	},
	options: {
		title?: string;
		includeSceneBreaks?: boolean;
	} = {}
): Promise<void> {
	try {
		const PptxGenJS = (await import("pptxgenjs")).default;
		const pptx = new PptxGenJS();

		// Set presentation properties
		pptx.author = "Video2PPT";
		pptx.company = "Video2PPT";
		pptx.title = options.title || "Smart Video Analysis";

		// Add title slide
		const titleSlide = pptx.addSlide();
		titleSlide.addText(options.title || "Smart Video Analysis", {
			x: 1,
			y: 1,
			w: 8,
			h: 1,
			fontSize: 32,
			fontFace: "Arial",
			color: "363636",
			align: "center",
			bold: true,
		});

		titleSlide.addText("Generated using WebAV + FFmpeg Technology", {
			x: 1,
			y: 2.5,
			w: 8,
			h: 0.5,
			fontSize: 16,
			fontFace: "Arial",
			color: "666666",
			align: "center",
		});

		// Add scene-based slides
		if (options.includeSceneBreaks && analysisResult.scenes.length > 0) {
			for (let i = 0; i < analysisResult.scenes.length; i++) {
				const scene = analysisResult.scenes[i];
				const slide = pptx.addSlide();

				// Add scene thumbnail
				slide.addImage({
					path: scene.thumbnail,
					x: 0.5,
					y: 1,
					w: 9,
					h: 5,
					sizing: {
						type: "contain",
						w: 9,
						h: 5,
					},
				});

				// Add scene information
				const duration = scene.endTime - scene.startTime;
				slide.addText(`Scene ${i + 1}`, {
					x: 0.5,
					y: 6.5,
					w: 4,
					h: 0.5,
					fontSize: 18,
					fontFace: "Arial",
					color: "363636",
					bold: true,
				});

				slide.addText(`Duration: ${duration.toFixed(1)}s`, {
					x: 5,
					y: 6.5,
					w: 4,
					h: 0.5,
					fontSize: 14,
					fontFace: "Arial",
					color: "666666",
				});
			}
		} else {
			// Add key frames
			for (let i = 0; i < analysisResult.keyFrames.length; i++) {
				const slide = pptx.addSlide();

				slide.addImage({
					path: analysisResult.keyFrames[i],
					x: 0.5,
					y: 0.5,
					w: 9,
					h: 6.75,
					sizing: {
						type: "contain",
						w: 9,
						h: 6.75,
					},
				});

				// Add slide number
				slide.addText(`Key Frame ${i + 1}`, {
					x: 0.5,
					y: 7.25,
					w: 9,
					h: 0.25,
					fontSize: 12,
					fontFace: "Arial",
					color: "999999",
					align: "center",
				});
			}
		}

		// Generate filename
		const timestamp = generateTimestamp();
		const fileName = `SmartVideo2PPT_${timestamp}.pptx`;

		await pptx.writeFile({ fileName });
		console.log(`Smart PPT generated successfully: ${fileName}`);
	} catch (error) {
		console.error("Error creating smart PPT:", error);
		throw error;
	}
}

export function convertScreenshotsToSlideData(screenshots: string[]): PPTSlideData[] {
	return screenshots.map((screenshot, index) => ({
		image: screenshot,
		title: `Slide ${index + 1}`,
		description: `Screenshot captured at frame ${index + 1}`,
	}));
}
