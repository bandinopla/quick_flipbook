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



export class FlipBook extends THREE.Mesh 
{
    private pages:FlipPage[];
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
        this._currentProgress = 0;
        this._flipDuration = config?.flipDuration || 1; // 1 second
        this._ySpacing = config?.yBetweenPages || 0.001;
        this._pageSubdivisions = config?.pageSubdivisions || 20;
        this.currentPage = 0; 
    } 

    /** 
     * Initialize the book. Pass in the URLs to the images to use for each page.
     * The order in which they will be loaded is one page (2 images per page) at a time.
     * After one page is loaded, the next will start loading. While one page is loading the rest are in perpetual inactive state (nothing loading) 
      
     * @param pagesSources Array with the "source" to use as the page texture, either a material or a url to load an image from.
     */
    setPages( pagesSources: PageSource[] ) 
    {     
        // remove old pages
        while(this.pages.length)
        {
            let page = this.pages.pop()!;
            page.dispose();
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
            const page = new FlipPage( this._pageSubdivisions );  
            
            this.add(page);  

            page.position.y = -this._ySpacing * this.pages.length;
            this.pages.push(page);
            page.name = `Page#${this.pages.length}`
            
            //
            // load one "Page" at a time...
            //
            prom = prom.then( this.loadPages(urlA,urlB, page) ); 
        } 
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
            return Promise.resolve();
        }

        if( source instanceof THREE.Material )
        {
            page.setPageMaterial(source,side);
            return Promise.resolve();
        }

        //
        // es un string...
        //
        return new Promise( (resolve, reject) => {

            new THREE.TextureLoader().load( source as string, function ( texture ) {

                texture.wrapS = texture.wrapT = THREE.RepeatWrapping; 
                texture.colorSpace = THREE.SRGBColorSpace; 
            
                const material = new THREE.MeshStandardMaterial( { map: texture, roughness:0.2, emissive:0 } ); 
            
                page.setPageMaterial(material,side);

                resolve();
            
            }
            , undefined //TODO: show a progress bar or spinner...
            , (err)=>{

                // page failed to load... oh well... 
                console.error("Failed to load a page: ", err);
                resolve();

            });

        });
    }

    /**
     * Gets the current page's face index in which we are focused. 
     * This is the index of the URLS we used in `setPages`
     */
    get currentPage()  { return this._currentPage; }
    set currentPage(n) { 

        let goal = Math.ceil(n/2);

        // // distance between where we are and were we want to go.
        let distance = goal - this._currentProgress; 

        // // during the animation towards the goal page, we will move at this speed per second.
        this._stepSize = distance / this._flipDuration;
        this._flipDirection = this._stepSize>0? 1 : -1;

        this._currentPage = n; 
        this._goalProgress = goal;

        this.flipPages(); 
    }

    /**
     * Each page has a progress that goes form 0 to 1. 
     * Here, the progress of a book goes form 0 to [Total Pages]
     * and the decimal portion is the progress of that integer page. 
     */
    get progress(){ return this._currentProgress; }
    set progress(p){ this._currentProgress = p; }

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

        const A = pageIndex*2;
        const B = A+1;  

        this.currentPage = this._currentPage<=A? B : A;  
    }

    /**
     * Goes one by one and calculate the progress of each FlipPage based on the progress of the book.
     */
    private flipPages()
    {
        const totalPages = this.pages.length;
        let activeProgress = this._currentProgress % 1;
      
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

            page.flip(pageProgress, this._flipDirection); 

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
}