import Phaser from 'phaser';
import { CROPS, PLOT_CELLS, canWalk, plotAt, nearShop, ready, type Direction, type Farm } from '../../shared/game';
export interface Bridge {farm:Farm;move:Direction|null;interact:boolean;blocked:boolean;onTarget:(plot:number,shop:boolean)=>void;onInteract:(plot:number,shop:boolean)=>void}
const T=40;
export class FarmScene extends Phaser.Scene {
 private terrain!:Phaser.GameObjects.Graphics;private plants!:Phaser.GameObjects.Graphics;private person!:Phaser.GameObjects.Container;private cursor!:Phaser.GameObjects.Graphics;
 private xCell=10;private yCell=10;private direction:Direction='up';private walking=false;private keys!:Record<string,Phaser.Input.Keyboard.Key>;private lastFarm:Farm|null=null;private lastSecond=-1;
 constructor(private bridge:Bridge){super('farm')}
 create(){
 this.terrain=this.add.graphics();this.drawWorld();this.plants=this.add.graphics();this.cursor=this.add.graphics();
 const shadow=this.add.ellipse(0,14,26,9,0x163f32,.22);
 const g=this.add.graphics();g.fillStyle(0x324861);g.fillRect(-10,2,20,14);g.fillStyle(0x26364c);g.fillRect(-10,14,8,7);g.fillRect(3,14,8,7);g.fillStyle(0xefd0a0);g.fillRect(-9,-12,18,17);g.fillStyle(0x6c4733);g.fillRect(-11,-16,22,8);g.fillStyle(0xe7b960);g.fillRect(-16,-14,32,5);g.fillRect(-10,-23,20,12);g.fillStyle(0x7a572e);g.fillRect(-10,-16,20,3);g.fillStyle(0x253a35);g.fillRect(-5,-7,3,3);g.fillRect(4,-7,3,3);g.fillStyle(0xeebd91);g.fillRect(-14,2,5,10);g.fillRect(10,2,5,10);g.fillStyle(0x88b3ad);g.fillRect(-6,3,12,10);
 this.person=this.add.container(this.xCell*T+20,this.yCell*T+20,[shadow,g]);this.person.setDepth(10);
 this.keys=this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE') as Record<string,Phaser.Input.Keyboard.Key>;
 this.input.keyboard!.addCapture(['UP','DOWN','LEFT','RIGHT','SPACE']);
 this.target();
 }
 private drawWorld(){const g=this.terrain;g.fillStyle(0x89b76d);g.fillRect(0,0,800,600);
 let seed=59;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
 for(let i=0;i<700;i++){const x=Math.floor(rand()*200)*4,y=Math.floor(rand()*150)*4;g.fillStyle(i%3?0x7caa61:0x99c57b,.65);g.fillRect(x,y,4,4);}
 // Sandy footpaths, garden border and stepping stones.
 g.fillStyle(0xdcc69b);g.fillRect(40,400,720,44);g.fillRect(220,220,44,220);g.fillRect(540,220,80,220);g.fillRect(240,360,360,40);
 for(let x=60;x<760;x+=42){g.fillStyle(0xc8b58b);g.fillRect(x,415,14,3)}
 g.fillStyle(0x63884a);g.fillRoundedRect(267,187,266,178,8);g.fillStyle(0xd8b481);g.fillRect(274,194,252,164);
 for(const p of PLOT_CELLS){const x=p.x*T,y=p.y*T;g.fillStyle(0x77563d);g.fillRect(x,y,38,38);g.fillStyle(0x8e6847);g.fillRect(x+2,y+2,34,32);g.fillStyle(0x76553c);for(let i=0;i<3;i++)g.fillRect(x+5,y+8+i*9,28,3)}
 // Pond.
 g.fillStyle(0x70995b);g.fillRoundedRect(18,353,177,165,42);g.fillStyle(0xb8caa0);g.fillRoundedRect(23,361,164,148,38);g.fillStyle(0x66a9aa);g.fillRoundedRect(30,368,150,132,35);g.fillStyle(0x82c4bc);g.fillRect(60,392,40,4);g.fillRect(114,450,42,4);g.fillRect(48,472,27,4);g.fillStyle(0x53945a);g.fillEllipse(139,396,26,13);g.fillEllipse(69,460,23,12);g.fillStyle(0xf5c2c0);g.fillRect(137,386,8,8);
 const tree=(x:number,y:number,s=1)=>{g.fillStyle(0x507946,.22);g.fillEllipse(x+5,y+15,58*s,20*s);g.fillStyle(0x775638);g.fillRect(x-6,y-26,13,38);g.fillStyle(0x3e754d);g.fillCircle(x,y-44,28*s);g.fillCircle(x-21*s,y-30,21*s);g.fillCircle(x+20*s,y-30,22*s);g.fillStyle(0x518952);g.fillCircle(x-6,y-55,22*s);g.fillStyle(0x639d5d);g.fillCircle(x-13,y-61,12*s)};
 for(const [x,y] of [[35,66],[104,53],[177,66],[248,48],[320,58],[409,52],[491,63],[576,52],[650,66],[733,52],[778,110],[23,265],[775,280],[737,549],[646,555],[555,551],[469,561],[381,552],[281,565],[203,550],[100,551],[28,553]])tree(x,y);
 // House and market.
 const house=(x:number,y:number,shop=false)=>{g.fillStyle(0x47613b,.2);g.fillRect(x-6,y+83,165,14);g.fillStyle(shop?0xe4d2a9:0xf3dfb8);g.fillRect(x,y,150,90);g.fillStyle(0xc3ab80);g.fillRect(x,y+79,150,12);g.fillStyle(shop?0x537c65:0xac6553);g.fillTriangle(x-16,y+8,x+75,y-57,x+166,y+8);g.fillStyle(shop?0x6e9673:0xc77f63);g.fillTriangle(x-16,y,x+75,y-62,x+166,y);g.fillStyle(0x815e40);g.fillRect(x+60,y+41,30,49);g.fillStyle(0x516e67);g.fillRect(x+16,y+30,27,27);g.fillRect(x+108,y+30,27,27);g.fillStyle(0xe4d2a9);g.fillRect(x+28,y+30,3,27);g.fillRect(x+120,y+30,3,27);g.fillStyle(0xeecb79);g.fillRect(x+82,y+63,4,4);if(shop){g.fillStyle(0xf1dfb6);g.fillRect(x-6,y+9,162,25);for(let i=0;i<8;i++){g.fillStyle(i%2?0xf1dfb6:0xc47f62);g.fillRect(x-6+i*20,y+9,20,25)}g.fillStyle(0x3e604c);g.fillRect(x+30,y-25,90,23);this.add.text(x+75,y-14,'CỬA HÀNG',{fontFamily:'sans-serif',fontSize:'11px',fontStyle:'bold',color:'#fff5d7'}).setOrigin(.5)}};
 house(80,133);house(560,133,true);
 this.add.text(155,246,'NHÀ CỦA BẠN',{fontFamily:'sans-serif',fontSize:'10px',fontStyle:'bold',color:'#405942'}).setOrigin(.5);
 // Fence, flowers, crates and lantern.
 for(let x=268;x<536;x+=24){g.fillStyle(0xe7d5a4);g.fillRect(x,158,6,24);g.fillRect(x-8,164,27,5)}
 for(const [x,y] of [[226,300],[663,330],[714,386],[200,461],[610,472],[259,111]]){g.fillStyle(0x54884d);g.fillRect(x,y,3,13);g.fillStyle(0xecc889);g.fillRect(x-4,y-4,11,7);g.fillStyle(0xf5e7bc);g.fillRect(x,y-8,4,15)}
 g.fillStyle(0x8e6544);g.fillRect(700,224,31,25);g.fillStyle(0xbe9968);g.fillRect(703,227,25,3);g.fillRect(703,239,25,3);g.fillStyle(0x46734b);g.fillRect(670,231,21,18);g.fillStyle(0xe77b58);g.fillRect(673,226,6,8);g.fillRect(682,223,6,11);
 }
 private drawPlants(){const g=this.plants;g.clear();for(const p of this.bridge.farm.plots){if(!p.crop)continue;const cell=PLOT_CELLS[p.id],x=cell.x*T+19,y=cell.y*T+24;const isReady=ready(p);if(p.wateredAt){g.fillStyle(0x5e5140,.7);g.fillRect(cell.x*T+3,cell.y*T+3,32,30)}g.fillStyle(0x4c854b);g.fillRect(x-2,y-(isReady?17:9),4,isReady?21:12);g.fillStyle(0x70ab57);g.fillEllipse(x-5,y-10,13,7);g.fillEllipse(x+5,y-15,13,7);if(isReady){g.fillStyle(CROPS[p.crop].color);if(p.crop==='carrot')g.fillTriangle(x-7,y-2,x+7,y-2,x,y+11);else if(p.crop==='corn')g.fillRoundedRect(x-5,y-17,10,19,4);else{g.fillCircle(x-6,y-5,6);g.fillCircle(x+6,y-10,6)}g.fillStyle(0xfff0ad);g.fillRect(x+12,y-24,3,9);g.fillRect(x+9,y-21,9,3)}else if(!p.wateredAt){g.fillStyle(0x9ed8e4);g.fillTriangle(x+10,y-18,x+5,y-9,x+15,y-9)}}}
 private target(){let x=this.xCell,y=this.yCell;if(this.direction==='up')y--;if(this.direction==='down')y++;if(this.direction==='left')x--;if(this.direction==='right')x++;const plot=plotAt(x,y),shop=nearShop(this.xCell,this.yCell);this.cursor.clear();this.cursor.lineStyle(2,0xffefb1,.9);this.cursor.strokeRoundedRect(x*T+1,y*T+1,37,37,4);this.bridge.onTarget(plot,shop);return {plot,shop}}
 update(time:number){if(this.lastFarm!==this.bridge.farm||Math.floor(time/1000)!==this.lastSecond){this.lastFarm=this.bridge.farm;this.lastSecond=Math.floor(time/1000);this.drawPlants()}
 if(this.bridge.blocked){this.bridge.move=null;this.bridge.interact=false;return}if(this.walking)return;
 if(Phaser.Input.Keyboard.JustDown(this.keys.E)||Phaser.Input.Keyboard.JustDown(this.keys.SPACE)||this.bridge.interact){this.bridge.interact=false;const t=this.target();this.bridge.onInteract(t.plot,t.shop);return}
 const k=this.keys;const d=this.bridge.move||(k.W.isDown||k.UP.isDown?'up':k.S.isDown||k.DOWN.isDown?'down':k.A.isDown||k.LEFT.isDown?'left':k.D.isDown||k.RIGHT.isDown?'right':null);if(!d)return;
 this.direction=d;const nx=this.xCell+(d==='left'?-1:d==='right'?1:0),ny=this.yCell+(d==='up'?-1:d==='down'?1:0);if(!canWalk(nx,ny)){this.target();return}this.xCell=nx;this.yCell=ny;this.walking=true;this.cursor.clear();this.tweens.add({targets:this.person,x:nx*T+20,y:ny*T+20,duration:140,onComplete:()=>{this.walking=false;this.target()}});this.tweens.add({targets:this.person.list[1],y:-3,duration:70,yoyo:true});
 }
}
