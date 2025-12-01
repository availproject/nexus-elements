"use client";

import { useEffect, useState, useCallback } from "react";

export interface GlobeThemeColors {
  globeColor: string;
  atmosphereColor: string;
  emissive: string;
  polygonColor: string;
  ambientLight: string;
  arcColors: [string, string, string];
}

const defaultColors: GlobeThemeColors = {
  globeColor: "#062056",
  atmosphereColor: "#ffffff",
  emissive: "#062056",
  polygonColor: "rgba(255, 255, 255, 0.7)",
  ambientLight: "#38bdf8",
  arcColors: ["#06b6d4", "#3b82f6", "#6366f1"],
};

function getCSSVariable(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

function readGlobeTheme(): GlobeThemeColors {
  if (typeof window === "undefined") {
    return defaultColors;
  }

  const globeColor =
    getCSSVariable("--globe-color") || defaultColors.globeColor;
  const atmosphereColor =
    getCSSVariable("--globe-atmosphere") || defaultColors.atmosphereColor;
  const emissive = getCSSVariable("--globe-emissive") || defaultColors.emissive;
  const polygonColor =
    getCSSVariable("--globe-polygon") || defaultColors.polygonColor;
  const ambientLight =
    getCSSVariable("--globe-ambient-light") || defaultColors.ambientLight;
  const arc1 = getCSSVariable("--globe-arc-1") || defaultColors.arcColors[0];
  const arc2 = getCSSVariable("--globe-arc-2") || defaultColors.arcColors[1];
  const arc3 = getCSSVariable("--globe-arc-3") || defaultColors.arcColors[2];

  return {
    globeColor,
    atmosphereColor,
    emissive,
    polygonColor,
    ambientLight,
    arcColors: [arc1, arc2, arc3],
  };
}

export function useGlobeTheme(): GlobeThemeColors {
  const [colors, setColors] = useState<GlobeThemeColors>(defaultColors);

  const updateColors = useCallback(() => {
    setColors(readGlobeTheme());
  }, []);

  useEffect(() => {
    // Initial read
    updateColors();

    // Watch for class changes on <html> element (theme switches)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          // Small delay to let CSS variables update
          requestAnimationFrame(() => {
            updateColors();
          });
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Also listen for storage events (in case theme is stored in localStorage)
    const handleStorage = () => {
      requestAnimationFrame(() => {
        updateColors();
      });
    };
    globalThis.addEventListener("storage", handleStorage);

    return () => {
      observer.disconnect();
      globalThis.removeEventListener("storage", handleStorage);
    };
  }, [updateColors]);

  return colors;
}
