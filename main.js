/***
 * Example of how to use...
 */

import * as THREE from 'three';
import { Book } from './src/book'; //<-- quick_flipbook
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

const width = window.innerWidth;
const height = window.innerHeight;

/**
 * @type {THREE.Vector3}
 */
let cameraPosition;

let zoom = 0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe0e0e0); 

const light = new THREE.DirectionalLight( 0xffffff, 4 );
 
light.position.set( .2, 1, 0 );
light.castShadow = true;
//Set up shadow properties for the light
light.shadow.mapSize.width = 512*4; // default
light.shadow.mapSize.height = 512*4; // default
light.shadow.camera.near = 0.5; // default
light.shadow.camera.far = 3; // default
light.shadow.bias = -0.02;

scene.add( light );
scene.add( new THREE.AmbientLight( 0xffffff) );
 

const MAXFOV = 40;
const camera = new THREE.PerspectiveCamera( 0, width / height, 0.1, 1000 ); 
camera.setFocalLength(MAXFOV);

const renderer = new THREE.WebGLRenderer();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize( width, height );
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild( renderer.domElement );
  
 


camera.position.x = 0; 
camera.position.y = 3; 
camera.position.z = 1; 
cameraPosition = camera.position.clone();

camera.lookAt(0,0,0);
//--------------------------------------------------------------------------------------------------------------

const postprocessing = {};
const composer = new EffectComposer( renderer );
const renderPass = new RenderPass( scene, camera );

composer.addPass( renderPass );

const bokehPass = new BokehPass( scene, camera, {
    focus: 10,
    aperture: 10* 0.00001, 
    maxblur: .008
} );
composer.addPass( bokehPass );

const outputPass = new OutputPass();
composer.addPass( outputPass );

//----------------
postprocessing.composer = composer;
postprocessing.bokeh = bokehPass;

//-----------------
 
const clock = new THREE.Clock();
 

const pmremGenerator = new THREE.PMREMGenerator( renderer );
	  pmremGenerator.compileEquirectangularShader();

  
const book = new Book({
    flipDuration: .5,
    yBetweenPages:.001
}); 

book.scale.x = 0.8;
scene.add(book);
 
book.setPages([
    "https://placehold.co/600x400?text=Cover+page", 
    "https://placehold.co/600x400?text=Backside+of+cover",  
    null, //blank page
    null, //blank page
    "https://placehold.co/600x400?text=last+page",    
    "https://placehold.co/600x400?text=Back+side", 
]); 
 
  
  

function onWindowResize() {

    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize( width, height );
    //postprocessing.composer( width, height );

    postprocessing.composer.setSize( width, height );

}

// Event listener for mouse click
function onMouseClick(event) {
    // Calculate mouse coordinates in normalized device space (-1 to 1)
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
    // Raycasting to check for intersections with the mesh
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
   
    // Array to store intersected objects
    const intersects = raycaster.intersectObjects(scene.children);
  
    // // Check if the mesh is clicked
    // if (intersects.length > 0 && intersects[0].object === cube) {
    //   console.log('Mesh clicked!');
    // }
     
    if( intersects.length )
        book.flipPage(intersects[0].object.parent); 
  }

function onMouseMove(event)
{
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1; 

    if( zoom>0 )
    { 
        cameraPosition.x = mouse.x/3;
        cameraPosition.z = 1 + -mouse.y/3; 
    } 
    
}
 

window.addEventListener( 'resize', onWindowResize );
renderer.domElement.addEventListener('click', onMouseClick);
renderer.domElement.addEventListener('mousemove', onMouseMove);
renderer.domElement.addEventListener('mousewheel', ev => 
{
    zoom += ev.deltaY<0? 1 : -1;  

    if( zoom <=0 )
    { 
        cameraPosition.x = 0;
        cameraPosition.z = 1; 
    }
    camera.setFocalLength(MAXFOV+zoom);
});
//--------------------------------------------------------------------------------------------------------------

let t = 0;
function animate() {
	requestAnimationFrame( animate );

    book.animate(clock.getDelta());
  

    postprocessing.composer.render( 0.1 );
    camera.position.add( cameraPosition.clone().sub(camera.position).divideScalar(5) )

}

animate();

//**************************************************************** */ 
