import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Lane, BatState, Obstacle, Cloud, GroundDetail, Star } from './types';
import {
  drawBat,
  drawCat,
  drawRock,
  drawBranch,
  drawGround,
  drawCloud,
  drawNightSky,
} from './sprites';
import {
  playLaneChangeSound,
  playScoreMilestoneSound,
  playCrashSound,
  isAudioMuted,
  toggleAudioMute,
} from './audio';
import { usePWAInstall } from './usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';
import { OfflineIndicator } from './OfflineIndicator';
import { Volume2, VolumeX, RotateCcw, Maximize, Trophy, Download, Smartphone } from 'lucide-react';

// Canvas virtual dimensions (fixed 2:1 aspect ratio)
const V_WIDTH = 800;
const V_HEIGHT = 400;
const GROUND_Y = 345;

// Fixed Heights for the 3 Lanes (Y coordinate of bat center)
const LANE_Y: Record<Lane, number> = {
  1: 326, // Embaixo / Chão (Perfect collision alignment with cats on ground)
  2: 205, // Meio (Aligned with flying rocks)
  3: 95,  // Em cima (Aligned with hanging tree branches)
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // High score from localStorage
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('batblack_highscore');
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const [currentScore, setCurrentScore] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentLane, setCurrentLane] = useState<Lane>(2);
  const [isMuted, setIsMuted] = useState<boolean>(isAudioMuted());
  const [isNightMode, setIsNightMode] = useState<boolean>(false);
  const [isNewHigh, setIsNewHigh] = useState<boolean>(false);
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);

  // PWA install state
  const { isInstalled } = usePWAInstall();

  // Mutable Game Loop State Ref (prevents re-render lag)
  const gameRef = useRef<{
    score: number;
    highScore: number;
    isPlaying: boolean;
    isGameOver: boolean;
    speed: number;
    baseSpeed: number;
    distance: number;
    lastTime: number;
    bat: BatState;
    obstacles: Obstacle[];
    clouds: Cloud[];
    groundDetails: GroundDetail[];
    stars: Star[];
    spawnTimer: number;
    nextSpawnDistance: number;
    nextObstacleId: number;
    nextMilestone: number;
    nightFade: number; // 0 to 1
    targetNightFade: number;
  }>({
    score: 0,
    highScore: 0,
    isPlaying: false,
    isGameOver: false,
    speed: 340,
    baseSpeed: 340,
    distance: 0,
    lastTime: 0,
    bat: {
      lane: 2,
      targetY: LANE_Y[2],
      y: LANE_Y[2],
      x: 100,
      width: 36,
      height: 24,
      rotation: 0,
      flapFrame: 0,
      flapTimer: 0,
      isHit: false,
    },
    obstacles: [],
    clouds: [
      { x: 140, y: 40, speed: 28, width: 44 },
      { x: 380, y: 80, speed: 24, width: 44 },
      { x: 620, y: 50, speed: 30, width: 44 },
    ],
    groundDetails: [],
    stars: [],
    spawnTimer: 0,
    nextSpawnDistance: 450,
    nextObstacleId: 1,
    nextMilestone: 100,
    nightFade: 0,
    targetNightFade: 0,
  });

  // Keep ref in sync with state
  useEffect(() => {
    gameRef.current.highScore = highScore;
  }, [highScore]);

  // Initialize Ground Details & Stars
  useEffect(() => {
    const details: GroundDetail[] = [];
    for (let x = 0; x < V_WIDTH + 100; x += 18 + Math.random() * 30) {
      details.push({
        x,
        type: Math.floor(Math.random() * 4),
      });
    }
    gameRef.current.groundDetails = details;

    const stars: Star[] = [];
    for (let i = 0; i < 28; i++) {
      stars.push({
        x: Math.floor(Math.random() * V_WIDTH),
        y: Math.floor(Math.random() * (GROUND_Y - 80)),
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
    gameRef.current.stars = stars;
  }, []);

  /**
   * RESET / RESTART GAME
   */
  const restartGame = useCallback(() => {
    const g = gameRef.current;
    g.isPlaying = true;
    g.isGameOver = false;
    g.score = 0;
    g.speed = g.baseSpeed;
    g.distance = 0;
    g.obstacles = [];
    g.nextMilestone = 100;
    g.spawnTimer = 0;
    g.nextSpawnDistance = 380;
    g.nightFade = 0;
    g.targetNightFade = 0;
    g.lastTime = performance.now();

    // Reset Bat to Lane 2
    g.bat.lane = 2;
    g.bat.targetY = LANE_Y[2];
    g.bat.y = LANE_Y[2];
    g.bat.rotation = 0;
    g.bat.flapFrame = 0;
    g.bat.isHit = false;

    setCurrentScore(0);
    setIsGameOver(false);
    setIsPlaying(true);
    setCurrentLane(2);
    setIsNightMode(false);
    setIsNewHigh(false);

    playLaneChangeSound(2);
  }, []);

  /**
   * Screen Tap / Click handler:
   * Starts or restarts the game only.
   * During gameplay, touching the screen DOES NOT change height (height only changes via height buttons).
   */
  const handleScreenTap = useCallback(() => {
    const g = gameRef.current;

    // If game over, tap restarts
    if (g.isGameOver) {
      restartGame();
      return;
    }

    // If waiting on start screen, first tap starts
    if (!g.isPlaying) {
      g.isPlaying = true;
      setIsPlaying(true);
      g.lastTime = performance.now();
    }

    // NOTE: During active gameplay, touching the screen DOES NOT change the height!
  }, [restartGame]);

  /**
   * SET HEIGHT DIRECTLY (1: Chão, 2: Meio, 3: Cima)
   * The bat changes height ONLY when clicking/touching the height buttons.
   */
  const setHeightDirectly = useCallback((targetLane: Lane) => {
    const g = gameRef.current;

    // If game over, clicking a button restarts and sets the lane
    if (g.isGameOver) {
      restartGame();
    }

    // If waiting on start screen, start playing
    if (!g.isPlaying) {
      g.isPlaying = true;
      setIsPlaying(true);
      g.lastTime = performance.now();
    }

    // Directly set the target lane
    g.bat.lane = targetLane;
    g.bat.targetY = LANE_Y[targetLane];

    // Sound effect for the specific lane
    playLaneChangeSound(targetLane);
    setCurrentLane(targetLane);
  }, [restartGame]);

  /**
   * Sound Mute Toggle
   */
  const handleToggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const muted = toggleAudioMute();
    setIsMuted(muted);
  };

  /**
   * Fullscreen Toggle
   */
  const handleToggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  /**
   * Keyboard Controls (1, 2, 3 directly set heights; Arrows move up/down)
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Direct lane keys: 1, 2, 3
      if (e.code === 'Digit1' || e.code === 'Numpad1') {
        e.preventDefault();
        setHeightDirectly(1);
        return;
      }
      if (e.code === 'Digit2' || e.code === 'Numpad2') {
        e.preventDefault();
        setHeightDirectly(2);
        return;
      }
      if (e.code === 'Digit3' || e.code === 'Numpad3') {
        e.preventDefault();
        setHeightDirectly(3);
        return;
      }

      // Arrows or W/S to move up/down between the 3 heights
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        const g = gameRef.current;
        if (g.bat.lane < 3) {
          setHeightDirectly((g.bat.lane + 1) as Lane);
        }
        return;
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        const g = gameRef.current;
        if (g.bat.lane > 1) {
          setHeightDirectly((g.bat.lane - 1) as Lane);
        }
        return;
      }

      // Space or Enter only starts or restarts the game (does NOT change height during gameplay)
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleScreenTap();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleScreenTap, setHeightDirectly]);

  /**
   * Collision Detection (Axis-Aligned Bounding Box with tuned hitboxes)
   * Guaranteed solid hitboxes for Cat (Lane 1), Rock (Lane 2), Branch (Lane 3)
   */
  const checkCollision = (bat: BatState, obs: Obstacle): boolean => {
    // Bat hitbox:
    const batBox = {
      left: bat.x - 12,
      right: bat.x + 12,
      top: bat.y - 10,
      bottom: bat.y + 10,
    };

    if (obs.type === 'cat') {
      // Cat sitting on ground (Lane 1: y = 315 to 345)
      const catBox = {
        left: obs.x + 2,
        right: obs.x + obs.width - 2,
        top: obs.y,
        bottom: obs.y + obs.height,
      };
      return !(
        batBox.right < catBox.left ||
        batBox.left > catBox.right ||
        batBox.bottom < catBox.top ||
        batBox.top > catBox.bottom
      );
    } else if (obs.type === 'rock') {
      // Flying rock (with wobble)
      const curY = obs.y + obs.wobbleOffset;
      const rockBox = {
        left: obs.x + 2,
        right: obs.x + obs.width - 2,
        top: curY + 2,
        bottom: curY + obs.height - 2,
      };
      return !(
        batBox.right < rockBox.left ||
        batBox.left > rockBox.right ||
        batBox.bottom < rockBox.top ||
        batBox.top > rockBox.bottom
      );
    } else if (obs.type === 'branch') {
      // Hanging branch from top
      const branchBox = {
        left: obs.x + 2,
        right: obs.x + obs.width - 2,
        top: 0,
        bottom: obs.height,
      };
      return !(
        batBox.right < branchBox.left ||
        batBox.left > branchBox.right ||
        batBox.bottom < branchBox.top ||
        batBox.top > branchBox.bottom
      );
    }

    return false;
  };

  /**
   * Fair Obstacle Spawner
   * Generates obstacles across the 3 heights while guaranteeing fairness:
   * - Height 1: Cat
   * - Height 2: Flying Rock
   * - Height 3: Tree Branch
   */
  const spawnObstacle = (g: typeof gameRef.current) => {
    // Pick lane (1, 2, or 3)
    const lanes: Lane[] = [1, 2, 3];
    const chosenLane = lanes[Math.floor(Math.random() * lanes.length)];

    let obs: Obstacle;

    if (chosenLane === 1) {
      // Gato Preto no chão (Altura 1)
      obs = {
        id: g.nextObstacleId++,
        type: 'cat',
        lane: 1,
        x: V_WIDTH + 40,
        y: GROUND_Y - 30,
        width: 36,
        height: 30,
        passed: false,
        animFrame: 0,
        animTimer: 0,
        wobbleOffset: 0,
      };
    } else if (chosenLane === 2) {
      // Pedra Voadora no meio (Altura 2)
      obs = {
        id: g.nextObstacleId++,
        type: 'rock',
        lane: 2,
        x: V_WIDTH + 40,
        y: LANE_Y[2] - 13,
        width: 34,
        height: 26,
        passed: false,
        animFrame: 0,
        animTimer: 0,
        wobbleOffset: 0,
      };
    } else {
      // Galho de árvore descendo de cima (Altura 3)
      obs = {
        id: g.nextObstacleId++,
        type: 'branch',
        lane: 3,
        x: V_WIDTH + 40,
        y: 0,
        width: 34,
        height: 125, // Extends into Lane 3
        passed: false,
        animFrame: 0,
        animTimer: 0,
        wobbleOffset: 0,
      };
    }

    g.obstacles.push(obs);

    // Compute fair distance to next obstacle based on current game speed
    // Keeps ample reaction time (~0.8s to 1.1s)
    const minDistance = Math.max(340, g.speed * 0.9);
    const variance = Math.random() * 160;
    g.nextSpawnDistance = minDistance + variance;
  };

  /**
   * Main Game Loop
   */
  useEffect(() => {
    let animId: number;

    const render = (now: number) => {
      animId = requestAnimationFrame(render);

      const g = gameRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Delta time in seconds
      if (!g.lastTime) g.lastTime = now;
      const dt = Math.min((now - g.lastTime) / 1000, 0.1);
      g.lastTime = now;

      // UPDATE PHASE
      if (g.isPlaying && !g.isGameOver) {
        // 1. Advance distance & score
        g.distance += g.speed * dt;
        const newScore = Math.floor(g.distance / 12);
        if (newScore !== g.score) {
          g.score = newScore;
          setCurrentScore(newScore);

          // Dino-style 100-point celebratory chime
          if (newScore >= g.nextMilestone) {
            playScoreMilestoneSound();
            g.nextMilestone += 100;
          }

          // Chrome Dino Day/Night Inversion Cycle:
          // Inverts at every 500 points (500-700, 1000-1200, 1500-1700, ...)
          const cycleScore = newScore % 500;
          const shouldBeNight = cycleScore >= 0 && cycleScore < 200 && newScore >= 500;
          g.targetNightFade = shouldBeNight ? 1 : 0;
          if (shouldBeNight !== isNightMode) {
            setIsNightMode(shouldBeNight);
          }
        }

        // Gradual speed increase with score (caps at smooth responsive speed)
        g.speed = Math.min(680, g.baseSpeed + g.score * 0.28);

        // Smooth transition of night fade
        if (g.nightFade < g.targetNightFade) {
          g.nightFade = Math.min(1, g.nightFade + dt * 2.5);
        } else if (g.nightFade > g.targetNightFade) {
          g.nightFade = Math.max(0, g.nightFade - dt * 2.5);
        }

        // 2. Bat vertical smooth movement (interpolation) & angle
        const dy = g.bat.targetY - g.bat.y;
        // Fast, buttery smooth lerp to target height
        g.bat.y += dy * Math.min(1, dt * 14);

        // Subtle tilt angle while ascending or descending
        const targetRot = Math.max(-18, Math.min(18, dy * 0.22));
        g.bat.rotation += (targetRot - g.bat.rotation) * Math.min(1, dt * 12);

        // Wing flap animation
        g.bat.flapTimer += dt;
        const flapInterval = Math.abs(dy) > 10 ? 0.07 : 0.12;
        if (g.bat.flapTimer >= flapInterval) {
          g.bat.flapTimer = 0;
          g.bat.flapFrame = (g.bat.flapFrame + 1) % 3;
        }

        // 3. Update Clouds (parallax)
        for (const cloud of g.clouds) {
          cloud.x -= cloud.speed * dt;
          if (cloud.x < -cloud.width - 20) {
            cloud.x = V_WIDTH + Math.random() * 80;
            cloud.y = 30 + Math.random() * 70;
          }
        }

        // 4. Update Ground Details
        for (const detail of g.groundDetails) {
          detail.x -= g.speed * dt;
          if (detail.x < -20) {
            detail.x = V_WIDTH + Math.random() * 20;
            detail.type = Math.floor(Math.random() * 4);
          }
        }

        // 5. Update Stars (twinkle)
        for (const star of g.stars) {
          star.twinklePhase += dt * 3;
        }

        // 6. Obstacle Spawning
        g.spawnTimer += g.speed * dt;
        if (g.spawnTimer >= g.nextSpawnDistance) {
          g.spawnTimer = 0;
          spawnObstacle(g);
        }

        // 7. Update Obstacles & Check Collisions
        for (let i = g.obstacles.length - 1; i >= 0; i--) {
          const obs = g.obstacles[i];
          obs.x -= g.speed * dt;

          // Animations
          obs.animTimer += dt;
          if (obs.animTimer > 0.15) {
            obs.animTimer = 0;
            obs.animFrame = (obs.animFrame + 1) % 4;
          }

          // Rock hover wobble
          if (obs.type === 'rock') {
            obs.wobbleOffset = Math.sin(now * 0.006 + obs.id) * 3;
          }

          // Check Collision
          if (checkCollision(g.bat, obs)) {
            // Collision occurred!
            g.isGameOver = true;
            g.bat.isHit = true;
            playCrashSound();
            setIsGameOver(true);

            // Check high score
            if (g.score > g.highScore) {
              g.highScore = g.score;
              setHighScore(g.score);
              setIsNewHigh(true);
              try {
                localStorage.setItem('batblack_highscore', String(g.score));
              } catch {
                // Ignore storage errors
              }
            }
            break;
          }

          // Remove off-screen obstacles
          if (obs.x < -60) {
            g.obstacles.splice(i, 1);
          }
        }
      } else if (!g.isPlaying && !g.isGameOver) {
        // Idle hover animation on start screen
        g.bat.flapTimer += dt;
        if (g.bat.flapTimer >= 0.14) {
          g.bat.flapTimer = 0;
          g.bat.flapFrame = (g.bat.flapFrame + 1) % 3;
        }
        g.bat.y = LANE_Y[2] + Math.sin(now * 0.005) * 6;
      }

      // DRAW / RENDER PHASE
      const isNight = g.nightFade > 0.5;

      // Smooth background color interpolation
      // Day: #F7F7F7 (247, 247, 247) -> Night: #202124 (32, 33, 36)
      const r = Math.round(247 - (247 - 32) * g.nightFade);
      const gr = Math.round(247 - (247 - 33) * g.nightFade);
      const b = Math.round(247 - (247 - 36) * g.nightFade);
      ctx.fillStyle = `rgb(${r}, ${gr}, ${b})`;
      ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

      // Draw Night Sky (Moon & Stars if night fade > 0)
      drawNightSky(ctx, g.stars, isNight, g.nightFade);

      // Draw Clouds
      for (const cloud of g.clouds) {
        drawCloud(ctx, cloud, isNight);
      }

      // Draw Ground
      drawGround(ctx, GROUND_Y, V_WIDTH, g.groundDetails, isNight);

      // Draw Height Reference Track Dots (subtle, clean guide for the 3 heights)
      ctx.fillStyle = isNight ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.07)';
      for (let x = 40; x < V_WIDTH; x += 36) {
        ctx.fillRect(x, LANE_Y[3], 2, 2);
        ctx.fillRect(x, LANE_Y[2], 2, 2);
        ctx.fillRect(x, LANE_Y[1], 2, 2);
      }

      // Draw Obstacles
      for (const obs of g.obstacles) {
        if (obs.type === 'cat') {
          drawCat(ctx, obs, isNight);
        } else if (obs.type === 'rock') {
          drawRock(ctx, obs, isNight);
        } else if (obs.type === 'branch') {
          drawBranch(ctx, obs, isNight);
        }
      }

      // Draw Bat Player
      drawBat(ctx, g.bat, isNight);

      // Draw Arcade HUD inside Canvas (High Score & Current Score in Dino format)
      ctx.font = '14px "Press Start 2P", monospace';
      ctx.textAlign = 'right';

      const padScore = (num: number) => num.toString().padStart(5, '0');
      const hiText = `HI ${padScore(g.highScore)}  ${padScore(g.score)}`;

      // Text color matches theme
      ctx.fillStyle = isNight ? '#FFFFFF' : '#202124';
      ctx.fillText(hiText, V_WIDTH - 24, 38);

      // Left corner: Game Name "BatBlack" (Strictly never translated)
      ctx.textAlign = 'left';
      ctx.font = '16px "Press Start 2P", monospace';
      ctx.fillText('BatBlack', 24, 38);

      // Height Level Indicator HUD
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillStyle = isNight ? '#A0A0A0' : '#70757A';
      ctx.fillText(`ALTURA: ${g.bat.lane}/3`, 24, 62);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isNightMode]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full min-h-screen overflow-hidden flex flex-col justify-between items-center transition-colors duration-500 ${
        isNightMode ? 'bg-[#202124] text-white' : 'bg-[#f7f7f7] text-[#202124]'
      }`}
    >
      {/* Offline Status Badge */}
      <OfflineIndicator />

      {/* TOP HEADER CONTROLS (Crisp retro arcade bar) */}
      <header className="w-full max-w-[1320px] px-3 sm:px-6 pt-3 pb-2 flex items-center justify-between select-none shrink-0 z-20">
        {/* Game Title */}
        <div className="flex items-center space-x-2">
          <span className="font-pixel text-xs sm:text-sm font-bold tracking-wider">
            BatBlack
          </span>
          <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 border border-current font-pixel opacity-70">
            8-BIT
          </span>
        </div>

        {/* Action Buttons: Clean retro buttons that NEVER turn black */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Download App Button (White background with black text/border, never black!) */}
          {!isInstalled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowInstallModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] sm:text-[10px] font-pixel bg-white text-[#202124] border-2 border-[#202124] hover:bg-gray-100 active:bg-gray-200 transition cursor-pointer shadow-sm select-none"
              title="Baixar para Android / iPhone"
            >
              <Download className="w-3.5 h-3.5" />
              <span>BAIXAR APP</span>
            </button>
          )}

          {/* Mute Button */}
          <button
            type="button"
            onClick={handleToggleSound}
            aria-label={isMuted ? 'Ativar som' : 'Desativar som'}
            className="p-1.5 sm:p-2 bg-white text-[#202124] border-2 border-gray-400 hover:border-black active:bg-gray-200 transition cursor-pointer select-none shadow-xs"
            title={isMuted ? 'Ativar Som' : 'Silenciar Som'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#202124]" />}
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            aria-label="Tela cheia"
            className="p-1.5 sm:p-2 bg-white text-[#202124] border-2 border-gray-400 hover:border-black active:bg-gray-200 transition cursor-pointer hidden sm:block select-none shadow-xs"
            title="Tela Cheia"
          >
            <Maximize className="w-4 h-4 sm:w-5 sm:h-5 text-[#202124]" />
          </button>
        </div>
      </header>

      {/* MAIN GAME VIEWPORT (Larger canvas footprint: scales up to 1320px width & 76vh height) */}
      <main className="relative w-full max-w-[1320px] px-2 sm:px-4 flex flex-col items-center justify-center flex-1 my-auto">
        <div
          onClick={handleScreenTap}
          onTouchStart={(e) => {
            // Screen tap only starts or restarts the game, does NOT change height
            if ((e.target as HTMLElement).tagName !== 'BUTTON') {
              handleScreenTap();
            }
          }}
          className="relative w-full aspect-[2/1] max-h-[72vh] sm:max-h-[76vh] overflow-hidden border-2 sm:border-4 border-[#202124] shadow-xl bg-[#f7f7f7] select-none cursor-pointer"
        >
          {/* Canvas Rendering Context */}
          <canvas
            ref={canvasRef}
            width={V_WIDTH}
            height={V_HEIGHT}
            className="w-full h-full block select-none pointer-events-none"
            style={{ imageRendering: 'pixelated' }}
          />

          {/* START SCREEN OVERLAY */}
          {!isPlaying && !isGameOver && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/5 backdrop-blur-[1px] p-2 sm:p-4 text-center select-none pointer-events-auto">
              <div className="w-full max-w-md flex flex-col items-center justify-center">
                <h1 className="font-pixel text-xl sm:text-3xl md:text-4xl font-bold tracking-wider mb-1.5 sm:mb-2 text-[#202124]">
                  BatBlack
                </h1>

                <div className="font-pixel text-[9px] sm:text-xs leading-tight mb-2 sm:mb-3 text-[#202124]">
                  <p className="opacity-80">ALTURA CONTROLADA APENAS NOS BOTÕES:</p>
                  <div className="mt-2 flex justify-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setHeightDirectly(1);
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setHeightDirectly(1);
                      }}
                      className={`px-2 sm:px-3 py-1 text-[9px] sm:text-[10px] font-pixel transition cursor-pointer select-none border-2 shadow-xs ${
                        currentLane === 1
                          ? 'bg-amber-200 text-[#202124] border-[#202124] font-bold ring-2 ring-[#202124]/30'
                          : 'bg-white text-[#202124] border-gray-400 hover:border-black active:bg-gray-100'
                      }`}
                    >
                      1: Chão
                    </button>
                    <span className="self-center font-bold text-[9px] sm:text-[10px]">→</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setHeightDirectly(2);
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setHeightDirectly(2);
                      }}
                      className={`px-2 sm:px-3 py-1 text-[9px] sm:text-[10px] font-pixel transition cursor-pointer select-none border-2 shadow-xs ${
                        currentLane === 2
                          ? 'bg-amber-200 text-[#202124] border-[#202124] font-bold ring-2 ring-[#202124]/30'
                          : 'bg-white text-[#202124] border-gray-400 hover:border-black active:bg-gray-100'
                      }`}
                    >
                      2: Meio
                    </button>
                    <span className="self-center font-bold text-[9px] sm:text-[10px]">→</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setHeightDirectly(3);
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setHeightDirectly(3);
                      }}
                      className={`px-2 sm:px-3 py-1 text-[9px] sm:text-[10px] font-pixel transition cursor-pointer select-none border-2 shadow-xs ${
                        currentLane === 3
                          ? 'bg-amber-200 text-[#202124] border-[#202124] font-bold ring-2 ring-[#202124]/30'
                          : 'bg-white text-[#202124] border-gray-400 hover:border-black active:bg-gray-100'
                      }`}
                    >
                      3: Cima
                    </button>
                  </div>
                </div>

                {/* Start Prompt */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleScreenTap();
                  }}
                  className="animate-pulse font-pixel text-[10px] sm:text-xs md:text-sm border-2 border-[#202124] px-4 py-2 sm:px-5 sm:py-2.5 bg-white text-[#202124] shadow-md cursor-pointer hover:bg-gray-50 active:bg-gray-100"
                >
                  TOQUE OU CLIQUE PARA INICIAR
                </div>

                <p className="mt-2 text-[8px] sm:text-[9px] font-pixel opacity-70 text-[#202124]">
                  [ TECLAS 1, 2, 3 OU SETAS PARA MOVER ]
                </p>
              </div>
            </div>
          )}

          {/* "BAT OVER" SCREEN OVERLAY (Guaranteed to fit perfectly inside the game viewport without escaping) */}
          {isGameOver && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[2px] p-2 sm:p-4 text-center select-none pointer-events-auto">
              <div className="w-full max-w-sm flex flex-col items-center justify-center my-auto">
                {/* EXACT REQUIRED TEXT: "Bat Over" */}
                <h2 className="font-pixel text-2xl sm:text-3xl md:text-4xl text-white font-extrabold tracking-widest mb-1 sm:mb-2 drop-shadow-md">
                  Bat Over
                </h2>

                {isNewHigh && (
                  <div className="flex items-center gap-1.5 text-yellow-300 font-pixel text-[10px] sm:text-xs mb-1.5 animate-bounce">
                    <Trophy className="w-3.5 h-3.5" /> NOVO RECORDE!
                  </div>
                )}

                {/* Compact Score Bar */}
                <div className="font-pixel text-[10px] sm:text-xs text-gray-100 mb-2 sm:mb-3 flex items-center justify-center gap-2 sm:gap-3 bg-black/40 border border-white/20 px-3 py-1 sm:py-1.5">
                  <span>PONTOS: {currentScore.toString().padStart(5, '0')}</span>
                  <span className="text-gray-400">|</span>
                  <span className="text-amber-300">RECORDE: {highScore.toString().padStart(5, '0')}</span>
                </div>

                {/* RESTART BUTTON */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    restartGame();
                  }}
                  className="font-pixel text-[10px] sm:text-xs bg-white text-[#202124] px-5 py-2 sm:px-6 sm:py-2.5 border-2 border-[#202124] hover:bg-gray-100 active:bg-gray-200 transition cursor-pointer shadow-lg flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> REINICIAR
                </button>

                <p className="mt-1.5 sm:mt-2 text-[8px] sm:text-[9px] font-pixel text-gray-200 opacity-90">
                  Toque na tela ou pressione ESPAÇO
                </p>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM HUD & DIRECT HEIGHT CONTROLS */}
        <footer className="w-full mt-3 sm:mt-4 flex flex-wrap items-center justify-between gap-3 text-[10px] sm:text-xs font-pixel select-none">
          {/* Explicit Height Buttons: Click 1 moves to 1; 2 to 2; 3 to 3. NEVER turns black! */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-[10px] font-bold text-[#202124] opacity-80 hidden sm:inline">ALTURA:</span>
            {([1, 2, 3] as Lane[]).map((laneNum) => {
              const active = currentLane === laneNum;
              return (
                <button
                  key={laneNum}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setHeightDirectly(laneNum);
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setHeightDirectly(laneNum);
                  }}
                  className={`px-3.5 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-xs font-pixel transition-all cursor-pointer select-none border-2 shadow-xs ${
                    active
                      ? 'bg-amber-200 text-[#202124] border-[#202124] font-bold ring-2 ring-[#202124]/30 scale-105'
                      : 'bg-white text-[#202124] border-gray-400 hover:border-black hover:bg-gray-100 active:bg-gray-200'
                  }`}
                  title={`Mover BatBlack para Altura ${laneNum}`}
                >
                  {active ? '▶ ' : ''}{laneNum}: {laneNum === 1 ? 'Chão' : laneNum === 2 ? 'Meio' : 'Cima'}
                </button>
              );
            })}
          </div>

          {/* High Score & Live Score Badges (Clean white & amber buttons, NEVER black) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Pontos em Tempo Real */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-white text-[#202124] border-2 border-[#202124] shadow-sm select-none">
              <span className="text-[9px] sm:text-[10px] text-gray-600 font-semibold">PONTOS:</span>
              <span className="font-bold text-[11px] sm:text-xs tracking-wider text-[#202124]">
                {currentScore.toString().padStart(5, '0')}
              </span>
            </div>

            {/* Recorde */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-[#202124] border-2 border-amber-500 shadow-sm select-none">
              <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-[9px] sm:text-[10px] text-amber-900 font-semibold">RECORDE:</span>
              <span className="font-bold text-[11px] sm:text-xs text-amber-700 tracking-wider">
                {highScore.toString().padStart(5, '0')}
              </span>
            </div>
          </div>
        </footer>
      </main>

      {/* FOOTER BAR */}
      <div className="w-full text-center py-2 text-[9px] font-pixel opacity-50 select-none shrink-0 pointer-events-none text-[#202124]">
        BatBlack &copy; 8-Bit Pixel Runner &bull; Use os botões 1, 2, 3 para mudar a altura
      </div>

      {/* Download & Installation Modal */}
      <PWAInstallModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />
    </div>
  );
}
