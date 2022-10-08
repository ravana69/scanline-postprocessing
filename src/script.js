import * as THREE from "https://cdn.skypack.dev/three@0.136.0";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/controls/OrbitControls.js";
import { FBXLoader } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/loaders/FBXLoader.js";

import { EffectComposer } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/postprocessing/ShaderPass.js';
import { PixelShader } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/shaders/PixelShader.js';

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 20, 15);

var renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener("resize", event => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  pixelPass.uniforms[ 'resolution' ].value.set( innerWidth, innerHeight ).multiplyScalar( devicePixelRatio );
})

var controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 10, 0);
controls.update();

var light = new THREE.DirectionalLight(0xffffff, 0.5);
light.position.setScalar(1);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

// model
var plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
var helper = new THREE.PlaneHelper(plane, 20, 0xff0000);
//scene.add(helper);
var uniforms = {
  plane: {
    value: new THREE.Vector4(
      plane.normal.x,
      plane.normal.y,
      plane.normal.z,
      plane.constant
    )
  }
};
var loader = new FBXLoader();
loader.load(
  "https://threejs.org/examples/models/fbx/Samba Dancing.fbx",
  function (object) {
    object.traverse(function (child) {
      if (child.isMesh) {
        let mat = child.material;
        mat.onBeforeCompile = (shader) => {
          shader.uniforms.scanPlane = uniforms.plane;
          shader.vertexShader = `
        varying vec3 vWPos;
        ${shader.vertexShader}
`;
          shader.vertexShader = shader.vertexShader.replace(
            `#include <worldpos_vertex>`,
            `
          vec4 worldPosition = modelMatrix * vec4( transformed, 1.0 );
        	vWPos = worldPosition.xyz;
`
          );
          console.log(shader.fragmentShader);
          shader.fragmentShader = `
        uniform vec4 scanPlane;
        varying vec3 vWPos;
        ${shader.fragmentShader}
`;
          shader.fragmentShader = shader.fragmentShader.replace(
            `#include <dithering_fragment>`,
            `#include <dithering_fragment>

      float scanline = smoothstep(0.5, 0., abs(scanPlane.w - dot( vWPos, scanPlane.xyz )));
      gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1, 0.125, 0.25), scanline);
`
          );
        };
      }
    });
    object.scale.setScalar(0.1);
    scene.add(object);
  }
);

// postprocess
let composer = new EffectComposer( renderer );
composer.addPass( new RenderPass( scene, camera ) );

let pixelPass = new ShaderPass( PixelShader );
pixelPass.uniforms[ 'resolution' ].value = new THREE.Vector2( innerWidth, innerHeight );
pixelPass.uniforms[ 'resolution' ].value.multiplyScalar( devicePixelRatio );
pixelPass.uniforms[ 'pixelSize' ].value = 8;
composer.addPass( pixelPass );
//

var clock = new THREE.Clock();

var pn = new THREE.Vector3(); //plane normal
var pcp = new THREE.Vector3(); // plane co-planar point

var animate = function () {
  requestAnimationFrame(animate);
  let t = clock.getElapsedTime();
  pcp.y = Math.sin(t * 0.25) * 9 + 9;
  pn.setFromSphericalCoords(1, Math.sin(t * 0.314) * Math.PI, Math.cos(t * 0.27) * Math.PI * 2);
  plane.setFromNormalAndCoplanarPoint(pn, pcp);
  uniforms.plane.value.set(plane.normal.x, plane.normal.y, plane.normal.z, -plane.constant);
  composer.render();
  //renderer.render(scene, camera);
};

animate();
