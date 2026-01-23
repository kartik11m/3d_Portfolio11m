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

  // HUD DOM refs and in-car display ref
  const hudSpeedDomRef = useRef(null);
  const hudWheelDomRef = useRef(null);
  const carDisplayRef = useRef(null);
  // Steering angle state and ref (used for HUD steering wheel)
  const steerRef = useRef(0);
  const [steerAngle, setSteerAngle] = useState(0);

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
    scene.background = new THREE.Color('#87ceeb');
    scene.fog = new THREE.Fog('#87ceeb', 20, 100);

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
    sunLight.castShadow = true;
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    const SEG_LEN = 200;
    const HALF = SEG_LEN / 2;

    const textureLoader = new THREE.TextureLoader();

    const terrainColor = textureLoader.load('/textures/Grass/Grass001_4K-JPG_Color.jpg');
    const terrainNormal = textureLoader.load('/textures/Grass/Grass001_4K-JPG_NormalGL.jpg');
    const terrainRoughness = textureLoader.load('/textures/Grass/Grass001_4K-JPG_Roughness.jpg');
    const terrainAO = textureLoader.load('/textures/Grass/Grass001_4K-JPG_AmbientOcclusion.jpg');

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
        // Use alphaTest (discard fragments) and write depth so other
        // transparent objects (like tree leaves) depth-test correctly.
        transparent: false,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
        depthWrite: true,
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
        // sample left-side x and ensure it stays left of the road
        let x = -10 + (Math.random() - 0.5) * 40;
        while (x > -4.6) { // push until it's safely left of the road
          x = -10 + (Math.random() - 0.5) * 40;
        }
        const z = (Math.random() - 0.5) * SEG_LEN;
        dummy.position.set(x, -0.8, z);
        dummy.rotation.y = Math.random() * Math.PI;
        const s = 0.7 + Math.random() * 0.6;
        dummy.scale.set(s * 0.5 + Math.random() * 0.15, s * 0.9, s * 0.5 + Math.random() * 0.15);
        dummy.updateMatrix();
        grassLeft.setMatrixAt(i, dummy.matrix);
      }
      for (let i = 0; i < bladesPerSide; i++) {
        // sample right-side x and ensure it stays right of the road
        let x = 10 + (Math.random() - 0.5) * 40;
        while (x < 4.6) { // push until it's safely right of the road
          x = 10 + (Math.random() - 0.5) * 40;
        }
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

      // Create wind shader material for grass model
      const windShaderMaterial = new THREE.MeshStandardMaterial({
        // Use the grass textures so model clones correctly alpha-test
        map: grassColor,
        normalMap: grassNormal,
        roughnessMap: grassRoughness,
        aoMap: grassAO,
        color: '#8fbc8f',
        roughness: 0.6,
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

            if (Math.random() > 0.55) {
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
              group.add(grass);
            }
          }
        }
      });

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

      // Load and add white flowers
      const flowerGroup = new THREE.Group();
      const whiteFlowerLoader = new GLTFLoader();
      const sunflowerLoader = new GLTFLoader();
      
      // Create wind shader for flowers
      const flowerWindMaterial = new THREE.MeshStandardMaterial({
        roughness: 0.8,
        metalness: 0.0
      });

      const attachFlowerWindShader = (material) => {
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
             float wind = sin(uTime + position.z * 1.5 + position.x * 0.3) * 0.08;
             transformed.x += wind * (transformed.y * 0.5);
             transformed.z += sin(uTime * 0.5 + position.x) * 0.04 * transformed.y;`
          );
          material.userData.shader = shader;
        };
      };
      
      whiteFlowerLoader.load('/models/white_flower.glb', (gltf) => {
        const whiteFlowerModel = gltf.scene.children[0] || gltf.scene;
        whiteFlowerModel.scale.set(0.02, 0.02, 0.02);
        whiteFlowerModel.updateMatrixWorld(true);
        
        sunflowerLoader.load('/models/sunflower.glb', (sunGltf) => {
          const sunflowerModel = sunGltf.scene.children[0] || sunGltf.scene;
          sunflowerModel.scale.set(0.008, 0.008, 0.008);
          sunflowerModel.updateMatrixWorld(true);
          
          // Scatter white flowers and sunflowers throughout the grass area
          for (let i = -HALF; i < HALF; i += 5) {
            // Randomly place flowers on both sides
            for (let side = -1; side <= 1; side += 2) {
              // Left side or right side
              for (let j = 0; j < 3; j++) {
                if (Math.random() > 0.5) { // 50% chance to place a flower
                  const x = side * (4 + Math.random() * 15);
                  const z = i + (Math.random() - 0.5) * 8;
                  
                  // Randomly choose between white flower and sunflower
                  const flowerType = Math.random() > 0.5 ? whiteFlowerModel : sunflowerModel;
                  const flower = flowerType.clone(true);
                  
                  flower.position.set(x, -1.2, z);
                  flower.rotation.z = Math.random()* Math.PI * 2;
                  
                  flower.traverse((obj) => {
                    if (obj.isMesh) {
                      obj.castShadow = true;
                      obj.receiveShadow = true;
                      
                      // Apply wind shader to flower materials
                      const matClone = flowerWindMaterial.clone();
                      matClone.map = obj.material.map;
                      matClone.color.copy(obj.material.color);
                      attachFlowerWindShader(matClone);
                      matClone.needsUpdate = true;
                      obj.material = matClone;
                    }
                  });
                  
                  flowerGroup.add(flower);
                }
              }
            }
          }
        });
      });
      
      group.add(flowerGroup);
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
      displayObj.position.set(0, 0, 0);
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
    const createLeafParticles = () => {
      const leafGeometry = new THREE.BufferGeometry();
      const leafCount = 4000;  // Increased from 200
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

    const leafParticles = createLeafParticles();

    const clock = new THREE.Clock();

    const animate = () => {
      requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

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