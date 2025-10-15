import * as path from 'path';
import { serializeError } from 'serialize-error';
import dedent from 'dedent';

import { getReadablePath } from '../../../utils';
import { BaseAgentTool } from '../../base-agent.tool';
import { ReadImageToolParams } from '../../schema/read-image';
import {
	readImageFromPath,
	getImageMetadata,
	isSupportedImageFormat,
	checkImageQuality,
	optimizeImageForClaude,
	bufferToDataUrl,
} from '../../../../../utils/process-images';
import * as fs from 'fs/promises';

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
		let qualityReport: any = null;
		let qualityWarnings: string[] = []; // 收集警告信息，稍后放入 toolResponse
		
		try {
			qualityReport = await checkImageQuality(absolutePath);

			// Collect warnings if image is not optimal (不使用 say，收集到数组中)
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
			// Quality check failed, but continue with image reading
			qualityWarnings.push(
				`⚠️ Could not check image quality: ${error instanceof Error ? error.message : String(error)}`
			);
		}

			// Read image and optionally optimize
			let imageData: string;
			let metadata: any = null;
			let optimizationApplied = false;

			try {
				// Read original image buffer
				const originalBuffer = await fs.readFile(absolutePath);
				const originalFormat = path.extname(absolutePath).slice(1);

				// Optimize if enabled
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

						// Get metadata from optimized image if requested
						if (get_metadata) {
							const { Jimp } = await import('jimp');
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
					// Optimization failed, fall back to original
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
					// No optimization, use original
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

			// Extract base64 data without the data URL prefix for UI display
			// imageData format: "data:image/png;base64,iVBORw0KG..."
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
						imageData: base64Data, // Send full base64 data for UI display
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

		// 添加质量警告和优化信息到 toolResponse（显示在工具块内部）
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

			// Return the image data through toolResponse (not through say)
			// This ensures all models (text and multimodal) receive the image through the tool result
			return this.toolResponse('success', responseMsg, [imageData]);
		} catch (error) {
			const errorMsg = `Unexpected error reading image: ${error instanceof Error ? error.message : String(error)}`;
			await say('error', errorMsg);
			return this.toolResponse('error', errorMsg);
		}
	}
}

