import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/loaders/GLTFLoader.js';
import PositionAlongPathState from '../positionAlongPathTools/PositionAlongPathState.js';
import { handleScroll, updatePosition } from '../positionAlongPathTools/PositionAlongPathMethods.js';
import { loadCurveFromJSON } from '../curveTools/CurveMethods.js';

const loadingScreen = document.getElementById('loading-screen');
const loadingBar = document.querySelector('.loading-bar');

// Loading manager to track progress
const manager = new THREE.LoadingManager();
manager.onProgress = (url, itemsLoaded, itemsTotal) => {
  const progress = (itemsLoaded / itemsTotal) * 100;
  loadingBar.style.width = `${progress}%`;
};
manager.onLoad = () => {
  loadingScreen.style.opacity = 0;
  setTimeout(() => {
    loadingScreen.style.display = 'none';
  }, 500);
};

class Website3DDemo {
  constructor() {
    this._Initialize();
  }

  async _Initialize() {
    // Renderer setup
    this._threejs = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this._threejs.shadowMap.enabled = true;
  

   this._threejs.toneMapping = THREE.FilmicToneMapping;
   this._threejs.toneMappingExposure = 1.25; // Adjust for brightness

  this._threejs.outputEncoding = THREE.sRGBEncoding;

    this._threejs.setPixelRatio(window.devicePixelRatio);

   
    this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
    this._threejs.toneMapping = THREE.ACESFilmicToneMapping;
   


    const modelDiv = document.getElementById('model');
    modelDiv.appendChild(this._threejs.domElement);
    this._threejs.setSize(window.innerWidth, window.innerHeight);

    // Event listeners
    window.addEventListener('resize', () => this._OnWindowResize(), false);
    window.addEventListener('wheel', this._onMouseScroll.bind(this), false);
    this._SetupTouchScroll();

    // Scene setup
    this._scene = new THREE.Scene();

    // Load models
    await this._LoadModels();

    // Load curve path
    const curvePathJSON = './src/curvea3.json';
    this._curvePath = await loadCurveFromJSON(this._scene, curvePathJSON);

    // Camera setup
    this._SetupCamera();

    // Create a skysphere
    this._CreateSkysphere();

    // Lighting setup
    this._SetupLighting();

    // Create a clickable object
    await this._CreateClickableObject();

    // Position state
    this._positionAlongPathState = new PositionAlongPathState();

    // Start the render loop
    this._RAF();
  }

  async _LoadModels() {
    const loader = new GLTFLoader(manager);

    // Load rocks.gltf once and ensure it's not duplicated
    if (!this._rocks) {
      const gltf = await new Promise((resolve, reject) =>
        loader.load('./src/rocks.gltf', resolve, undefined, reject)
      );
      this._rocks = gltf.scene;
      this._scene.add(this._rocks);
    }
  }

  _SetupCamera() {
    // Create camera and set its initial position and orientation on the curve
    this._camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    // Set the camera's position at the start of the curve (t = 0)
    const startPoint = this._curvePath.curve.getPointAt(0);
    const nextPoint = this._curvePath.curve.getPointAt(0.01);

  //  this._camera.position.copy(startPoint);
   // this._camera.lookAt(nextPoint); // Ensure the camera is oriented along the curve
   // this._scene.add(this._camera);
   this._camera.position.copy(this._curvePath.curve.getPointAt(0));
    this._camera.lookAt(this._curvePath.curve.getPointAt(0.99));
    this._scene.add(this._camera);

  }

  _CreateSkysphere() {
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load('./src/sky3.png');
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
    const skysphere = new THREE.Mesh(geometry, material);
    this._scene.add(skysphere);
  }

  _SetupLighting() {
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    this._scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1).normalize();
    this._scene.add(directionalLight);
    const color = new THREE.Color().setHex( 0x112233 );
  }

  async _CreateClickableObject() {
    const loader = new GLTFLoader(manager);

    // Load click.gltf for the clickable object
    const gltf = await new Promise((resolve, reject) =>
      loader.load('./src/clickme.gltf', resolve, undefined, reject)
    );
    this._clickableObject = gltf.scene;
    this._clickableObject.scale.set(1, 1, 1); // Adjust size if needed
    this._clickableObject.position.set(0, 1, 0); // Adjust position if needed
    this._scene.add(this._clickableObject);

    // Click interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener('click', (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, this._camera);
      const intersects = raycaster.intersectObject(this._clickableObject, true); // Ensure only click.gltf is checked

      if (intersects.length > 0) {
        // Redirect to GitHub
        window.location.href = 'https://github.com/rmutairi/space';
      }
    });
  }

  _SetupTouchScroll() {
    let touchStartY = 0;

    window.addEventListener('touchstart', (event) => {
      if (event.touches.length === 1) {
        touchStartY = event.touches[0].clientY;
      }
    });

    window.addEventListener('touchmove', (event) => {
      if (event.touches.length === 1) {
        const touchMoveY = event.touches[0].clientY;
        const deltaY = touchStartY - touchMoveY;
        const scrollEvent = { deltaY }; // Mimic a wheel scroll event
        handleScroll(scrollEvent, this._positionAlongPathState);
        touchStartY = touchMoveY; // Update for continued touch scrolling
      }
    });
  }

  _onMouseScroll(event) {
    handleScroll(event, this._positionAlongPathState);
  }

  _OnWindowResize() {
    const modelDiv = document.getElementById('model');
    this._camera.aspect = modelDiv.offsetWidth / modelDiv.offsetHeight;
    this._camera.updateProjectionMatrix();
    this._threejs.setSize(modelDiv.offsetWidth, modelDiv.offsetHeight);
  }

  _RAF() {
    requestAnimationFrame(() => {
      updatePosition(this._curvePath, this._camera, this._positionAlongPathState);
      this._threejs.render(this._scene, this._camera);
      this._RAF();
    });
  }
}

let _APP = null;
window.addEventListener('DOMContentLoaded', () => {
  _APP = new Website3DDemo();
});
