# Quick FlipBook
[![npm version](https://img.shields.io/npm/v/quick_flipbook.svg?logo=threedotjs)](https://www.npmjs.com/package/quick_flipbook)

![Logo](./demo.gif)


A quick way to create a flipbook in [three.js](https://github.com/mrdoob/three.js/) 

## Install
```bash
npm install quick_flipbook
```

## Usage
```js
//...
import { FlipBook } from 'quick_flipbook'; 
//...
const book = new FlipBook({
    flipDuration: .5, // in seconds. Time it takes to flip ONE PAGE.
    yBetweenPages:.001, // y space between stacked pages
    pageSubdivisions: 20 //page's plane subdivisions
}); 

book.scale.x = 0.8; // Book starts as as 1x1 square. Change this to the correct ratio for your desire page size.

scene.add(book);
 
book.setPages([
    "https://placehold.co/600x400?text=Cover+page", 
    "https://placehold.co/600x400?text=Backside+of+cover",  
    "", //blank page
    "", //blank page
    "https://placehold.co/600x400?text=last+page",    
    "https://placehold.co/600x400?text=Back+side", 
]); 
``` 

## Controls

### --> `book.setPages( Source[] )`
Sets the source of each page of the book. An **array of**...

Source | Description
---|---
"" | An empty string will be interpreted as a blank page
`null` | same as above but in this case `null`
`string` | A string will internally be loaded using [`THREE.TextureLoader`](https://threejs.org/docs/#api/en/loaders/TextureLoader)
`THREE.Texture` | A texture will be put in the `map` of the internal `THREE.MeshStandardMaterial` of the page
`THREE.Material` | Will use this material instead of the internal `THREE.MeshStandardMaterial` we use. **Note:** We are putting a shadow on our internal material as an AO map, to simulate lack of light near the edge of the page. If you use your own material it won't have this decorative effects...

### --> `book.flipPage( page_reference )`
Takes a reference to a `FlipPage` object and makes the book animate towards that page, flipping as many pages as necesary to make sure the book shows that page. The original idea of this method was to be used as in this example below:

<details>
  <summary>Sample code</summary>

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

### --> `book.nextPage()` & `book.previousPage()`
Flip a page of the book forward or backwards by one page.

### --> `book.animate(delta)`
This should be called on your animation thick handler, so let the book animate itself (the page flipping...) it expects a delta value as parameter.

<details>
  <summary>Sample code</summary>

```js 
const clock = new THREE.Clock();

function animate() {
	requestAnimationFrame( animate );

    book.animate(clock.getDelta());  
}

animate();
```
</details>

### --> `book.progress = <Number>`
You can manually set the progress from this flipbook ( _in case you want to animate it yourself_ ). The number should go from 0 to total pages (as in sheet of paper) (1 page has 2 faces) and the decimal portion will be the progress of the page at the whole number index. ( 1.5 will be page at index 1 will have %50 of the flip )
<details>
  <summary>Sample code</summary>

```js 
book.progress = 1.5; // the paper at index 1, flipped %50 toward it's back side. (the backpage)
```
</details>

### --> `book.totalPages`
the total number of pages of the book. **Do not confuse with sheets of paper** 2 pages = 1 paper mesh (a sheet)

### --> `book.dispose()`
Will dispose all the geometries from the pages and dispose all the materials used. **Remove it from the scene after calling this.**

## Deformations / Page bending

The book uses [three.modifiers](https://github.com/drawcall/threejs-mesh-modifiers) to bend the plane of the pages. 

1. [Bend](https://github.com/drawcall/threejs-mesh-modifiers/blob/master/src/modifiers/Bend.ts)
2. [Twist](https://github.com/drawcall/threejs-mesh-modifiers/blob/master/src/modifiers/Twist.ts)
3. custom [PageCurve](https://github.com/bandinopla/quick_flipbook/tree/main/src/modifier/PageCurve.ts)

To access the relevant controllers for such deformations to tweak them do this:

```js
    //
    // for each FlipPage of the book...
    //
    for (const page of book) 
    {
        page.pageCurve; //<-- PageCurve 
        page.bend; //<--  Bend modifier
        page.twist; //<-- Twist modifier

        page.modifiers.apply(); // call this after modifying a deformation.
    }
```