# Quick FlipBook
[![npm version](https://badge.fury.io/js/quick_flipbook.svg)](https://www.npmjs.com/package/quick_flipbook)


![Logo](./demo.gif)


A quick way to create a flipbook in [three.js](https://github.com/mrdoob/three.js/) 

## Install
```bash
npm install quick_flipbook
```

## Usage
```js
//...
import { Book } from 'quick_flipbook'; 
//...
const book = new Book({
    flipDuration: .5, // in seconds. Time it takes to flip ONE PAGE.
    yBetweenPages:.001, // y space between stacked pages
    pageSubdivisions: 20 //page's plane subdivisions
}); 

book.scale.x = 0.8; // Book starts as as 1x1 square. Change this to the correct ratio for your desire page size.

scene.add(book);
 
book.setPages([
    "https://placehold.co/600x400?text=Cover+page", 
    "https://placehold.co/600x400?text=Backside+of+cover",  
    null, //blank page
    null, //blank page
    "https://placehold.co/600x400?text=last+page",    
    "https://placehold.co/600x400?text=Back+side", 
]); 
``` 

## Controls

### --> book.setPages(pagesSources)
You pass in an array of either:
1. **null** = for blank pages
2. **"a string"** = url to some image external or internal. `THREE.TextureLoader` will be used to load it.
3. a `THREE.Material`

### --> book.flipPage( page_reference );
Takes a reference to a `FlipPage` object and makes the book animate towards that page, flipping as many pages as necesary to make sure the book shows that page.

<details>
  <summary>Same code</summary>

```js
function onMouseClick(event) {
     
    const   mouse = new THREE.Vector2();
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
    // Raycasting to check for intersections with the mesh
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
   
    // Array to store intersected objects
    const intersects = raycaster.intersectObjects(scene.children); 
     
    // find where the page is based on your usecase, in this case...
    if( intersects.length )
        book.flipPage(intersects[0].object.parent); //parent is a FlipPage object
  }
```
</details>

### --> book.animate(delta);
This should be called on your animation thick handler, so let the book animate itself (the page flipping...) it expects a delta value as parameter.

<details>
  <summary>Same code</summary>

```js 
const clock = new THREE.Clock();

function animate() {
	requestAnimationFrame( animate );

    book.animate(clock.getDelta());  
}

animate();
```
</details>

