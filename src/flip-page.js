
import * as THREE from 'three'; 
import {mergeGeometries} from "three/addons/utils/BufferGeometryUtils.js"; //not available in CJS 
import * as MODIFIERS from "three.modifiers";

// import {
//     ModifierStack,
//     Bend,
//     Twist,
//     ModConstant
//   } from "three.modifiers";


const flipXUV = geo => {

    var uvAttribute = geo.attributes.uv;
		
    for ( var i = 0; i < uvAttribute.count; i ++ ) {
            
        var u = uvAttribute.getX( i );
        var v = uvAttribute.getY( i ); 
                
        uvAttribute.setXY( i, 1-u, v );
            
    }

    return geo;
}

const WHITEPAGE = new THREE.MeshStandardMaterial({ color: "white" });

/**
 * A plane that acts as a paper page that can be flipped.
 */
export class FlipPage extends THREE.Mesh
{
    constructor( subdivisions = 10 ) 
    {
        super();

        let plane = new THREE.Mesh(
            mergeGeometries(
              [
                flipXUV( new THREE.PlaneGeometry(1, 1,subdivisions,subdivisions) ),
                flipXUV( new THREE.PlaneGeometry(1, 1,subdivisions,subdivisions).rotateY(Math.PI))
              ],
              true // allow groups
            ),
            [
                WHITEPAGE,
                WHITEPAGE
            ]
          );

          plane.castShadow = true; //default is false
          plane.receiveShadow = true;


        //-----------------------------------------------
        plane.rotateX(Math.PI/2);
        plane.position.x = .5; 
        this.scale.z = -1;
        this.add(plane);

        //---
        const modifier = new MODIFIERS.ModifierStack(plane);
        const bend = new MODIFIERS.Bend(0, 0, 0);
              bend.constraint = MODIFIERS.ModConstant.LEFT;  
              modifier.addModifier(bend); 

        const twist = new MODIFIERS.Twist(0);
            twist.vector = new THREE.Vector3(1, 0, 0);
            twist.center = new THREE.Vector3(-.5, 0, 0);
            
        
        this.twist = twist;

        
        modifier.addModifier(twist); 

        this.modifiers = modifier;
        this.bend = bend;
        //---
    } 

    /**
     * 
     * @param {THREE.Material} newMaterial - Material for this side of the page
     * @param {Number} index - Side of the page 1=FRONT 0=BACK
     */
    setPageMaterial(newMaterial, index) {
        this.children[0] .material[index] = newMaterial;
    }

    /**
     * Flip a page, 0 = the page is flat on one of its sides, and 1 on the other. 0.5 is the middle, the page is perpendicular to the ground.
     * @param {Number} progress from 0 to 1
     * @param {Number} direction 1: left to right. -1: right to left.
     */
    flip( progress , direction ) 
    { 
        this.rotation.z = Math.PI * progress;

        this.bend.force = Math.min( -Math.sin( this.rotation.z ) / 2, -0.0001) * direction ;  
        this.twist.angle = Math.sin( this.rotation.z ) / 10;
         
        this.modifiers.apply();   
    }

    dispose(){
        
    }
}
