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
  const [showSettings, setShowSettings] = useState(false);
  const [textureQuality, setTextureQuality] = useState('high'); // high, medium, low
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

  // Scene and renderer refs for dynamic quality updates
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const sunLightRef = useRef(null);
  const ambientLightRef = useRef(null);
  const leafParticlesRef = useRef(null);
  const createLeafParticlesRef = useRef(null); // Function to recreate particles
  const segmentsRef = useRef([]); // Store segments for updating grass blades

  // HUD DOM refs and in-car display ref
  const hudSpeedDomRef = useRef(null);
  const hudWheelDomRef = useRef(null);
  const carDisplayRef = useRef(null);
  // Steering angle state and ref (used for HUD steering wheel)
  const steerRef = useRef(0);
  const [steerAngle, setSteerAngle] = useState(0);
  const [showSongList, setShowSongList] = useState(false);
  const [isPlayingCD, setIsPlayingCD] = useState(true);
  const [currentSong, setCurrentSong] = useState(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioRef = useRef(null);

  const songs = [
    { id: 1, title: 'Rihaa', artist: 'Arijit Singh', url: '/songs/Rihaa.mp3' },
    { id: 2, title: 'Midnight Drive', artist: 'Ed Sheeran', url: '/songs/Sapphire.mp3' },
    { id: 3, title: 'Mashup', artist: 'Shybu', url: '/songs/Mashup.mp3' },
    { id: 4, title: 'Retro Pulse', artist: 'Nostalgia Wave', url: '/assets/songs/retro-pulse.mp3' },
    { id: 5, title: 'Echo of Tomorrow', artist: 'Future Sound', url: '/assets/songs/echo-tomorrow.mp3' },
    { id: 6, title: 'Crystal Nights', artist: 'Ambient Beats', url: '/assets/songs/crystal-nights.mp3' },
  ];

  const handlePlaySong = (song) => {
    if (audioRef.current) {
      audioRef.current.src = song.url;
      audioRef.current.play().catch(() => {
        console.warn('Could not play audio. Make sure the file exists at:', song.url);
      });
      setCurrentSong(song);
      setIsAudioPlaying(true);
      setShowSongList(false);
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isAudioPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => {
          console.warn('Could not play audio');
        });
      }
      setIsAudioPlaying(!isAudioPlaying);
    }
  };

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

  // mouse handler to control steering HUD; only updates while in FPP
  const handleMouseMoveForSteer = (e) => {
    if (!isFPPRef.current) return; // only update steering when in first-person
    const x = e.clientX / window.innerWidth;
    const angle = (x - 0.5) * 2 * 45;
    steerRef.current = angle;
    setSteerAngle(angle);
  };

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

  // Open a car-display-styled details page using current license data
  const openCarDisplayDetails = () => {
    const w = window.open('', '_blank', 'width=680,height=520');
    if (!w) return;
    const html = `
      <html><head><title>Car Display — Driver Info</title>
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
      <style>
        html,body{height:100%;margin:0}
        body{background:#060606;color:#b9f6ca;font-family:monospace,system-ui,Segoe UI,Roboto,Arial;margin:0;display:flex;align-items:center;justify-content:center}
        .panel{width:620px;height:420px;background:linear-gradient(180deg,#050606 0%, #0b0b0c 100%);border-radius:12px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.03);position:relative}
        .heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
        .title{font-size:16px;color:#ff6b61;font-weight:700}
        .status{font-size:12px;color:#ff9f9f}
        .grid{display:grid;grid-template-columns:120px 1fr;gap:8px 16px;align-items:center}
        .label{color:#9fbf9a;font-size:12px}
        .value{font-size:14px;color:#dfffe8}
        .photo{width:120px;height:160px;background-size:cover;background-position:center;border-radius:6px;border:2px solid rgba(255,255,255,0.04)}

        /* Projects folder and cards */
        .folder{display:inline-flex;align-items:center;gap:12px;padding:8px 10px;background:linear-gradient(180deg,#071010,#0b1410);border-radius:8px;border:1px solid rgba(127,255,190,0.06);cursor:pointer;transition:transform .12s,box-shadow .12s}
        .folder:hover{transform:translateY(-3px);box-shadow:0 8px 18px rgba(0,0,0,0.5)}
        .folder .icon{width:36px;height:26px;border-radius:4px;background:linear-gradient(180deg,#ffcc66,#ffb36b);display:flex;align-items:center;justify-content:center;font-weight:700}

        .projects{position:absolute;left:18px;right:18px;top:70px;bottom:70px;background:linear-gradient(180deg,#050607,#0b0b0d);border-radius:10px;padding:14px;box-shadow:0 12px 40px rgba(0,0,0,0.6);display:none;flex-direction:column}
        .projects.open{display:flex}
        .projects-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;overflow:auto;padding:6px}
        /* Experience section (larger, section-style cards) */
        .experience{position:absolute;left:18px;right:18px;top:70px;bottom:70px;background:linear-gradient(180deg,#050607,#0b0b0d);border-radius:10px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,0.6);display:none;flex-direction:column}
        .experience.open{display:flex}
        .experience-grid{display:flex;flex-direction:column;gap:20px;overflow:auto;padding:6px}
        .exp-card{display:flex;flex-direction:column;gap:16px;background:linear-gradient(180deg,#081219,#0b1a1a);border-radius:12px;padding:20px;color:#dfffe8;border:1px solid rgba(255,255,255,0.08);transition:transform 0.2s, box-shadow 0.2s}
        .exp-card:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,0.4)}
        .exp-header{display:flex;gap:16px}
        .exp-img{width:180px;height:140px;background-size:cover;background-position:center;border-radius:8px;border:1px solid rgba(255,255,255,0.1);flex-shrink:0}
        .exp-info{flex:1}
        .exp-body{flex:1}
        .exp-title{font-weight:800;font-size:16px;color:#9ff6b8;margin-bottom:8px}
        .exp-role{font-size:14px;color:#dfffe8;margin-bottom:4px;font-weight:600}
        .exp-period{font-size:12px;color:#9fbf9a;margin-bottom:12px;font-style:italic}
        .exp-desc{font-size:13px;color:#cfefd4;line-height:1.8;margin:0}
        .exp-desc ul{margin:12px 0;padding-left:20px;color:#cfefd4}
        .exp-desc li{margin:10px 0;text-align:justify}
        .exp-card .open-full{margin-top:12px;align-self:flex-start}
        .card{display:block;background:linear-gradient(180deg,#071012,#091718);border-radius:8px;padding:10px;color:#dfffe8;text-decoration:none;border:1px solid rgba(255,255,255,0.03);transition:transform .12s,box-shadow .12s}
        .card:hover{transform:translateY(-6px);box-shadow:0 10px 30px rgba(0,0,0,0.6)}
        .card-img{width:100%;height:90px;background-size:cover;background-position:center;border-radius:6px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.02)}
        .card-title{font-weight:700;font-size:13px;color:#9ff6b8;margin-bottom:4px}
        .card-desc{font-size:12px;color:#9fbf9a}

        /* Arcade / Games view styles */
        .tab{background:transparent;border:1px solid rgba(255,255,255,0.04);color:#dfffe8;padding:6px 8px;border-radius:6px;cursor:pointer}
        .tab.active{background:linear-gradient(180deg,#071012,#091718);box-shadow:0 6px 18px rgba(0,0,0,0.6)}
        .card.arcade{background:linear-gradient(180deg,#2b0f0f,#120606);border:2px solid #ff3b3b;color:#ffd166}
        .card.arcade .card-title{font-family:'Press Start 2P',monospace;font-weight:700;color:#ffd166;font-size:12px}
        .game-frame{position:absolute;left:18px;right:18px;top:70px;bottom:70px;background:#000;border-radius:8px;padding:6px;box-shadow:0 12px 40px rgba(0,0,0,0.8);display:flex;flex-direction:column}
        .game-frame .toolbar{display:flex;align-items:center;gap:8px;margin-bottom:6px}
        .game-frame .title{color:#ffd166;font-family:monospace;font-weight:700}
        .game-frame .frame{flex:1;background:#000;border-radius:6px;overflow:hidden;border:4px solid rgba(255,255,255,0.02)}
        .crt{position:relative;width:100%;height:100%;background:#000}
        .crt::after{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px);background-size:100% 3px;mix-blend-mode:overlay;opacity:0.6;pointer-events:none}
        .close-frame{margin-left:auto;background:transparent;border:1px solid rgba(255,255,255,0.04);color:#fff;padding:6px 8px;border-radius:6px;cursor:pointer}
        .fullscreen-toggle{margin-left:8px;background:transparent;border:1px solid rgba(255,255,255,0.04);color:#fff;padding:6px 8px;border-radius:6px;cursor:pointer}
        .open-full{margin-left:8px;background:transparent;border:1px solid rgba(255,255,255,0.04);color:#fff;padding:6px 8px;border-radius:6px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center} 

        .close-projects{background:transparent;border:1px solid rgba(255,255,255,0.03);color:#fff;padding:6px 8px;border-radius:6px;cursor:pointer;margin-left:auto}
        .close-experience{background:transparent;border:1px solid rgba(255,255,255,0.03);color:#fff;padding:6px 8px;border-radius:6px;cursor:pointer;margin-left:auto}

        .actions{position:absolute;bottom:14px;right:18px}
        .btn{background:#120909;color:#fff;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;font-family:inherit}
      </style>
      </head><body>
      <div class="panel">
        <div class="heading"><div class="title">Driver Display</div><div class="status">In-Vehicle • Secure</div></div>
        <div style="display:flex;gap:18px">
          <div class="photo" style="background-image: url(${licenseData.photo || ''})"></div>
          <div style="flex:1">
            <div class="grid">
              <div class="label">Name</div><div class="value">${licenseData.name}</div>
              <div class="label">DOB</div><div class="value">${licenseData.dob}</div>
              <div class="label">License No</div><div class="value">${licenseData.licenseNo}</div>
              <div class="label">Class</div><div class="value">${licenseData.classField}</div>
              <div class="label">College</div><div class="value">${licenseData.college}</div>
            </div>

            <!-- Folder control -->
            <div style="margin-top:12px;display:flex;align-items:center;gap:12px">
                <div class="folder" role="button" tabindex="0" aria-expanded="false" data-target="projects" title="Open Projects">
                  <div class="icon">📁</div>
                  <div style="font-size:13px;color:#dfffe8">Projects</div>
                </div>
                <div class="folder" role="button" tabindex="0" aria-expanded="false" data-target="experience" title="Open Experience">
                  <div class="icon">📂</div>
                  <div style="font-size:13px;color:#dfffe8">Experience</div>
                </div>
            </div>

          </div>
        </div>

        <!-- Projects overlay (hidden by default) -->
        <div class="projects" aria-hidden="true">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <div style="font-weight:700;color:#9ff6b8">Projects</div>
            <div style="font-size:12px;color:#9fbf9a">— Click a card to open</div>
            <button class="close-projects" style="margin-left:auto">Close</button>
          </div>
          <div class="projects-grid" role="list"></div>
        </div>

        <!-- Experience overlay (hidden by default). larger section-style cards for internships -->
        <div class="experience" aria-hidden="true">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <div style="font-weight:700;color:#9ff6b8">Experience</div>
            <div style="font-size:12px;color:#9fbf9a">— Internship & work history</div>
            <button class="close-experience" style="margin-left:auto">Close</button>
          </div>
          <div class="experience-grid" role="list"></div>
        </div>

        <div class="actions">
          <button class="btn" onclick="window.print();">Print</button>
          <button class="btn" onclick="window.close();" style="margin-left:8px">Close</button>
        </div>
      </div>

      <script>
        (function(){
          try {
          // sample project data (replace or extend as needed)
          const projects = [
            { title: 'QuickShow', desc: 'End-to-end MERN stack movie ticket booking app with real-timeseat selection, secure payments, and automated email workflows.',img: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="100%" height="100%" fill="%2308120a"/><text x="50%" y="50%" fill="%23fff" font-size="18" text-anchor="middle" dominant-baseline="middle">Racing Demo</text></svg>', url: 'https://show-time-blond.vercel.app/' , category: 'web'},
            { title: 'Uber-Clone', desc: 'Built with MongoDB, Express.js, React.js, and Node.js using RESTful API architecture.', img: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="100%" height="100%" fill="%2301000b"/><text x="50%" y="50%" fill="%23fff" font-size="18" text-anchor="middle" dominant-baseline="middle">Portfolio</text></svg>', url: 'https://taxi11m.netlify.app/' , category: 'web'},
            { title: 'TASTY BURGER', desc: 'Developed Tasty Burgers, a responsive web application using HTML,CSS, React, Redux, and Bootstrap', img: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="100%" height="100%" fill="%23020b05"/><text x="50%" y="50%" fill="%23fff" font-size="18" text-anchor="middle" dominant-baseline="middle">Vehicle UI</text></svg>', url: 'https://tasty11-burger.netlify.app/' , category: 'web'},
            { title: 'Mojito', desc: 'Developed a responsive, single-page web application showcasing dynamic UI transitions and interactive elements using React and GSAP animations. ', img: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="100%" height="100%" fill="%23020b05"/><text x="50%" y="50%" fill="%23fff" font-size="18" text-anchor="middle" dominant-baseline="middle">Vehicle UI</text></svg>', url: 'https://mojito11m.netlify.app/' , category: 'web'},
            { title: 'Dog Runner', desc: 'Built a fast-paced Dog Runner Game using vanilla JavaScript with animations and collision detection.', img: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="100%" height="100%" fill="%23a01010"/><text x="50%" y="50%" fill="%23fff" font-size="18" text-anchor="middle" dominant-baseline="middle">Dog Runner</text></svg>', url: 'https://dog-runner.netlify.app/', category: 'game' },
            { title: 'Point and Shoot', desc: 'A fast-paced browser shooting game built with vanilla JavaScript.', img: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="100%" height="100%" fill="%23102614"/><text x="50%" y="50%" fill="%23fff" font-size="18" text-anchor="middle" dominant-baseline="middle">Point and Shoot</text></svg>', url: 'https://point-and-shoot11-game.netlify.app/', category: 'game' },
            { title: 'Solar System', desc: 'An interactive 3D visualization of the solar system built with Three.js, showcasing planets, orbits, and immersive space design.', img: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="100%" height="100%" fill="%23020b05"/><text x="50%" y="50%" fill="%23fff" font-size="18" text-anchor="middle" dominant-baseline="middle">Vehicle UI</text></svg>', url: 'https://solar-system11m.netlify.app/' , category: 'web'},
            { title: 'LargerThanI', desc: 'A responsive NGO landing page built with React, Tailwind CSS, and modern UI practices.', img: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="100%" height="100%" fill="%23020b05"/><text x="50%" y="50%" fill="%23fff" font-size="18" text-anchor="middle" dominant-baseline="middle">Vehicle UI</text></svg>', url: 'https://ngo11m.netlify.app/' , category: 'web'},
            { title: 'TODO', desc: ' A task management app using React, Redux, and Tailwind CSS for state handling and clean design.', img: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="100%" height="100%" fill="%23020b05"/><text x="50%" y="50%" fill="%23fff" font-size="18" text-anchor="middle" dominant-baseline="middle">Vehicle UI</text></svg>', url: 'https://todo11m.netlify.app/' , category: 'web'},
            { title: 'TAZZA', desc: 'A stylish frontend project crafted with HTML, CSS, Bootstrap, and JavaScript, focusing on responsive layouts.', img: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="100%" height="100%" fill="%23020b05"/><text x="50%" y="50%" fill="%23fff" font-size="18" text-anchor="middle" dominant-baseline="middle">Vehicle UI</text></svg>', url: 'https://tazza-web.netlify.app/' , category: 'web'},
            { title: 'Music Player(demo)', desc: 'A custom audio player with play/pause, track navigation, and sleek UI.', img: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="100%" height="100%" fill="%23020b05"/><text x="50%" y="50%" fill="%23fff" font-size="18" text-anchor="middle" dominant-baseline="middle">Vehicle UI</text></svg>', url: 'https://music11m-player-demo.netlify.app/' , category: 'web'},
            { title: 'Quiz', desc: 'An interactive quiz application with dynamic question handling and scoring logic.', img: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="100%" height="100%" fill="%23020b05"/><text x="50%" y="50%" fill="%23fff" font-size="18" text-anchor="middle" dominant-baseline="middle">Vehicle UI</text></svg>', url: 'https://quiz11m-app.netlify.app/' , category: 'web'},
            { title: 'Notes', desc: 'A simple notes manager for creating, editing, and storing text notes in the browser.', img: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="100%" height="100%" fill="%23020b05"/><text x="50%" y="50%" fill="%23fff" font-size="18" text-anchor="middle" dominant-baseline="middle">Vehicle UI</text></svg>', url: 'https://notes11m-app.netlify.app/' , category: 'web'},
            { title: 'Weather', desc: 'A weather forecast app fetching live data via API, styled with HTML, CSS, and JavaScript.', img: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="100%" height="100%" fill="%23020b05"/><text x="50%" y="50%" fill="%23fff" font-size="18" text-anchor="middle" dominant-baseline="middle">Vehicle UI</text></svg>', url: 'https://weather11m-app.netlify.app/' , category: 'web'},
          ];

          const folders = Array.from(document.querySelectorAll('.folder'));
          const projectsEl = document.querySelector('.projects');
          const projectsGrid = document.querySelector('.projects-grid');
          const experienceEl = document.querySelector('.experience');
          const experienceGrid = document.querySelector('.experience-grid');

          // create tab bar (projects only)
          const tabs = document.createElement('div');
          tabs.style.display = 'flex';
          tabs.style.gap = '8px';
          tabs.style.marginBottom = '8px';
          const allBtn = document.createElement('button'); allBtn.textContent = 'All'; allBtn.className = 'tab active';
          const gamesBtn = document.createElement('button'); gamesBtn.textContent = 'Games'; gamesBtn.className = 'tab';
          tabs.appendChild(allBtn); tabs.appendChild(gamesBtn);
          projectsGrid.parentNode.insertBefore(tabs, projectsGrid);

          function renderList(filter){
            projectsGrid.innerHTML = '';
            const list = projects.filter(p => !filter || p.category === filter || filter === 'all');
            list.forEach((p) => {
              const a = document.createElement('a');
              a.className = 'card' + (p.category === 'game' ? ' arcade' : '');
              a.href = p.url || '#';
              a.target = '_blank';
              a.role = 'listitem';

              const img = document.createElement('div');
              img.className = 'card-img';
              img.style.backgroundImage = 'url(' + p.img + ')';

              const t = document.createElement('div');
              t.className = 'card-title';
              t.textContent = p.title;

              const d = document.createElement('div');
              d.className = 'card-desc';
              d.textContent = p.desc;

              a.appendChild(img);
              a.appendChild(t);
              a.appendChild(d);

              if (p.category === 'game'){
                a.addEventListener('click', function(e){
                  e.preventDefault();
                  openInlineGame(p);
                });
              } else {
                a.addEventListener('click', function(){ window.open(p.url, '_blank'); });
              }

              projectsGrid.appendChild(a);
            });
          }

          // Experience data (sample — replace with your internship entries)
          const experiences = [
            { title: 'MERN Stack development Intern -> Uptoskills', role: 'Fullstack Developer', period: '1st of October 2025 - 1st of January 2026', desc: 'Key Contributions:- Designed the HRMS portal prototype using Figma, ensuring a user friendly and modern interface. Promoted to Sub Team Leader; initiated development of the portal using the PERN stack, focusing on frontend implementation. Led backend development and contributed to successful completion of the HRMS project. Achievements:- Awarded Intern of the Month (October) for outstanding performance. Promoted to Sub Team Leader (November): Managed project sheets, reviewed code, and facilitated meetings in the absence of the Team Lead. Promoted to Team Lead (December): Directed a team of 85 interns, handled onboarding, organized and led meetings, prepared daily summaries for senior authorities, reviewed tasks and code, and assigned responsibilities effectively.', img: '/assets/logos/uptoskills_logo.jpg', url: '' },
                          ];

          function renderExperience(){
            experienceGrid.innerHTML = '';
            experiences.forEach((e) => {
              const card = document.createElement('div'); card.className = 'exp-card';

              // Header with image and info
              const header = document.createElement('div'); header.className = 'exp-header';
              const img = document.createElement('div'); img.className = 'exp-img'; img.style.backgroundImage = 'url(' + e.img + ')';
              const info = document.createElement('div'); info.className = 'exp-info';
              
              const title = document.createElement('div'); title.className = 'exp-title'; title.textContent = e.title;
              const role = document.createElement('div'); role.className = 'exp-role'; role.textContent = e.role;
              const period = document.createElement('div'); period.className = 'exp-period'; period.textContent = e.period;
              
              info.appendChild(title); info.appendChild(role); info.appendChild(period);
              header.appendChild(img); header.appendChild(info);
              card.appendChild(header);

              // Body with description as bullet points
              const body = document.createElement('div'); body.className = 'exp-body';
              const desc = document.createElement('div'); desc.className = 'exp-desc';
              
              // Parse description into bullet points (split by specific keywords)
              const points = e.desc.split(/Achievements:[-]?/);
              let descHTML = '<ul>';
              points.forEach((point, idx) => {
                const items = point.split(/(?:[-•]\s+)/).filter(s => s.trim());
                items.forEach(item => {
                  const cleaned = item.trim();
                  if (cleaned && cleaned.length > 2) {
                    descHTML += '<li>' + cleaned + '</li>';
                  }
                });
              });
              descHTML += '</ul>';
              desc.innerHTML = descHTML;
              body.appendChild(desc);
              card.appendChild(body);

              if (e.url){
                const link = document.createElement('a'); link.className = 'open-full'; link.textContent = 'View'; link.href = e.url; link.target = '_blank'; body.appendChild(link);
              }

              experienceGrid.appendChild(card);
            });
          }

          // arcade CSS moved into the main <style> block above (no inline style injection here)

          function openInlineGame(p){
            // hide projects list
            projectsGrid.style.display = 'none';
            tabs.style.display = 'none';

            // create frame
            const frame = document.createElement('div'); frame.className = 'game-frame';
            const toolbar = document.createElement('div'); toolbar.className = 'toolbar';
            const title = document.createElement('div'); title.className = 'title'; title.textContent = p.title + ' — Play';
            const openFull = document.createElement('a'); openFull.className = 'open-full'; openFull.textContent = 'Open full experience'; openFull.href = p.url; openFull.target = '_blank'; openFull.rel = 'noopener noreferrer'; openFull.title = 'Open full experience in a new tab';
            const fsBtn = document.createElement('button'); fsBtn.className = 'fullscreen-toggle'; fsBtn.textContent = 'Fullscreen';
            const closeBtn = document.createElement('button'); closeBtn.className = 'close-frame'; closeBtn.textContent = 'Exit Game';
            toolbar.appendChild(title); toolbar.appendChild(openFull); toolbar.appendChild(fsBtn); toolbar.appendChild(closeBtn);

            const frameHolder = document.createElement('div'); frameHolder.className = 'frame';
            const crt = document.createElement('div'); crt.className = 'crt';

            // iframe for hosted games
            const iframe = document.createElement('iframe');
            iframe.src = p.url;
            iframe.style.border = '0';
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            // allow fullscreen and common permissions
            iframe.setAttribute('allow', 'fullscreen; autoplay; picture-in-picture');
            iframe.setAttribute('allowfullscreen', '');

            crt.appendChild(iframe);
            frameHolder.appendChild(crt);
            frame.appendChild(toolbar);
            frame.appendChild(frameHolder);

            // insert into panel
            const projectsContainer = document.querySelector('.projects');
            projectsContainer.appendChild(frame);

            // fullscreen toggle behavior with fallback to new tab
            fsBtn.addEventListener('click', async function(){
              if (!document.fullscreenElement){
                try {
                  if (frame.requestFullscreen) await frame.requestFullscreen();
                  else if (frame.webkitRequestFullscreen) await frame.webkitRequestFullscreen();
                  else if (frame.msRequestFullscreen) await frame.msRequestFullscreen();
                } catch (err){
                  // if fullscreen is blocked, open game in a new tab as fallback
                  window.open(p.url, '_blank');
                }
              } else {
                try { await document.exitFullscreen(); } catch (e) { /* ignore */ }
              }
            });

            // update button label and keep listener reference so we can clean up
            function updateFsBtn(){ fsBtn.textContent = document.fullscreenElement ? 'Exit Fullscreen' : 'Fullscreen'; }
            const fsChangeHandler = updateFsBtn;
            document.addEventListener('fullscreenchange', fsChangeHandler);
            // initialize label
            updateFsBtn();

            // close handler (also exit fullscreen and remove listener)
            closeBtn.addEventListener('click', function(){
              if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
              document.removeEventListener('fullscreenchange', fsChangeHandler);
              frame.remove(); projectsGrid.style.display = ''; tabs.style.display = ''; 
            });
          }

          // initial render
          renderList('all');
          renderExperience();

          allBtn.addEventListener('click', function(){ allBtn.classList.add('active'); gamesBtn.classList.remove('active'); renderList('all'); });
          gamesBtn.addEventListener('click', function(){ gamesBtn.classList.add('active'); allBtn.classList.remove('active'); renderList('game'); });

          // folder click handlers (projects + experience)
          folders.forEach(function(f){
            f.addEventListener('click', function(){
              const target = f.getAttribute('data-target');
              if (target === 'projects'){
                const open = !projectsEl.classList.contains('open');
                projectsEl.classList.toggle('open', open);
                projectsEl.setAttribute('aria-hidden', !open);
                // close other
                experienceEl.classList.remove('open');
                document.querySelectorAll('.folder[data-target="experience"]').forEach(x=>x.setAttribute('aria-expanded', false));
                f.setAttribute('aria-expanded', open);
              } else if (target === 'experience'){
                const open = !experienceEl.classList.contains('open');
                experienceEl.classList.toggle('open', open);
                experienceEl.setAttribute('aria-hidden', !open);
                // close other
                projectsEl.classList.remove('open');
                document.querySelectorAll('.folder[data-target="projects"]').forEach(x=>x.setAttribute('aria-expanded', false));
                f.setAttribute('aria-expanded', open);
              }
            });
            f.addEventListener('mouseenter', function(){ document.body.style.cursor = 'pointer'; });
            f.addEventListener('mouseleave', function(){ document.body.style.cursor = 'default'; });
          });

          const closeProjectsBtn = document.querySelector('.close-projects');
          if (closeProjectsBtn) closeProjectsBtn.addEventListener('click', function(){ projectsEl.classList.remove('open'); document.querySelectorAll('.folder[data-target="projects"]').forEach(x=>x.setAttribute('aria-expanded', false)); projectsEl.setAttribute('aria-hidden', true); });

          const closeExperienceBtn = document.querySelector('.close-experience');
          if (closeExperienceBtn) closeExperienceBtn.addEventListener('click', function(){ experienceEl.classList.remove('open'); document.querySelectorAll('.folder[data-target="experience"]').forEach(x=>x.setAttribute('aria-expanded', false)); experienceEl.setAttribute('aria-hidden', true); });

        } catch (e) { var dbg = document.createElement('pre'); dbg.style.color='salmon'; dbg.style.background='#0b0b0b'; dbg.style.padding='12px'; dbg.style.borderRadius='8px'; dbg.style.maxHeight='200px'; dbg.style.overflow='auto'; dbg.textContent = (e && e.stack) ? e.stack : (e && e.message) ? e.message : String(e); document.body.appendChild(dbg); }
        })();
      </script>

      </body></html>
    `;
    w.document.write(html);
    w.document.close();
  };

  const handleSaveLicense = () => {
    setIsEditingLicense(false);
  }; 

  const speedRef = useRef(0);
  const startedRef = useRef(false);

  // first-person flag (driver's-eye) and ref for the animation loop
  const [isFPP, setIsFPP] = useState(false);
  const isFPPRef = useRef(false);
  useEffect(() => { isFPPRef.current = isFPP; }, [isFPP]);



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
    sceneRef.current = scene;
    rendererRef.current = renderer;
    
    // Create cloudy sky texture with animation support
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    const skyTexture = new THREE.CanvasTexture(canvas);
    scene.background = skyTexture;
    // Fog will be updated based on quality settings below
    
    // Function to draw the cloudy sky
    const drawCloudySky = (time) => {
      // Create a gradient for sky
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#87ceeb');
      gradient.addColorStop(1, '#e0f6ff');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add cloud shapes using circles with movement
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      const cloudPositions = [
        { x: 80, y: 30, r: 40 }, { x: 120, y: 35, r: 35 }, { x: 160, y: 25, r: 45 },
        { x: 300, y: 40, r: 50 }, { x: 360, y: 45, r: 38 }, { x: 410, y: 35, r: 42 },
        { x: 100, y: 70, r: 45 }, { x: 160, y: 75, r: 40 }, { x: 80, y: 65, r: 35 },
        { x: 350, y: 50, r: 50 }, { x: 420, y: 60, r: 40 }, { x: 300, y: 85, r: 45 }
      ];
      
      cloudPositions.forEach((cloud, i) => {
        // Move clouds horizontally based on time
        const moveX = Math.sin(time * 0.3 + i) * 30;
        const finalX = (cloud.x + moveX) % (canvas.width + 100);
        
        ctx.beginPath();
        ctx.arc(finalX, cloud.y, cloud.r, 0, Math.PI * 2);
        ctx.fill();
      });
    };
    
    // Initial draw
    drawCloudySky(0);

    const camera = new THREE.PerspectiveCamera(65, w / h, 0.1, 500);
    camera.position.set(0, 3, 10);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.04;
    // enable orbit controls in both FPP and TPP — we'll update target each frame
    controls.enabled = true;
    controls.enablePan = false;

    const sunLight = new THREE.DirectionalLight(0xffffff, 2);
    sunLight.position.set(5, 10, 5);
    scene.add(sunLight);
    sunLightRef.current = sunLight;
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const SEG_LEN = 200;
    const HALF = SEG_LEN / 2;

    const textureLoader = new THREE.TextureLoader();

    // Comprehensive quality settings
    const getQualitySettings = () => {
      switch(textureQuality) {
        case 'low':
          return {
            textureScale: 0.25,
            particleCount: 200,        // Reduced particles
            grassBladesPerSide: 150,   // Reduced for patches
            grassModelSpawnChance: 0.2, // Less dense grass patches
            flowerSpawnChance: 0.25,    // Fewer flowers
            shadowsEnabled: false,      // Disable shadows
            fogFar: 50,                 // Closer fog
            ambientLightIntensity: 0.5
          };
        case 'medium':
          return {
            textureScale: 0.5,
            particleCount: 1200,
            grassBladesPerSide: 400,  // Medium patches
            grassModelSpawnChance: 0.45,
            flowerSpawnChance: 0.4,
            shadowsEnabled: true,
            fogFar: 80,
            ambientLightIntensity: 0.4
          };
        case 'high':
        default:
          return {
            textureScale: 1.0,
            particleCount: 4000,
            grassBladesPerSide: 200,   // High quality patches
            grassModelSpawnChance: 0.55,
            flowerSpawnChance: 0.5,
            shadowsEnabled: true,
            fogFar: 100,
            ambientLightIntensity: 0.3
          };
      }
    };

    // Function to get texture scale based on quality setting
    const getTextureScale = () => {
      return getQualitySettings().textureScale;
    };

    // Function to apply texture quality settings to all textures in a scene
    const applyTextureQuality = (scene) => {
      scene.traverse((obj) => {
        if (obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          materials.forEach((mat) => {
            // Apply quality settings to all texture maps
            ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'displacementMap', 'envMap'].forEach((mapName) => {
              if (mat[mapName] && mat[mapName].isTexture) {
                const tex = mat[mapName];
                const qualityScale = getTextureScale();
                
                // Adjust filtering based on quality
                if (qualityScale < 1.0) {
                  tex.magFilter = THREE.LinearFilter;
                  tex.minFilter = THREE.LinearMipmapLinearFilter;
                } else {
                  tex.magFilter = THREE.LinearFilter;
                  tex.minFilter = THREE.LinearMipmapLinearFilter;
                }
              }
            });
          });
        }
      });
    };

    const terrainColor = textureLoader.load('/textures/Grass/Grass001_4K-JPG_Color.jpg');
    const terrainNormal = textureLoader.load('/textures/Grass/Grass001_4K-JPG_NormalGL.jpg');
    const terrainRoughness = textureLoader.load('/textures/Grass/Grass001_4K-JPG_Roughness.jpg');
    const terrainAO = textureLoader.load('/textures/Grass/Grass001_4K-JPG_AmbientOcclusion.jpg');

    // Load grass_01_1k textures for the ground
    const groundColor = textureLoader.load('/textures/grass_01_1k/grass_01_color_1k.png');
    const groundNormal = textureLoader.load('/textures/grass_01_1k/grass_01_normal_gl_1k.png');
    const groundRoughness = textureLoader.load('/textures/grass_01_1k/grass_01_roughness_1k.png');
    const groundAO = textureLoader.load('/textures/grass_01_1k/grass_01_ambient_occlusion_1k.png');

    // Apply texture scaling based on quality
    const qualityScale = getTextureScale();
    [terrainColor, terrainNormal, terrainRoughness, terrainAO, groundColor, groundNormal, groundRoughness, groundAO].forEach((tex) => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(4, 4);
      tex.magFilter = qualityScale < 1.0 ? THREE.LinearFilter : THREE.LinearFilter;
      tex.minFilter = qualityScale < 1.0 ? THREE.LinearMipmapLinearFilter : THREE.LinearMipmapLinearFilter;
    });

    const grassColor = textureLoader.load('/textures/Grass/Grass001_4K-JPG_Color.jpg');
    const grassNormal = textureLoader.load('/textures/Grass/Grass001_4K-JPG_NormalGL.jpg');
    const grassRoughness = textureLoader.load('/textures/Grass/Grass001_4K-JPG_Roughness.jpg');
    const grassAO = textureLoader.load('/textures/Grass/Grass001_4K-JPG_AmbientOcclusion.jpg');

    // Apply quality settings to scene
    const qualitySettings = getQualitySettings();
    
    // Update shadows based on quality
    renderer.shadowMap.enabled = qualitySettings.shadowsEnabled;
    sunLight.castShadow = qualitySettings.shadowsEnabled;
    
    // Update fog based on quality
    scene.fog = new THREE.Fog('#b0d4ff', 20, qualitySettings.fogFar);
    
    // Update ambient light intensity
    ambientLight.intensity = qualitySettings.ambientLightIntensity;

    function createRoadSegment(initialZ) {
      const group = new THREE.Group();
      group.position.z = initialZ;

      // Stylized Road with artistic appearance
      const roadGeo = new THREE.PlaneGeometry(6, SEG_LEN);
      
      // Create a stylized road texture canvas
      const roadCanvas = document.createElement('canvas');
      roadCanvas.width = 512;
      roadCanvas.height = 256;
      const roadCtx = roadCanvas.getContext('2d');
      
      // Stylized gradient - warmer, more artistic colors
      const roadGrad = roadCtx.createLinearGradient(0, 0, 0, roadCanvas.height);
      roadGrad.addColorStop(0, '#3d3d4d');
      roadGrad.addColorStop(0.5, '#2a2a3a');
      roadGrad.addColorStop(1, '#3d3d4d');
      
      roadCtx.fillStyle = roadGrad;
      roadCtx.fillRect(0, 0, roadCanvas.width, roadCanvas.height);
      
      // Add artistic noise texture
      for (let i = 0; i < 800; i++) {
        const x = Math.random() * roadCanvas.width;
        const y = Math.random() * roadCanvas.height;
        const size = Math.random() * 3;
        const opacity = Math.random() * 0.2;
        roadCtx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        roadCtx.fillRect(x, y, size, size);
      }
      
      // Add stylized lane sections with slight color variation
      roadCtx.fillStyle = 'rgba(100, 120, 150, 0.08)';
      for (let i = 0; i < roadCanvas.height; i += 40) {
        roadCtx.fillRect(0, i, roadCanvas.width, 20);
      }
      
      const roadTexture = new THREE.CanvasTexture(roadCanvas);
      roadTexture.repeat.set(0.5, 2);
      roadTexture.wrapS = THREE.RepeatWrapping;
      roadTexture.wrapT = THREE.RepeatWrapping;
      
      const roadMat = new THREE.MeshStandardMaterial({ 
        map: roadTexture,
        color: '#3a3a48',
        metalness: 0.15,
        roughness: 0.75,
        side: THREE.DoubleSide
      });
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.receiveShadow = true;
      group.add(road);
      
      // Add stylized road edge markings (white stripes on sides)
      const edgeStripeMat = new THREE.MeshStandardMaterial({ 
        color: '#f0f0f0',
        metalness: 0.1,
        roughness: 0.6
      });
      
      // Left edge stripe
      const leftEdge = new THREE.Mesh(new THREE.PlaneGeometry(0.15, SEG_LEN), edgeStripeMat);
      leftEdge.rotation.x = -Math.PI / 2;
      leftEdge.position.set(-2.95, 0.005, 0);
      group.add(leftEdge);
      
      // Right edge stripe
      const rightEdge = new THREE.Mesh(new THREE.PlaneGeometry(0.15, SEG_LEN), edgeStripeMat);
      rightEdge.rotation.x = -Math.PI / 2;
      rightEdge.position.set(2.95, 0.005, 0);
      group.add(rightEdge);

      // Stylized Terrain Ground using grass_01_1k textures
      const terrainGeo = new THREE.PlaneGeometry(40, SEG_LEN, 80, 80);
      terrainGeo.setAttribute('uv2', new THREE.BufferAttribute(terrainGeo.attributes.uv.array, 2));

      const terrainMat = new THREE.MeshStandardMaterial({
        map: groundColor,
        normalMap: groundNormal,
        roughnessMap: groundRoughness,
        aoMap: groundAO,
        roughness: 0.9,
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

      // Stylized Grass blades with vibrant colors
      const grassMat = new THREE.MeshStandardMaterial({
        color: '#5ec96f',  // Vibrant green color
        map: groundColor,
        normalMap: groundNormal,
        roughnessMap: groundRoughness,
        aoMap: groundAO,
        // Use alphaTest (discard fragments) and write depth so other
        // transparent objects (like tree leaves) depth-test correctly.
        transparent: false,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
        depthWrite: true,
        roughness: 0.7,
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
           float wind = sin(uTime + position.z * 2.0 + position.x * 0.5) * 0.2;
           transformed.x += wind * (transformed.y * 0.85);
           transformed.z += sin(uTime * 0.7 + position.x) * 0.1 * transformed.y;`
        );
        grassMat.userData.shader = shader;
      };

      const bladeGeo = new THREE.PlaneGeometry(0.12, 1.8, 2, 5);  // Taller, wider blades
      const patchesPerSide = qualitySettings.grassBladesPerSide;
      const grassLeft = new THREE.InstancedMesh(bladeGeo, grassMat, patchesPerSide);
      const grassRight = new THREE.InstancedMesh(bladeGeo, grassMat, patchesPerSide);

      grassLeft.castShadow = true;
      grassRight.castShadow = true;

      const dummy = new THREE.Object3D();
      // Create grass patches on the left side
      for (let i = 0; i < patchesPerSide; i++) {
        // Create patch centers randomly
        let patchX = -10 + (Math.random() - 0.5) * 40;
        while (patchX > -4.6) {
          patchX = -10 + (Math.random() - 0.5) * 40;
        }
        const patchZ = (Math.random() - 0.5) * SEG_LEN;
        
        // Create cluster around patch center
        const clusterRadius = 1.5;
        const offsetX = (Math.random() - 0.5) * clusterRadius;
        const offsetZ = (Math.random() - 0.5) * clusterRadius;
        
        dummy.position.set(patchX + offsetX, -0.8, patchZ + offsetZ);
        dummy.rotation.y = Math.random() * Math.PI;
        const s = 1.0 + Math.random() * 0.4;
        dummy.scale.set(s * 0.7, s * 1.0, s * 0.7);
        dummy.updateMatrix();
        grassLeft.setMatrixAt(i, dummy.matrix);
      }
      
      // Create grass patches on the right side
      for (let i = 0; i < patchesPerSide; i++) {
        // Create patch centers randomly
        let patchX = 10 + (Math.random() - 0.5) * 40;
        while (patchX < 4.6) {
          patchX = 10 + (Math.random() - 0.5) * 40;
        }
        const patchZ = (Math.random() - 0.5) * SEG_LEN;
        
        // Create cluster around patch center
        const clusterRadius = 1.5;
        const offsetX = (Math.random() - 0.5) * clusterRadius;
        const offsetZ = (Math.random() - 0.5) * clusterRadius;
        
        dummy.position.set(patchX + offsetX, -0.8, patchZ + offsetZ);
        dummy.rotation.y = Math.random() * Math.PI;
        const s = 1.0 + Math.random() * 0.4;
        dummy.scale.set(s * 0.7, s * 1.0, s * 0.7);
        dummy.updateMatrix();
        grassRight.setMatrixAt(i, dummy.matrix);
      }
      grassLeft.instanceMatrix.needsUpdate = true;
      grassRight.instanceMatrix.needsUpdate = true;

      group.add(grassLeft, grassRight);

      // Create wind shader material for stylized grass model
      const windShaderMaterial = new THREE.MeshStandardMaterial({
        // Use the grass textures so model clones correctly alpha-test
        color: '#6dd47d',  // Vibrant green
        map: groundColor,
        normalMap: groundNormal,
        roughnessMap: groundRoughness,
        aoMap: groundAO,
        roughness: 0.65,
        metalness: 0.0,
        // Ensure depth is written for correct compositing with leaves
        transparent: false,
        alphaTest: 0.5,
        depthWrite: true,
        side: THREE.DoubleSide,
        shadowSide: THREE.FrontSide
      });

      windShaderMaterial.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = { value: 0 };
        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `#include <common>
           uniform float uTime;`
        );
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           float wind = sin(uTime + position.z * 2.0 + position.x * 0.5) * 0.12;
           transformed.x += wind * (transformed.y * 0.7);
           transformed.z += sin(uTime * 0.7 + position.x) * 0.06 * transformed.y;`
        );
        windShaderMaterial.userData.shader = shader;
      };

      // Helper to attach the same onBeforeCompile behavior to clones
      const attachWindShader = (material, strength = 0.12) => {
        material.onBeforeCompile = (shader) => {
          shader.uniforms.uTime = { value: 0 };
          shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `#include <common>
             uniform float uTime;`
          );
          shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
             float wind = sin(uTime + position.z * 2.0 + position.x * 0.5) * ${strength.toFixed(3)};
             transformed.x += wind * (transformed.y * 0.7);
             transformed.z += sin(uTime * 0.7 + position.x) * ${(
              (strength * 0.5)
            ).toFixed(3)} * transformed.y;`
          );
          material.userData.shader = shader;
        };
      };

      // ensure the original material has the handler as well
      attachWindShader(windShaderMaterial);

      // Load grass model with wind animation
      const grassModelLoader = new GLTFLoader();
      
      // Handle GLTF extensions
      grassModelLoader.register((parser) => {
        return {
          name: 'KHR_materials_pbrSpecularGlossiness',
          beforeRoot: async () => {}
        };
      });
      
      grassModelLoader.load('/models/lump_grass.glb', (gltf) => {
        const grassModel = gltf.scene.children[0] || gltf.scene;
        grassModel.scale.set(0.001, 0.001, 0.001);
        applyTextureQuality(grassModel);
        grassModel.traverse((obj) => {
          if (obj.isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
          }
        });

        // Add grass patches on the sides
        for (let i = -HALF; i < HALF; i += 25) {
          for (let j = -9; j <= 9; j += 6) {
            // ensure patches don't appear on the road (road half-width is 3)
            const x = j * 0.8;
            if (Math.abs(x) <= 3.2) continue; // skip positions too close to center

            if (Math.random() > (1 - qualitySettings.grassModelSpawnChance)) {
              const grass = grassModel.clone(true);
              grass.position.set(x, -1, i);
              // grass.rotation.y = Math.random() * Math.PI * 2;
              grass.frustumCulled = false;
              grass.traverse((obj) => {
                if (obj.isMesh) {
                  // Apply wind shader to each mesh
                  const matClone = windShaderMaterial.clone();
                  attachWindShader(matClone, 0.18); // slightly stronger wind for model-scale
                  matClone.needsUpdate = true; // force recompile so uTime exists immediately
                  obj.material = matClone;
                  obj.frustumCulled = false;
                }
              });
              // group.add(grass);
            }
          }
        }
      });

            // Stylized Road markings - artistic center dashes with varying sizes
      const stripeMaterial = new THREE.MeshStandardMaterial({ 
        color: '#fff4a0',
        metalness: 0.25,
        roughness: 0.5
      });
      const stripeGroup = new THREE.Group();
      
      // Create alternating dash sizes for visual interest
      for (let i = -HALF; i < HALF; i += 5) {
        const isLarge = (Math.floor(i / 5) % 3) === 0; // Every 3rd dash is larger
        const stripeHeight = isLarge ? 1.5 : 1;
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.4, stripeHeight), stripeMaterial);
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

treeLoader.load('/models/stylized_tree_03_clean.glb', (gltf) => {
  const treeModel = gltf.scene.children[0] || gltf.scene;
  treeModel.scale.set(.0035, .0035, .0035);
  applyTextureQuality(treeModel);
  treeModel.updateMatrixWorld(true);

  // Load lamp model once
  lampLoader.load('/models/street_lamp.glb', (lampGltf) => {
    const lampModel = lampGltf.scene;
    lampModel.scale.set(0.11, 0.11, 0.11); // Adjust if needed
    applyTextureQuality(lampModel);
    lampModel.updateMatrixWorld(true);

    let treeCounter = 0;

    for (let i = -HALF; i < HALF; i += 20) {
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
        treeL.position.set(-6.5, -1, i);
        treeL.traverse((obj) => {
          if (obj.isMesh) obj.castShadow = true;
        });
        treeGroup.add(treeL);

        const treeR = treeModel.clone(true);
        treeR.position.set(6.5, -1, i);
        treeR.traverse((obj) => {
          if (obj.isMesh) obj.castShadow = true;
        });
        treeGroup.add(treeR);
      }
    }

    group.add(treeGroup);
    group.add(lampGroup);

      // Load and add stylized buildings on both sides
      const tavernGroup = new THREE.Group();
      const buildingLoader = new GLTFLoader();
      
      // Map of building models with their specific configurations
      const buildingModels = {
        '/models/stylized_house.glb': {
          scale: 5,
          configs: [
            { xLeft: -20, xRight: 20, rotLeft: Math.PI / 2, rotRight: -Math.PI / 2 },
          ]
        },
        '/models/stylized_coffee_shop_sketchfabweeklychallenge.glb': {
          scale: 50,
          configs: [
            { xLeft: -20, xRight: 20, rotLeft: Math.PI / 3, rotRight: -Math.PI / 3, yOffset: 0, zOffset: 0 },
          ]
        },
        '/models/low_poly_store_building.glb': {
          scale: 1,
          rightSideOnly: false,
          configs: [
            { xLeft: -20, xRight: 20, rotLeft: Math.PI / 2.2, rotRight: -Math.PI / 2.2 },
          ]
        },
        '/models/ultimate_japanese_konbini.glb': {
          scale: 0.01,
          configs: [
            { xLeft: -25, xRight: 25, rotLeft: 0, rotRight: Math.PI / 1 },
          ]
        }
      };
      
      const buildingModelPaths = Object.keys(buildingModels);
      
      // Shuffle the building paths to randomize order
      const shuffledPaths = buildingModelPaths.sort(() => Math.random() - 0.5);
      
      // Load and place buildings on both sides
      const buildingsPerSide = buildingModelPaths.length;
      
      // Create footpath material
      const footpathMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B7355,
        roughness: 0.8,
        metalness: 0.0
      });
      
      // Create continuous straight footpaths
      const footpathWidth = 4;
      const footpathLength = HALF * 2.5; // Covers the entire building area
      
      // Left side footpath
      const footpathLeftGeometry = new THREE.PlaneGeometry(footpathWidth, footpathLength);
      const footpathLeftMesh = new THREE.Mesh(footpathLeftGeometry, footpathMaterial);
      footpathLeftMesh.rotation.x = -Math.PI / 2;
      footpathLeftMesh.position.set(-14, -0.98, 0);
      footpathLeftMesh.receiveShadow = true;
      tavernGroup.add(footpathLeftMesh);
      
      // Right side footpath
      const footpathRightGeometry = new THREE.PlaneGeometry(footpathWidth, footpathLength);
      const footpathRightMesh = new THREE.Mesh(footpathRightGeometry, footpathMaterial);
      footpathRightMesh.rotation.x = -Math.PI / 2;
      footpathRightMesh.position.set(14, -0.98, 0);
      footpathRightMesh.receiveShadow = true;
      tavernGroup.add(footpathRightMesh);
      
      for (let i = 0; i < buildingsPerSide; i++) {
        const modelPath = shuffledPaths[i];
        const modelConfig = buildingModels[modelPath];
        const modelScale = modelConfig.scale;
        const config = modelConfig.configs[i % modelConfig.configs.length];
        
        buildingLoader.load(modelPath, (gltf) => {
          const buildingModel = gltf.scene;
          buildingModel.scale.set(modelScale, modelScale, modelScale);
          applyTextureQuality(buildingModel);
          buildingModel.updateMatrixWorld(true);
          
          const z = -HALF + (i + 1) * (HALF / (buildingsPerSide * 1.3));
          
          // Left side building
          if (!modelConfig.rightSideOnly) {
            const buildingLeft = buildingModel.clone(true);
            buildingLeft.position.set(config.xLeft, -1 + (config.yOffset || 0), z + (config.zOffset || 0));
            buildingLeft.rotation.y = config.rotLeft;
            buildingLeft.traverse((obj) => {
              if (obj.isMesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
              }
            });
            tavernGroup.add(buildingLeft);
          }
          
          // Right side building
          const buildingRight = buildingModel.clone(true);
          buildingRight.position.set(config.xRight, -1 + (config.yOffset || 0), z + (config.zOffset || 0));
          buildingRight.rotation.y = config.rotRight;
          buildingRight.traverse((obj) => {
            if (obj.isMesh) {
              obj.castShadow = true;
              obj.receiveShadow = true;
            }
          });
          tavernGroup.add(buildingRight);
        });
      }
      
      group.add(tavernGroup);

      // Load and add second building group far from first group
      const secondBuildingGroup = new THREE.Group();
      const secondBuildingLoader = new GLTFLoader();
      
      // Map of second building group models
      const secondBuildingModels = {
        '/models/stone_well_stylized.glb': {
          scale: 0.02,
          configs: [
            { xLeft: -22, xRight: 22, rotLeft: Math.PI / 2, rotRight: -Math.PI / 2, yOffset: 0, zOffset: 0 },
          ]
        },
        '/models/low-poly_truck_car_drifter.glb': {
          scale: 0.01,
          configs: [
            { xLeft: -20, xRight: 20, rotLeft: 0, rotRight: Math.PI, yOffset: 0.4, zOffset: 0 },
          ]
        }
      };

      const secondBuildingModelPaths = Object.keys(secondBuildingModels);
      const buildingsPerSideSecond = secondBuildingModelPaths.length;

      for (let i = 0; i < buildingsPerSideSecond; i++) {
        const modelPath = secondBuildingModelPaths[i];
        const modelConfig = secondBuildingModels[modelPath];
        const modelScale = modelConfig.scale;
        const config = modelConfig.configs[i % modelConfig.configs.length];
        
        secondBuildingLoader.load(modelPath, (gltf) => {
          const buildingModel = gltf.scene;
          buildingModel.scale.set(modelScale, modelScale, modelScale);
          applyTextureQuality(buildingModel);
          buildingModel.updateMatrixWorld(true);
          
          // Position far along Z-axis from first group (much larger offset)
          const z = HALF*2 + (i + 1) * (HALF / (buildingsPerSideSecond * 1.5));
          
          // Left side building
          const buildingLeft = buildingModel.clone(true);
          buildingLeft.position.set(config.xLeft, -1 + (config.yOffset || 0), z + (config.zOffset || 0));
          buildingLeft.rotation.y = config.rotLeft;
          buildingLeft.traverse((obj) => {
            if (obj.isMesh) {
              obj.castShadow = true;
              obj.receiveShadow = true;
            }
          });
          secondBuildingGroup.add(buildingLeft);
          
          // Right side building
          const buildingRight = buildingModel.clone(true);
          buildingRight.position.set(config.xRight, -1 + (config.yOffset || 0), z + (config.zOffset || 0));
          buildingRight.rotation.y = config.rotRight;
          buildingRight.traverse((obj) => {
            if (obj.isMesh) {
              obj.castShadow = true;
              obj.receiveShadow = true;
            }
          });
          secondBuildingGroup.add(buildingRight);
        });
      }

      group.add(secondBuildingGroup);
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
      applyTextureQuality(billModel);
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

    // Load flying plane
    const planeLoader = new GLTFLoader();
    let planeModel = null;
    let planeAnimationMixer = null;
    let planeAnimationClips = [];
    planeLoader.load('/models/stylized_ww1_plane.glb', (gltf) => {
      planeModel = gltf.scene.children[0] || gltf.scene;
      planeModel.scale.set(0.5, 0.5, 0.5);
      applyTextureQuality(planeModel);
      planeModel.updateMatrixWorld(true);
      
      // Initial position high in the sky
      planeModel.position.set(0, 20, -300);
      
      // Face the plane towards the camera (pointing forward along +Z)
      planeModel.rotation.y = Math.PI;
      
      planeModel.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
      
      // Set up animation mixer and play animations if available
      if (gltf.animations && gltf.animations.length > 0) {
        planeAnimationMixer = new THREE.AnimationMixer(planeModel);
        planeAnimationClips = gltf.animations;
        console.log('WW1 Plane animations available:', planeAnimationClips.map(clip => clip.name));
        
        // Play the first animation by default
        if (planeAnimationClips.length > 0) {
          planeAnimationMixer.clipAction(planeAnimationClips[0]).play();
          planeAnimationMixer.timeScale = 20; // Speed up animation by 2x
        }
      }
      
      scene.add(planeModel);
    }, undefined, (error) => {
      console.warn('Could not load plane model:', error);
    });

    // Load fences and attach continuously
const gltfLoader = new GLTFLoader();
gltfLoader.load('/models/stylized_fence.glb', (gltf) => {
  const fenceModel = gltf.scene.children[0] || gltf.scene;

  // Ensure upright orientation
  fenceModel.rotation.set(-1.55, 0, 0);
  applyTextureQuality(fenceModel);
  fenceModel.updateMatrixWorld(true);

  // Measure fence length dynamically
  const bbox = new THREE.Box3().setFromObject(fenceModel);
  const fenceLength = bbox.max.z - bbox.min.z;

  const fenceSpacing = fenceLength; // ensures no overlap
  const fenceOffsetZ = 0.5;         // slight forward offset
  const fenceDistLeft = -5.1;       // left side of road
  const fenceDistRight = 5.1;       // right side of road

  const addFencesToSegment = (segment) => {
    for (let i = -HALF; i < HALF; i += fenceSpacing) {
      // Left fence — rotate to face right (toward road center)
      const fenceL = fenceModel.clone(true);
      fenceL.position.set(fenceDistLeft, -1, i + fenceOffsetZ);
      
      fenceL.castShadow = true;
      fenceL.traverse((obj) => {
        if (obj.isMesh) obj.castShadow = true;
      });
      segment.add(fenceL);

      // Right fence — rotate to face left (toward road center)
      const fenceR = fenceModel.clone(true);
      fenceR.position.set(fenceDistRight, -1, i + fenceOffsetZ);
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

    // Display anchor + in-car screen canvas & texture (for an emissive 3D screen on the dashboard)
    let displayAnchor = null; // set to dashboard mesh when found
    let screenDepthOffset = 0.0; // nudging depth (adjust with [ / ])
    let screenDebugOverlay = null;

    let screenCanvas = null;
    let screenCtx = null;
    let screenTexture = null;
    let screenMesh = null;
    let drawScreenFunc = null; // assigned when the GLTF is ready

    // key handler updates speedRef — only effective after start
    const handleKeyDown = (e) => {
      if (!startedRef.current) return;
      if (e.key === 'ArrowUp') speedRef.current = Math.min(0.7, speedRef.current + 0.1);
      if (e.key === 'ArrowDown') speedRef.current = Math.max(0, speedRef.current - 0.1);

      // small nudge: adjust screen depth with [ and ] (for quick placement tweaks)
      if (e.key === '[') {
        screenDepthOffset = Math.max(-0.5, screenDepthOffset - 0.005);
        if (screenDebugOverlay) screenDebugOverlay.innerText = `Screen depth: ${screenDepthOffset.toFixed(3)}\nUse [ and ] to adjust`;
        console.log('screenDepthOffset', screenDepthOffset);
      }
      if (e.key === ']') {
        screenDepthOffset = Math.min(0.5, screenDepthOffset + 0.005);
        if (screenDebugOverlay) screenDebugOverlay.innerText = `Screen depth: ${screenDepthOffset.toFixed(3)}\nUse [ and ] to adjust`;
        console.log('screenDepthOffset', screenDepthOffset);
      }

      // Toggle first-person view with 'F' and exit with Escape
      if (e.key && e.key.toLowerCase && e.key.toLowerCase() === 'f') {
        setIsFPP(prev => !prev);
      }
      if (e.key === 'Escape' && isFPPRef.current) {
        setIsFPP(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    // steering mouse moves (only active while FPP) — add listener always but we check flag in handler
    window.addEventListener('mousemove', handleMouseMoveForSteer);

    // Resume label
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
        // If Shift+Click, toggle exploded view and show resume label (legacy behavior)
        if (event.shiftKey) {
          exploded = !exploded;
          resumeLabel.visible = true;
        } else {
          // Click toggles first-person (driver) view
          setIsFPP(prev => !prev);
          resumeLabel.visible = false;
        }
        return;
      }
    };
    window.addEventListener('click', handleClick);

    const carLoader = new GLTFLoader();
    carLoader.load('/models/car1.glb', (gltf) => {
      carModel = gltf.scene;
      carModel.scale.set(0.28, 0.28, 0.28);
      applyTextureQuality(carModel);
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

      // Find a good anchor mesh on the dashboard (if available). fallback to car root
      let displayAnchor = carModel;
      carModel.traverse((obj) => {
        if (obj.isMesh && /(dash|screen|radio|display|console|pioneer|cluster|tft|panel)/i.test(obj.name)) {
          displayAnchor = obj;
        }
      });

      // create a small in-car display using CSS2D (clickable and styled like a real car screen)
      console.log('Car display anchored to:', displayAnchor.name || 'root (carModel)');
      const displayDiv = document.createElement('div');
      displayDiv.className = 'car-display';
      displayDiv.style.pointerEvents = 'auto'; // enable clicks inside the CSS2D element
      displayDiv.style.background = 'rgba(0,0,0,0.88)';
      displayDiv.style.padding = '8px';
      displayDiv.style.borderRadius = '8px';
      displayDiv.style.color = '#dfffe8';
      displayDiv.style.minWidth = '120px';

      displayDiv.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px">
          <div class="left-icons" style="display:flex;flex-direction:column;gap:6px;width:36px;align-items:center;color:#ff7b6b">
            <div style="font-size:14px">⚑</div>
            <div style="font-size:14px">♪</div>
            <div style="font-size:14px">🔋</div>
            <div style="font-size:14px">⚙</div>
          </div>
          <div class="screen" style="background:#060606;border-radius:6px;padding:8px;min-width:140px;min-height:64px;color:#dfffe8;border:1px solid rgba(255,255,255,0.03)">
            <div class="speed-line" style="font-size:15px;font-weight:800;color:#7ff7a2">Speed: 0 km/h</div>
            <div style="font-size:11px;color:#9fbf9a;margin-top:6px">Press F to toggle view</div>
            <button class="details-btn" style="margin-top:8px;background:#071010;border:1px solid rgba(127,255,190,0.08);color:#9ff6b8;padding:6px;border-radius:6px;cursor:pointer;font-size:11px">More details</button>
          </div>
        </div>
      `;

      // wire up button to open a car-display-styled details page
      const detailsBtn = displayDiv.querySelector('.details-btn');
      if (detailsBtn) detailsBtn.onclick = (e) => { e.stopPropagation(); openCarDisplayDetails(); };

      carDisplayRef.current = displayDiv;
      const displayObj = new CSS2DObject(displayDiv);
      // Attach the label to dashboard anchor so it moves with the interior
      displayObj.position.set(0, -10, 0);
      displayAnchor.add(displayObj);

      // Create a canvas for a physical in-world screen (gives a realistic emissive display)
      screenCanvas = document.createElement('canvas');
      screenCanvas.width = 512;
      screenCanvas.height = 256;
      screenCtx = screenCanvas.getContext('2d');

      const drawScreen = (speedKmh, isFPP) => {
        const ctx = screenCtx;
        if (!ctx) return;
        // background
        ctx.fillStyle = '#030303';
        ctx.fillRect(0, 0, screenCanvas.width, screenCanvas.height);

        // left icons column
        ctx.fillStyle = '#ff6b6b';
        ctx.font = '28px serif';
        ctx.fillText('⚑', 18, 46);
        ctx.fillText('♪', 18, 96);
        ctx.fillText('🔋', 18, 146);
        ctx.fillText('⚙', 18, 196);

        // main display area
        ctx.fillStyle = '#07120b';
        ctx.fillRect(80, 30, 420, 196);

        ctx.fillStyle = '#7ff7a2';
        ctx.font = '36px monospace';
        ctx.fillText(`Speed: ${speedKmh} km/h`, 96, 94);

        ctx.fillStyle = '#9fbf9a';
        ctx.font = '16px monospace';
        ctx.fillText('Press F to toggle view', 96, 132);

        // details button box
        ctx.strokeStyle = 'rgba(159,255,154,0.12)';
        ctx.lineWidth = 2;
        ctx.strokeRect(96, 152, 160, 36);
        ctx.fillStyle = '#9ff6b8';
        ctx.font = '16px monospace';
        ctx.fillText('More details', 110, 178);
      };

      // Draw initial content and expose draw function to the animation loop
      drawScreen(0, false);
      drawScreenFunc = drawScreen;
      screenTexture = new THREE.CanvasTexture(screenCanvas);
      screenTexture.encoding = THREE.sRGBEncoding;

      const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture, side: THREE.FrontSide });
      screenMat.transparent = false;
      const screenGeo = new THREE.PlaneGeometry(0.46, 0.23);
      screenMesh = new THREE.Mesh(screenGeo, screenMat);

      // We'll position this mesh each frame using the anchor's bounding box so it sits flush in the dash
      screenMesh.renderOrder = 999;
      screenMesh.frustumCulled = false;

      // Add to scene and compute world placement in the animation loop (keeps it parented logically but allows precise placement)
      scene.add(screenMesh);

      // Debug overlay for nudging placement (visible in top-left)
      if (mountRef && mountRef.current) {
        screenDebugOverlay = document.createElement('div');
        screenDebugOverlay.style.position = 'absolute';
        screenDebugOverlay.style.left = '12px';
        screenDebugOverlay.style.top = '12px';
        screenDebugOverlay.style.padding = '6px 8px';
        screenDebugOverlay.style.background = 'rgba(0,0,0,0.5)';
        screenDebugOverlay.style.color = '#bfffd6';
        screenDebugOverlay.style.fontSize = '12px';
        screenDebugOverlay.style.borderRadius = '6px';
        screenDebugOverlay.style.pointerEvents = 'none';
        screenDebugOverlay.innerText = `Screen depth: ${screenDepthOffset.toFixed(3)}\nUse [ and ] to adjust`;
        mountRef.current.appendChild(screenDebugOverlay);
      }
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

    // Create leaf particle system
    const createLeafParticles = (settings) => {
      const leafGeometry = new THREE.BufferGeometry();
      const leafCount = settings.particleCount;
      const positions = [];

      for (let i = 0; i < leafCount; i++) {
        positions.push(
          (Math.random() - 0.5) * 200,  // x: spread across entire width
          Math.random() * 50,            // y: spread from 0-50 for varied fall times
          (Math.random() - 0.5) * 200   // z: spread across entire depth
        );
      }

      leafGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));

      const leafMaterial = new THREE.PointsMaterial({
        color: 0x228B22,
        size: 0.2,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.6,
      });

      const leafParticles = new THREE.Points(leafGeometry, leafMaterial);
      scene.add(leafParticles);
      return leafParticles;
    };

    // Store the function for later recreation
    createLeafParticlesRef.current = createLeafParticles;

    const leafParticles = createLeafParticles(qualitySettings);
    leafParticlesRef.current = leafParticles;

    const clock = new THREE.Clock();

    // Create circular minimap
    const minimapSize = 180;
    const minimapCanvas = document.createElement('canvas');
    minimapCanvas.width = minimapSize;
    minimapCanvas.height = minimapSize;
    minimapCanvas.style.position = 'absolute';
    minimapCanvas.style.bottom = '20px';
    minimapCanvas.style.right = '20px';
    minimapCanvas.style.border = '2px solid rgba(255, 255, 255, 0.7)';
    minimapCanvas.style.borderRadius = '50%';
    minimapCanvas.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    minimapCanvas.style.cursor = 'default';
    minimapCanvas.style.zIndex = '100';
    minimapCanvas.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    mountRef.current.appendChild(minimapCanvas);

    const minimapCtx = minimapCanvas.getContext('2d');
    const mapScale = 0.5; // Scale for world-to-minimap
    const mapRange = 100; // Range visible on minimap

    const animate = () => {
      requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Update cloud animation
      drawCloudySky(time);
      skyTexture.needsUpdate = true;

      // Update leaf particles with wind effect
      if (leafParticles) {
        const positions = leafParticles.geometry.attributes.position.array;
        const windStrength = Math.sin(time * 0.5) * 0.4 + 0.3;
        const carSpeed = speedRef.current;

        for (let i = 0; i < positions.length; i += 3) {
          const leafIndex = i / 3;

          // Continuous wind + car speed
          positions[i] += windStrength * 0.4 + carSpeed * 0.15;              // x: wind + car motion
          positions[i + 1] -= 0.06;                                         // y: slower falling (was 0.12)
          positions[i + 2] += Math.sin(time * 0.3 + leafIndex) * 0.15;     // z: swaying

          // Reset leaves individually as they fall (not all at once)
          if (positions[i + 1] < -10) {
            // Respawn at top with random distribution
            positions[i] = (Math.random() - 0.5) * 200;
            positions[i + 1] = 35 + Math.random() * 10;  // Respawn at top (45-55)
            positions[i + 2] = (Math.random() - 0.5) * 200;
          }

          // Reset if too far horizontally or back
          if (Math.abs(positions[i]) > 120 || positions[i + 2] < -120) {
            positions[i] = (Math.random() - 0.5) * 200;
            positions[i + 1] = 35 + Math.random() * 10;
            positions[i + 2] = (Math.random() - 0.5) * 200;
          }
        }
        leafParticles.geometry.attributes.position.needsUpdate = true;

        // Always keep high opacity so leaves are always visible
        leafParticles.material.opacity = 0.7;
      }

      // Grass wind
      scene.traverse((obj) => {
        if (obj.isMesh && obj.material && obj.material.userData && obj.material.userData.shader) {
          obj.material.userData.shader.uniforms.uTime.value = time;
        }
      });

      // Update plane animations
      if (planeAnimationMixer) {
        planeAnimationMixer.update(clock.getDelta());
      }

      // Animate flying plane
      if (planeModel) {
        // Plane moves towards the camera (positive Z direction towards camera)
        planeModel.position.z += 0.6;  // Faster speed of approach
        
        // Add slight vertical bobbing motion
        // planeModel.position.y = 15 + Math.sin(time * 0.5) * 2;
        
        // Add slight banking/rolling motion for realism
        // planeModel.rotation.z = Math.sin(time * 0.2) * 0.2;
        
        // Reset position when it gets too close
        if (planeModel.position.z > 20) {
          planeModel.position.z = -200;
        }
      }

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

        // First-person: position camera at the driver's seat inside the car
        if (isFPPRef.current) {
          // local offset from car origin to driver's eye (tweak these values to taste)
          // Use a forward-facing local Z (negative Z is forward in Three.js)
          const driverLocal = new THREE.Vector3(1.2, 3.5, -0.7);
          // convert to world space
          const driverWorld = carModel.localToWorld(driverLocal.clone());

          // set camera position immediately for sharp response
          camera.position.copy(driverWorld);

          // look at a point in front of the car (local -Z), converted to world space
          const forwardLocal = new THREE.Vector3(0, 0, 20);
          const forwardWorld = carModel.localToWorld(forwardLocal.clone());
          camera.lookAt(forwardWorld);
        } else {
          // third-person follow()
          const carPos = carModel.getWorldPosition(new THREE.Vector3());
          const camOffset = new THREE.Vector3(0, 2.1, 6);
          const targetCamPos = carPos.clone().add(camOffset);
          camera.position.lerp(targetCamPos, 0.1);
          camera.lookAt(carPos);
        }

        updateExplodedView();
      }

      // update HUD (speed and steering)
      if (isFPPRef.current) {
        const speedKmh = Math.round(speedRef.current * 250); // mapping to ~km/h for effect
        if (hudSpeedDomRef.current) hudSpeedDomRef.current.innerText = `${speedKmh} km/h`;
        if (hudWheelDomRef.current) hudWheelDomRef.current.style.transform = `rotate(${steerRef.current}deg)`;
      }

      // update in-car display (CSS2D) + physical canvas-based screen
      const speedKmh = Math.round(speedRef.current * 250);
      if (carDisplayRef.current) {
        // Update numeric fields inside the existing markup to avoid reflowing the whole element
        const speedLine = carDisplayRef.current.querySelector('.speed-line');
        if (speedLine) speedLine.innerText = `Speed: ${speedKmh} km/h`;
        const fppLine = carDisplayRef.current.querySelector('.fpp-line');
        if (fppLine) fppLine.innerText = `FPP: ${isFPPRef.current ? 'ON' : 'OFF'}`;
        else {
          const f = document.createElement('div');
          f.className = 'fpp-line';
          f.style.fontSize = '11px';
          f.style.color = '#ccc';
          f.style.marginTop = '4px';
          f.innerText = `FPP: ${isFPPRef.current ? 'ON' : 'OFF'}`;
          carDisplayRef.current.appendChild(f);
        }
      }

      // Update the 3D canvas-based screen if it exists
      if (drawScreenFunc && screenTexture) {
        drawScreenFunc(speedKmh, isFPPRef.current);
        screenTexture.needsUpdate = true;
      }

      // Position the physical screen flush with the dashboard anchor (auto-alignment)
      if (screenMesh && displayAnchor) {
        try {
          const bbox = new THREE.Box3().setFromObject(displayAnchor);
          const center = bbox.getCenter(new THREE.Vector3());
          const size = bbox.getSize(new THREE.Vector3());

          // outward direction is from anchor center to camera; push a bit outside the surface
          const outward = camera.position.clone().sub(center).normalize();
          const push = Math.max(size.x, size.y, size.z) * 0.5 + 0.005 + screenDepthOffset;
          const worldPos = center.clone().add(outward.multiplyScalar(push));

          screenMesh.position.copy(worldPos);

          // make the plane face the camera
          const lookAtMat = new THREE.Matrix4().lookAt(worldPos, camera.position.clone(), new THREE.Vector3(0, 1, 0));
          screenMesh.quaternion.setFromRotationMatrix(lookAtMat);
          // plane geometry may need flipping so the textured face faces the camera
          screenMesh.rotateY(Math.PI);

          // scale the plane to roughly fit the anchor size
          const desiredWidth = Math.max(size.x * 0.9, 0.18);
          const desiredHeight = Math.max(size.y * 0.5, 0.10);
          const baseW = 0.46; const baseH = 0.23;
          screenMesh.scale.set(desiredWidth / baseW, desiredHeight / baseH, 1);
        } catch (err) {
          // ignore errors from badly-formed meshes
        }
      }

      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);

      // Draw minimap
      const miniRadius = minimapSize / 2;
      
      // Clear minimap with dark background
      minimapCtx.fillStyle = 'rgba(20, 20, 20, 0.7)';
      minimapCtx.fillRect(0, 0, minimapSize, minimapSize);
      
      // Draw circle border
      minimapCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      minimapCtx.lineWidth = 2;
      minimapCtx.beginPath();
      minimapCtx.arc(miniRadius, miniRadius, miniRadius - 1, 0, Math.PI * 2);
      minimapCtx.stroke();
      
      // Draw center grid/crosshair
      minimapCtx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
      minimapCtx.lineWidth = 1;
      minimapCtx.beginPath();
      minimapCtx.moveTo(miniRadius - 10, miniRadius);
      minimapCtx.lineTo(miniRadius + 10, miniRadius);
      minimapCtx.moveTo(miniRadius, miniRadius - 10);
      minimapCtx.lineTo(miniRadius, miniRadius + 10);
      minimapCtx.stroke();
      
      // Draw road (vertical line in center)
      minimapCtx.fillStyle = 'rgba(80, 80, 80, 0.6)';
      minimapCtx.fillRect(miniRadius - 8, 0, 16, minimapSize);
      
      // Get car position and draw it on minimap
      let carX = 0;
      let carZ = segment1.position.z; // Use segment1 position as reference
      
      // Convert world position to minimap position
      const mapPixelX = miniRadius + (carX * mapScale);
      const mapPixelZ = miniRadius - (carZ * mapScale);
      
      // Clamp to minimap bounds
      const clampedX = Math.max(miniRadius - miniRadius + 5, Math.min(miniRadius + miniRadius - 5, mapPixelX));
      const clampedZ = Math.max(miniRadius - miniRadius + 5, Math.min(miniRadius + miniRadius - 5, mapPixelZ));
      
      // Draw car symbol (simple rectangle with direction indicator)
      minimapCtx.save();
      minimapCtx.translate(clampedX, clampedZ);
      
      // Car body
      minimapCtx.fillStyle = 'rgba(255, 0, 0, 0.9)';
      minimapCtx.fillRect(-5, -7, 10, 14);
      
      // Car roof
      minimapCtx.fillStyle = 'rgba(255, 100, 0, 0.9)';
      minimapCtx.fillRect(-3, -4, 6, 8);
      
      // Direction indicator (front of car pointing down on minimap / forward)
      minimapCtx.fillStyle = 'rgba(255, 200, 0, 1)';
      minimapCtx.beginPath();
      minimapCtx.moveTo(-2, 8);
      minimapCtx.lineTo(2, 8);
      minimapCtx.lineTo(0, 10);
      minimapCtx.closePath();
      minimapCtx.fill();
      
      minimapCtx.restore();


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
      window.removeEventListener('mousemove', handleMouseMoveForSteer);
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
        onShowResume={() => { window.open('/KM_Full.pdf', '_blank'); setShowResume(true); }}
      />

      {started && (
        <button className="main-menu-btn" onClick={() => setStarted(false)} title="Menu">☰</button>
      )}

      {started && (
        <button 
          className="settings-btn" 
          onClick={() => setShowSettings(!showSettings)} 
          title="Settings"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            color: '#fff',
            fontSize: '24px',
            cursor: 'pointer',
            zIndex: 101,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
            e.target.style.border = '2px solid rgba(255, 255, 255, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.1)';
            e.target.style.border = '2px solid rgba(255, 255, 255, 0.3)';
          }}
        >⚙</button>
      )}

      {isFPP && (
        <>
          <button className="fpp-exit-btn" onClick={() => setIsFPP(false)} title="Exit First-Person">Exit FPP</button>

          <div className="hud" style={{ display: isFPP ? 'flex' : 'none' }}>
            <div className="speedometer">
              <div className="speed-value" ref={hudSpeedDomRef}>0 km/h</div>
              <div className="speed-label">Speed</div>
            </div>
            <div className="steering-wheel" ref={hudWheelDomRef} style={{ transform: `rotate(${steerAngle}deg)` }}>
              <div className="wheel-inner" />
            </div>
          </div>
        </>
      )}

      {/* Retro CD Music Player - Always Visible */}
      <div className="cd-player" style={{
        position: 'absolute',
        top: '100px',
        left: '20px',
        width: 'auto',
        minWidth: '120px',
        borderRadius: '8px',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}>
        {/* CD Disc - Perfect Circle */}
        <div 
          onClick={() => {
            setShowSongList(!showSongList);
          }}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #ffd700, #ffed4e, #ffa500, #d4a017)',
            border: '2px solid #333',
            boxShadow: '0 0 10px rgba(255, 215, 0, 0.4), inset -2px -2px 5px rgba(0, 0, 0, 0.4)',
            position: 'relative',
            animation: isAudioPlaying ? 'spin 3s linear infinite' : 'none',
            flexShrink: 0,
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}>
          {/* Center hole */}
          <div style={{
            position: 'absolute',
            width: '14px',
            height: '14px',
            background: '#333',
            borderRadius: '50%',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            border: '1px solid #666'
          }} />
        </div>
        {/* Player Label */}
        <div style={{
          color: '#ffe100',
          fontSize: '11px',
          fontWeight: 'bold',
          fontFamily: 'monospace',
          letterSpacing: '1px',
          textShadow: '0 0 5px rgb(238, 255, 0)',
          whiteSpace: 'nowrap'
        }}>
          {showSongList ? 'SONGS' : 'MUSIC'}
        </div>

        {/* Song List Dropdown */}
        {showSongList && (
          <div style={{
            marginTop: '8px',
            background: 'rgba(0, 0, 0, 0.8)',
            border: '2px solid #ffe100',
            borderRadius: '6px',
            padding: '8px',
            minWidth: '200px',
            maxHeight: '300px',
            overflowY: 'auto',
            boxShadow: '0 0 15px rgba(255, 225, 0, 0.3)'
          }}>
            {songs.map((song) => (
              <div
                key={song.id}
                onClick={() => {
                  handlePlaySong(song);
                }}
                style={{
                  padding: '8px 10px',
                  color: currentSong?.id === song.id ? '#00ff00' : '#ffe100',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255, 225, 0, 0.2)',
                  backgroundColor: currentSong?.id === song.id ? 'rgba(0, 255, 0, 0.1)' : 'transparent',
                  transition: 'all 0.2s ease',
                  textShadow: '0 0 5px currentColor'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'rgba(255, 225, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = currentSong?.id === song.id ? 'rgba(0, 255, 0, 0.1)' : 'transparent';
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{song.title}</div>
                <div style={{ fontSize: '10px', color: '#aaa' }}>{song.artist}</div>
              </div>
            ))}
          </div>
        )}

        {/* Currently Playing Song Display */}
        {currentSong && !showSongList && (
          <div style={{
            marginTop: '8px',
            color: '#00ff00',
            fontSize: '10px',
            fontFamily: 'monospace',
            textAlign: 'center',
            textShadow: '0 0 5px rgba(0, 255, 0, 0.5)',
            maxWidth: '150px'
          }}>
            <div style={{ fontWeight: 'bold' }}>Playing:</div>
            <div style={{ marginBottom: '8px' }}>{currentSong.title}</div>
            <button
              onClick={handlePlayPause}
              style={{
                background: '#00ff00',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '11px',
                transition: 'all 0.2s ease',
                boxShadow: '0 0 10px rgba(0, 255, 0, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.3)';
              }}
            >
              {isAudioPlaying ? '⏸ PAUSE' : '▶ PLAY'}
            </button>
          </div>
        )}

        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          onEnded={() => {
            setIsAudioPlaying(false);
          }}
        />
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {showSettings && (
        <div 
          className="settings-modal" 
          onClick={() => setShowSettings(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            backdropFilter: 'blur(5px)'
          }}
        >
          <div 
            className="settings-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: '16px',
              padding: '30px',
              width: '90%',
              maxWidth: '400px',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
              color: '#fff',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', textAlign: 'center', color: '#7ff7a2' }}>
              Settings
            </h2>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', color: '#ccc' }}>
                Texture Quality
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['low', 'medium', 'high'].map((quality) => (
                  <button
                    key={quality}
                    onClick={() => {
                      setTextureQuality(quality);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      border: '2px solid',
                      borderColor: textureQuality === quality ? '#7ff7a2' : 'rgba(255, 255, 255, 0.2)',
                      background: textureQuality === quality ? 'rgba(127, 247, 162, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      color: textureQuality === quality ? '#7ff7a2' : '#ccc',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      textTransform: 'capitalize',
                      transition: 'all 0.3s ease',
                      fontSize: '13px'
                    }}
                    onMouseEnter={(e) => {
                      if (textureQuality !== quality) {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                        e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (textureQuality !== quality) {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                      }
                    }}
                  >
                    {quality.charAt(0).toUpperCase() + quality.slice(1)}
                  </button>
                ))}
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#999' }}>
                Lower quality improves performance
              </p>
            </div>

            <div style={{ 
              marginBottom: '20px', 
              padding: '12px', 
              background: 'rgba(127, 247, 162, 0.1)', 
              borderRadius: '8px',
              border: '1px solid rgba(127, 247, 162, 0.3)',
              fontSize: '13px',
              color: '#b3e5b3'
            }}>
              <strong>Current Quality:</strong> {textureQuality.toUpperCase()}
            </div>

            <button
              onClick={() => setShowSettings(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(127, 247, 162, 0.15)',
                border: '2px solid #7ff7a2',
                color: '#7ff7a2',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(127, 247, 162, 0.25)';
                e.target.style.boxShadow = '0 0 12px rgba(127, 247, 162, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(127, 247, 162, 0.15)';
                e.target.style.boxShadow = 'none';
              }}
            >
              Close
            </button>
          </div>
        </div>
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
                  {isEditingLicense ? <button className="btn primary" onClick={()=>{handleSaveLicense()}}>Save</button> : <button className="btn" onClick={()=>setIsEditingLicense(true)}>Edit</button>}
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