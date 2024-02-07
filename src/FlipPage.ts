import * as THREE from 'three'; 
//import {mergeGeometries} from "three/addons/utils/BufferGeometryUtils.js"; //not available in CJS 
import {mergeGeometries} from "three/examples/jsm/utils/BufferGeometryUtils.js";
import * as MODIFIERS from "three.modifiers";

const flipXUV = (geo:THREE.PlaneGeometry) => {

    var uvAttribute = geo.attributes.uv;
		
    for ( var i = 0; i < uvAttribute.count; i ++ ) {
            
        var u = uvAttribute.getX( i );
        var v = uvAttribute.getY( i ); 
                
        uvAttribute.setXY( i, 1-u, v );
            
    }

    return geo;
}


const NOTEXTURE = new THREE.MeshStandardMaterial({ color: "#ff00ff" });


/**
 * This object represents a page. A page has 2 sides.
 */
export class FlipPage extends THREE.Mesh { 

    private readonly modifiers:MODIFIERS.ModifierStack;
    private readonly bend: MODIFIERS.Bend;
    private readonly twist:MODIFIERS.Twist;
    private readonly page:THREE.Mesh;

    constructor( subdivisions:number=10 ) {
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
                NOTEXTURE,
                NOTEXTURE
            ]
          ); 

        plane.castShadow    = true; 
        plane.receiveShadow = true;

        plane.rotateX(Math.PI/2);
        plane.position.x = .5; 
        this.scale.z = -1;
        this.add(plane);
        this.page = plane; 
        

        this.modifiers = new MODIFIERS.ModifierStack(plane);

        this.bend = new MODIFIERS.Bend(0, 0, 0);
        this.bend.constraint = MODIFIERS.ModConstant.LEFT;  

        this.twist = new MODIFIERS.Twist(0);
        this.twist.vector = new MODIFIERS.Vector3(1, 0, 0);
        this.twist.center = new MODIFIERS.Vector3(-0.5, 0, 0);

        this.modifiers.addModifier(this.bend);
        this.modifiers.addModifier(this.twist);  
    }

    /**
     * Sets the material for a page's face.
     * @param newMaterial New material for this page's face.
     * @param index 0 or 1
     */
    public setPageMaterial( newMaterial:THREE.Material, index:number ):void { 
        this.page.material[index] = newMaterial;  
    }

    /**
     * Sets the internal progress of the flip of this page. 0 = no flip. 1 = fully flipped to the otehr side.
     * @param progress a number from 0 to 1
     * @param direction either -1 or 1 to know to which side we are flipping (this is used to invert the bending of the page to the correct side on flip)
     */
    public flip( progress:number, direction:number )
    {
        this.rotation.z = Math.PI * progress;

        this.bend.force = Math.min( -Math.sin( this.rotation.z ) / 2, -0.0001) * direction ;  
        this.twist.angle = Math.sin( this.rotation.z ) / 10;
         
        this.modifiers.apply();  
    }

    /**
     * call dispose on the material of this face.
     */
    private disposeMaterial( faceIndex:number )
    {
        const material:THREE.Material = this.page.material[faceIndex];

        if( material!==NOTEXTURE )
        {
            material.dispose();
        } 
    }

    /**
     * Just sets all materials to "no texture"
     */
    public reset() {
        this.setPageMaterial(NOTEXTURE,0);
        this.setPageMaterial(NOTEXTURE,1);
    }

    public dispose( materialToo:boolean=false ){ 
        if( materialToo )
        {
            this.disposeMaterial(0);
            this.disposeMaterial(1);
        }

        this.page.geometry.dispose();
        this.modifiers.destroy();
    }

}