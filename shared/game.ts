export const CROPS = {
 carrot: {name:'Cà rốt',icon:'🥕',seed:5,sell:10,seconds:60,color:0xf4a14a},
 corn: {name:'Ngô',icon:'🌽',seed:10,sell:22,seconds:180,color:0xf5d86a},
 tomato: {name:'Cà chua',icon:'🍅',seed:15,sell:35,seconds:300,color:0xe97962},
} as const;
export type Crop = keyof typeof CROPS;
export type Tool = Crop | 'water';
export type Direction = 'up'|'down'|'left'|'right';
export interface Plot {id:number;crop:Crop|null;wateredAt:string|null}
export interface Farm {coins:number;revenue:number;seeds:Record<Crop,number>;produce:Record<Crop,number>;plots:Plot[];name:string}
export interface Leader {name:string;revenue:number}
export type Action = {kind:'plant';plot:number;crop:Crop}|{kind:'water'|'harvest';plot:number}|{kind:'buy';crop:Crop;quantity:number}|{kind:'sell';crop:Crop;quantity:number};
export const crops = Object.keys(CROPS) as Crop[];
export function isCrop(v:unknown):v is Crop {return typeof v==='string' && Object.hasOwn(CROPS,v)}
export function parseAction(v:unknown):Action {
 if(!v||typeof v!=='object')throw Error('Thao tác không hợp lệ.');
 const a=v as Record<string,unknown>;
 if(['plant','water','harvest'].includes(String(a.kind))){
 if(!Number.isInteger(a.plot)||Number(a.plot)<0||Number(a.plot)>23)throw Error('Ô đất không hợp lệ.');
 if(a.kind==='plant'){if(!isCrop(a.crop))throw Error('Loại cây không hợp lệ.');return {kind:'plant',plot:Number(a.plot),crop:a.crop};}
 return {kind:a.kind as 'water'|'harvest',plot:Number(a.plot)};
 }
 if((a.kind==='buy'||a.kind==='sell')&&isCrop(a.crop)&&Number.isInteger(a.quantity)&&Number(a.quantity)>0&&Number(a.quantity)<=99)return {kind:a.kind,crop:a.crop,quantity:Number(a.quantity)};
 throw Error('Thao tác không hợp lệ.');
}
export function newFarm(name='Người làm vườn'):Farm{return {name,coins:100,revenue:0,seeds:{carrot:5,corn:0,tomato:0},produce:{carrot:0,corn:0,tomato:0},plots:Array.from({length:24},(_,id)=>({id,crop:null,wateredAt:null}))}}
export function ready(p:Plot,now=Date.now()){return !!p.crop&&!!p.wateredAt&&now-Date.parse(p.wateredAt)>=CROPS[p.crop].seconds*1000}
// Used for the explicitly labelled local demo; production mutations execute in Postgres.
export function applyAction(farm:Farm,input:Action,now=Date.now()):Farm {
 const a=parseAction(input), f=structuredClone(farm);
 if(a.kind==='buy'){const cost=CROPS[a.crop].seed*a.quantity;if(f.coins<cost)throw Error('Bạn chưa đủ xu.');f.coins-=cost;f.seeds[a.crop]+=a.quantity;}
 else if(a.kind==='sell'){if(f.produce[a.crop]<a.quantity)throw Error('Không đủ nông sản.');const amount=CROPS[a.crop].sell*a.quantity;f.produce[a.crop]-=a.quantity;f.coins+=amount;f.revenue+=amount;}
 else {const p=f.plots[a.plot];if(a.kind==='plant'){if(p.crop)throw Error('Ô đất đã có cây.');if(f.seeds[a.crop]<1)throw Error('Bạn đã hết hạt giống.');p.crop=a.crop;f.seeds[a.crop]--;}
 else if(a.kind==='water'){if(!p.crop)throw Error('Hãy gieo hạt trước.');if(p.wateredAt)throw Error('Cây đã được tưới.');p.wateredAt=new Date(now).toISOString();}
 else {if(!ready(p,now))throw Error('Cây chưa sẵn sàng thu hoạch.');f.produce[p.crop!]++;p.crop=null;p.wateredAt=null;}}
 return f;
}
export const PLOT_CELLS=Array.from({length:24},(_,id)=>({x:7+id%6,y:5+Math.floor(id/6)}));
export function plotAt(x:number,y:number){return PLOT_CELLS.findIndex(p=>p.x===x&&p.y===y)}
export function canWalk(x:number,y:number){return x>=1&&x<19&&y>=2&&y<13&&!(x>=2&&x<=5&&y>=3&&y<=5)&&!(x>=14&&x<=17&&y>=3&&y<=5)&&!(x<=4&&y>=9)}
export function nearShop(x:number,y:number){return Math.abs(x-15)+Math.abs(y-6)<=2}
