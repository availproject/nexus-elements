"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  Color,
  Scene,
  Fog,
  PerspectiveCamera,
  Vector3,
  Sprite,
  TextureLoader,
  Group,
  AdditiveBlending,
} from "three";
import ThreeGlobe from "three-globe";
import { useThree, Canvas, extend, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import countries from "@/data/globe.json";

declare module "@react-three/fiber" {
  interface ThreeElements {
    threeGlobe: ThreeElements["mesh"] & (new () => ThreeGlobe);
  }
}

extend({ ThreeGlobe: ThreeGlobe });

const aspect = 1.2;
const cameraZ = 300;
const GLOBE_RADIUS = 100; // Default three-globe radius

type Position = {
  order: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  arcAlt: number;
  color: string;
};

export type ChainLocation = {
  lat: number;
  lng: number;
  chain: string;
  chainIcon: string;
};

export type GlobeConfig = {
  pointSize?: number;
  globeColor?: string;
  showAtmosphere?: boolean;
  atmosphereColor?: string;
  atmosphereAltitude?: number;
  emissive?: string;
  emissiveIntensity?: number;
  shininess?: number;
  polygonColor?: string;
  ambientLight?: string;
  directionalLeftLight?: string;
  directionalTopLight?: string;
  pointLight?: string;
  arcTime?: number;
  arcLength?: number;
  rings?: number;
  maxRings?: number;
  initialPosition?: {
    lat: number;
    lng: number;
  };
  autoRotate?: boolean;
  autoRotateSpeed?: number;
};

interface WorldProps {
  globeConfig: GlobeConfig;
  data: Position[];
  chainLocations?: ChainLocation[];
}

// Convert lat/lng to 3D position on sphere
function latLngToVector3(lat: number, lng: number, radius: number): Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new Vector3(x, y, z);
}

// Create a fallback canvas texture (shared across all markers)
function createFallbackCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    // Draw a simple chain icon placeholder
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 28);
    gradient.addColorStop(0, "#60a5fa");
    gradient.addColorStop(1, "#3b82f6");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fill();

    // Inner circle
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.beginPath();
    ctx.arc(32, 32, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

// Chain marker sprite component
function ChainMarker({
  lat,
  lng,
  chain,
  chainIcon,
  radius,
}: Readonly<{
  lat: number;
  lng: number;
  chain: string;
  chainIcon: string;
  radius: number;
}>) {
  const spriteRef = useRef<Sprite>(null);
  const ringRef = useRef<Sprite>(null);
  const [textureLoaded, setTextureLoaded] = useState(false);
  const [textureCanvas, setTextureCanvas] = useState<HTMLCanvasElement | null>(
    null
  );
  const ringPhase = useMemo(() => Math.random() * Math.PI * 2, []);

  // Calculate position
  const position = useMemo(
    () => latLngToVector3(lat, lng, radius + 2),
    [lat, lng, radius]
  );

  // Load chain icon via Image element to handle CORS
  useEffect(() => {
    // Always start with fallback, then try to load the actual icon
    setTextureCanvas(createFallbackCanvas());
    setTextureLoaded(true);

    if (!chainIcon) {
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      // Draw the loaded image onto a canvas
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Draw circular clipped image
        ctx.beginPath();
        ctx.arc(32, 32, 30, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 0, 0, 64, 64);
      }
      setTextureCanvas(canvas);
    };

    img.onerror = () => {
      console.warn(`Chain icon failed to load: ${chainIcon}, using fallback`);
      // Keep the fallback that was already set
    };

    img.src = chainIcon;
  }, [chainIcon]);

  // Create Three.js texture from canvas
  const texture = useMemo(() => {
    if (!textureCanvas) return null;
    const loader = new TextureLoader();
    return loader.load(textureCanvas.toDataURL());
  }, [textureCanvas]);

  // Create ring texture (simple radial gradient)
  const ringTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
      gradient.addColorStop(0.5, "rgba(255, 255, 255, 0)");
      gradient.addColorStop(0.7, "rgba(255, 255, 255, 0.8)");
      gradient.addColorStop(0.85, "rgba(255, 255, 255, 0.4)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    }
    const loader = new TextureLoader();
    return loader.load(canvas.toDataURL());
  }, []);

  // Animate the ring pulse
  useFrame((state) => {
    if (ringRef.current) {
      const time = state.clock.elapsedTime + ringPhase;
      const pulse = Math.sin(time * 2) * 0.5 + 0.5;
      const scale = 8 + pulse * 6;
      ringRef.current.scale.set(scale, scale, 1);
      ringRef.current.material.opacity = 0.3 + pulse * 0.4;
    }
  });

  if (!textureLoaded || !texture) return null;

  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Chain icon sprite */}
      <sprite ref={spriteRef} scale={[6, 6, 1]}>
        <spriteMaterial
          map={texture}
          transparent
          depthTest={false}
          depthWrite={false}
        />
      </sprite>
      {/* Pulsing ring effect */}
      <sprite ref={ringRef} scale={[10, 10, 1]}>
        <spriteMaterial
          map={ringTexture}
          transparent
          opacity={0.5}
          blending={AdditiveBlending}
          depthTest={false}
          depthWrite={false}
        />
      </sprite>
    </group>
  );
}

// Chain markers container
function ChainMarkers({
  chainLocations,
  radius,
}: Readonly<{
  chainLocations: ChainLocation[];
  radius: number;
}>) {
  return (
    <group>
      {chainLocations.map((location, index) => (
        <ChainMarker
          key={`${location.chain}-${index}`}
          lat={location.lat}
          lng={location.lng}
          chain={location.chain}
          chainIcon={location.chainIcon}
          radius={radius}
        />
      ))}
    </group>
  );
}

export function Globe({
  globeConfig,
  data,
  chainLocations = [],
}: Readonly<WorldProps>) {
  const globeRef = useRef<ThreeGlobe | null>(null);
  const groupRef = useRef<Group>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const defaultProps = useMemo(
    () => ({
      pointSize: 1,
      atmosphereColor: "#ffffff",
      showAtmosphere: true,
      atmosphereAltitude: 0.1,
      polygonColor: "rgba(255,255,255,0.7)",
      globeColor: "#1d072e",
      emissive: "#000000",
      emissiveIntensity: 0.1,
      shininess: 0.9,
      arcTime: 2000,
      arcLength: 0.9,
      rings: 1,
      maxRings: 3,
      ...globeConfig,
    }),
    [globeConfig]
  );

  // Initialize globe only once
  useEffect(() => {
    if (!globeRef.current && groupRef.current) {
      globeRef.current = new ThreeGlobe();
      groupRef.current.add(globeRef.current);
      setIsInitialized(true);
    }
  }, []);

  // Build material when globe is initialized or when relevant props change
  useEffect(() => {
    if (!globeRef.current || !isInitialized) return;

    const globeMaterial = globeRef.current.globeMaterial() as unknown as {
      color: Color;
      emissive: Color;
      emissiveIntensity: number;
      shininess: number;
    };
    globeMaterial.color = new Color(defaultProps.globeColor);
    globeMaterial.emissive = new Color(defaultProps.emissive);
    globeMaterial.emissiveIntensity = defaultProps.emissiveIntensity || 0.1;
    globeMaterial.shininess = defaultProps.shininess || 0.9;
  }, [
    isInitialized,
    defaultProps.globeColor,
    defaultProps.emissive,
    defaultProps.emissiveIntensity,
    defaultProps.shininess,
  ]);

  // Build data when globe is initialized or when data changes
  useEffect(() => {
    if (!globeRef.current || !isInitialized || !data) return;

    // Setup hex polygons (countries)
    globeRef.current
      .hexPolygonsData(countries.features)
      .hexPolygonResolution(3)
      .hexPolygonMargin(0.7)
      .showAtmosphere(defaultProps.showAtmosphere)
      .atmosphereColor(defaultProps.atmosphereColor)
      .atmosphereAltitude(defaultProps.atmosphereAltitude)
      .hexPolygonColor(() => defaultProps.polygonColor);

    // Setup arcs
    globeRef.current
      .arcsData(data)
      .arcStartLat((d) => (d as { startLat: number }).startLat * 1)
      .arcStartLng((d) => (d as { startLng: number }).startLng * 1)
      .arcEndLat((d) => (d as { endLat: number }).endLat * 1)
      .arcEndLng((d) => (d as { endLng: number }).endLng * 1)
      .arcColor((e: unknown) => (e as { color: string }).color)
      .arcAltitude((e) => (e as { arcAlt: number }).arcAlt * 1)
      .arcStroke(() => [0.32, 0.28, 0.3][Math.round(Math.random() * 2)])
      .arcDashLength(defaultProps.arcLength)
      .arcDashInitialGap((e) => (e as { order: number }).order * 1)
      .arcDashGap(15)
      .arcDashAnimateTime(() => defaultProps.arcTime);

    // Clear built-in points and rings (we use custom sprites instead)
    globeRef.current.pointsData([]).ringsData([]);
  }, [
    isInitialized,
    data,
    defaultProps.showAtmosphere,
    defaultProps.atmosphereColor,
    defaultProps.atmosphereAltitude,
    defaultProps.polygonColor,
    defaultProps.arcLength,
    defaultProps.arcTime,
  ]);

  return (
    <group ref={groupRef}>
      {/* Custom chain markers rendered as sprites */}
      {isInitialized && chainLocations.length > 0 && (
        <ChainMarkers chainLocations={chainLocations} radius={GLOBE_RADIUS} />
      )}
    </group>
  );
}

export function WebGLRendererConfig() {
  const { gl, size } = useThree();

  useEffect(() => {
    gl.setPixelRatio(window.devicePixelRatio);
    gl.setSize(size.width, size.height);
    gl.setClearColor(0xffaaff, 0);
  }, [gl, size]);

  return null;
}

export function World(props: Readonly<WorldProps>) {
  const { globeConfig } = props;
  const scene = useMemo(() => {
    const s = new Scene();
    s.fog = new Fog(0xffffff, 400, 2000);
    return s;
  }, []);

  const camera = useMemo(
    () => new PerspectiveCamera(50, aspect, 180, 1800),
    []
  );

  return (
    <Canvas scene={scene} camera={camera}>
      <WebGLRendererConfig />
      <ambientLight color={globeConfig.ambientLight} intensity={0.6} />
      <directionalLight
        color={globeConfig.directionalLeftLight}
        position={new Vector3(-400, 100, 400)}
      />
      <directionalLight
        color={globeConfig.directionalTopLight}
        position={new Vector3(-200, 500, 200)}
      />
      <pointLight
        color={globeConfig.pointLight}
        position={new Vector3(-200, 500, 200)}
        intensity={0.8}
      />
      <Globe {...props} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minDistance={cameraZ}
        maxDistance={cameraZ}
        autoRotateSpeed={1}
        autoRotate={true}
        minPolarAngle={Math.PI / 3.5}
        maxPolarAngle={Math.PI - Math.PI / 3}
      />
    </Canvas>
  );
}

export function hexToRgb(hex: string) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function (m, r, g, b) {
    return r + r + g + g + b + b;
  });

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : null;
}

export function genRandomNumbers(min: number, max: number, count: number) {
  const arr: number[] = [];
  while (arr.length < count) {
    const r = Math.floor(Math.random() * (max - min)) + min;
    if (!arr.includes(r)) arr.push(r);
  }

  return arr;
}
