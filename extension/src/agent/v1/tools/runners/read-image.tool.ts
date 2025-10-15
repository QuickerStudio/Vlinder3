import * as path from 'path';
import * as fs from 'fs/promises';
import dedent from 'dedent';
import { Jimp } from 'jimp';
import * as webp from 'webp-wasm';

import { getReadablePath } from '../../utils';
import { BaseAgentTool } from '../base-agent.tool';
import { ReadImageToolParams } from '../schema/read-image';

// ============================================================================
// Image Processing Utilities (integrated from Vlinder)
// ============================================================================

// WebP initialization state
let webpInitialized = false;
let webpInitError: Error | null = null;

/**
 * Image metadata interface
 */
interface ImageMetadata {
	width?: number;
	height?: number;
	size: number;
	format: string;
	mimeType: string;
	fileName: string;
	filePath: string;
}

/**
 * Image quality report interface
 */
interface ImageQualityReport {
	isOptimal: boolean;
	warnings: string[];
	recommendations: string[];
	estimatedTokens: number;
	estimatedCost: number;
	currentDimensions: { width: number; height: number };
	recommendedDimensions?: { width: number; height: number };
}

/**
 * Image optimization options
 */
interface ImageOptimizationOptions {
	maxWidth?: number;
	maxHeight?: number;
	jpegQuality?: number;
	pngCompressionLevel?: number;
	webpQuality?: number;
	preferWebP?: boolean;
}

/**
 * Get MIME type from file path
 */
function getMimeType(filePath: string): string {
	const ext = path.extname(filePath).toLowerCase();
	switch (ext) {
		case '.png':
			return 'image/png';
		case '.jpeg':
		case '.jpg':
			return 'image/jpeg';
		case '.webp':
			return 'image/webp';
		case '.gif':
			return 'image/gif';
		default:
			throw new Error(`Unsupported file type: ${ext}`);
	}
}

/**
 * Extract image dimensions from buffer
 */
function extractImageDimensions(
	buffer: Buffer,
	format: string
): { width: number; height: number } | null {
	try {
		if (format === 'png' && buffer.length >= 24) {
			const width = buffer.readUInt32BE(16);
			const height = buffer.readUInt32BE(20);
			return { width, height };
		} else if ((format === 'jpg' || format === 'jpeg') && buffer.length >= 2) {
			for (let i = 0; i < buffer.length - 9; i++) {
				if (buffer[i] === 0xff && buffer[i + 1] === 0xc0) {
					const height = buffer.readUInt16BE(i + 5);
					const width = buffer.readUInt16BE(i + 7);
					return { width, height };
				}
			}
		}
		return null;
	} catch (error) {
		return null;
	}
}

/**
 * Read a single image from file path and convert to base64 data URL
 */
async function readImageFromPath(filePath: string): Promise<string> {
	try {
		const buffer = await fs.readFile(filePath);
		const base64 = buffer.toString('base64');
		const mimeType = getMimeType(filePath);
		const dataUrl = `data:${mimeType};base64,${base64}`;
		return dataUrl;
	} catch (error) {
		throw new Error(
			`Failed to read image from ${filePath}: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

/**
 * Get image metadata without loading the full image
 */
async function getImageMetadata(filePath: string): Promise<ImageMetadata> {
	const stats = await fs.stat(filePath);
	const buffer = await fs.readFile(filePath);
	const mimeType = getMimeType(filePath);
	const format = path.extname(filePath).toLowerCase().slice(1);

	const dimensions = extractImageDimensions(buffer, format);

	return {
		width: dimensions?.width,
		height: dimensions?.height,
		size: stats.size,
		format,
		mimeType,
		fileName: path.basename(filePath),
		filePath,
	};
}

/**
 * Validate if a file is a supported image format
 */
function isSupportedImageFormat(filePath: string): boolean {
	const ext = path.extname(filePath).toLowerCase();
	return ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext);
}

/**
 * Convert image buffer to base64 data URL
 */
function bufferToDataUrl(buffer: Buffer, mimeType: string): string {
	const base64 = buffer.toString('base64');
	return `data:${mimeType};base64,${base64}`;
}

/**
 * Check image quality and provide recommendations
 */
async function checkImageQuality(filePath: string): Promise<ImageQualityReport> {
	const metadata = await getImageMetadata(filePath);
	const warnings: string[] = [];
	const recommendations: string[] = [];

	const { width = 0, height = 0, size } = metadata;
	const pixels = width * height;

	if (width < 200 || height < 200) {
		warnings.push('⚠️ Image is too small (<200px on any edge), may degrade Claude performance');
		recommendations.push('💡 Use a higher resolution image (≥200px on all edges)');
	}

	if (width > 1568 || height > 1568) {
		warnings.push('⚠️ Image is larger than recommended (>1568px), will increase latency');
		recommendations.push('💡 Resize to ≤1568px to reduce latency without losing model performance');
	}

	if (width > 8000 || height > 8000) {
		warnings.push('❌ Image is too large (>8000px), will be rejected by Claude API');
		recommendations.push('💡 Resize to ≤1568px for optimal performance');
	}

	if (size > 5 * 1024 * 1024) {
		warnings.push('⚠️ Image is larger than 5MB, may be rejected by Claude API');
		recommendations.push('💡 Compress or resize the image to reduce file size');
	}

	const estimatedTokens = Math.ceil(pixels / 750);
	const estimatedCost = (estimatedTokens / 1000000) * 3;

	let recommendedDimensions: { width: number; height: number } | undefined;
	if (width > 1568 || height > 1568) {
		const aspectRatio = width / height;
		if (aspectRatio > 1) {
			recommendedDimensions = {
				width: 1568,
				height: Math.round(1568 / aspectRatio),
			};
		} else {
			recommendedDimensions = {
				width: Math.round(1568 * aspectRatio),
				height: 1568,
			};
		}
	}

	return {
		isOptimal: warnings.length === 0,
		warnings,
		recommendations,
		estimatedTokens,
		estimatedCost,
		currentDimensions: { width, height },
		recommendedDimensions,
	};
}

/**
 * Initialize WebP encoder
 */
async function initializeWebP(): Promise<boolean> {
	if (webpInitialized) {
		return true;
	}

	if (webpInitError) {
		return false;
	}

	try {
		const testImageData = {
			data: new Uint8ClampedArray([255, 0, 0, 255]),
			width: 1,
			height: 1,
		};
		await webp.encode(testImageData, { quality: 85 });
		webpInitialized = true;
		return true;
	} catch (error) {
		webpInitError = error instanceof Error ? error : new Error(String(error));
		console.warn('WebP encoder initialization failed, will use JPEG/PNG fallback:', error);
		return false;
	}
}

/**
 * Optimize image for Claude API using Jimp with WebP support
 */
async function optimizeImageForClaude(
	buffer: Buffer,
	originalFormat: string,
	options: ImageOptimizationOptions = {}
): Promise<{ buffer: Buffer; mimeType: string }> {
	const {
		maxWidth = 1568,
		maxHeight = 1568,
		jpegQuality = 85,
		webpQuality = 75,
		preferWebP = true,
	} = options;

	try {
		const inputFormat = originalFormat.toLowerCase();
		
		// Handle WebP input
		if (inputFormat === 'webp') {
			const webpAvailable = await initializeWebP();
			if (!webpAvailable) {
				return { buffer, mimeType: 'image/webp' };
			}

			const decoded = await webp.decode(buffer);
			const width = decoded.width;
			const height = decoded.height;
			const needsResize = width > maxWidth || height > maxHeight;

			if (!needsResize) {
				return { buffer, mimeType: 'image/webp' };
			}

			const jimpImage = new Jimp({
				data: Buffer.from(new Uint8Array(decoded.data.buffer)),
				width: decoded.width,
				height: decoded.height
			});

			jimpImage.scaleToFit({ w: maxWidth, h: maxHeight });

			const imageData = {
				data: new Uint8ClampedArray(jimpImage.bitmap.data),
				width: jimpImage.bitmap.width,
				height: jimpImage.bitmap.height,
			};
			const optimizedBuffer = await webp.encode(imageData, { quality: webpQuality });

			return {
				buffer: optimizedBuffer,
				mimeType: 'image/webp'
			};
		}

		// Load image with Jimp
		const image = await Jimp.read(buffer);
		const width = image.bitmap.width;
		const height = image.bitmap.height;
		const needsResize = width > maxWidth || height > maxHeight;

		const format = originalFormat.toLowerCase();
		let mimeType: string;

		if (format === 'jpeg' || format === 'jpg') {
			mimeType = 'image/jpeg';
		} else if (format === 'png') {
			mimeType = 'image/png';
		} else if (format === 'webp') {
			mimeType = 'image/webp';
		} else if (format === 'gif') {
			mimeType = 'image/png';
		} else {
			mimeType = 'image/jpeg';
		}

		if (!needsResize && (format === 'jpeg' || format === 'jpg' || format === 'png')) {
			return { buffer, mimeType };
		}

		if (needsResize) {
			image.scaleToFit({ w: maxWidth, h: maxHeight });
		}

		let optimizedBuffer: Buffer;
		let outputMimeType: string;

		if (preferWebP) {
			const webpAvailable = await initializeWebP();
			
			if (webpAvailable) {
				try {
					const imageData = {
						data: new Uint8ClampedArray(image.bitmap.data),
						width: image.bitmap.width,
						height: image.bitmap.height,
					};

					optimizedBuffer = await webp.encode(imageData, { quality: webpQuality });
					outputMimeType = 'image/webp';
				} catch (webpError) {
					console.warn('[Image Optimization] WebP encoding failed, fallback to JPEG/PNG:', webpError);
					if (format === 'png' || format === 'gif') {
						optimizedBuffer = await image.getBuffer('image/png');
						outputMimeType = 'image/png';
					} else {
						optimizedBuffer = await image.getBuffer('image/jpeg', { quality: jpegQuality });
						outputMimeType = 'image/jpeg';
					}
				}
			} else {
				if (format === 'png' || format === 'gif') {
					optimizedBuffer = await image.getBuffer('image/png');
					outputMimeType = 'image/png';
				} else {
					optimizedBuffer = await image.getBuffer('image/jpeg', { quality: jpegQuality });
					outputMimeType = 'image/jpeg';
				}
			}
		} else if (format === 'png' || format === 'gif') {
			optimizedBuffer = await image.getBuffer('image/png');
			outputMimeType = 'image/png';
		} else {
			optimizedBuffer = await image.getBuffer('image/jpeg', { quality: jpegQuality });
			outputMimeType = 'image/jpeg';
		}

		// Smart choice: keep original if optimized is larger
		if (optimizedBuffer.length > buffer.length) {
			console.log(`[Image Optimization] Smart choice: optimized is larger, keeping original`);
			return {
				buffer,
				mimeType: format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg',
			};
		}
		
		const compressionRatio = ((1 - optimizedBuffer.length / buffer.length) * 100).toFixed(2);
		console.log(`[Image Optimization] Success: ${format} → ${outputMimeType.split('/')[1]}, ` +
			`${buffer.length}B → ${optimizedBuffer.length}B (-${compressionRatio}%)`);

		return {
			buffer: optimizedBuffer,
			mimeType: outputMimeType,
		};
	} catch (error) {
		console.error('Image optimization failed:', error);
		const format = originalFormat.toLowerCase();
		return {
			buffer,
			mimeType: `image/${format}`,
		};
	}
}

// ============================================================================
// ReadImageTool Class
// ============================================================================

/**
 * Tool for reading images from the file system
 * Converts images to base64 format for use in AI messages
 */
export class ReadImageTool extends BaseAgentTool<ReadImageToolParams> {
	async execute() {
		const { input, ask, say } = this.params;
		const {
			path: relPath,
			get_metadata,
			auto_optimize = true,
			max_dimension = 1568,
			quality = 85,
		} = input;

		try {
			// Resolve absolute path
			const absolutePath = path.resolve(this.cwd, relPath);
			const readablePath = getReadablePath(relPath, this.cwd);

			// Validate file format (Anthropic Claude API supported formats)
			if (!isSupportedImageFormat(absolutePath)) {
				const errorMsg = `Unsupported image format. File: ${readablePath}. Supported formats: PNG, JPG, JPEG, WebP, GIF (compatible with Anthropic Claude API)`;
				await say('error', errorMsg);
				return this.toolResponse('error', errorMsg);
			}

			// Check image quality first
			let qualityReport: ImageQualityReport | null = null;
			let qualityWarnings: string[] = [];
			
			try {
				qualityReport = await checkImageQuality(absolutePath);

				if (!qualityReport.isOptimal) {
					qualityWarnings.push(dedent`
						⚠️ Image Quality Warning:
						${qualityReport.warnings.join('\n')}

						💡 Recommendations:
						${qualityReport.recommendations.join('\n')}

						📊 Current: ${qualityReport.currentDimensions.width}x${qualityReport.currentDimensions.height}px
						${qualityReport.recommendedDimensions ? `📊 Recommended: ${qualityReport.recommendedDimensions.width}x${qualityReport.recommendedDimensions.height}px` : ''}
						📈 Estimated: ${qualityReport.estimatedTokens} tokens (~$${qualityReport.estimatedCost.toFixed(4)})

						${auto_optimize ? '✅ Auto-optimization is enabled. The image will be optimized automatically.' : '⚠️ Auto-optimization is disabled. Consider enabling it for better performance.'}
					`);
				}
			} catch (error) {
				qualityWarnings.push(
					`⚠️ Could not check image quality: ${error instanceof Error ? error.message : String(error)}`
				);
			}

			// Read image and optionally optimize
			let imageData: string;
			let metadata: any = null;
			let optimizationApplied = false;

			try {
				const originalBuffer = await fs.readFile(absolutePath);
				const originalFormat = path.extname(absolutePath).slice(1);

				if (auto_optimize) {
					try {
						const { buffer: optimizedBuffer, mimeType } =
							await optimizeImageForClaude(originalBuffer, originalFormat, {
								maxWidth: max_dimension,
								maxHeight: max_dimension,
								jpegQuality: quality,
								webpQuality: quality,
							});

						imageData = bufferToDataUrl(optimizedBuffer, mimeType);
						optimizationApplied = true;

						if (get_metadata) {
							const optimizedImage = await Jimp.read(optimizedBuffer);
							metadata = {
								format: originalFormat,
								size: optimizedBuffer.length,
								width: optimizedImage.bitmap.width,
								height: optimizedImage.bitmap.height,
								mimeType,
								optimized: true,
								originalSize: originalBuffer.length,
								originalDimensions: qualityReport?.currentDimensions,
							};
						}
					} catch (optimizeError) {
						qualityWarnings.push(
							`⚠️ Image optimization failed, using original: ${optimizeError instanceof Error ? optimizeError.message : String(optimizeError)}`
						);
						imageData = await readImageFromPath(absolutePath);
						optimizationApplied = false;

						if (get_metadata) {
							metadata = await getImageMetadata(absolutePath);
						}
					}
				} else {
					imageData = await readImageFromPath(absolutePath);

					if (get_metadata) {
						metadata = await getImageMetadata(absolutePath);
					}
				}
			} catch (error) {
				const errorMsg = `Failed to read image: ${error instanceof Error ? error.message : String(error)}`;
				await say('error', errorMsg);
				return this.toolResponse('error', errorMsg);
			}

			const base64Data = imageData.includes(',')
				? imageData.split(',')[1]
				: imageData;

			// Ask for approval to use the image
			const { response, text, images } = await ask(
				'tool',
				{
					tool: {
						tool: 'read_image',
						path: readablePath,
						approvalState: 'pending',
						imageData: base64Data,
						metadata,
						ts: this.ts,
					},
				},
				this.ts
			);

			if (response !== 'yesButtonTapped') {
				await this.params.updateAsk(
					'tool',
					{
						tool: {
							tool: 'read_image',
							path: readablePath,
							approvalState: 'rejected',
							imageData: base64Data,
							metadata,
							userFeedback: text,
							ts: this.ts,
						},
					},
					this.ts
				);

				if (response === 'messageResponse') {
					await say(
						'user_feedback',
						text ?? 'The user denied this operation.',
						images
					);
					return this.toolResponse('feedback', text, images);
				}

				return this.toolResponse(
					'error',
					'Image read operation cancelled by user.'
				);
			}

			// Update approval state
			await this.params.updateAsk(
				'tool',
				{
					tool: {
						tool: 'read_image',
						path: readablePath,
						approvalState: 'approved',
						imageData: base64Data,
						metadata,
						ts: this.ts,
					},
				},
				this.ts
			);

			// Prepare response message
			let responseMsg = dedent`Successfully read image from ${readablePath}`;

			if (qualityWarnings.length > 0) {
				responseMsg += '\n\n' + qualityWarnings.join('\n\n');
			}

			if (metadata) {
				responseMsg += dedent`

					Image Metadata:
					- Format: ${metadata.format.toUpperCase()}
					- Size: ${(metadata.size / 1024).toFixed(2)} KB
					${metadata.width && metadata.height ? `- Dimensions: ${metadata.width}x${metadata.height}px` : ''}
					- MIME Type: ${metadata.mimeType}
				`;

				if (metadata.optimized) {
					const sizeSaved = metadata.originalSize - metadata.size;
					const percentSaved = ((sizeSaved / metadata.originalSize) * 100).toFixed(1);
					responseMsg += dedent`

						✅ Image Optimization Applied (Jimp + WebP):
						- Original Size: ${(metadata.originalSize / 1024).toFixed(2)} KB
						- Optimized Size: ${(metadata.size / 1024).toFixed(2)} KB
						- Saved: ${(sizeSaved / 1024).toFixed(2)} KB (${percentSaved}%)
						${metadata.originalDimensions ? `- Original Dimensions: ${metadata.originalDimensions.width}x${metadata.originalDimensions.height}px` : ''}
						- Optimized Dimensions: ${metadata.width}x${metadata.height}px
					`;
				}
			}

			if (optimizationApplied && !metadata) {
				responseMsg += dedent`

					✅ Image has been optimized using Jimp preprocessing and WebP format conversion (resized to ≤${max_dimension}px)
				`;
			}

			responseMsg += dedent`

				The image is now attached to this tool response and available in the conversation context.
				You can reference and analyze this image in your responses.
			`;

			return this.toolResponse('success', responseMsg, [imageData]);
		} catch (error) {
			const errorMsg = `Unexpected error reading image: ${error instanceof Error ? error.message : String(error)}`;
			await say('error', errorMsg);
			return this.toolResponse('error', errorMsg);
		}
	}
}
