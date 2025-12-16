import { useEffect, useRef, useState } from 'react';
import StartMenu from './StartMenu';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';

const ThreeCanvas = () => {
  const mountRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [showLicense, setShowLicense] = useState(false);
  const [showResume, setShowResume] = useState(false);
  const [isEditingLicense, setIsEditingLicense] = useState(false);
  const placeholderPhoto = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="320"><rect width="100%" height="100%" fill="%23ddd"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-size="24">Photo</text></svg>';
  const [licenseData, setLicenseData] = useState({
    name: 'Kartik Maheshwari',
    dob: '2005-12-05',
    licenseNo: 'DL-12345678',
    address: 'Indore, MP, India',
    classField: 'B',
    college: 'Madhav Institute of Technology and Science (Gwalior)',
    issueDate: '2023-01-01',
    expiryDate: '2028-01-01',
    signature: 'Kartik Maheshwari',
    photo: '/license_photo.png'
  });
  const licenseRef = useRef(null);

  // If the default image path doesn't load, fall back to the placeholder
  useEffect(() => {
    if (!licenseData.photo || !licenseData.photo.startsWith('/')) return;
    const img = new Image();
    img.onload = () => { /* success */ };
    img.onerror = () => setLicenseData(ld => ({ ...ld, photo: placeholderPhoto }));
    img.src = licenseData.photo;
    // run only once on mount to validate default path
  }, []);

  const handleLicenseChange = (key, value) => {
    setLicenseData(ld => ({ ...ld, [key]: value }));
  };

  const handlePhotoFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setLicenseData(ld => ({ ...ld, photo: e.target.result }));
    reader.readAsDataURL(file);
  };

  const handleResetPhoto = () => setLicenseData(ld => ({ ...ld, photo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="320"><rect width="100%" height="100%" fill="%23ddd"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-size="24">Photo</text></svg>' }));

  const handlePrintLicense = () => {
    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w || !licenseRef.current) return;
    const html = `
      <html><head><title>Driver's License</title>
      <style>
        body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#f3f3f3;display:flex;align-items:center;justify-content:center;height:100vh}
        .card{width:560px;background:#fff;padding:16px;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.2)}
        .photo{float:left;width:160px;height:200px;background-size:cover;background-position:center;border-radius:6px;border:2px solid #ddd;margin-right:12px}
        .label{font-size:12px;color:#666}
        .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee}
      </style>
      </head><body><div class="card">${licenseRef.current.innerHTML}</div><script>setTimeout(()=>{window.print();},200);</script></body></html>
    `;
    w.document.write(html);
    w.document.close();
  };

  const handleSaveLicense = () => {
    setIsEditingLicense(false);
  };

  const speedRef = useRef(0);
  const startedRef = useRef(false);

  // keep startedRef and speedRef in sync with `started` state
  useEffect(() => {
    startedRef.current = started;
    speedRef.current = started ? 0.2 : 0;
  }, [started]);

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

      // Road
      const roadGeo = new THREE.PlaneGeometry(6, SEG_LEN);
      const roadMat = new THREE.MeshStandardMaterial({ color: '#333333', side: THREE.DoubleSide });
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.receiveShadow = true;
      group.add(road);

      // Terrain
      const terrainGeo = new THREE.PlaneGeometry(40, SEG_LEN, 100, 100);
      terrainGeo.setAttribute('uv2', new THREE.BufferAttribute(terrainGeo.attributes.uv.array, 2));

      const noise = new ImprovedNoise();
      const scale = 0.05;
      for (let i = 0; i < terrainGeo.attributes.position.count; i++) {
        const x = terrainGeo.attributes.position.getX(i);
        const y0 = terrainGeo.attributes.position.getY(i);
        const nx = noise.noise(x * scale, y0 * scale, 0);
        const n2 = noise.noise(x * scale * 2.0, y0 * scale * 2.0, 10);
        let height = nx * 1.0 + n2 * 0.3;
        height = Math.max(height, -0.2); // clamp to avoid too low dips
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

      // Grass blades
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

      grassMat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = { value: 0 };
        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `#include <common>
           uniform float uTime;`
        );
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           float wind = sin(uTime + position.z * 2.0 + position.x * 0.5) * 0.15;
           transformed.x += wind * (transformed.y * 0.8);
           transformed.z += sin(uTime * 0.7 + position.x) * 0.08 * transformed.y;`
        );
        grassMat.userData.shader = shader;
      };

      const bladeGeo = new THREE.PlaneGeometry(0.1, 1.5, 1, 4);
      const bladesPerSide = 3500;
      const grassLeft = new THREE.InstancedMesh(bladeGeo, grassMat, bladesPerSide);
      const grassRight = new THREE.InstancedMesh(bladeGeo, grassMat, bladesPerSide);

      grassLeft.castShadow = true;
      grassRight.castShadow = true;

      const dummy = new THREE.Object3D();
      for (let i = 0; i < bladesPerSide; i++) {
        const x = -10 + (Math.random() - 0.5) * 8;
        const z = (Math.random() - 0.5) * SEG_LEN;
        dummy.position.set(x, -0.8, z);
        dummy.rotation.y = Math.random() * Math.PI;
        const s = 0.7 + Math.random() * 0.6;
        dummy.scale.set(s * 0.5 + Math.random() * 0.15, s * 0.9, s * 0.5 + Math.random() * 0.15);
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
        dummy.updateMatrix();
        grassRight.setMatrixAt(i, dummy.matrix);
      }
      grassLeft.instanceMatrix.needsUpdate = true;
      grassRight.instanceMatrix.needsUpdate = true;

      group.add(grassLeft, grassRight);

            // Road stripes
      const stripeMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff' });
      const stripeGroup = new THREE.Group();
      for (let i = -HALF; i < HALF; i += 5) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 1), stripeMaterial);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(0, 0.01, i);
        stripeGroup.add(stripe);
      }
      group.add(stripeGroup);


      // trees and lamps
      const treeGroup = new THREE.Group();
const lampGroup = new THREE.Group();

const treeLoader = new GLTFLoader();
const lampLoader = new GLTFLoader();

treeLoader.load('/models/trees_low_poly.glb', (gltf) => {
  const treeModel = gltf.scene.children[0] || gltf.scene;
  treeModel.scale.set(0.01, 0.01, 0.01);
  treeModel.updateMatrixWorld(true);

  // Load lamp model once
  lampLoader.load('/models/street_lamp.glb', (lampGltf) => {
    const lampModel = lampGltf.scene;
    lampModel.scale.set(0.11, 0.11, 0.11); // Adjust if needed
    lampModel.updateMatrixWorld(true);

    let treeCounter = 0;

    for (let i = -HALF; i < HALF; i += 15) {
      treeCounter++;

      if (treeCounter % 3 === 0) {
        // Left lamp
        const lampL = lampModel.clone(true);
        lampL.position.set(-5.5, -1, i); // adjust Y if needed
        lampL.rotation.y = Math.PI;
        lampL.traverse((obj) => {
          if (obj.isMesh) obj.castShadow = true;
        });
        lampGroup.add(lampL);

        // Right lamp
        const lampR = lampModel.clone(true);
        lampR.position.set(5.5, -1, i);
        lampR.traverse((obj) => {
          if (obj.isMesh) obj.castShadow = true;
        });
        lampGroup.add(lampR);

      } else {
        // Trees
        const treeL = treeModel.clone(true);
        treeL.position.set(-5.5, -1, i);
        treeL.traverse((obj) => {
          if (obj.isMesh) obj.castShadow = true;
        });
        treeGroup.add(treeL);

        const treeR = treeModel.clone(true);
        treeR.position.set(5.5, -1, i);
        treeR.traverse((obj) => {
          if (obj.isMesh) obj.castShadow = true;
        });
        treeGroup.add(treeR);
      }
    }

    group.add(treeGroup);
    group.add(lampGroup);
  });
});

return group;
    }

    // billboards: add 1–2 billboards per segment on the LEFT side
    const billGrp = new THREE.Group();
    const billLoader = new GLTFLoader();
    billLoader.load('/models/billboard_lowpoly.glb', (gltf) => {
      const billModel = gltf.scene.children[0] || gltf.scene;
      billModel.scale.set(0.4, 0.4, 0.4);
      billModel.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });

      const addBillboardsToSegment = (segment) => {
        const count = 1 + Math.floor(Math.random() * 2); // 1 or 2
        for (let i = 0; i < count; i++) {
          // spread evenly along the segment
          const z = -HALF + ((i + 1) * (SEG_LEN / (count + 1)));
          const b = billModel.clone(true);
          b.position.set(-12, -1, z); // left side of road; adjust Y to sit on ground
          b.rotation.z = -1;
          segment.add(b);
        }
      };

      addBillboardsToSegment(segment1);
      addBillboardsToSegment(segment2);
    });
    // Segments
    const segment1 = createRoadSegment(0);
    const segment2 = createRoadSegment(-SEG_LEN);
    scene.add(segment1, segment2);

    // Load fences and attach continuously
const gltfLoader = new GLTFLoader();
gltfLoader.load('/models/fence_wood.glb', (gltf) => {
  const fenceModel = gltf.scene.children[0] || gltf.scene;

  // Ensure upright orientation
  fenceModel.rotation.set(-1.52, 0, -0.4);
  fenceModel.updateMatrixWorld(true);

  // Measure fence length dynamically
  const bbox = new THREE.Box3().setFromObject(fenceModel);
  const fenceLength = bbox.max.z - bbox.min.z;

  const fenceSpacing = fenceLength; // ensures no overlap
  const fenceOffsetZ = 0.5;         // slight forward offset
  const fenceDistLeft = -4.8;       // left side of road
  const fenceDistRight = 4.8;       // right side of road

  const addFencesToSegment = (segment) => {
    for (let i = -HALF; i < HALF; i += fenceSpacing) {
      // Left fence — rotate to face right (toward road center)
      const fenceL = fenceModel.clone(true);
      fenceL.position.set(fenceDistLeft, -0.8, i + fenceOffsetZ);
      
      fenceL.castShadow = true;
      fenceL.traverse((obj) => {
        if (obj.isMesh) obj.castShadow = true;
      });
      segment.add(fenceL);

      // Right fence — rotate to face left (toward road center)
      const fenceR = fenceModel.clone(true);
      fenceR.position.set(fenceDistRight, -0.8, i + fenceOffsetZ);
      fenceR.castShadow = true;
      fenceR.traverse((obj) => {
        if (obj.isMesh) obj.castShadow = true;
      });
      segment.add(fenceR);
    }
  };

  addFencesToSegment(segment1);
  addFencesToSegment(segment2);
});

    // Sun
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

    // key handler updates speedRef — only effective after start
    const handleKeyDown = (e) => {
      if (!startedRef.current) return;
      if (e.key === 'ArrowUp') speedRef.current = Math.min(0.7, speedRef.current + 0.1);
      if (e.key === 'ArrowDown') speedRef.current = Math.max(0, speedRef.current - 0.1);
    };
    window.addEventListener('keydown', handleKeyDown);

    // Resume label
    // const resumeDiv = document.createElement('div');
    // resumeDiv.style.pointerEvents = 'auto';
    // resumeDiv.style.background = 'rgba(20,20,30,0.9)';
    // resumeDiv.style.color = '#fff';
    // resumeDiv.style.padding = '10px';
    // resumeDiv.style.borderRadius = '8px';
    // resumeDiv.innerHTML = `<strong>Driver's License</strong><br/>Tap to view resume`;
    // const resumeLabel = new CSS2DObject(resumeDiv);
    // resumeLabel.visible = false;

    // resumeDiv.addEventListener('click', (e) => { 
    //   e.stopPropagation();
    //   window.open('/resume.pdf', '_blank');
    // });

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

    const carLoader = new GLTFLoader();
    carLoader.load('/models/classic_car.glb', (gltf) => {
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

    const animate = () => {
      requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Grass wind
      scene.traverse((obj) => {
        if (obj.isMesh && obj.material && obj.material.userData && obj.material.userData.shader) {
          obj.material.userData.shader.uniforms.uTime.value = time;
        }
      });

      // Move segments
      segment1.position.z += speedRef.current;
      segment2.position.z += speedRef.current;

      if (segment1.position.z > HALF) {
        segment1.position.z = segment2.position.z - SEG_LEN;
      }
      if (segment2.position.z > HALF) {
        segment2.position.z = segment1.position.z - SEG_LEN;
      }

      // Car + camera follow
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

    // Handle resize
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      labelRenderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
      controls.dispose();
    };
  }, []);

  return (
    <>
      <div
        ref={mountRef}
        style={{
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          position: 'relative',
        }}
      />

      <StartMenu
        visible={!started}
        onStart={() => setStarted(true)}
        onShowLicense={() => setShowLicense(true)}
        onShowResume={() => { window.open('/resume.pdf', '_blank'); setShowResume(true); }}
      />

      {started && (
        <button className="main-menu-btn" onClick={() => setStarted(false)} title="Menu">☰</button>
      )}

      {showLicense && (
        <div className="license-modal" onClick={() => { setShowLicense(false); setIsEditingLicense(false); }}>
          <div className="license-card" onClick={(e) => e.stopPropagation()} ref={licenseRef}>

            <div className="license-left">
              <div className="license-photo" style={{ backgroundImage: `url(${licenseData.photo})` }} />

              {isEditingLicense && (
                <div style={{ marginTop: 8 }}>
                  <input type="file" accept="image/*" onChange={(e) => e.target.files && handlePhotoFile(e.target.files[0])} />
                  <div style={{ marginTop: 6 }}>
                    <button className="btn" onClick={handleResetPhoto}>Reset Photo</button>
                  </div>
                </div>
              )}
            </div>

            <div className="license-right">
              <h2>Driver's License</h2>

              <div className="license-grid">
                <div className="field"><div className="label">Name</div>{isEditingLicense ? <input type="text" value={licenseData.name} onChange={(e)=>handleLicenseChange('name', e.target.value)} /> : <div>{licenseData.name}</div>}</div>
                <div className="field"><div className="label">DOB</div>{isEditingLicense ? <input type="date" value={licenseData.dob} onChange={(e)=>handleLicenseChange('dob', e.target.value)} /> : <div>{licenseData.dob}</div>}</div>
                <div className="field"><div className="label">License No</div>{isEditingLicense ? <input type="text" value={licenseData.licenseNo} onChange={(e)=>handleLicenseChange('licenseNo', e.target.value)} /> : <div>{licenseData.licenseNo}</div>}</div>
                <div className="field"><div className="label">Class</div>{isEditingLicense ? <input type="text" value={licenseData.classField} onChange={(e)=>handleLicenseChange('classField', e.target.value)} /> : <div>{licenseData.classField}</div>}</div>
                <div className="field" style={{ gridColumn: '1 / -1' }}><div className="label">Address</div>{isEditingLicense ? <input type="text" value={licenseData.address} onChange={(e)=>handleLicenseChange('address', e.target.value)} /> : <div>{licenseData.address}</div>}</div>
                <div className="field" style={{ gridColumn: '1 / -1' }}><div className="label">College</div>{isEditingLicense ? <input type="text" value={licenseData.college} onChange={(e)=>handleLicenseChange('college', e.target.value)} /> : <div>{licenseData.college}</div>}</div>
                <div className="field"><div className="label">Issue</div>{isEditingLicense ? <input type="date" value={licenseData.issueDate} onChange={(e)=>handleLicenseChange('issueDate', e.target.value)} /> : <div>{licenseData.issueDate}</div>}</div>
                <div className="field"><div className="label">Expiry</div>{isEditingLicense ? <input type="date" value={licenseData.expiryDate} onChange={(e)=>handleLicenseChange('expiryDate', e.target.value)} /> : <div>{licenseData.expiryDate}</div>}</div>
              </div>

              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="label">Signature</div>
                  <div style={{ fontFamily: 'Brush Script MT, cursive', fontSize: 20 }}>{licenseData.signature}</div>
                </div>

                <div className="license-actions">
                  {isEditingLicense ? <button className="btn primary" onClick={()=>{handleSaveLicense()}}>Save</button> : <button className="btn"
                  //  onClick={()=>setIsEditingLicense(true)}
                   >
                    Edit</button>}
                  <button className="btn" onClick={handlePrintLicense}>Print / Save</button>
                  <button className="btn" onClick={() => { navigator.clipboard?.writeText(JSON.stringify(licenseData)); alert('License data copied to clipboard'); }}>Copy Data</button>
                  <button className="btn" onClick={() => { setShowLicense(false); setIsEditingLicense(false); }}>Close</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default ThreeCanvas;