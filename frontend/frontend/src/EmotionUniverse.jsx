import { useEffect, useRef } from "react";
import * as THREE from "three";

function EmotionUniverse({ emotion }) {
  const mountRef = useRef(null);

  const emotionRef = useRef(
    emotion?.toLowerCase() || "neutral"
  );

  useEffect(() => {
    emotionRef.current =
      emotion?.toLowerCase() || "neutral";
  }, [emotion]);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) return;

    // ==================================================
    // EMOTION PROFILES
    // ==================================================

    const emotionProfiles = {
      joy: {
        colors: [
          "#ffd166",
          "#ff9f43",
          "#ff6b6b",
          "#fff3b0",
          "#ffcf70",
        ],
        speed: 0.0018,
        swirl: 1.35,
        pulse: 1.5,
        brightness: 1.35,
        turbulence: 0.7,
      },

      sadness: {
        colors: [
          "#2563eb",
          "#3b82f6",
          "#6366f1",
          "#60a5fa",
          "#93c5fd",
        ],
        speed: 0.00055,
        swirl: 0.65,
        pulse: 0.55,
        brightness: 0.8,
        turbulence: 0.25,
      },

      anger: {
        colors: [
          "#ff1744",
          "#ff3030",
          "#ff5722",
          "#ff6b35",
          "#ff8a65",
        ],
        speed: 0.0045,
        swirl: 2.0,
        pulse: 2.4,
        brightness: 1.8,
        turbulence: 1.5,
      },

      fear: {
        colors: [
          "#7c3aed",
          "#8b5cf6",
          "#a855f7",
          "#c084fc",
          "#e879f9",
        ],
        speed: 0.0028,
        swirl: 1.65,
        pulse: 1.3,
        brightness: 1.1,
        turbulence: 1.25,
      },

      surprise: {
        colors: [
          "#ff9800",
          "#ff4d6d",
          "#ffd166",
          "#ff7043",
          "#fff176",
        ],
        speed: 0.006,
        swirl: 2.4,
        pulse: 2.8,
        brightness: 1.9,
        turbulence: 2.0,
      },

      disgust: {
        colors: [
          "#22c55e",
          "#55c878",
          "#84cc16",
          "#a3e635",
          "#bef264",
        ],
        speed: 0.0017,
        swirl: 1.15,
        pulse: 1.0,
        brightness: 1.0,
        turbulence: 1.0,
      },

      neutral: {
        colors: [
          "#60a5fa",
          "#7dd3fc",
          "#a78bfa",
          "#c4b5fd",
          "#e0e7ff",
        ],
        speed: 0.001,
        swirl: 0.9,
        pulse: 0.9,
        brightness: 1.0,
        turbulence: 0.45,
      },
    };

    // ==================================================
    // SCENE
    // ==================================================

    const scene = new THREE.Scene();

    scene.background =
      new THREE.Color("#010108");

    // ==================================================
    // CAMERA
    // ==================================================

    const camera =
      new THREE.PerspectiveCamera(
        52,
        window.innerWidth /
          window.innerHeight,
        0.1,
        1000
      );

    camera.position.set(
      0,
      3.8,
      17
    );

    camera.lookAt(
      0,
      0,
      0
    );

    // ==================================================
    // RENDERER
    // ==================================================

    const renderer =
      new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference:
          "high-performance",
      });

    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        2
      )
    );

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );

    renderer.outputColorSpace =
      THREE.SRGBColorSpace;

    mount.appendChild(
      renderer.domElement
    );

    // ==================================================
    // GALAXY GROUP
    // ==================================================

    const galaxy =
      new THREE.Group();

    galaxy.rotation.x =
      0.48;

    galaxy.rotation.z =
      -0.22;

    galaxy.scale.set(
      1.22,
      1.22,
      1.22
    );

    scene.add(galaxy);

    // ==================================================
    // STAR TEXTURE
    // ==================================================

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width = 64;
    canvas.height = 64;

    const ctx =
      canvas.getContext("2d");

    const gradient =
      ctx.createRadialGradient(
        32,
        32,
        0,
        32,
        32,
        32
      );

    gradient.addColorStop(
      0,
      "rgba(255,255,255,1)"
    );

    gradient.addColorStop(
      0.12,
      "rgba(255,255,255,1)"
    );

    gradient.addColorStop(
      0.3,
      "rgba(255,255,255,0.65)"
    );

    gradient.addColorStop(
      0.6,
      "rgba(255,255,255,0.18)"
    );

    gradient.addColorStop(
      1,
      "rgba(255,255,255,0)"
    );

    ctx.fillStyle =
      gradient;

    ctx.fillRect(
      0,
      0,
      64,
      64
    );

    const starTexture =
      new THREE.CanvasTexture(
        canvas
      );

    // ==================================================
    // GALAXY STARS
    // ==================================================

    const starCount = 30000;

    const starGeometry =
      new THREE.BufferGeometry();

    const positions =
      new Float32Array(
        starCount * 3
      );

    const colors =
      new Float32Array(
        starCount * 3
      );

    const sizes =
      new Float32Array(
        starCount
      );

    const arms = 8;

    function randomEmotionColor() {
      const current =
        emotionProfiles[
          emotionRef.current
        ] ||
        emotionProfiles.neutral;

      return new THREE.Color(
        current.colors[
          Math.floor(
            Math.random() *
              current.colors.length
          )
        ]
      );
    }

    for (
      let i = 0;
      i < starCount;
      i++
    ) {
      const i3 = i * 3;

      // More stars around center
      const radius =
        Math.pow(
          Math.random(),
          0.62
        ) * 11;

      const arm =
        i % arms;

      const baseAngle =
        (arm / arms) *
        Math.PI *
        2;

      const spiralAngle =
        radius *
        0.62;

      const armSpread =
        (Math.random() - 0.5) *
        (0.18 + radius * 0.12);

      const angle =
        baseAngle +
        spiralAngle +
        armSpread;

      // Organic thickness
      const thickness =
        (Math.random() - 0.5) *
        (0.25 + radius * 0.13);

      const x =
        Math.cos(angle) *
          radius +
        Math.cos(
          angle + Math.PI / 2
        ) *
          thickness;

      const z =
        Math.sin(angle) *
          radius +
        Math.sin(
          angle + Math.PI / 2
        ) *
          thickness;

      const y =
        (Math.random() - 0.5) *
        (0.12 + radius * 0.075);

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      const color =
        randomEmotionColor();

      // Some white stars
      if (
        Math.random() < 0.14
      ) {
        color.lerp(
          new THREE.Color(
            "#ffffff"
          ),
          0.55
        );
      }

      colors[i3] =
        color.r;

      colors[i3 + 1] =
        color.g;

      colors[i3 + 2] =
        color.b;

      sizes[i] =
        Math.random() < 0.035
          ? Math.random() *
              2.8 +
            2
          : Math.random() *
              1.2 +
            0.45;
    }

    starGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        positions,
        3
      )
    );

    starGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(
        colors,
        3
      )
    );

    starGeometry.setAttribute(
      "size",
      new THREE.BufferAttribute(
        sizes,
        1
      )
    );

    const starMaterial =
      new THREE.PointsMaterial({
        size: 0.075,
        map: starTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        blending:
          THREE.AdditiveBlending,
        sizeAttenuation: true,
      });

    const stars =
      new THREE.Points(
        starGeometry,
        starMaterial
      );

    galaxy.add(stars);

    // ==================================================
    // NEBULA CLOUD
    // ==================================================

    const nebulaCount = 12000;

    const nebulaGeometry =
      new THREE.BufferGeometry();

    const nebulaPositions =
      new Float32Array(
        nebulaCount * 3
      );

    const nebulaColors =
      new Float32Array(
        nebulaCount * 3
      );

    for (
      let i = 0;
      i < nebulaCount;
      i++
    ) {
      const i3 = i * 3;

      const radius =
        Math.pow(
          Math.random(),
          0.72
        ) * 10.5;

      const angle =
        Math.random() *
        Math.PI *
        2;

      const cloudNoise =
        Math.sin(
          radius * 1.5
        ) *
        0.55;

      const spread =
        (Math.random() - 0.5) *
        (1.0 + radius * 0.14);

      const x =
        Math.cos(angle) *
          radius +
        Math.cos(
          angle + Math.PI / 2
        ) *
          spread +
        cloudNoise;

      const z =
        Math.sin(angle) *
          radius +
        Math.sin(
          angle + Math.PI / 2
        ) *
          spread;

      const y =
        (Math.random() - 0.5) *
        (0.5 + radius * 0.12);

      nebulaPositions[i3] =
        x;

      nebulaPositions[i3 + 1] =
        y;

      nebulaPositions[i3 + 2] =
        z;

      const color =
        randomEmotionColor();

      color.multiplyScalar(
        0.35 +
          Math.random() *
            0.7
      );

      nebulaColors[i3] =
        color.r;

      nebulaColors[i3 + 1] =
        color.g;

      nebulaColors[i3 + 2] =
        color.b;
    }

    nebulaGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        nebulaPositions,
        3
      )
    );

    nebulaGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(
        nebulaColors,
        3
      )
    );

    const nebulaMaterial =
      new THREE.PointsMaterial({
        size: 0.24,
        map: starTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.13,
        depthWrite: false,
        blending:
          THREE.AdditiveBlending,
      });

    const nebula =
      new THREE.Points(
        nebulaGeometry,
        nebulaMaterial
      );

    galaxy.add(nebula);

    // ==================================================
    // INNER CORE
    // ==================================================

    const coreCount = 8000;

    const coreGeometry =
      new THREE.BufferGeometry();

    const corePositions =
      new Float32Array(
        coreCount * 3
      );

    const coreColors =
      new Float32Array(
        coreCount * 3
      );

    for (
      let i = 0;
      i < coreCount;
      i++
    ) {
      const i3 = i * 3;

      const radius =
        Math.pow(
          Math.random(),
          2.5
        ) * 3;

      const angle =
        Math.random() *
        Math.PI *
        2;

      corePositions[i3] =
        Math.cos(angle) *
        radius;

      corePositions[i3 + 1] =
        (Math.random() - 0.5) *
        0.9;

      corePositions[i3 + 2] =
        Math.sin(angle) *
        radius;

      const color =
        randomEmotionColor();

      if (
        Math.random() < 0.35
      ) {
        color.lerp(
          new THREE.Color(
            "#fff5cc"
          ),
          0.7
        );
      }

      coreColors[i3] =
        color.r;

      coreColors[i3 + 1] =
        color.g;

      coreColors[i3 + 2] =
        color.b;
    }

    coreGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        corePositions,
        3
      )
    );

    coreGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(
        coreColors,
        3
      )
    );

    const coreMaterial =
      new THREE.PointsMaterial({
        size: 0.13,
        map: starTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending:
          THREE.AdditiveBlending,
      });

    const core =
      new THREE.Points(
        coreGeometry,
        coreMaterial
      );

    galaxy.add(core);

    // ==================================================
    // CENTRAL GLOW
    // ==================================================

    const glowMaterial =
      new THREE.SpriteMaterial({
        map: starTexture,
        color:
          randomEmotionColor(),
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending:
          THREE.AdditiveBlending,
      });

    const glow =
      new THREE.Sprite(
        glowMaterial
      );

    glow.scale.set(
      5.2,
      5.2,
      1
    );

    galaxy.add(glow);

    // ==================================================
    // SECONDARY GLOW
    // ==================================================

    const glow2Material =
      new THREE.SpriteMaterial({
        map: starTexture,
        color:
          randomEmotionColor(),
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        blending:
          THREE.AdditiveBlending,
      });

    const glow2 =
      new THREE.Sprite(
        glow2Material
      );

    glow2.scale.set(
      8,
      8,
      1
    );

    galaxy.add(glow2);

    // ==================================================
    // BACKGROUND STARS
    // ==================================================

    const backgroundCount =
      6500;

    const backgroundGeometry =
      new THREE.BufferGeometry();

    const backgroundPositions =
      new Float32Array(
        backgroundCount * 3
      );

    for (
      let i = 0;
      i < backgroundCount;
      i++
    ) {
      const i3 = i * 3;

      backgroundPositions[i3] =
        (Math.random() - 0.5) *
        90;

      backgroundPositions[
        i3 + 1
      ] =
        (Math.random() - 0.5) *
        55;

      backgroundPositions[
        i3 + 2
      ] =
        (Math.random() - 0.5) *
        90;
    }

    backgroundGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        backgroundPositions,
        3
      )
    );

    const backgroundMaterial =
      new THREE.PointsMaterial({
        size: 0.035,
        map: starTexture,
        color: "#ffffff",
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending:
          THREE.AdditiveBlending,
      });

    const backgroundStars =
      new THREE.Points(
        backgroundGeometry,
        backgroundMaterial
      );

    scene.add(
      backgroundStars
    );

    // ==================================================
    // EMOTION LIGHT
    // ==================================================

    const emotionLight =
      new THREE.PointLight(
        randomEmotionColor(),
        2.2,
        20
      );

    emotionLight.position.set(
      0,
      0,
      0
    );

    galaxy.add(
      emotionLight
    );

    // ==================================================
    // ANIMATION
    // ==================================================

    const clock =
      new THREE.Clock();

    let animationId;

    const animate = () => {
      animationId =
        requestAnimationFrame(
          animate
        );

      const time =
        clock.getElapsedTime();

      const current =
        emotionProfiles[
          emotionRef.current
        ] ||
        emotionProfiles.neutral;

      // ----------------------------------------------
      // GALAXY ROTATION
      // ----------------------------------------------

      galaxy.rotation.y +=
        current.speed;

      // ----------------------------------------------
      // ORGANIC FLOATING
      // ----------------------------------------------

      galaxy.position.y =
        Math.sin(
          time * 0.35
        ) *
        0.14;

      galaxy.position.x =
        Math.cos(
          time * 0.22
        ) *
        0.1;

      // ----------------------------------------------
      // SPIRAL ARM MOVEMENT
      // ----------------------------------------------

      stars.rotation.z =
        Math.sin(
          time * current.swirl
        ) *
        0.035;

      stars.rotation.x =
        Math.sin(
          time * 0.4
        ) *
        current.turbulence *
        0.018;

      // ----------------------------------------------
      // NEBULA FLOW
      // ----------------------------------------------

      nebula.rotation.y =
        time *
        current.speed *
        1.8;

      nebula.rotation.z =
        Math.sin(
          time * 0.3
        ) *
        current.turbulence *
        0.08;

      // ----------------------------------------------
      // CORE ROTATION
      // ----------------------------------------------

      core.rotation.y =
        time *
        current.speed *
        2.5;

      // ----------------------------------------------
      // CORE PULSE
      // ----------------------------------------------

      const pulse =
        1 +
        Math.sin(
          time *
            current.pulse
        ) *
          0.09;

      glow.scale.set(
        5.2 * pulse,
        5.2 * pulse,
        1
      );

      const pulse2 =
        1 +
        Math.sin(
          time *
            current.pulse *
            0.65
        ) *
          0.12;

      glow2.scale.set(
        8 * pulse2,
        8 * pulse2,
        1
      );

      // ----------------------------------------------
      // NEBULA BREATHING
      // ----------------------------------------------

      nebulaMaterial.opacity =
        0.09 +
        Math.sin(
          time * 0.65
        ) *
          0.035 *
          current.brightness;

      // ----------------------------------------------
      // LIGHT ENERGY
      // ----------------------------------------------

      emotionLight.intensity =
        current.brightness *
        (2.0 +
          Math.sin(
            time *
              current.pulse
          ) *
            0.35);

      // ----------------------------------------------
      // BACKGROUND DRIFT
      // ----------------------------------------------

      backgroundStars.rotation.y =
        time * 0.00025;

      backgroundStars.rotation.x =
        Math.sin(
          time * 0.1
        ) *
        0.025;

      // ----------------------------------------------
      // CAMERA MICRO MOVEMENT
      // ----------------------------------------------

      camera.position.x =
        Math.sin(
          time * 0.18
        ) *
        0.25;

      camera.position.y =
        3.8 +
        Math.cos(
          time * 0.15
        ) *
        0.18;

      camera.lookAt(
        0,
        0,
        0
      );

      renderer.render(
        scene,
        camera
      );
    };

    animate();

    // ==================================================
    // RESIZE
    // ==================================================

    const handleResize = () => {
      camera.aspect =
        window.innerWidth /
        window.innerHeight;

      camera.updateProjectionMatrix();

      renderer.setSize(
        window.innerWidth,
        window.innerHeight
      );
    };

    window.addEventListener(
      "resize",
      handleResize
    );

    // ==================================================
    // CLEANUP
    // ==================================================

    return () => {
      cancelAnimationFrame(
        animationId
      );

      window.removeEventListener(
        "resize",
        handleResize
      );

      starGeometry.dispose();
      starMaterial.dispose();

      nebulaGeometry.dispose();
      nebulaMaterial.dispose();

      coreGeometry.dispose();
      coreMaterial.dispose();

      backgroundGeometry.dispose();
      backgroundMaterial.dispose();

      glowMaterial.dispose();
      glow2Material.dispose();

      starTexture.dispose();

      renderer.dispose();

      if (
        mount.contains(
          renderer.domElement
        )
      ) {
        mount.removeChild(
          renderer.domElement
        );
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        zIndex: 0,
        pointerEvents: "none",
        background:
          "#010108",
      }}
    />
  );
}

export default EmotionUniverse;