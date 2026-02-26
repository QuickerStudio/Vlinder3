import { ToolPromptSchema } from '../utils/utils';

export const readImagePrompt: ToolPromptSchema = {
	name: 'read_image',
	description: `Read and analyze images from screenshots, diagrams, charts, or photos. Use when you need to see what's in an image file. Automatically optimizes images for API compatibility.`,
	// No requiresFeatures - available for ALL models (text and multimodal)
	parameters: {
		path: {
			type: 'string',
			description: 'Path to the image file relative to the current working directory. Supports: png, jpg, jpeg, webp, gif (Anthropic Claude API compatible formats)',
			required: true,
		},
		get_metadata: {
			type: 'boolean',
			description: 'If true, returns image metadata (dimensions, size, format) along with the image data',
			required: false,
		},
		auto_optimize: {
			type: 'boolean',
			description: 'If true (default), automatically optimizes the image for Claude API (resizes to ≤1568px, compresses). Recommended to keep enabled for best performance and cost.',
			required: false,
		},
		max_dimension: {
			type: 'number',
			description: 'Maximum width or height in pixels (default: 1568). Images larger than this will be resized while preserving aspect ratio. Based on Anthropic recommendations.',
			required: false,
		},
		quality: {
			type: 'number',
			description: 'Compression quality for JPEG/WebP images (1-100, default: 85). Higher values mean better quality but larger file size. 80-90 is recommended.',
			required: false,
		},
	},
	capabilities: [
		'Read images from the file system',
		'Support for Anthropic Claude API compatible formats: PNG, JPG, JPEG, WebP, GIF',
		'Automatic optimization for Claude API best practices (enabled by default)',
		'Quality checking with warnings and recommendations',
		'Convert images to base64 data URLs',
		'Optionally retrieve image metadata (dimensions, size, format)',
		'Validate image format before reading',
	],
	examples: [
		{
			description: 'Read a screenshot for analysis',
			output: `<read_image>
<path>screenshots/error-message.png</path>
</read_image>`,
		},
		{
			description: 'Read an image with metadata',
			output: `<read_image>
<path>assets/logo.png</path>
<get_metadata>true</get_metadata>
</read_image>`,
		},
		{
			description: 'Read without auto-optimization (use original image)',
			output: `<read_image>
<path>assets/high-res-photo.jpg</path>
<auto_optimize>false</auto_optimize>
</read_image>`,
		},
		{
			description: 'Read with custom optimization settings',
			output: `<read_image>
<path>screenshots/large-screenshot.png</path>
<max_dimension>1200</max_dimension>
<quality>90</quality>
<get_metadata>true</get_metadata>
</read_image>`,
		},
		{
			description: 'Read a diagram for understanding',
			output: `<read_image>
<path>docs/architecture-diagram.jpg</path>
</read_image>`,
		},
		{
			description: 'Read multiple images (use multiple tool calls)',
			output: `<read_image>
<path>screenshots/before.png</path>
</read_image>
<read_image>
<path>screenshots/after.png</path>
</read_image>`,
		},
	],
	usageNotes: `**When to use this tool:**
- Analyze screenshots to understand errors or UI issues
- Read diagrams or charts to understand architecture
- Verify what's in an image file
- Get image dimensions or format info

**When NOT to use:**
- Reading text files (use read_file)
- Checking if file exists (use list_files)
- Images over 5MB

**Supported formats:** PNG, JPG, JPEG, WebP, GIF
**Auto-optimization:** Enabled by default, keeps images ≤1568px for best API performance`,
};
