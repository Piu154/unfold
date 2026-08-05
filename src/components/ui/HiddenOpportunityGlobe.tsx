// import { useEffect, useMemo, useRef, useState } from "react";
// import Globe from "react-globe.gl";

// type GlobePoint = {
//   lat: number;
//   lng: number;
//   size: number;
// };

// const PIN_LOCATIONS: GlobePoint[] = [
//   { lat: 28.6, lng: 77.2, size: 0.55 },
//   { lat: 19.0, lng: 72.8, size: 0.45 },
//   { lat: 13.0, lng: 80.2, size: 0.5 },
//   { lat: 22.6, lng: 88.4, size: 0.42 },

//   { lat: 51.5, lng: -0.1, size: 0.5 },
//   { lat: 48.8, lng: 2.3, size: 0.42 },
//   { lat: 52.5, lng: 13.4, size: 0.48 },

//   { lat: 40.7, lng: -74.0, size: 0.55 },
//   { lat: 37.7, lng: -122.4, size: 0.45 },
//   { lat: 43.6, lng: -79.4, size: 0.4 },

//   { lat: -33.9, lng: 151.2, size: 0.5 },
//   { lat: -37.8, lng: 144.9, size: 0.4 },

//   { lat: 35.7, lng: 139.7, size: 0.55 },
//   { lat: 37.5, lng: 127.0, size: 0.45 },
//   { lat: 31.2, lng: 121.5, size: 0.48 },

//   { lat: 1.3, lng: 103.8, size: 0.42 },
//   { lat: 25.2, lng: 55.3, size: 0.4 },

//   { lat: -1.3, lng: 36.8, size: 0.38 },
//   { lat: -23.5, lng: -46.6, size: 0.45 },
//   { lat: 19.4, lng: -99.1, size: 0.42 },

//   { lat: 41.0, lng: 29.0, size: 0.38 },
//   { lat: 59.3, lng: 18.1, size: 0.35 },
// ];

// export function HiddenOpportunityGlobe() {
//   const globeRef = useRef<any>(undefined);
//   const containerRef = useRef<HTMLDivElement>(null);
//   const [dims, setDims] = useState({ width: 900, height: 500 });

//   const points = useMemo(() => PIN_LOCATIONS, []);

//   // Resize-safe width/height (fixes SSR + window resize issues)
//   useEffect(() => {
//     const el = containerRef.current;
//     if (!el) return;

//     const update = () => {
//       setDims({
//         width: el.clientWidth,
//         height: el.clientHeight,
//       });
//     };

//     update();

//     const observer = new ResizeObserver(update);
//     observer.observe(el);
//     return () => observer.disconnect();
//   }, []);

//   useEffect(() => {
//     const globe = globeRef.current;
//     if (!globe || !globe.controls) return;

//     const controls = globe.controls();

//     controls.autoRotate = true;
//     controls.autoRotateSpeed = 0.28;
//     controls.enableZoom = false;
//     controls.minDistance = 180;
//     controls.maxDistance = 180;

//     globe.pointOfView({ lat: 20, lng: 10, altitude: 2.35 }, 0);
//   }, []);

//   return (
//     <section className="mb-10 overflow-hidden rounded-3xl border border-line bg-panel">
//       <div className="relative">
//         {/* Text floating over the globe */}
//         <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 px-6 pt-6 text-center">
//           <p className="mono text-[10px] uppercase tracking-[0.22em] text-gold">
//             The hidden opportunity globe
//           </p>

//           <h2 className="serif mt-2 text-2xl font-medium sm:text-3xl">
//             Not a job board. A living map of doors.
//           </h2>

//           <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-ink-dim">
//             Every pin is an opportunity, a guide, or a school somewhere in the
//             world — right now, a fellowship is opening, a mentor is ready to
//             be found, a college is looking for an expert to bring in.
//           </p>
//         </div>

//         {/* Globe — pins only, no labels, no click action (decorative/interactive-feel only) */}
//         <div
//           ref={containerRef}
//           className="flex h-[430px] w-full items-center justify-center sm:h-[520px]"
//         >
//           <Globe
//             ref={globeRef}
//             width={dims.width}
//             height={dims.height}
//             backgroundColor="rgba(0,0,0,0)"
//             globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
//             bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
//             showAtmosphere={true}
//             atmosphereColor="#d4a94f"
//             atmosphereAltitude={0.12}
//             showGraticules={false}
//             pointsData={points}
//             pointLat="lat"
//             pointLng="lng"
//             pointAltitude={0.025}
//             pointRadius="size"
//             pointColor={() => "#e8bd63"}
//             pointResolution={12}
//             pointLabel={() => ""}
//             showPointerCursor={false}
//             rendererConfig={{ antialias: true, alpha: true }}
//           />
//         </div>

//         {/* Bottom caption */}
//         <div className="pointer-events-none absolute bottom-5 left-0 right-0 z-10 text-center">
//           <p className="text-[10px] uppercase tracking-widest text-ink-faint">
//             fellowships · guides · schools · hidden doors
//           </p>
//         </div>
//       </div>
//     </section>
//   );
// }