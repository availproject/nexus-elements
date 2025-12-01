"use client";
import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { useGlobeTheme } from "@/hooks/use-globe-theme";

const World = dynamic(() => import("./ui/globe").then((m) => m.World), {
  ssr: false,
});

// Chain location type for custom markers
export type ChainLocation = {
  lat: number;
  lng: number;
  chain: string;
  chainIcon: string;
};

function NexusGlobe() {
  const themeColors = useGlobeTheme();

  // Build globe config from theme colors
  const globeConfig = useMemo(
    () => ({
      pointSize: 4,
      globeColor: themeColors.globeColor,
      showAtmosphere: true,
      atmosphereColor: themeColors.atmosphereColor,
      atmosphereAltitude: 0.1,
      emissive: themeColors.emissive,
      emissiveIntensity: 0.1,
      shininess: 0.9,
      polygonColor: themeColors.polygonColor,
      ambientLight: themeColors.ambientLight,
      directionalLeftLight: "#ffffff",
      directionalTopLight: "#ffffff",
      pointLight: "#ffffff",
      arcTime: 1000,
      arcLength: 0.9,
      rings: 1,
      maxRings: 3,
      initialPosition: { lat: 22.3193, lng: 114.1694 },
      autoRotate: true,
      autoRotateSpeed: 0.5,
    }),
    [themeColors]
  );

  // Use arc colors from theme
  const colors = useMemo(() => themeColors.arcColors, [themeColors.arcColors]);

  // Chain locations for custom markers (using local SVG icons)
  // Positioned on major cities/countries spread across the globe
  const chainLocations: ChainLocation[] = useMemo(
    () => [
      {
        // United States - San Francisco
        lat: 37.7749,
        lng: -122.4194,
        chain: "ethereum",
        chainIcon: "/chains/ethereum.svg",
      },
      {
        // United Kingdom - London
        lat: 51.5074,
        lng: -0.1278,
        chain: "base",
        chainIcon: "/chains/base.svg",
      },
      {
        // India - Mumbai
        lat: 19.076,
        lng: 72.8777,
        chain: "polygon",
        chainIcon: "/chains/polygon.svg",
      },
      {
        // Japan - Tokyo
        lat: 35.6762,
        lng: 139.6503,
        chain: "arbitrum",
        chainIcon: "/chains/arbitrum.svg",
      },
      {
        // China - Shanghai
        lat: 31.2304,
        lng: 121.4737,
        chain: "optimism",
        chainIcon: "/chains/optimism.svg",
      },
      {
        // Canada - Toronto
        lat: 43.6532,
        lng: -79.3832,
        chain: "avalanche",
        chainIcon: "/chains/avalanche.svg",
      },
      {
        // Australia - Sydney
        lat: -33.8688,
        lng: 151.2093,
        chain: "scroll",
        chainIcon: "/chains/scroll.svg",
      },
      {
        // Germany - Berlin
        lat: 52.52,
        lng: 13.405,
        chain: "bnb",
        chainIcon: "/chains/bnb.svg",
      },
      {
        // Brazil - São Paulo
        lat: -23.5505,
        lng: -46.6333,
        chain: "monad",
        chainIcon: "/chains/monad.svg",
      },
      {
        // South Korea - Seoul
        lat: 37.5665,
        lng: 126.978,
        chain: "kaia",
        chainIcon: "/chains/kaia.svg",
      },
      {
        // UAE - Dubai
        lat: 25.2048,
        lng: 55.2708,
        chain: "sophon",
        chainIcon: "/chains/sophon.svg",
      },
      {
        // South Africa - Johannesburg
        lat: -26.2041,
        lng: 28.0473,
        chain: "hyperevm",
        chainIcon: "/chains/hyperevm.svg",
      },
    ],
    []
  );

  // Generate arcs with theme colors
  const sampleArcs = useMemo(() => {
    const getRandomColor = () =>
      colors[Math.floor(Math.random() * colors.length)];

    return [
      {
        order: 1,
        startLat: -19.885592,
        startLng: -43.951191,
        endLat: -22.9068,
        endLng: -43.1729,
        arcAlt: 0.1,
        color: getRandomColor(),
      },
      {
        order: 1,
        startLat: 28.6139,
        startLng: 77.209,
        endLat: 3.139,
        endLng: 101.6869,
        arcAlt: 0.2,
        color: getRandomColor(),
      },
      {
        order: 1,
        startLat: -19.885592,
        startLng: -43.951191,
        endLat: -1.303396,
        endLng: 36.852443,
        arcAlt: 0.5,
        color: getRandomColor(),
      },
      {
        order: 2,
        startLat: 1.3521,
        startLng: 103.8198,
        endLat: 35.6762,
        endLng: 139.6503,
        arcAlt: 0.2,
        color: getRandomColor(),
      },
      {
        order: 2,
        startLat: 51.5072,
        startLng: -0.1276,
        endLat: 3.139,
        endLng: 101.6869,
        arcAlt: 0.3,
        color: getRandomColor(),
      },
      {
        order: 2,
        startLat: -15.785493,
        startLng: -47.909029,
        endLat: 36.162809,
        endLng: -115.119411,
        arcAlt: 0.3,
        color: getRandomColor(),
      },
      {
        order: 3,
        startLat: -33.8688,
        startLng: 151.2093,
        endLat: 22.3193,
        endLng: 114.1694,
        arcAlt: 0.3,
        color: getRandomColor(),
      },
      {
        order: 3,
        startLat: 21.3099,
        startLng: -157.8581,
        endLat: 40.7128,
        endLng: -74.006,
        arcAlt: 0.3,
        color: getRandomColor(),
      },
      {
        order: 3,
        startLat: -6.2088,
        startLng: 106.8456,
        endLat: 51.5072,
        endLng: -0.1276,
        arcAlt: 0.3,
        color: getRandomColor(),
      },
      {
        order: 4,
        startLat: 11.986597,
        startLng: 8.571831,
        endLat: -15.595412,
        endLng: -56.05918,
        arcAlt: 0.5,
        color: getRandomColor(),
      },
      {
        order: 4,
        startLat: -34.6037,
        startLng: -58.3816,
        endLat: 22.3193,
        endLng: 114.1694,
        arcAlt: 0.7,
        color: getRandomColor(),
      },
      {
        order: 4,
        startLat: 51.5072,
        startLng: -0.1276,
        endLat: 48.8566,
        endLng: -2.3522,
        arcAlt: 0.1,
        color: getRandomColor(),
      },
      {
        order: 5,
        startLat: 14.5995,
        startLng: 120.9842,
        endLat: 51.5072,
        endLng: -0.1276,
        arcAlt: 0.3,
        color: getRandomColor(),
      },
      {
        order: 5,
        startLat: 1.3521,
        startLng: 103.8198,
        endLat: -33.8688,
        endLng: 151.2093,
        arcAlt: 0.2,
        color: getRandomColor(),
      },
      {
        order: 5,
        startLat: 34.0522,
        startLng: -118.2437,
        endLat: 48.8566,
        endLng: -2.3522,
        arcAlt: 0.2,
        color: getRandomColor(),
      },
      {
        order: 6,
        startLat: -15.432563,
        startLng: 28.315853,
        endLat: 1.094136,
        endLng: -63.34546,
        arcAlt: 0.7,
        color: getRandomColor(),
      },
      {
        order: 6,
        startLat: 37.5665,
        startLng: 126.978,
        endLat: 35.6762,
        endLng: 139.6503,
        arcAlt: 0.1,
        color: getRandomColor(),
      },
      {
        order: 6,
        startLat: 22.3193,
        startLng: 114.1694,
        endLat: 51.5072,
        endLng: -0.1276,
        arcAlt: 0.3,
        color: getRandomColor(),
      },
      {
        order: 7,
        startLat: -19.885592,
        startLng: -43.951191,
        endLat: -15.595412,
        endLng: -56.05918,
        arcAlt: 0.1,
        color: getRandomColor(),
      },
      {
        order: 7,
        startLat: 48.8566,
        startLng: -2.3522,
        endLat: 52.52,
        endLng: 13.405,
        arcAlt: 0.1,
        color: getRandomColor(),
      },
      {
        order: 7,
        startLat: 52.52,
        startLng: 13.405,
        endLat: 34.0522,
        endLng: -118.2437,
        arcAlt: 0.2,
        color: getRandomColor(),
      },
      {
        order: 8,
        startLat: -8.833221,
        startLng: 13.264837,
        endLat: -33.936138,
        endLng: 18.436529,
        arcAlt: 0.2,
        color: getRandomColor(),
      },
      {
        order: 8,
        startLat: 49.2827,
        startLng: -123.1207,
        endLat: 52.3676,
        endLng: 4.9041,
        arcAlt: 0.2,
        color: getRandomColor(),
      },
      {
        order: 8,
        startLat: 1.3521,
        startLng: 103.8198,
        endLat: 40.7128,
        endLng: -74.006,
        arcAlt: 0.5,
        color: getRandomColor(),
      },
      {
        order: 9,
        startLat: 51.5072,
        startLng: -0.1276,
        endLat: 34.0522,
        endLng: -118.2437,
        arcAlt: 0.2,
        color: getRandomColor(),
      },
      {
        order: 9,
        startLat: 22.3193,
        startLng: 114.1694,
        endLat: -22.9068,
        endLng: -43.1729,
        arcAlt: 0.7,
        color: getRandomColor(),
      },
      {
        order: 9,
        startLat: 1.3521,
        startLng: 103.8198,
        endLat: -34.6037,
        endLng: -58.3816,
        arcAlt: 0.5,
        color: getRandomColor(),
      },
      {
        order: 10,
        startLat: -22.9068,
        startLng: -43.1729,
        endLat: 28.6139,
        endLng: 77.209,
        arcAlt: 0.7,
        color: getRandomColor(),
      },
      {
        order: 10,
        startLat: 34.0522,
        startLng: -118.2437,
        endLat: 31.2304,
        endLng: 121.4737,
        arcAlt: 0.3,
        color: getRandomColor(),
      },
      {
        order: 10,
        startLat: -6.2088,
        startLng: 106.8456,
        endLat: 52.3676,
        endLng: 4.9041,
        arcAlt: 0.3,
        color: getRandomColor(),
      },
      {
        order: 11,
        startLat: 41.9028,
        startLng: 12.4964,
        endLat: 34.0522,
        endLng: -118.2437,
        arcAlt: 0.2,
        color: getRandomColor(),
      },
      {
        order: 11,
        startLat: -6.2088,
        startLng: 106.8456,
        endLat: 31.2304,
        endLng: 121.4737,
        arcAlt: 0.2,
        color: getRandomColor(),
      },
      {
        order: 11,
        startLat: 22.3193,
        startLng: 114.1694,
        endLat: 1.3521,
        endLng: 103.8198,
        arcAlt: 0.2,
        color: getRandomColor(),
      },
      {
        order: 12,
        startLat: 34.0522,
        startLng: -118.2437,
        endLat: 37.7749,
        endLng: -122.4194,
        arcAlt: 0.1,
        color: getRandomColor(),
      },
      {
        order: 12,
        startLat: 35.6762,
        startLng: 139.6503,
        endLat: 22.3193,
        endLng: 114.1694,
        arcAlt: 0.2,
        color: getRandomColor(),
      },
      {
        order: 12,
        startLat: 22.3193,
        startLng: 114.1694,
        endLat: 34.0522,
        endLng: -118.2437,
        arcAlt: 0.3,
        color: getRandomColor(),
      },
      {
        order: 13,
        startLat: 52.52,
        startLng: 13.405,
        endLat: 22.3193,
        endLng: 114.1694,
        arcAlt: 0.3,
        color: getRandomColor(),
      },
      {
        order: 13,
        startLat: 11.986597,
        startLng: 8.571831,
        endLat: 35.6762,
        endLng: 139.6503,
        arcAlt: 0.3,
        color: getRandomColor(),
      },
      {
        order: 13,
        startLat: -22.9068,
        startLng: -43.1729,
        endLat: -34.6037,
        endLng: -58.3816,
        arcAlt: 0.1,
        color: getRandomColor(),
      },
      {
        order: 14,
        startLat: -33.936138,
        startLng: 18.436529,
        endLat: 21.395643,
        endLng: 39.883798,
        arcAlt: 0.3,
        color: getRandomColor(),
      },
    ];
  }, [colors]);

  return (
    <div className="absolute w-full -top-36 sm:bottom-0 -z-10 h-64 sm:h-144">
      <World
        data={sampleArcs}
        globeConfig={globeConfig}
        chainLocations={chainLocations}
      />
    </div>
  );
}
export default NexusGlobe;
