import "@testing-library/jest-dom";

// Prefer node-canvas if installed; fallback to lightweight shim otherwise.
let haveNodeCanvas = false;
try {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const canvasLib = require('canvas');
	const { Canvas, Image, ImageData } = canvasLib;
	// Attach globals expected by Konva when available
	(globalThis as any).HTMLCanvasElement = Canvas as any; // Konva only uses subset
	(globalThis as any).Image = Image;
	(globalThis as any).ImageData = ImageData;
	haveNodeCanvas = true;
} catch {/* ignore; will use shim */}

if (!haveNodeCanvas && typeof HTMLCanvasElement !== 'undefined') {
	const proto: any = (HTMLCanvasElement.prototype as any);
	if (!proto.getContext) {
		proto.getContext = function getContext(type: string, _options?: any) {
			if (type && type !== '2d') return null;
			const ctx: any = {
				lineWidth: 1,
				globalAlpha: 1,
				fillStyle: '#000',
				strokeStyle: '#000',
				font: '12px sans-serif'
			};
			ctx.canvas = this;
			ctx.save = () => {};
			ctx.restore = () => {};
			ctx.beginPath = () => {};
			ctx.closePath = () => {};
			ctx.rect = () => {};
			ctx.moveTo = () => {};
			ctx.lineTo = () => {};
			ctx.arc = () => {};
			ctx.quadraticCurveTo = () => {};
			ctx.bezierCurveTo = () => {};
			ctx.clearRect = () => {};
			ctx.fillRect = () => {};
			ctx.strokeRect = () => {};
			ctx.translate = () => {};
			ctx.scale = () => {};
			ctx.rotate = () => {};
			ctx.drawImage = () => {};
			ctx.fillText = () => {};
			ctx.measureText = (text: string) => ({ width: text.length * 7 });
			ctx.fill = () => {};
			ctx.stroke = () => {};
			ctx.setLineDash = () => {};
			ctx.getLineDash = () => [];
			ctx.clip = () => {};
			ctx.createLinearGradient = () => ({ addColorStop: () => {} });
			ctx.createPattern = () => null;
			ctx.createRadialGradient = () => ({ addColorStop: () => {} });
			ctx.transform = () => {};
			ctx.setTransform = () => {};
			return ctx;
		};
	}
}
