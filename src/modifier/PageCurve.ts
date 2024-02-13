import { ModConstant, UserDefined } from "three.modifiers";
import { VertexProxy } from "three.modifiers/src/core/VertexProxy";


/**
 * Modifier to deform in the same way as the pages of a book
 */
export class PageCurve extends UserDefined { 

    /**
     * strength of the deformation effect
     */
    intensity = 1;

    /** 
     * @param elevationAxis Axis to use as elevation dimension
     * @param alongAxis Axis to use as the "plane" (perpendicular to elevation ideally)
     * @param effectRange from 0 to 1, along the "along axis" what portion wil be subjected to this effect. 
     * @param effectMid from 0 to 1, at what point we stop climbing up and start going down again?
     * @param elevationHeight how "high" we elevate the vertices along the elevationAxis?
     */
    constructor( public elevationAxis:number = ModConstant.Y, public alongAxis:number = ModConstant.X, public effectRange:number = 0.5, public effectMid:number = 0.5, public elevationHeight:number= 0.5 ) {
        super(); 
        this.renderVector = this._renderVector;
      }

    private _renderVector( vec: VertexProxy, i: number, l: number) {

        let radio = vec.getRatio(this.alongAxis);
        let val = vec.getValue(this.elevationAxis);
    
        if( radio<=this.effectRange )
        {
            radio /= this.effectRange; // da uno nuevo de 0 a 1
    
            let elevation = 0;
    
            if( radio<this.effectMid )
            {
                radio = radio / this.effectMid;
    
                //loma
                elevation = Math.sqrt( 1 - Math.pow(radio,2) + radio*2 - 1 ); //numero de 0 a 1
                
            }
            else 
            {
                radio = (radio-this.effectMid) / (1-this.effectMid);
                 
                //S curve 
                elevation = (Math.cos( radio * Math.PI )-(-1)) / (1-(-1));//numero de 0 a 1
            }
    
            vec.setValue(this.elevationAxis, val + elevation * this.elevationHeight * this.intensity); 
        }
    }
}