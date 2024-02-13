/***
 * Example of how to use...
 */

import * as THREE from 'three'; 
import { FlipBook as Book } from './src/FlipBook';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
const width = window.innerWidth;
const height = window.innerHeight;

/**
 * @type {THREE.Vector3}
 */
let cameraPosition;

let zoom = 0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x999999); 

const light = new THREE.DirectionalLight( 0xffffff,1 );
 
light.position.set( .2, 1, 0 );
light.castShadow = true;
//Set up shadow properties for the light
light.shadow.mapSize.width = 512*8; // default
light.shadow.mapSize.height = 512*8; // default
light.shadow.camera.near = 0.5; // default
light.shadow.camera.far = 3; // default
light.shadow.bias = -0.003;
light.shadow.blurSamples=3;

scene.add( light );
const ambientLight = new THREE.AmbientLight( 0xffffff, 2);
scene.add( ambientLight );
 

const MAXFOV = 40;
const camera = new THREE.PerspectiveCamera( 0, width / height, 0.1, 1000 ); 
camera.setFocalLength(MAXFOV);

const renderer = new THREE.WebGLRenderer();
 renderer.shadowMap.enabled = true;
 renderer.shadowMap.type = THREE.PCFSoftShadowMap;
 renderer.setSize( width, height );
// //renderer.toneMapping = THREE.ACESFilmicToneMapping;
 renderer.toneMapping = THREE.NoToneMapping;
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
    "/page1.ignore.png", 
    "/loremipsum.ignore.png",
    "/page2.ignore.png", 
    "/page3.ignore.png", 
    "/page4.ignore.png",   
    "/page5.ignore.png",   
]); 
  
// setTimeout( ()=>{

//     book.setPages([
//         "https://placehold.co/600x400?text=Test1", 
//         "https://placehold.co/600x400?text=Hello+World",  
//         null, //blank page 
//         null
//     ]); 
    
//     // book.dispose();

//     //book.progress = 1.5;

// }, 3000 );
  

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

const panel = new GUI( { width: 310 } );
const folder1 = panel.addFolder( 'Page deformation' );
const folder2 = panel.addFolder( 'Book' );
const folder3 = panel.addFolder( 'Scene' );

const effects = {
    heightIntensity: 0.054,
    curveEffectRange: 0.735,
    midEffect:0.325,
    intensity:1
} 

folder1.add( effects, 'heightIntensity', 0, 3 ).onChange( value => {
    for (const page of book) {
        page.pageCurve.elevationHeight = value;
        page.modifiers.apply();
    }
});

folder1.add( effects, 'curveEffectRange', 0, 1 ).onChange( value => {
    for (const page of book) {
        page.pageCurve.effectRange = value;
        page.modifiers.apply();
    }
});

folder1.add( effects, 'midEffect', 0, 1 ).onChange( value => {
    for (const page of book) {
        page.pageCurve.effectMid = value;
        page.modifiers.apply();
    }
});

folder1.add( effects, 'intensity', 0, 1 ).onChange( value => {
    for (const page of book) {
        page.pageCurve.intensity = value;
        page.modifiers.apply();
    }
});

folder2.add( { progress:0 }, 'progress', 0, book.totalPages/2 ).onChange( value => {
    book.progress = value ;
});

folder3.add( ambientLight, 'intensity', 0, 5 ) ;

