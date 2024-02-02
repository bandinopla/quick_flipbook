import * as THREE from 'three';  
import { FlipPage } from './flip-page';

/**
 * @typedef {Object} BookConfig
 * @property {number} flipDuration - seconds it takes for one page to flip
 * @property {number} yBetweenPages - space between pages in the vertical plane
 * @property {number} pageSubdivisions - how much time to subdivie the plane of each page
 */

export class Book extends THREE.Mesh
{   
    /**
     * Pages of this book
     * @type {FlipPage[]} 
     */
    #pages;

    /**
     * @type {number} Page's plane subdivisions
     */
    #_pageSubdivisions;

    /** 
     * A number were the `Math.floor` of it will be the page index, and the modulo will be the flip progress of that page.
     * 
     * @type {Number}
     */
    #_currentProgress;

    /**
     * The goal of the current animation's progress.
     */
    #_goalProgress;

    /**
     * Current page "on focus"
     */
    #_currentPage;

    /**
     * @type {Number} seconds for a single page to flip
     */
    #_flipDuration;

    /**
     * @type {Number} speed at which the pages will flip
     */
    #_stepSize;

    /**
     * @type {Number} -1 or 1
     */
    #_flipDirection;

    #_ySpacing;

    /**
     * A serie of FlipPages
     * @constructor
     * @param {BookConfig} config
     */
    constructor(config={})
    { 
        super();

        this.#pages = [];
        this.#_currentProgress = 0; 
        this.#_flipDuration = config.flipDuration || 1; // 1 second by default
        this.#_ySpacing = config.yBetweenPages || 0.001;
        this.#_pageSubdivisions = config.pageSubdivisions || 20;
        this.currentPage = 0;
    }

    /** 
     * Initialize the book. Pass in the URLs to the images to use for each page.
     * The order in which they will be loaded is one page (2 images per page) at a time.
     * After one page is loaded, the next will start loading. While one page is loading the rest are in perpetual inactive state (nothing loading)
     * 
     * @param {Array.<String|THREE.Material>} pagesSources Url of the image of each page.
     */
    setPages( pagesSources ) 
    {
        // remove old pages
        while(this.#pages.length)
        {
            let page = this.#pages.pop();
            page.dispose();
            this.remove(page); 
        }

        /**
         * @type {Promise}
         */
        let prom = Promise.resolve();

        for ( let i = 0; i < pagesSources.length; i+=2 ) 
        {
            const urlA = pagesSources[i];
            const urlB = pagesSources[i+1];
            const page = new FlipPage( this.#_pageSubdivisions );  
            
            this.add(page);

            page.position.y = -this.#_ySpacing * this.#pages.length;
            this.#pages.push(page);
            page.name = `Page#${this.#pages.length}`
            

            prom.then( this.#loadPagePages(urlA,urlB, page) ); 
        }
    }

    /** 
     * @param {String|THREE.Material|null} sourceA 
     * @param {String|THREE.Material|null} sourceB 
     * @param {FlipPage} page 
     * @return {()=>Promise} 
     */
    #loadPagePages( sourceA, sourceB, page )
    {
        return ()=> Promise.all([
            this.#loadPage(sourceA, 1, page),
            this.#loadPage(sourceB, 0, page)
        ]);
             
    }

    /**
     * 
     * @param {String|THREE.Material|null} url 
     * @param {Number} side 
     * @param {FlipPage} page  
     * @returns {Promise}
     */
    #loadPage( source, side, page )
    {
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

            new THREE.TextureLoader().load( source, function ( texture ) {

                texture.wrapS = texture.wrapT = THREE.RepeatWrapping; 
                texture.colorSpace = THREE.SRGBColorSpace; 
            
                const material = new THREE.MeshStandardMaterial( { map: texture, roughness:0.2, emissive:0 } );
            
                page.setPageMaterial(material,side);
            
            }, null, (err)=>{

                // page failed to load...
                resolve();

            } );

        });
    }


    /**
     * Gets the current page's face index in which we are focused. 
     * This is the index of the URLS we used in `setPages`
     */
    get currentPage()  { return this.#_currentPage; }
    set currentPage(n) { 

        let goal = Math.ceil(n/2);

        // // distance between where we are and were we want to go.
        let distance = goal - this.#_currentProgress; 

        // // during the animation towards the goal page, we will move at this speed per second.
        this.#_stepSize = distance / this.#_flipDuration;
        this.#_flipDirection = this.#_stepSize>0? 1 : -1;

        this.#_currentPage = n; 
        this.#_goalProgress = goal;

        this.#flipPages(); 
    }

    get progress(){ return this.#_currentProgress; }
    set progress(p){ this.#_currentProgress = p; }

    /**
     * Animate flip. It will tween to the corresponding page if needed.
     * @param {Number} delta elapsed time since last frame
     */
    animate(delta)
    { 
        // animar _currentProgress en DIRECCION al goal en un determinado STEP
        if( this.#_stepSize != 0 )
        {
            // move towards goal
            this.#_currentProgress += this.#_stepSize * delta;   

            //constrain
            if( (this.#_stepSize>0 && this.#_currentProgress > this.#_goalProgress) 
                ||
                (this.#_stepSize<0 && this.#_currentProgress < this.#_goalProgress ))
            { 
                    this.#_currentProgress = this.#_goalProgress; 
                    this.#_stepSize = 0;
            } 

            this.#flipPages(); 
        } 
    } 

    /** 
     * "Flip this page" and go to the corresponding book progress.
     * @param {FlipPage} page 
     */
    flipPage( page )
    {
        var pageIndex = this.#pages.indexOf( page );

        const A = pageIndex*2;
        const B = A+1;  

        this.currentPage = this.#_currentPage<=A? B : A;  
    }


    /**
     * Calculates the corresponding `progress` of each FlipPage
     */
    #flipPages()
    {
        const totalPages = this.#pages.length;
        let activeProgress = this.#_currentProgress % 1 
        let activeIndex = Math.floor(this.#_currentProgress);  
        
        //
        // for each page calculate it's "flip progress"
        //
        for (let i = 0; i < totalPages; i++) 
        { 
            //
            // calculate the progress of this page flip based on the overall progress.
            //
            const page = this.#pages[i];   
            const pageProgress = activeIndex<i? 0 :
                                    activeIndex>i? 1 :
                                    activeProgress;

            const yProgress     = pageProgress<0.5? 0 : (pageProgress - 0.5) / 0.5;
            const leftPileY     = -this.#_ySpacing * (totalPages-i);
            const rightPileY    = -this.#_ySpacing * i;

            page.flip(pageProgress, this.#_flipDirection); 

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