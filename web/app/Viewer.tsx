"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export default function Viewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true);
      return;
    }

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 8000);

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.outline = "none";

    // Lighting — soft, neutral, to read geometry on a light backdrop
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b2a4, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(2, 3, 2.5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.8);
    fill.position.set(-2.5, 1, -1.5);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.6);
    rim.position.set(0, 1.5, -3);
    scene.add(rim);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.1;

    let raf = 0;
    let disposed = false;

    const loader = new GLTFLoader();
    loader.load(
      "/model/starboard.glb",
      (gltf) => {
        if (disposed) return;
        const obj = gltf.scene;
        // CAD is Z-up; rotate to Y-up turntable
        obj.rotation.x = -Math.PI / 2;

        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        obj.position.x -= center.x;
        obj.position.y -= center.y;
        obj.position.z -= center.z;
        scene.add(obj);

        const maxDim = Math.max(size.x, size.y, size.z);
        const dist = maxDim * 1.9;
        camera.position.set(dist * 0.55, dist * 0.5, dist * 0.85);
        camera.near = maxDim / 100;
        camera.far = maxDim * 100;
        camera.updateProjectionMatrix();
        // distance limits relative to model size (GLB is in metres)
        controls.minDistance = maxDim * 0.6;
        controls.maxDistance = maxDim * 6;
        controls.target.set(0, 0, 0);
        controls.update();
        setLoaded(true);
      },
      undefined,
      () => setFailed(true)
    );

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative h-[360px] w-full md:h-[460px]">
      <div ref={mountRef} className="h-full w-full" aria-hidden />
      {/* Poster / fallback — visible until the model renders (or stays if WebGL fails) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assembled-model-render.png"
        alt="Starboard assembled enclosure"
        className={`pointer-events-none absolute inset-0 m-auto max-h-full w-auto max-w-full object-contain transition-opacity duration-700 ${
          loaded && !failed ? "opacity-0" : "opacity-100"
        }`}
      />
      <span className="label pointer-events-none absolute bottom-2 right-3 text-faint">
        {failed ? "static render" : "drag to rotate · scroll to zoom"}
      </span>
    </div>
  );
}
