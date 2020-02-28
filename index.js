/*global webkitAudioContext*/

/*成员*/

const FFTSIZE=1024;

/**
 * @name 音频
 * @type Object
 */
let Music=(function()
{
/*成员*/

    let element;

    /**
     * @name 初始化
     * @type Function
     * @see Music
     */
    let initiate=function()
    {
        element=new Audio();
        element.src='./audio/ShapeOfYou.mp3';
        element.loop=true;
    };

/*接口*/

    /**
     * @name 播放
     * @type Function
     * @see Music
     */
    let play=function()
    {
        element.play();
    };
    /**
     * @name 取得当前播放进度
     * @type Function
     * @see Music
     * @return {float} 当前播放进度。单位：s
     */
    let getCurrentTime=function()
    {
        return element.currentTime;
    };
    /**
     * @name 取得时长
     * @type Function
     * @see Music
     * @return {float} 时长。单位：s
     */
    let getDuration=function()
    {
        return element.duration;
    };

/*构造*/

    initiate();

    return {element,play,getCurrentTime,getDuration};
})();
/**
 * @name 音频分析
 * @type Object
 */
let Analysis=(function()
{
/*成员*/

    let dataArray;
    let analyser;

    /**
     * @name 初始化
     * @type Function
     * @see Analysis
     */
    let initiate=function()
    {
        let context=new (AudioContext || webkitAudioContext)();
        let source=context.createMediaElementSource(Music.element);
        analyser=context.createAnalyser();
        source.connect(analyser);
        analyser.connect(context.destination);
        analyser.fftSize=FFTSIZE;
        dataArray=new Uint8Array(FFTSIZE);
    };

/*接口*/

    /**
     * @name 更新数据
     * @type Function
     * @see Analysis
     * @return {Object} 频谱数据
     */
    let updateData=function()
    {
        analyser.getByteFrequencyData(dataArray);
        
        return dataArray;
    };

/*构造*/

    initiate();

    return {updateData};
})();
/**
 * @name 视效
 * @type Object
 */
let Vision=(function()
{
/*成员*/

    let context;
    let width;
    let height;

    /**
     * @name 渲染
     * @type Function
     * @see Vision
     */
    let render=(function()
    {
    /*成员*/

        let TIMESTOP=[10.2,50.2,170.3,190,231];
        let STEP=64;       //步数 
        let PACE=FFTSIZE/2/STEP;       //步长,取前1/4数据
        let extent;
        let averageExtent;
        let time;
        let h1;
        let h2;

        /**
         * @name 画曲线
         * @type Function
         * @param {Object} context Canvas绘图环境
         * @param {Array} points 点数组，[{x,y}] 
         * @param {float} a 系数a，可省略 
         * @param {float} b 系数b，可省略
         */
        let DrawCurve=(function()
        {
        /*成员*/

            /**
             * @name 计算控制点
             * @param {Array} points 点数组，[{x:float,y:float}] 
             * @param {int} i 点索引 
             * @param {float} a 系数a 
             * @param {float} b 系数b
             * @return {Object} 控制点，{pA:{x:float,y:float},pB:{x:float,y:float}}
             */
            let getCtrlPoint=function(points,i,a,b)
            {
                let pAx,pAy,pBx,pBy;

                if(i<1)                 //处理极端情形
                {    
                    pAx = points[0].x + (points[1].x-points[0].x)*a;
                     pAy = points[0].y + (points[1].y-points[0].y)*a;
                }
                else
                {
                     pAx = points[i].x + (points[i+1].x-points[i-1].x)*a;
                     pAy = points[i].y + (points[i+1].y-points[i-1].y)*a;
                }
                if(i>points.length-3)      //处理极端情形
                {
                     let last=points.length-1;
                     pBx = points[last].x - (points[last].x-points[last-1].x)*b;
                     pBy = points[last].y - (points[last].y-points[last-1].y)*b;
                }
                else
                {
                     pBx = points[i+1].x - (points[i+2].x-points[i].x)*b;
                     pBy = points[i+1].y - (points[i+2].y-points[i].y)*b;
                }
                
                return {pA:{x:pAx,y:pAy},pB:{x:pBx,y:pBy}};
            };

        /*构造*/

            return function(context,points,a=0.25,b=0.25)
            {
                context.moveTo(points[0].x,points[0].y);
                for(let i=1,l=points.length;i<l;i++)
                {
                    let ctrlPoint=getCtrlPoint(points,i-1,a,b);
                    context.bezierCurveTo(ctrlPoint.pA.x, ctrlPoint.pA.y, ctrlPoint.pB.x,ctrlPoint.pB.y, points[i].x, points[i].y);
                }
            };
        })();
        /**
         * @name 预处理数据
         * @type Function
         * @see Vision-render
         */
        let preData=function()
        {
            let data=Analysis.updateData();
            extent=[];
            let sum=0;
            for(let i=0;i<STEP;i++)
            {
                extent[i]=data[i*PACE]/256;
                sum+=extent[i];
            }                    
            averageExtent=sum/extent.length;
            time=Music.getCurrentTime();
        };
        /**
         * @name 波形
         * @type Function
         * @see Vision-render
         */
        let wave=(function()
        {
        /*成员*/

            let maxHeight=null;
            let paceX=null;

        /*构造*/

            return function()
            {
                if(maxHeight==null || paceX==null)
                {
                    maxHeight=height/5;
                    paceX=width/3/STEP;
                }

                let points;   
                
                points=[];      //后线条
                let d=true;
                let s=Math.round(STEP/16);
                let p=width/2/s;
                for(let i=0;i<s;i++)
                {
                    let lineHeight=extent[i]*maxHeight/2;
                    let x=i*p;
                    let y= d?height/2-lineHeight:height/2+lineHeight;
                    points.push({x,y});

                    d=!d;
                }
                for(let i=0;i<s;i++)
                {
                    let lineHeight=extent[s-1-i]*maxHeight;
                    let x=width/2+i*p;
                    let y= d?height/2-lineHeight:height/2+lineHeight/2;
                    points.push({x,y});

                    d=!d;
                }
                points.push({x:width,y:points[0].y});
                context.beginPath();
                context.moveTo(0,height/2);
                DrawCurve(context,points);

                points=[];      //左线条
                for(let i=0,d=true;i<STEP;i++)
                {
                    let lineHeight=extent[i]*maxHeight;
                    let x=i*paceX;
                    let y= d?height/2-lineHeight:height/2+lineHeight;
                    points.push({x,y});

                    d=!d;
                }
                context.moveTo(0,height/2);
                DrawCurve(context,points);
                context.moveTo(width/3-16,height/2);
                context.lineTo(width/3+(width/6)*(Music.getCurrentTime()/Music.getDuration()),height/2);

                points=[];      //右线条
                for(let i=0,d=true;i<STEP;i++)
                {
                    let lineHeight=extent[i]*maxHeight;
                    let x=width-i*paceX;
                    let y= d?height/2-lineHeight:height/2+lineHeight;
                    points.push({x,y});

                    d=!d;
                }
                context.moveTo(0,height/2);
                DrawCurve(context,points);
                context.moveTo(width/3*2+16,height/2);
                context.lineTo(width/3*2-(width/6)*(Music.getCurrentTime()/Music.getDuration()),height/2);

                let gradient=context.createLinearGradient(0,0,width,0);
                gradient.addColorStop(0,`hsla(${h1},100%,50%,0.5)`);
                gradient.addColorStop(1,`hsla(${h2},100%,50%,0.5)`);
                context.strokeStyle=gradient;
                context.stroke();
            };
        })();
        /**
         * @name 环
         * @type Function
         * @see Vision-render
         */
        let circle=(function()
        {
        /*成员*/

            let radiusBase=null;
            let radiusletiable=null;
            let group=[];

            /**
             * @name 圆
             * @type Object
             * @see Vision-render-Circle
             */
            let Circle=class
            {
            /*构造*/

                /**
                 * @name 构造函数
                 * @type Function
                 * @see Vision-render-Circle
                 */
                constructor()
                {
                    this.context=context;
                    this.opacity=1;
                    this.points=[];

                    for(let i=0,d=false;i<16;i++)
                    {
                        let a=Math.PI*(1/8*i+0.5);
                        let r=radiusBase+(d ? radiusletiable*extent[i+16] : -radiusletiable*extent[i+16]);
                        d=!d;
                        let x=Math.cos(a)*r+width/2;
                        let y=Math.sin(a)*r+height/2;
                        this.points.push({x,y});
                    }
                    this.points.push(this.points[0]);
                }
                /**
                 * @name 渲染后处理
                 * @type Function
                 * @see Vision-render-Circle
                 * @return {bool} 是否显示
                 */
                afterRender()
                {
                    this.opacity-=Circle.fadeRate;
                    if(this.opacity>0)
                        return true;
                    else
                        return false;
                }

            /*接口*/

                /**
                 * @name 渲染
                 * @type Function
                 * @see Vision-render-Circle
                 */
                render()
                {
                    context.moveTo(this.points[0].x,this.points[0].y);
                    DrawCurve(context,this.points);

                    return this.afterRender();
                }
            };
            Circle.fadeRate=0.1;

        /*构造*/

            return function(level)
            {
                if(radiusBase==null || radiusletiable==null)
                    radiusBase=height/4;
                radiusletiable=height/level;

                group.push(new Circle());
                context.beginPath();
                let count=0;        //可见计数
                for(let i=0;i<group.length;i++)  
                    if(group[i].render())
                        group[count++]=group[i];
                if(group.length>count)
                    group.splice(count,group.length-count);
                context.strokeStyle=`hsla(${(h1+h2)/2},100%,50%,0.75)`;
                context.stroke();
            };
        })();
        /**
         * @name 线
         * @type Function
         * @see Vision-render
         */
        let line=function()
        {
            context.beginPath();
            context.moveTo(0,height/2);
            context.lineTo(width/3+(width/6)*(Music.getCurrentTime()/Music.getDuration()),height/2);
            context.strokeStyle=`hsl(${h1},100%,50%)`;
            context.stroke();

            context.beginPath();
            context.moveTo(width,height/2);
            context.lineTo(width/3*2-(width/6)*(Music.getCurrentTime()/Music.getDuration()),height/2);
            context.strokeStyle=`hsl(${h2},100%,50%)`;
            context.stroke();
        };

    /*构造*/

        return function()
        {
            preData();
            context.clearRect(0,0,width,height);
            context.lineWidth=3;
            h1=300+180*averageExtent;
            h2=180+180*averageExtent;

            if(time<TIMESTOP[0])
            {
                wave();
            }
            else if(time>=TIMESTOP[0] && time< TIMESTOP[1])
            {
                wave();   
            }
            else if(time >= TIMESTOP[1] && time<TIMESTOP[2])
            {
                wave();
                circle(2);
            }
            else if(time >=TIMESTOP[2] && time<TIMESTOP[3])
            {
                line();
            }
            else if(time >=TIMESTOP[3] && time<=TIMESTOP[4])
            {
                wave();
                circle(1);
            }
            else if(time>=TIMESTOP[4])
            {
                wave();
            }
        };
    })();
    /**
     * @name 动画
     * @type Function
     * @see Vision
     */
    let animate=(function()
    {
    /*成员*/

        let lastTimestamp=0;
        /**
         * @name 内联函数
         * @type Function
         * @see Vision-animate
         */
        let inline=function(timestamp)
        {
            let deltaTime=timestamp-lastTimestamp;
            if(deltaTime>25)        //限制40帧每秒
            {
                render();
                lastTimestamp=timestamp;
            }

            window.requestAnimationFrame(inline);
        };

    /*构造*/

        return function()
        {
            window.requestAnimationFrame(inline);
        };
    })();

/*构造*/

    window.addEventListener('load',function()
    {
        let part=document.getElementById('vision');
        context=part.getContext('2d');
        width=part.offsetWidth;
        height=part.offsetHeight;
        part.width=width;       //尺寸固化
        part.height=height;
    });

    return {animate};
})();
/**
 * @name 歌词
 * @type Object
 */
let Lyrics=(function()
{
/*成员*/

    let lrc;
    let content;
    let lines=[];
    /**
     * @name 初始化
     * @type Function
     * @see Lyrics
     */
    let initiate=function()
    {
        let xmlHttp=new XMLHttpRequest();       //创建对象
        xmlHttp.onreadystatechange=function()       //注册回调函数
        {
            if(this.readyState==4)
            {
                lrc=resolve(this.responseText);
                load();
            }
        };
    
        xmlHttp.open('GET','./text/ShapeOfYou.lrc',true);
        xmlHttp.send(null);

        content=document.getElementById('lyrics_content');
    };
    /**
     * @name 解析
     * @type Function
     * @see Lyrics
     * @param {String} text lrc文本
     * @return {Object} 数据对象
     */
    let resolve=function(text)
    {
        let timeTags=[];
        let artist='';
        let title='';
        let album='';
        let by='';
        let offset=0;

        let statements=text.split('\n');
        for(let i=0,l=statements.length;i<l;i++)
        {
            let timeTag={};
            let statement=statements[i];
            if(statement)
            {
                let timeTagBracket=statement.match(/\[\d+:\d{1,2}\.?\d*\]/);
                if(timeTagBracket)
                {
                   let time=timeTagBracket[0].split(/[\[\]:]/);
                   let ms=parseInt(time[1])*60*1000+parseFloat(time[2])*1000;
                   timeTag.time=ms;

                   let text=statement.split(/\[\d+:\d{1,2}\.?\d*\]/)[1];
                   text=text.replace(/\n|\r/g,'');
                   timeTag.text=text;

                   timeTags.push(timeTag);
                }
                else
                {
                    let arTemp=statement.match(/\[ar:.*\]/);
                    if(arTemp)
                    {
                        artist=arTemp[0].split(/[\[:\]]/)[2];
                    }
                    let tiTemp=statement.match(/\[ti:.*\]/);
                    if(tiTemp)
                    {
                        title=tiTemp[0].split(/[\[:\]]/)[2];
                    }  
                    let alTemp=statement.match(/\[al:.*\]/);
                    if(alTemp)
                    {
                        album=alTemp[0].split(/[\[:\]]/)[2];
                    }  
                    let byTemp=statement.match(/\[by:.*\]/);
                    if(byTemp)
                    {
                        by=byTemp[0].split(/[\[:\]]/)[2];
                    }  
                    let offsetTemp=statement.match(/\[offset:.*\]/);
                    if(offsetTemp)
                    {
                        offset=parseInt(offsetTemp[0].split(/[\[:\]]/)[2]);
                    }   
                }
            }
        }

        return {timeTags,artist,title,album,by,offset};
    };
    /**
     * @name 载入
     * @type Function
     * @see Lyrics
     */
    let load=function()
    {
        lines=[];
        let timeTags=lrc.timeTags;
        for(let i=0,l=timeTags.length;i<l;i++)
        {
            let line=document.createElement('div');
            line.className='lyrics_line';
            line.innerHTML=timeTags[i].text;
            line.timeTag=timeTags[i];
            content.appendChild(line);

            lines.push(line);
        }
    };

/*接口*/

    /**
     * @name 动画
     * @type Function
     * @see Lyrics
     */
    let animate=(function()
    {
    /*成员*/

        let lastLine;

        /**
         * @name 内联函数
         * @type Function
         * @see Lyrics-animate
         */
        let inline=function()
        {
            let time=Music.getCurrentTime()*1000;
            for(let i=lines.length-1;i>=0;i--)
                if(time>lines[i].timeTag.time)
                {
                    let line=lines[i];
                    if(line!=lastLine)
                    {
                        content.style.top=`calc( 50% - ${line.offsetTop}px - ${line.offsetHeight/2}px)`;
                        line.classList.add('current');
                        if(lastLine)
                            lastLine.classList.remove('current');
                    }
                    
                    lastLine=line;

                    break;
                }

            window.requestAnimationFrame(inline);
        };

    /*构造*/

        return function()
        {
            window.requestAnimationFrame(inline);
        };
    })();

/*构造*/ 

    window.addEventListener('load',function()
    {
        initiate();
    });

    return {animate};
})();

/*构造*/

window.addEventListener('load',function()
{
    document.getElementById('cover_play').addEventListener('click',function()
    {
        document.getElementById('cover_background').classList.add('animate');
        document.getElementById('cover_title').classList.add('animate');
        this.classList.add('hide');

        Music.play();
        Vision.animate();
        Lyrics.animate();
    });
});
