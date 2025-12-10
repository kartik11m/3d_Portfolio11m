import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';

const ThreeCanvas = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(w, h);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.left = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';

    mountRef.current.appendChild(renderer.domElement);
    mountRef.current.appendChild(labelRenderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#87ceeb');
    scene.fog = new THREE.Fog('#87ceeb', 20, 100);

    const camera = new THREE.PerspectiveCamera(65, w / h, 0.1, 500);
    camera.position.set(0, 3, 10);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.04;
    controls.enabled = false;

    const sunLight = new THREE.DirectionalLight(0xffffff, 2);
    sunLight.position.set(5, 10, 5);
    sunLight.castShadow = true;
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    const SEG_LEN = 200;
    const HALF = SEG_LEN / 2;

    const textureLoader = new THREE.TextureLoader();

    const terrainColor = textureLoader.load('/textures/Ground/Ground037_4K-JPG_Color.jpg');
    const terrainNormal = textureLoader.load('/textures/Ground/Ground037_4K-JPG_NormalGL.jpg');
    const terrainRoughness = textureLoader.load('/textures/Ground/Ground037_4K-JPG_Roughness.jpg');
    const terrainAO = textureLoader.load('/textures/Ground/Ground037_4K-JPG_Ambient Occlusion.jpg');

    [terrainColor, terrainNormal, terrainRoughness, terrainAO].forEach((tex) => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(4, 4);
    });

    const grassColor = textureLoader.load('/textures/Grass/Grass001_4K-JPG_Color.jpg');
    const grassNormal = textureLoader.load('/textures/Grass/Grass001_4K-JPG_NormalGL.jpg');
    const grassRoughness = textureLoader.load('/textures/Grass/Grass001_4K-JPG_Roughness.jpg');
    const grassAO = textureLoader.load('/textures/Grass/Grass001_4K-JPG_AmbientOcclusion.jpg');

    function createRoadSegment(initialZ) {
      const group = new THREE.Group();
      group.position.z = initialZ;

      const roadGeo = new THREE.PlaneGeometry(6, SEG_LEN);
      const roadMat = new THREE.MeshStandardMaterial({ color: '#333333', side: THREE.DoubleSide });
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.receiveShadow = true;
      group.add(road);

      const terrainGeo = new THREE.PlaneGeometry(40, SEG_LEN, 100, 100);
      terrainGeo.setAttribute('uv2', new THREE.BufferAttribute(terrainGeo.attributes.uv.array, 2));

      const noise = new ImprovedNoise();
      const scale = 0.05;
      for (let i = 0; i < terrainGeo.attributes.position.count; i++) {
        const x = terrainGeo.attributes.position.getX(i);
        const y0 = terrainGeo.attributes.position.getY(i);
        const nx = noise.noise(x * scale, y0 * scale, 0);
        const n2 = noise.noise(x * scale * 2.0, y0 * scale * 2.0, 10);
        let height = nx * 1.0 + n2 * 0.3; // layered noise
        height = Math.min(height, -0.2); // clamp to stay well below road
        terrainGeo.attributes.position.setZ(i, height);
      }
      terrainGeo.computeVertexNormals();

      const terrainMat = new THREE.MeshStandardMaterial({
        map: terrainColor,
        normalMap: terrainNormal,
        roughnessMap: terrainRoughness,
        aoMap: terrainAO,
        roughness: 1.0,
        metalness: 0.0
      });

      const terrainLeft = new THREE.Mesh(terrainGeo.clone(), terrainMat);
      terrainLeft.rotation.x = -Math.PI / 2;
      terrainLeft.position.set(-20, -1, 0);
      terrainLeft.receiveShadow = true;

      const terrainRight = new THREE.Mesh(terrainGeo.clone(), terrainMat);
      terrainRight.rotation.x = -Math.PI / 2;
      terrainRight.position.set(20, -1, 0);
      terrainRight.receiveShadow = true;

      group.add(terrainLeft, terrainRight);

      const grassMat = new THREE.MeshStandardMaterial({
        map: grassColor,
        normalMap: grassNormal,
        roughnessMap: grassRoughness,
        aoMap: grassAO,
        transparent: true,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
        roughness: 0.9,
        metalness: 0.0,
        shadowSide: THREE.FrontSide
      });

      // Custom shader for wind animation
      grassMat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = { value: 0 };
        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `#include <common>
           uniform float uTime;
           `
        );
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           float wind = sin(uTime + position.z * 2.0 + position.x * 0.5) * 0.15;
           transformed.x += wind * (transformed.y * 0.8);
           transformed.z += sin(uTime * 0.7 + position.x) * 0.08 * transformed.y;
           `
        );
        grassMat.userData.shader = shader;
      };

      const bladeGeo = new THREE.PlaneGeometry(0.1, 1.5, 1, 4);
      const bladesPerSide = 3500;
      const grassLeft = new THREE.InstancedMesh(bladeGeo, grassMat, bladesPerSide);
      const grassRight = new THREE.InstancedMesh(bladeGeo, grassMat, bladesPerSide);

      grassLeft.castShadow = true;
      grassLeft.receiveShadow = false;
      grassRight.castShadow = true;
      grassRight.receiveShadow = false;

      const dummy = new THREE.Object3D();
      for (let i = 0; i < bladesPerSide; i++) {
        const x = -10 + (Math.random() - 0.5) * 8;
        const z = (Math.random() - 0.5) * SEG_LEN;
        dummy.position.set(x, -0.8, z);
        dummy.rotation.y = Math.random() * Math.PI;
        const s = 0.7 + Math.random() * 0.6;
        dummy.scale.set(s * 0.5 + Math.random() * 0.15, s * 0.9, s * 0.5 + Math.random() * 0.15);
        dummy.rotation.x = (Math.random() - 0.5) * 0.4 + (Math.random() - 0.5) * 0.1;
        dummy.rotation.z = (Math.random() - 0.5) * 0.2;
        dummy.updateMatrix();
        grassLeft.setMatrixAt(i, dummy.matrix);
      }
      for (let i = 0; i < bladesPerSide; i++) {
        const x = 10 + (Math.random() - 0.5) * 8;
        const z = (Math.random() - 0.5) * SEG_LEN;
        dummy.position.set(x, -0.8, z);
        dummy.rotation.y = Math.random() * Math.PI;
        const s = 0.7 + Math.random() * 0.6;
        dummy.scale.set(s * 0.5 + Math.random() * 0.15, s * 0.9, s * 0.5 + Math.random() * 0.15);
        dummy.rotation.x = (Math.random() - 0.5) * 0.4 + (Math.random() - 0.5) * 0.1;
        dummy.rotation.z = (Math.random() - 0.5) * 0.2;
        dummy.updateMatrix();
        grassRight.setMatrixAt(i, dummy.matrix);
      }
      grassLeft.instanceMatrix.needsUpdate = true;
      grassRight.instanceMatrix.needsUpdate = true;

      group.add(grassLeft, grassRight);

      const stripeMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff' });
      const stripeGroup = new THREE.Group();
      for (let i = -HALF; i < HALF; i += 5) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.01, 1), stripeMaterial);
        stripe.position.set(0, 0.01, i);
        stripeGroup.add(stripe);
      }
      group.add(stripeGroup);

      const treeGroup = new THREE.Group();
      const treeMaterial = new THREE.MeshStandardMaterial({ color: '#228B22' });
      const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#8B4513' });

      for (let i = -HALF; i < HALF; i += 10) {
        const trunkL = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1), trunkMaterial);
        const crownL = new THREE.Mesh(new THREE.SphereGeometry(0.6), treeMaterial);
        trunkL.castShadow = true;
        crownL.castShadow = true;
        trunkL.position.set(-3.5, -0.5, i);
        crownL.position.set(-3.5, 0.4, i);
        treeGroup.add(trunkL, crownL);

        const trunkR = trunkL.clone();
        const crownR = crownL.clone();
        trunkR.position.x = 3.5;
        crownR.position.x = 3.5;
        treeGroup.add(trunkR, crownR);
      }
      group.add(treeGroup);

      return group;
    }

    const segment1 = createRoadSegment(0);
    const segment2 = createRoadSegment(-SEG_LEN);
    scene.add(segment1, segment2);

        const sun = new THREE.Mesh(
      new THREE.SphereGeometry(2),
      new THREE.MeshBasicMaterial({ color: '#ffcc00' })
    );
    sun.position.set(10, 10, -50);
    scene.add(sun);

    // Car setup
    let carModel = null;
    let carParts = [];
    const originalPositions = new Map();
    let exploded = false;
    let speed = 0.2;

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') speed = Math.min(0.7, speed + 0.1);
      if (e.key === 'ArrowDown') speed = Math.max(0, speed - 0.1);
    });

    const resumeDiv = document.createElement('div');
    resumeDiv.style.pointerEvents = 'auto';
    resumeDiv.style.background = 'rgba(20,20,30,0.9)';
    resumeDiv.style.color = '#fff';
    resumeDiv.style.padding = '10px';
    resumeDiv.style.borderRadius = '8px';
    resumeDiv.innerHTML = `<strong>Driver's License</strong><br/>Tap to view resume`;
    const resumeLabel = new CSS2DObject(resumeDiv);
    resumeLabel.visible = false;

    resumeDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      window.open('/resume.pdf', '_blank');
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const handleClick = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(carModel ? [carModel] : [], true);
      if (intersects.length > 0) {
        exploded = !exploded;
        resumeLabel.visible = true;
      }
    };
    window.addEventListener('click', handleClick);

    // Load car model
    const gltfLoader = new GLTFLoader();
    gltfLoader.load('/models/classic_car.glb', (gltf) => {
      carModel = gltf.scene;
      carModel.scale.set(0.28, 0.28, 0.28);
      carModel.traverse((obj) => {
        if (obj.isMesh) {
          carParts.push(obj);
          originalPositions.set(obj.uuid, obj.position.clone());
          obj.castShadow = true;
        }
      });
      scene.add(carModel);
      resumeLabel.position.set(0, 0.4, 0);
      carModel.add(resumeLabel);
    });

    // Explode effect
    const explodeOffset = 0.15;
    const explodeLerp = 0.12;
    const updateExplodedView = () => {
      if (!carModel) return;
      carParts.forEach((part) => {
        const orig = originalPositions.get(part.uuid);
        if (!orig) return;
        const dir = part.position.clone().normalize();
        const target = exploded ? orig.clone().add(dir.multiplyScalar(explodeOffset)) : orig.clone();
        part.position.lerp(target, explodeLerp);
      });
    };

    const clock = new THREE.Clock();

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      const time = clock.getElapsedTime();

      scene.traverse((obj) => {
        if (obj.isMesh && obj.material && obj.material.userData && obj.material.userData.shader) {
          obj.material.userData.shader.uniforms.uTime.value = time;
        }
      });

      segment1.position.z += speed;
      segment2.position.z += speed;

      // Seamless recycling
      if (segment1.position.z > HALF) {
        segment1.position.z = segment2.position.z - SEG_LEN;
      }
      if (segment2.position.z > HALF) {
        segment2.position.z = segment1.position.z - SEG_LEN;
      }

      if (carModel) {
        carModel.position.set(0, 0.1, 0);
        carModel.rotation.y = Math.PI;

        const carPos = carModel.getWorldPosition(new THREE.Vector3());
        const camOffset = new THREE.Vector3(0, 3.5, 6);
        const targetCamPos = carPos.clone().add(camOffset);
        camera.position.lerp(targetCamPos, 0.1);
        camera.lookAt(carPos);

        updateExplodedView();
      }

      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      labelRenderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('click', handleClick);
      controls.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
      }}
    />
  );
};

export default ThreeCanvas;