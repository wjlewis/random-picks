import { Pt } from './tools';

export function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('failed to create shader');
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  return shader;
}

export function linkProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram {
  const program = gl.createProgram();
  if (!program) {
    throw new Error('failed to create program');
  }
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(`program error: ${gl.getProgramInfoLog(program)}`);
    console.error(`vertex shader: ${gl.getShaderInfoLog(vertexShader)}`);
    console.error(`fragment shader: ${gl.getShaderInfoLog(fragmentShader)}`);
    throw new Error('failed to link program');
  }
  return program;
}

export interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function computeViewMatrix(
  viewWidth: number,
  viewHeight: number,
  bb: BoundingBox
): number[] {
  const { minX, maxX, minY, maxY } = bb;
  const worldWidth = maxX - minX;
  const worldHeight = maxY - minY;

  const viewAr = viewWidth / viewHeight;
  const worldAr = worldWidth / worldHeight;

  const heightBound = viewAr > worldAr;

  const xMargin = heightBound ? 1 - worldAr / viewAr : 0;
  const yMargin = heightBound ? 0 : 1 - viewAr / worldAr;

  const scaleX = (2 * (1 - xMargin)) / worldWidth;
  const scaleY = (2 * (1 - yMargin)) / worldHeight;

  const transX = 1 - xMargin - scaleX * maxX;
  const transY = 1 - yMargin - scaleY * maxY;

  // prettier-ignore
  return [
    scaleX, 0,      0,
    0,      scaleY, 0,
    transX, transY, 1,
  ];
}

export function viewToWorld(
  viewWidth: number,
  viewHeight: number,
  bb: BoundingBox,
  pos: Pt
): Pt {
  const { minX, maxX, minY, maxY } = bb;
  const worldWidth = maxX - minX;
  const worldHeight = maxY - minY;

  const viewAr = viewWidth / viewHeight;
  const worldAr = worldWidth / worldHeight;

  const heightBound = viewAr > worldAr;

  const xMargin = heightBound ? (viewWidth - viewHeight * worldAr) / 2 : 0;
  const yMargin = heightBound ? 0 : (viewHeight - viewWidth / worldAr) / 2;

  const viewInnerWidth = viewWidth - 2 * xMargin;
  const viewInnerHeight = viewHeight - 2 * yMargin;

  const scaleX = worldWidth / viewInnerWidth;
  const scaleY = -worldHeight / viewInnerHeight;

  const transX = minX - scaleX * xMargin;
  const transY = maxY - scaleY * yMargin;

  return {
    x: scaleX * pos.x + transX,
    y: scaleY * pos.y + transY,
  };
}

export function resizeViewport(
  canvas: HTMLCanvasElement,
  gl: WebGLRenderingContext
) {
  const dpi = devicePixelRatio;
  const pxWidth = Math.floor(dpi * canvas.clientWidth);
  const pxHeight = Math.floor(dpi * canvas.clientHeight);

  if (canvas.width !== pxWidth || canvas.height !== pxHeight) {
    canvas.width = pxWidth;
    canvas.height = pxHeight;
    gl.viewport(0, 0, pxWidth, pxHeight);
  }
}
