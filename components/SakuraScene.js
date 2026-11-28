'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// A swarm of 3D cherry blossom petals drifting through the air.
// count = number of petals. Fewer petals on phones keeps things smooth.
export default function SakuraScene({ count = 90 }) {
  const mount = useRef(null);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch (e) {
      return; // no 3D support: the page still works
    }

    const small = window.innerWidth < 700;
    const total = small ? Math.round(count * 0.5) : count;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, el.clientWidth / el.clientHeight, 0.1, 100);
    camera.position.z = 12;

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(4, 8, 8);
    scene.add(sun);

    // Petal shape: a rounded heart-like leaf with a small notch
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.5, 0.2, 0.7, 0.9, 0.25, 1.15);
    shape.lineTo(0, 1.0);
    shape.lineTo(-0.25, 1.15);
    shape.bezierCurveTo(-0.7, 0.9, -0.5, 0.2, 0, 0);
    const geometry = new THREE.ShapeGeometry(shape, 12);

    const colors = [0xffd6e5, 0xffb6d1, 0xff9ec4, 0xffffff, 0xf9c6da];
    const petals = [];

    for (let i = 0; i < total; i++) {
      const material = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        side: THREE.DoubleSide,
        roughness: 0.6,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(geometry, material);
      const s = 0.35 + Math.random() * 0.55;
      mesh.scale.set(s, s, s);
      mesh.position.set((Math.random() - 0.5) * 26, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 14 - 2);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      mesh.userData = {
        fall: 0.012 + Math.random() * 0.02,
        sway: 0.4 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
        spin: new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02),
      };
      scene.add(mesh);
      petals.push(mesh);
    }

    let mx = 0, my = 0;
    function onMove(e) {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    }
    window.addEventListener('mousemove', onMove);

    function onResize() {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', onResize);

    let t = 0;
    let frame;
    function animate() {
      frame = requestAnimationFrame(animate);
      t += 0.01;
      petals.forEach((p) => {
        const d = p.userData;
        p.position.y -= d.fall;
        p.position.x += Math.sin(t * d.sway + d.phase) * 0.006 + 0.002;
        p.rotation.x += d.spin.x;
        p.rotation.y += d.spin.y;
        p.rotation.z += d.spin.z;
        if (p.position.y < -9) {
          p.position.y = 9;
          p.position.x = (Math.random() - 0.5) * 26;
        }
        if (p.position.x > 14) p.position.x = -14;
      });
      camera.position.x += (mx * 0.8 - camera.position.x) * 0.03;
      camera.position.y += (-my * 0.5 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', onResize);
      petals.forEach((p) => p.material.dispose());
      geometry.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, [count]);

  return <div ref={mount} style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }} />;
}
