import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function generateTimestamp(): string {
	const now = new Date();
	return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}_${now.getHours().toString().padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}`;
}

export function calculateImageDifference(imgData1: ImageData, imgData2: ImageData): number {
	let sumOfSquares = 0;
	const length = imgData1.data.length;

	for (let i = 0; i < length; i += 4) {
		const r = imgData1.data[i];
		const g = imgData1.data[i + 1];
		const b = imgData1.data[i + 2];
		const luminance1 = 0.2126 * r + 0.7152 * g + 0.0722 * b;

		const r2 = imgData2.data[i];
		const g2 = imgData2.data[i + 1];
		const b2 = imgData2.data[i + 2];
		const luminance2 = 0.2126 * r2 + 0.7152 * g2 + 0.0722 * b2;

		const diff = luminance1 - luminance2;
		sumOfSquares += diff * diff;
	}

	const avgSquareDiff = sumOfSquares / (length / 4);
	return Math.sqrt(avgSquareDiff);
}
