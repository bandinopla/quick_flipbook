import * as THREE from 'three';
import { FlipPage } from './FlipPage';

export type FlipBookConfig = {
    /**
     * Duration of the flip animation in seconds
     */
    flipDuration:number,

    /**
     * vertical spece between the stacked pages
     */
    yBetweenPages:number,

    /**
     * How much to subdivide the page's plane 
     */
    pageSubdivisions:number
}

type PageSource = String|THREE.Material|null;

const AOTexture = (function() {
 

    var texture : THREE.Texture;

    return ()=>{

        if(!texture) 
        { 
            const canvas = document.createElement('canvas');
            canvas.width = 256; // Width of the canvas
            canvas.height = 256; // Height of the canvas

            // Get the 2D context of the canvas
            const ctx = canvas.getContext('2d');

            // Create a gradient
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
            gradient.addColorStop(0, 'black'); // Start color (red)
            gradient.addColorStop(0.1, 'white'); // End color (blue)

            // Fill the canvas with the gradient
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            texture = new THREE.CanvasTexture(canvas);

            canvas.remove(); 
        }

        return texture;

    }
})();


export class FlipBook extends THREE.Mesh implements Iterable<FlipPage>
{
    /**
     * Sheets of paper (each FlipPage holds 2 "pages")
     */
    private pages:FlipPage[];
    private pool:FlipPage[]; 
    private readonly _url2Loader:Map<string, Promise<THREE.Material>>;
    private readonly _pageSubdivisions:number;
    private _currentProgress:number;
    private _goalProgress:number;
    private _currentPage:number;
    private readonly _flipDuration:number;
    private _stepSize:number;
    private _flipDirection:number;
    private readonly _ySpacing:number;

    constructor( config:FlipBookConfig|null ) {
        super();
        this.pages = [];
        this.pool = [];
        this._url2Loader = new Map<string, Promise<THREE.Material>>();
        this._currentProgress = 0;
        this._flipDuration = config?.flipDuration || 1; // 1 second
        this._ySpacing = config?.yBetweenPages || 0.001;
        this._pageSubdivisions = config?.pageSubdivisions || 20;
        this.currentPage = 0; 
    }

    [Symbol.iterator](): Iterator<FlipPage> {
        let index = 0;
         
        return {
             
            next: (): IteratorResult<FlipPage> => {
                if (index < this.pages.length) {
                    return { value: this.pages[index++], done: false };
                } else {
                    return { value: null as any, done: true };
                }
            }
        };
    }

    /** 
     * Initialize the book. Pass in the URLs to the images to use for each page.
     * The order in which they will be loaded is one page (2 images per page) at a time.
     * After one page is loaded, the next will start loading. While one page is loading the rest are in perpetual inactive state (nothing loading) 
      
     * @param pagesSources Array with the "source" to use as the page texture, either a material or a url to load an image from.
     */
    setPages( pagesSources: PageSource[] ) 
    {     
        if( pagesSources.length%2 !== 0 )
        {
            //throw new RangeError(`The number of pages should be divisible by 2 (because one page has 2 faces). You called setPages with ${pagesSources.length} sources.`);
            pagesSources.push(""); // an empty page
        }  

        // remove old pages
        while(this.pages.length)
        {
            let page = this.pages.pop()!;
            page.reset();
            this.pool.push( page );
            this.remove(page); 
        }

        /**
         * @type {Promise}
         */
        let prom:Promise<any> = Promise.resolve();

        for ( let i = 0; i < pagesSources.length; i+=2 ) 
        {
            const urlA = pagesSources[i];
            const urlB = pagesSources[i+1];
            let page    = this.pool.pop();  

            if( !page )
            {
                page = new FlipPage( this._pageSubdivisions );
            }
            
            this.add(page);  

            page.position.y = -this._ySpacing * this.pages.length;
            this.pages.push(page);
            page.name = `Page#${this.pages.length}`
            
            //
            // load one "Page" at a time...
            //
            prom = prom.then( this.loadPages(urlA,urlB, page) ); 
        } 
  

        //
        // if this happens it means that `setPages` was called with LESS pages than last time.
        //
        if( this.currentPage>this.pages.length*2-1 )
        {
            this._currentPage = this.pages.length*2-1; //<--- last page
            this._currentProgress = this.pages.length; //<--- all pages are flipped (looking at the last page)
        }

        //
        // send all pages to the current progress
        //
        this.flipPages(); 
    }

    /**
     * Returns the total number of pages.
     * **Do not confuse with the number of sheets of paper**
     */
    get totalPages() {
        return this.pages.length*2; // sheets of paper * 2 (1 sheet has 2 pages, back and front)
    }

    /**
     * Loads the 2 faces of a page at the same time...
     */
    private loadPages( sourceA:PageSource, sourceB:PageSource, page:FlipPage ){
        return ()=> Promise.all([
            this.loadPage(sourceA, 1, page),
            this.loadPage(sourceB, 0, page)
        ]);
    }

    /**
     * Loads a page's face. If it is a Material it just puts that, if it is a string it will try to load it using the TextureLoader
     */
    private loadPage( source:PageSource, side:number, page:FlipPage ):Promise<void> {
        if( !source || source==='')
        {
            const blankPage = new THREE.MeshStandardMaterial( { 
                color:"white",
                roughness:0.2, 
                aoMapIntensity:.7,
                aoMap: side==1? AOTexture() : null
            } );

            page.setPageMaterial(blankPage,side);
            return Promise.resolve();
        }

        if( source instanceof THREE.Material )
        {
            page.setPageMaterial(source,side);
            return Promise.resolve();
        }

        const url = source as string;

        //
        // check cache first
        //
        if( !this._url2Loader.has(url) )
        {
            //
            // first time, cache it.
            //
            this._url2Loader.set(url, new Promise( (resolve, reject) => {

                new THREE.TextureLoader().load( source as string, function ( texture ) {
    
                    texture.magFilter = THREE.LinearFilter;
                    texture.minFilter = THREE.LinearFilter;
                    texture.generateMipmaps = false;
                    texture.colorSpace = THREE.SRGBColorSpace; 
                
                    const material = new THREE.MeshStandardMaterial( { 
                        color:"white",
                        map: texture, 
                        roughness:0.2, 
                        aoMapIntensity:.7, 
                        aoMap: side==1? AOTexture() : null,
                        toneMapped:false
                    } ); 
                
                    //page.setPageMaterial(material,side);
    
                    resolve(material);
                
                }
                , undefined //TODO: show a progress bar or spinner...
                , (err)=>{
    
                    // page failed to load... oh well... 
                    // console.error("Failed to load a page: ", err);
                    resolve(null);
    
                });
    
            }));
        }

        //
        // es un string...
        //
        return this._url2Loader.get(url).then( material=>{
            page.setPageMaterial(material,side);
        });
    }

    /**
     * The current "page" (as you would read on a book, the page number...)
     */
    get currentPage()  { return this._currentPage; }
    set currentPage(n) { 

        let goal = Math.ceil(n/2);

        // // distance between where we are and were we want to go.
        let distance = goal - this._currentProgress; 

        // // during the animation towards the goal page, we will move at this speed per second.
        this._stepSize = distance / this._flipDuration;
        this._flipDirection = this._stepSize>0? 1 : -1;

        this._currentPage = Math.ceil(n); 
        this._goalProgress = goal; 

        this.flipPages(); 
    }

    /**
     * Each page has a progress that goes form 0 to 1. 
     * Here, the progress of a book goes form 0 to `Total Pages` (but in this case, by "page" we mean paper, a paper has 2 pages, the fornt and back page...)
     * and the decimal portion is the progress of the flip of that page. 
     * If you have 3 pages, for example, to send the user to the last page's back side, you have to call .progress = 3 (which is almost equivalent to 2.9999... )
     * 
     * expects a number from `0` to `book.totalPages/2`
     */
    get progress(){ return this._currentProgress; }
    set progress(p)
    { 
        let oldProgress         = this._currentProgress; 
        this._currentProgress   = Math.max(0, Math.min( p, this.pages.length )); //this.pages.length*2+1
        this._currentPage       = Math.floor( this._currentProgress * 2)
        this._stepSize          = 0;
        this._flipDirection     = this._currentProgress>oldProgress? 1 : -1;
        this.flipPages(); 
    }

    /**
     * Call this to animate this book every frame.
     * @param delta seconds since last frame render
     */
    public animate(delta:number)
    { 
        // animar _currentProgress en DIRECCION al goal en un determinado STEP
        if( this._stepSize != 0 )
        {
            // move towards goal
            this._currentProgress += this._stepSize * delta;   

            //constrain
            if( (this._stepSize>0 && this._currentProgress > this._goalProgress) 
                ||
                (this._stepSize<0 && this._currentProgress < this._goalProgress ))
            { 
                    this._currentProgress = this._goalProgress; 
                    this._stepSize = 0;
            } 

            this.flipPages(); 
        } 
    } 

    /**
     * It will flip all the pages until this page is facing at the user.
     * @param page Page of interest
     */
    public flipPage( page:FlipPage )
    { 
        var pageIndex = this.pages.indexOf( page );

        if(pageIndex<0) 
            throw new ReferenceError("I don't own that page! Not mine!");

        const A = pageIndex*2;
        const B = A+1;   

        this.currentPage = this._currentPage<=A? B : A;  
    }

    /**
     * Send the book to the next page
     */
    public nextPage(){
        this.currentPage = Math.min( Math.ceil(this.currentPage/2) +1, this.pages.length ) * 2; 
    }

    /**
     * Send the book to the previous page
     */
    public previousPage(){
        this.currentPage = Math.max( Math.ceil(this.currentPage/2)-1, 0 ) * 2;
    }

    /**
     * Goes one by one and calculate the progress of each FlipPage based on the progress of the book.
     */
    private flipPages()
    {
        const totalPages = this.pages.length;

        // progress of the "flip" of the current page
        let activeProgress = this._currentProgress % 1;
      
        // index of the current page
        let activeIndex = Math.floor(this._currentProgress);  
        
        //
        // for each page calculate it's "flip progress"
        //
        for (let i = 0; i < totalPages; i++) 
        { 
            //
            // calculate the progress of this page flip based on the overall progress.
            //
            const page = this.pages[i];   
            const pageProgress = activeIndex<i? 0 :
                                    activeIndex>i? 1 :
                                    activeProgress;

            const yProgress     = pageProgress<0.5? 0 : (pageProgress - 0.5) / 0.5;
            const leftPileY     = -this._ySpacing * (totalPages-i);
            const rightPileY    = -this._ySpacing * i;
            const pageCurveEffectIntensity     = this._currentProgress<1? activeProgress : 
                                                 this._currentProgress>=totalPages? 0 :
                                                 this._currentProgress>=totalPages-1? 1-activeProgress 
                                                 : 1;

            page.flip(pageProgress, this._flipDirection, pageCurveEffectIntensity); 

            //
            // adjust y position according to the pile we are in...
            //
            page.position.y = rightPileY + yProgress * (leftPileY-rightPileY);  
        }   

        //
        // animate offset
        //
        const offset = activeIndex==0? -0.5 + 0.5*activeProgress : 
        activeIndex==totalPages-1? 0.5*activeProgress: 
        activeIndex==totalPages? 0.5 : 
                       0;

        this.position.x = offset * this.scale.x;  
    }

    /**
     * Will dispose the book, the pages and all the materials used. Also the internal cache.
     */
    public dispose() 
    {
        while(this.pages.length)
        {
            let page = this.pages.pop()!; 
            this.remove(page); 
        }

        while( this.pool.length )
        {
            this.pool.pop().dispose(true);
        }

        //
        // dispose all cached materials & clear cache
        //
        this._url2Loader.forEach( m=> m.then(m=>m.dispose()) );
        this._url2Loader.clear();
    }
}