import { useEffect, useRef, useState } from "react";

const GAME = {
  width: 900,
  height: 640,
  groundHeight: 94,
  birdX: 240,
  birdRadius: 18,
  gravity: 0.42,
  flapVelocity: -7.2,
  pipeWidth: 94,
  pipeGap: 178,
  pipeSpeed: 3.25,
  pipeSpawnDistance: 320,
  minGapTop: 110,
};

function randomGapTop() {
  const maxGapTop = GAME.height - GAME.groundHeight - GAME.pipeGap - 110;
  return GAME.minGapTop + Math.random() * (maxGapTop - GAME.minGapTop);
}

function createPipe(x) {
  return {
    x,
    width: GAME.pipeWidth,
    gapTop: randomGapTop(),
    gapHeight: GAME.pipeGap,
    scored: false,
  };
}

function createPipes() {
  return [
    createPipe(GAME.width + 120),
    createPipe(GAME.width + 120 + GAME.pipeSpawnDistance),
    createPipe(GAME.width + 120 + GAME.pipeSpawnDistance * 2),
  ];
}

function createGameState(bestScore = 0) {
  return {
    bird: {
      x: GAME.birdX,
      y: GAME.height * 0.42,
      radius: GAME.birdRadius,
      velocity: 0,
      rotation: 0,
    },
    pipes: createPipes(),
    score: 0,
    bestScore,
    status: "ready",
    tick: 0,
  };
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
}

function circleIntersectsRect(bird, rect) {
  const closestX = Math.max(rect.x, Math.min(bird.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(bird.y, rect.y + rect.height));
  const dx = bird.x - closestX;
  const dy = bird.y - closestY;
  return dx * dx + dy * dy <= bird.radius * bird.radius;
}

function drawCloud(ctx, x, y, scale) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.beginPath();
  ctx.arc(x, y, 18 * scale, 0, Math.PI * 2);
  ctx.arc(x + 24 * scale, y - 8 * scale, 22 * scale, 0, Math.PI * 2);
  ctx.arc(x + 50 * scale, y, 18 * scale, 0, Math.PI * 2);
  ctx.arc(x + 26 * scale, y + 10 * scale, 24 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBackground(ctx, game) {
  const skyGradient = ctx.createLinearGradient(0, 0, 0, GAME.height);
  skyGradient.addColorStop(0, "#7dd3fc");
  skyGradient.addColorStop(0.55, "#a5f3fc");
  skyGradient.addColorStop(1, "#dcfce7");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, GAME.width, GAME.height);

  const sun = ctx.createRadialGradient(730, 110, 20, 730, 110, 90);
  sun.addColorStop(0, "rgba(255,255,255,0.95)");
  sun.addColorStop(0.3, "rgba(253, 224, 71, 0.92)");
  sun.addColorStop(1, "rgba(253, 186, 116, 0)");
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(730, 110, 90, 0, Math.PI * 2);
  ctx.fill();

  drawCloud(ctx, 90 + Math.sin(game.tick * 0.01) * 8, 120, 1);
  drawCloud(ctx, 520 + Math.sin(game.tick * 0.013) * 10, 170, 0.85);
  drawCloud(ctx, 300 + Math.sin(game.tick * 0.009) * 6, 70, 0.75);
}

function drawPipes(ctx, pipes) {
  pipes.forEach((pipe) => {
    const topHeight = pipe.gapTop;
    const bottomY = pipe.gapTop + pipe.gapHeight;
    const bottomHeight = GAME.height - GAME.groundHeight - bottomY;

    const bodyGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
    bodyGradient.addColorStop(0, "#4ade80");
    bodyGradient.addColorStop(0.5, "#22c55e");
    bodyGradient.addColorStop(1, "#15803d");

    ctx.fillStyle = bodyGradient;

    drawRoundedRect(ctx, pipe.x, 0, pipe.width, topHeight, 14);
    ctx.fill();
    drawRoundedRect(ctx, pipe.x, bottomY, pipe.width, bottomHeight, 14);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.18)";
    drawRoundedRect(ctx, pipe.x + 8, 10, pipe.width - 16, 8, 5);
    ctx.fill();
    drawRoundedRect(ctx, pipe.x + 8, bottomY + 10, pipe.width - 16, 8, 5);
    ctx.fill();

    ctx.fillStyle = "#166534";
    drawRoundedRect(ctx, pipe.x - 6, topHeight - 18, pipe.width + 12, 18, 8);
    ctx.fill();
    drawRoundedRect(ctx, pipe.x - 6, bottomY, pipe.width + 12, 18, 8);
    ctx.fill();
  });
}

function drawGround(ctx, tick) {
  const groundY = GAME.height - GAME.groundHeight;
  const groundGradient = ctx.createLinearGradient(0, groundY, 0, GAME.height);
  groundGradient.addColorStop(0, "#facc15");
  groundGradient.addColorStop(0.4, "#eab308");
  groundGradient.addColorStop(1, "#a16207");
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, groundY, GAME.width, GAME.groundHeight);

  ctx.fillStyle = "#65a30d";
  ctx.fillRect(0, groundY, GAME.width, 14);

  const stripeWidth = 38;
  const offset = -(tick * 2.4) % stripeWidth;
  for (let x = offset; x < GAME.width + stripeWidth; x += stripeWidth) {
    ctx.fillStyle = (Math.round(x / stripeWidth) % 2 === 0) ? "rgba(255,255,255,0.18)" : "rgba(120,53,15,0.12)";
    ctx.fillRect(x, groundY + 18, stripeWidth / 2, GAME.groundHeight - 18);
  }
}

function drawBird(ctx, bird) {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation);

  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.ellipse(0, 0, bird.radius + 2, bird.radius, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.ellipse(-3, 3, bird.radius * 0.65, bird.radius * 0.48, 0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(7, -6, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(8, -6, 2.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fb7185";
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(28, 4);
  ctx.lineTo(14, 11);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.beginPath();
  ctx.ellipse(-5, -7, 8, 4, -0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawScene(ctx, game) {
  ctx.clearRect(0, 0, GAME.width, GAME.height);
  drawBackground(ctx, game);
  drawPipes(ctx, game.pipes);
  drawGround(ctx, game.tick);
  drawBird(ctx, game.bird);

  if (game.status === "ready") {
    ctx.save();
    ctx.fillStyle = "rgba(7, 17, 31, 0.22)";
    ctx.font = "500 24px 'IBM Plex Mono'";
    ctx.textAlign = "center";
    ctx.fillText("Space / Click / Tap", GAME.width / 2, GAME.height / 2 - 8);
    ctx.font = "700 46px 'Space Grotesk'";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Start Flying", GAME.width / 2, GAME.height / 2 + 48);
    ctx.restore();
  }
}

export default function App() {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const timeRef = useRef(0);
  const gameRef = useRef(createGameState());

  const [hud, setHud] = useState({
    score: 0,
    bestScore: 0,
    status: "ready",
  });

  function syncHud() {
    const game = gameRef.current;
    setHud({
      score: game.score,
      bestScore: game.bestScore,
      status: game.status,
    });
  }

  function persistBestScore(nextBest) {
    try {
      window.localStorage.setItem("flappy-bird-best-score", String(nextBest));
    } catch {
      // Ignore storage failures.
    }
  }

  function loadBestScore() {
    try {
      const raw = window.localStorage.getItem("flappy-bird-best-score");
      return raw ? Number(raw) || 0 : 0;
    } catch {
      return 0;
    }
  }

  function restartGame() {
    const bestScore = gameRef.current.bestScore || loadBestScore();
    gameRef.current = createGameState(bestScore);
    timeRef.current = 0;
    syncHud();
  }

  function triggerFlap() {
    const game = gameRef.current;

    if (game.status === "gameover") {
      restartGame();
      return;
    }

    if (game.status === "ready") {
      game.status = "running";
    }

    if (game.status !== "running") {
      return;
    }

    game.bird.velocity = GAME.flapVelocity;
    game.bird.rotation = -0.55;
    syncHud();
  }

  useEffect(() => {
    const bestScore = loadBestScore();
    gameRef.current = createGameState(bestScore);
    syncHud();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();

      if ([" ", "arrowup", "w", "enter", "r"].includes(key)) {
        event.preventDefault();
      }

      if (event.repeat && (key === " " || key === "arrowup" || key === "w")) {
        return;
      }

      if (key === " " || key === "arrowup" || key === "w" || key === "enter") {
        triggerFlap();
      } else if (key === "r") {
        restartGame();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const loop = (time) => {
      const game = gameRef.current;
      const rawDelta = timeRef.current === 0 ? 1 : (time - timeRef.current) / 16.6667;
      const delta = Math.min(rawDelta, 2);
      timeRef.current = time;
      game.tick += delta;

      if (game.status === "ready") {
        game.bird.y = GAME.height * 0.42 + Math.sin(game.tick * 0.08) * 8;
        game.bird.rotation = Math.sin(game.tick * 0.08) * 0.08;
      }

      if (game.status === "running") {
        game.bird.velocity += GAME.gravity * delta;
        game.bird.y += game.bird.velocity * delta * 1.2;
        game.bird.rotation = Math.max(-0.7, Math.min(1.25, game.bird.velocity * 0.055));

        if (game.bird.y - game.bird.radius <= 0) {
          game.bird.y = game.bird.radius;
          game.bird.velocity = Math.max(0, game.bird.velocity);
        }

        game.pipes.forEach((pipe) => {
          pipe.x -= GAME.pipeSpeed * delta;

          if (!pipe.scored && pipe.x + pipe.width < game.bird.x) {
            pipe.scored = true;
            game.score += 1;

            if (game.score > game.bestScore) {
              game.bestScore = game.score;
              persistBestScore(game.bestScore);
            }

            syncHud();
          }
        });

        if (game.pipes.length > 0 && game.pipes[0].x + game.pipes[0].width < -60) {
          game.pipes.shift();
        }

        const lastPipe = game.pipes[game.pipes.length - 1];
        if (lastPipe.x < GAME.width - GAME.pipeSpawnDistance) {
          game.pipes.push(createPipe(lastPipe.x + GAME.pipeSpawnDistance));
        }

        const bird = game.bird;
        const collidedPipe = game.pipes.some((pipe) => {
          const topRect = { x: pipe.x, y: 0, width: pipe.width, height: pipe.gapTop };
          const bottomRect = {
            x: pipe.x,
            y: pipe.gapTop + pipe.gapHeight,
            width: pipe.width,
            height: GAME.height - GAME.groundHeight - (pipe.gapTop + pipe.gapHeight),
          };

          return circleIntersectsRect(bird, topRect) || circleIntersectsRect(bird, bottomRect);
        });

        const hitGround = bird.y + bird.radius >= GAME.height - GAME.groundHeight;

        if (collidedPipe || hitGround) {
          game.status = "gameover";
          game.bird.rotation = 1.35;

          if (game.score > game.bestScore) {
            game.bestScore = game.score;
            persistBestScore(game.bestScore);
          }

          syncHud();
        }
      }

      drawScene(ctx, game);
      frameRef.current = window.requestAnimationFrame(loop);
    };

    frameRef.current = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const statusLabel =
    hud.status === "running" ? "Running" : hud.status === "gameover" ? "Game Over" : "Ready";
  const statusTone =
    hud.status === "running"
      ? "bg-emerald-100 text-emerald-900"
      : hud.status === "gameover"
        ? "bg-rose-100 text-rose-900"
        : "bg-amber-100 text-amber-900";

  return (
    <main className="min-h-screen px-3 py-4 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-[1120px]">
        <section className="board-enter overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 p-3 shadow-panel backdrop-blur sm:p-5">
          <div className="mb-4 flex flex-col gap-3 border-b border-slate-200/80 pb-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-sky">
                React + Vite + Tailwind CDN
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl">
                Flappy Bird Reactor
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Score
                </p>
                <p className="mt-1 text-2xl font-bold">{hud.score}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Best
                </p>
                <p className="mt-1 text-2xl font-bold">{hud.bestScore}</p>
              </div>
              <div className={`rounded-full px-4 py-2 text-sm font-semibold ${statusTone}`}>
                {statusLabel}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="mx-auto max-w-[860px]">
              <div
                className="relative overflow-hidden rounded-[1.6rem] border border-slate-200 bg-slate-950 p-2 shadow-2xl shadow-slate-900/20"
                onPointerDown={triggerFlap}
                role="presentation"
              >
                <div className="canvas-shell glow-ring overflow-hidden rounded-[1.2rem] border border-white/5 p-2">
                  <canvas
                    ref={canvasRef}
                    width={GAME.width}
                    height={GAME.height}
                    className="block aspect-[45/32] w-full rounded-[1rem]"
                  />
                </div>

                {hud.status === "gameover" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/72 p-6 text-center">
                    <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-6 text-white shadow-2xl">
                      <p className="font-mono text-xs uppercase tracking-[0.26em] text-orange-300">
                        Collision
                      </p>
                      <h2 className="mt-3 text-3xl font-bold">Game Over</h2>
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        Press restart or tap the game area to try again.
                      </p>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          restartGame();
                        }}
                        className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-100"
                      >
                        Restart
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mx-auto grid max-w-[860px] gap-2.5 sm:grid-cols-4">
              <button
                type="button"
                onClick={triggerFlap}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
              >
                Flap
              </button>
              <button
                type="button"
                onClick={restartGame}
                className="rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Restart
              </button>
              <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-center text-sm font-semibold text-orange-950">
                60 FPS Loop
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-950">
                Space / Click / Tap
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
