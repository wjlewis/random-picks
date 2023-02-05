import React from 'react';
import styled from 'styled-components';
import Controls from './Controls';
import Stats from './Stats';
import { EventType, WorkerEvent, PicksData } from './shared';
import {
  BoundingBox,
  compileShader,
  computeViewMatrix,
  linkProgram,
  resizeViewport,
  viewToWorld,
} from './canvas';
import pickModel from './pick.model';
import freeModel from './free.model';

const Main = styled.main`
  width: 100%;
  height: 100%;
  background-color: #f0f0f0;
  position: relative;
`;

const Canvas = styled.canvas`
  cursor: move;
  width: 100%;
  height: 100%;
`;

const StyledControls = styled(Controls)`
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
`;

const StyledStats = styled(Stats)`
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 1;
`;

interface WebGLProgramData {
  vertexShader: WebGLShader;
  fragmentShader: WebGLShader;
  program: WebGLProgram;
}

interface WebGLInitData {
  centersBuffer: WebGLBuffer;
  pickModelBuffer: WebGLBuffer;
  frontierBuffer: WebGLBuffer;
  freeModelBuffer: WebGLBuffer;

  viewLoc: WebGLUniformLocation;
  colorLoc: WebGLUniformLocation;
  fudgeFactorLoc: WebGLUniformLocation;
  centerLoc: number;
  ptLoc: number;
}

const initPicks: PicksData = {
  centers: [{ x: 0, y: 0 }],
  frontier: [
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ],
};

const initBB = {
  minX: -20,
  maxX: 20,
  minY: -20,
  maxY: 20,
};

function getFreeFudgeFactor(bb: BoundingBox): number {
  const width = bb.maxX - bb.minX;
  const height = bb.maxY - bb.minY;
  const dim = Math.max(width, height);

  return Math.max(0.02 * dim, 1);
}

const App: React.FC = () => {
  const [pickCount, setPickCount] = React.useState(1_000);
  const [loading, setLoading] = React.useState<number | null>(null);

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const programDataRef = React.useRef<WebGLProgramData | null>(null);
  const initDataRef = React.useRef<WebGLInitData | null>(null);

  const [bb, setBB] = React.useState<BoundingBox>(initBB);
  const [picks, setPicks] = React.useState<PicksData>(initPicks);

  const processor: Worker = React.useMemo(
    () => new Worker(new URL('./process/worker.ts', import.meta.url)),
    []
  );

  const run = React.useCallback(() => {
    setLoading(0);
    processor.postMessage({ type: EventType.generate, pickCount });
  }, [processor, pickCount]);

  const cancel = React.useCallback(() => {
    processor.postMessage({ type: EventType.cancel });
  }, [processor]);

  React.useEffect(() => {
    function handleMessage(e: MessageEvent<WorkerEvent>) {
      const msg = e.data;
      if (msg.type === EventType.progress) {
        const { picks, percent } = msg;
        setLoading(percent);
        setPicks(picks);
      }
    }

    processor.addEventListener('message', handleMessage);
    return () => {
      processor.removeEventListener('message', handleMessage);
    };
  }, [processor]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl');
    if (!canvas || !gl) {
      return;
    }

    const vertexShader = compileShader(
      gl,
      gl.VERTEX_SHADER,
      `
uniform mat3 u_view;
uniform vec3 u_color;
uniform float u_fudge_factor;

attribute vec2 a_center;
attribute vec2 a_pt;

varying vec3 v_color;

void main() {
  v_color = u_color;

  bool horiz = mod(a_center.x + a_center.y, 2.0) < 1.0;

  vec2 oriented_pt = horiz ? a_pt : vec2(-a_pt.y, a_pt.x);
  vec2 in_world = a_center + u_fudge_factor * oriented_pt;

  vec3 in_view = u_view * vec3(in_world, 1.0);
  gl_Position = vec4(in_view.xy, 0.0, 1.0);
}
`
    );

    const fragmentShader = compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      `
precision mediump float;

varying vec3 v_color;

void main() {
  gl_FragColor = vec4(v_color, 1.0);
}
`
    );

    const program = linkProgram(gl, vertexShader, fragmentShader);

    programDataRef.current = {
      vertexShader,
      fragmentShader,
      program,
    };

    return () => {
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteProgram(program);
    };
  }, []);

  React.useEffect(() => {
    requestAnimationFrame(drawFromScratch);
  }, [picks]);

  React.useEffect(() => {
    requestAnimationFrame(redrawExisting);
  }, [bb]);

  const drawFromScratch = React.useCallback(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl');
    const ext = gl.getExtension('ANGLE_instanced_arrays');
    const program = programDataRef.current?.program;

    if (!canvas || !gl || !ext || !program) {
      return;
    }

    gl.clearColor(1, 1, 1, 1);

    const { centers, frontier } = picks;

    const viewLoc = gl.getUniformLocation(program, 'u_view');
    const colorLoc = gl.getUniformLocation(program, 'u_color');
    const fudgeFactorLoc = gl.getUniformLocation(program, 'u_fudge_factor');
    const centerLoc = gl.getAttribLocation(program, 'a_center');
    const ptLoc = gl.getAttribLocation(program, 'a_pt');

    gl.useProgram(program);

    const centersBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, centersBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(centers.flatMap(({ x, y }) => [x, y])),
      gl.STATIC_DRAW
    );

    const frontierBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, frontierBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(frontier.flatMap(({ x, y }) => [x, y])),
      gl.STATIC_DRAW
    );

    const pickModelBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pickModelBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pickModel), gl.STATIC_DRAW);

    const freeModelBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, freeModelBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(freeModel), gl.STATIC_DRAW);

    initDataRef.current = {
      centersBuffer,
      pickModelBuffer,
      frontierBuffer,
      freeModelBuffer,

      viewLoc,
      colorLoc,
      fudgeFactorLoc,
      centerLoc,
      ptLoc,
    };
  }, [picks]);

  const redrawExisting = React.useCallback(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl');
    const ext = gl.getExtension('ANGLE_instanced_arrays');
    const program = programDataRef.current?.program;
    const initData = initDataRef.current;
    if (!canvas || !gl || !program || !initData) {
      return;
    }

    const viewMatrix = computeViewMatrix(
      canvas.clientWidth,
      canvas.clientHeight,
      bb
    );
    gl.uniformMatrix3fv(initData.viewLoc, false, new Float32Array(viewMatrix));

    const { centers, frontier } = picks;

    resizeViewport(canvas, gl);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, initData.centersBuffer);
    gl.enableVertexAttribArray(initData.centerLoc);
    gl.vertexAttribPointer(initData.centerLoc, 2, gl.FLOAT, false, 0, 0);
    ext.vertexAttribDivisorANGLE(initData.centerLoc, 1);

    gl.bindBuffer(gl.ARRAY_BUFFER, initData.pickModelBuffer);
    gl.enableVertexAttribArray(initData.ptLoc);
    gl.vertexAttribPointer(initData.ptLoc, 2, gl.FLOAT, false, 0, 0);

    gl.uniform3f(initData.colorLoc, 0.3, 0.3, 0.3);
    gl.uniform1f(initData.fudgeFactorLoc, 1.0);

    ext.drawArraysInstancedANGLE(gl.TRIANGLE_STRIP, 0, 6, centers.length);

    gl.bindBuffer(gl.ARRAY_BUFFER, initData.frontierBuffer);
    gl.enableVertexAttribArray(initData.centerLoc);
    gl.vertexAttribPointer(initData.centerLoc, 2, gl.FLOAT, false, 0, 0);
    ext.vertexAttribDivisorANGLE(initData.centerLoc, 1);

    gl.bindBuffer(gl.ARRAY_BUFFER, initData.freeModelBuffer);
    gl.enableVertexAttribArray(initData.ptLoc);
    gl.vertexAttribPointer(initData.ptLoc, 2, gl.FLOAT, false, 0, 0);

    gl.uniform3f(initData.colorLoc, 1.0, 0.3, 0.2);
    gl.uniform1f(initData.fudgeFactorLoc, getFreeFudgeFactor(bb));

    ext.drawArraysInstancedANGLE(gl.TRIANGLE_STRIP, 0, 4, frontier.length);
  }, [bb, picks]);

  React.useEffect(() => {
    function handleResize() {
      const canvas = canvasRef.current;
      const gl = canvas.getContext('webgl');
      if (!canvas || !gl) {
        return;
      }

      requestAnimationFrame(redrawExisting);
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const observer = new ResizeObserver(handleResize);
    observer.observe(canvas);

    return () => {
      observer.unobserve(canvas);
    };
  }, [redrawExisting]);

  React.useEffect(() => {
    function handleDown(e: PointerEvent) {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const downPos = viewToWorld(canvas.clientWidth, canvas.clientHeight, bb, {
        x: e.clientX,
        y: e.clientY,
      });

      function handleMove(e: PointerEvent) {
        const pos = viewToWorld(canvas.clientWidth, canvas.clientHeight, bb, {
          x: e.clientX,
          y: e.clientY,
        });

        const deltaX = pos.x - downPos.x;
        const deltaY = pos.y - downPos.y;

        setBB({
          minX: bb.minX - deltaX,
          maxX: bb.maxX - deltaX,
          minY: bb.minY - deltaY,
          maxY: bb.maxY - deltaY,
        });
      }

      function handleUp() {
        document.removeEventListener('pointermove', handleMove);
        document.removeEventListener('pointerup', handleMove);
      }

      document.addEventListener('pointermove', handleMove);
      document.addEventListener('pointerup', handleUp);
    }

    function handleWheel(e: WheelEvent) {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const pos = viewToWorld(canvas.clientWidth, canvas.clientHeight, bb, {
        x: e.clientX,
        y: e.clientY,
      });

      const { minX, maxX, minY, maxY } = bb;
      const viewWidth = maxX - minX;
      const viewHeight = maxY - minY;

      const leftFrac = (pos.x - minX) / viewWidth;
      const topFrac = (maxY - pos.y) / viewHeight;

      const factor = Math.exp(e.deltaY / 1_000);
      const width = factor * viewWidth;
      const height = factor * viewHeight;

      setBB({
        minX: pos.x - width * leftFrac,
        maxX: pos.x + width * (1 - leftFrac),
        minY: pos.y - height * (1 - topFrac),
        maxY: pos.y + height * topFrac,
      });
    }

    document.addEventListener('pointerdown', handleDown);
    document.addEventListener('wheel', handleWheel);

    return () => {
      document.removeEventListener('pointerdown', handleDown);
      document.removeEventListener('wheel', handleWheel);
    };
  }, [bb]);

  function reset() {
    setBB(initBB);
    setPicks(initPicks);
  }

  return (
    <Main>
      <Canvas ref={canvasRef} />

      <StyledControls
        pickCount={pickCount}
        setPickCount={setPickCount}
        onClickGenerate={run}
        onClickCancel={cancel}
        onClickReset={reset}
        loading={loading}
      />

      <StyledStats
        picksCount={picks.centers.length}
        frontierSize={picks.frontier.length}
      />
    </Main>
  );
};

export default App;
